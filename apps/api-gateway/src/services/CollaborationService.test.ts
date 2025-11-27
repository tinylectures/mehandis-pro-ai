import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createServer } from 'http';
import { CollaborationService } from './CollaborationService';
import { AuthService } from './AuthService';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';

// Mock AuthService
const createMockAuthService = (): AuthService => {
  return {
    validateToken: vi.fn(async (token: string) => {
      if (token === 'valid-token') {
        return {
          userId: 'user-123',
          email: 'test@example.com',
          role: 'viewer',
        };
      }
      throw new Error('Invalid token');
    }),
  } as any;
};

describe('CollaborationService', () => {
  let httpServer: any;
  let collaborationService: CollaborationService;
  let mockAuthService: AuthService;
  let clientSocket: ClientSocket;
  const PORT = 4001;

  beforeEach(async () => {
    // Create HTTP server
    httpServer = createServer();
    mockAuthService = createMockAuthService();
    
    // Initialize collaboration service
    collaborationService = new CollaborationService(httpServer, mockAuthService);

    // Start server
    await new Promise<void>((resolve) => {
      httpServer.listen(PORT, () => {
        resolve();
      });
    });
  });

  afterEach(async () => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }
    
    if (httpServer) {
      await new Promise<void>((resolve) => {
        httpServer.close(() => {
          resolve();
        });
      });
    }
  });

  it('should authenticate valid token', async () => {
    clientSocket = ioClient(`http://localhost:${PORT}`, {
      auth: {
        token: 'valid-token',
      },
      transports: ['websocket'],
    });

    await new Promise<void>((resolve, reject) => {
      clientSocket.on('connect', () => {
        expect(clientSocket.connected).toBe(true);
        expect(mockAuthService.validateToken).toHaveBeenCalledWith('valid-token');
        resolve();
      });

      clientSocket.on('connect_error', (error) => {
        reject(error);
      });
    });
  });

  it('should reject invalid token', async () => {
    clientSocket = ioClient(`http://localhost:${PORT}`, {
      auth: {
        token: 'invalid-token',
      },
      transports: ['websocket'],
    });

    await new Promise<void>((resolve, reject) => {
      clientSocket.on('connect', () => {
        reject(new Error('Should not connect with invalid token'));
      });

      clientSocket.on('connect_error', (error) => {
        expect(error.message).toContain('Authentication failed');
        resolve();
      });
    });
  });

  it('should allow user to join a project room', async () => {
    clientSocket = ioClient(`http://localhost:${PORT}`, {
      auth: {
        token: 'valid-token',
      },
      transports: ['websocket'],
    });

    await new Promise<void>((resolve) => {
      clientSocket.on('connect', () => {
        clientSocket.emit('join:project', 'project-123');

        clientSocket.on('users:active', (users) => {
          expect(Array.isArray(users)).toBe(true);
          expect(users.length).toBeGreaterThan(0);
          expect(users[0].userId).toBe('user-123');
          resolve();
        });
      });
    });
  });

  it('should broadcast cursor updates to other users', async () => {
    const client1 = ioClient(`http://localhost:${PORT}`, {
      auth: { token: 'valid-token' },
      transports: ['websocket'],
    });

    const client2 = ioClient(`http://localhost:${PORT}`, {
      auth: { token: 'valid-token' },
      transports: ['websocket'],
    });

    await new Promise<void>((resolve) => {
      let connectedCount = 0;
      const projectId = 'project-123';

      const checkBothConnected = () => {
        connectedCount++;
        if (connectedCount === 2) {
          // Both clients connected, now join the same project
          client1.emit('join:project', projectId);
          client2.emit('join:project', projectId);

          // Wait a bit for both to join
          setTimeout(() => {
            // Client 1 updates cursor
            client1.emit('cursor:update', {
              projectId,
              position: { x: 100, y: 200 },
            });
          }, 100);
        }
      };

      client1.on('connect', checkBothConnected);
      client2.on('connect', checkBothConnected);

      // Client 2 should receive cursor update from Client 1
      client2.on('cursor:moved', (data) => {
        expect(data.userId).toBe('user-123');
        expect(data.position.x).toBe(100);
        expect(data.position.y).toBe(200);
        
        client1.disconnect();
        client2.disconnect();
        resolve();
      });
    });
  });

  it('should broadcast data changes to collaborators', async () => {
    const client1 = ioClient(`http://localhost:${PORT}`, {
      auth: { token: 'valid-token' },
      transports: ['websocket'],
    });

    const client2 = ioClient(`http://localhost:${PORT}`, {
      auth: { token: 'valid-token' },
      transports: ['websocket'],
    });

    await new Promise<void>((resolve) => {
      let connectedCount = 0;
      const projectId = 'project-123';

      const checkBothConnected = () => {
        connectedCount++;
        if (connectedCount === 2) {
          client1.emit('join:project', projectId);
          client2.emit('join:project', projectId);

          setTimeout(() => {
            client1.emit('data:change', {
              projectId,
              change: {
                entityType: 'quantity',
                entityId: 'qty-456',
                action: 'update',
                data: { value: 100 },
                userId: 'user-123',
                timestamp: new Date(),
              },
            });
          }, 100);
        }
      };

      client1.on('connect', checkBothConnected);
      client2.on('connect', checkBothConnected);

      client2.on('data:changed', (change) => {
        expect(change.entityType).toBe('quantity');
        expect(change.entityId).toBe('qty-456');
        expect(change.action).toBe('update');
        
        client1.disconnect();
        client2.disconnect();
        resolve();
      });
    });
  });

  it('should notify when user leaves project', async () => {
    const client1 = ioClient(`http://localhost:${PORT}`, {
      auth: { token: 'valid-token' },
      transports: ['websocket'],
    });

    const client2 = ioClient(`http://localhost:${PORT}`, {
      auth: { token: 'valid-token' },
      transports: ['websocket'],
    });

    await new Promise<void>((resolve) => {
      let connectedCount = 0;
      const projectId = 'project-123';

      const checkBothConnected = () => {
        connectedCount++;
        if (connectedCount === 2) {
          client1.emit('join:project', projectId);
          client2.emit('join:project', projectId);

          setTimeout(() => {
            client1.emit('leave:project', projectId);
          }, 100);
        }
      };

      client1.on('connect', checkBothConnected);
      client2.on('connect', checkBothConnected);

      client2.on('user:left', (data) => {
        expect(data.userId).toBe('user-123');
        
        client1.disconnect();
        client2.disconnect();
        resolve();
      });
    });
  });
});

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { AuthService } from './AuthService';
import { logger } from '../middleware/requestLogger';

export interface CursorPosition {
  x: number;
  y: number;
  elementId?: string;
  page?: string;
}

export interface DataChange {
  entityType: string;
  entityId: string;
  action: 'create' | 'update' | 'delete';
  data: any;
  userId: string;
  timestamp: Date;
}

export interface ActiveUser {
  userId: string;
  socketId: string;
  userName: string;
  cursor?: CursorPosition;
  connectedAt: Date;
}

export interface ConflictResolution {
  conflictId: string;
  resolution: 'accept' | 'reject';
  resolvedBy: string;
}

export class CollaborationService {
  private io: SocketIOServer;
  private authService: AuthService;
  private activeUsers: Map<string, Map<string, ActiveUser>>; // projectId -> Map<socketId, ActiveUser>

  constructor(httpServer: HTTPServer, authService: AuthService) {
    this.authService = authService;
    this.activeUsers = new Map();

    // Initialize Socket.io with CORS configuration
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    this.setupMiddleware();
    this.setupEventHandlers();

    logger.info('CollaborationService initialized');
  }

  /**
   * Setup authentication middleware for Socket.io connections
   */
  private setupMiddleware(): void {
    this.io.use(async (socket: Socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // Validate JWT token
        const payload = await this.authService.validateToken(token);
        
        // Attach user info to socket
        socket.data.userId = payload.userId;
        socket.data.userEmail = payload.email;
        socket.data.userRole = payload.role;

        logger.info(`Socket authenticated for user ${payload.userId}`);
        next();
      } catch (error) {
        logger.error('Socket authentication failed:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  /**
   * Setup event handlers for Socket.io connections
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      logger.info(`Client connected: ${socket.id}, User: ${socket.data.userId}`);

      // Handle joining a project room
      socket.on('join:project', (projectId: string) => {
        this.handleJoinProject(socket, projectId);
      });

      // Handle leaving a project room
      socket.on('leave:project', (projectId: string) => {
        this.handleLeaveProject(socket, projectId);
      });

      // Handle cursor position updates
      socket.on('cursor:update', (data: { projectId: string; position: CursorPosition }) => {
        this.handleCursorUpdate(socket, data.projectId, data.position);
      });

      // Handle data changes
      socket.on('data:change', (data: { projectId: string; change: DataChange }) => {
        this.handleDataChange(socket, data.projectId, data.change);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });

      // Handle errors
      socket.on('error', (error) => {
        logger.error(`Socket error for ${socket.id}:`, error);
      });
    });
  }

  /**
   * Handle user joining a project room
   */
  private handleJoinProject(socket: Socket, projectId: string): void {
    try {
      // Join the Socket.io room
      socket.join(`project:${projectId}`);

      // Track active user
      if (!this.activeUsers.has(projectId)) {
        this.activeUsers.set(projectId, new Map());
      }

      const projectUsers = this.activeUsers.get(projectId)!;
      const activeUser: ActiveUser = {
        userId: socket.data.userId,
        socketId: socket.id,
        userName: socket.data.userEmail,
        connectedAt: new Date(),
      };

      projectUsers.set(socket.id, activeUser);

      // Notify other users in the room
      socket.to(`project:${projectId}`).emit('user:joined', {
        userId: socket.data.userId,
        userName: socket.data.userEmail,
      });

      // Send current active users to the newly joined user
      const activeUsersList = Array.from(projectUsers.values()).map(user => ({
        userId: user.userId,
        userName: user.userName,
        cursor: user.cursor,
      }));

      socket.emit('users:active', activeUsersList);

      logger.info(`User ${socket.data.userId} joined project ${projectId}`);
    } catch (error) {
      logger.error(`Error joining project ${projectId}:`, error);
      socket.emit('error', { message: 'Failed to join project' });
    }
  }

  /**
   * Handle user leaving a project room
   */
  private handleLeaveProject(socket: Socket, projectId: string): void {
    try {
      socket.leave(`project:${projectId}`);

      // Remove from active users
      const projectUsers = this.activeUsers.get(projectId);
      if (projectUsers) {
        projectUsers.delete(socket.id);
        
        // Clean up empty project maps
        if (projectUsers.size === 0) {
          this.activeUsers.delete(projectId);
        }
      }

      // Notify other users
      socket.to(`project:${projectId}`).emit('user:left', {
        userId: socket.data.userId,
        userName: socket.data.userEmail,
      });

      logger.info(`User ${socket.data.userId} left project ${projectId}`);
    } catch (error) {
      logger.error(`Error leaving project ${projectId}:`, error);
    }
  }

  /**
   * Handle cursor position updates
   */
  private handleCursorUpdate(socket: Socket, projectId: string, position: CursorPosition): void {
    try {
      // Update cursor position in active users
      const projectUsers = this.activeUsers.get(projectId);
      if (projectUsers) {
        const user = projectUsers.get(socket.id);
        if (user) {
          user.cursor = position;
        }
      }

      // Broadcast cursor position to other users in the room
      socket.to(`project:${projectId}`).emit('cursor:moved', {
        userId: socket.data.userId,
        userName: socket.data.userEmail,
        position,
      });
    } catch (error) {
      logger.error(`Error updating cursor for project ${projectId}:`, error);
    }
  }

  /**
   * Handle data changes and broadcast to collaborators
   */
  private handleDataChange(socket: Socket, projectId: string, change: DataChange): void {
    try {
      // Add metadata to the change
      const enrichedChange: DataChange = {
        ...change,
        userId: socket.data.userId,
        timestamp: new Date(),
      };

      // Broadcast change to all other users in the room
      socket.to(`project:${projectId}`).emit('data:changed', enrichedChange);

      logger.info(`Data change broadcast for project ${projectId}: ${change.action} ${change.entityType}`);
    } catch (error) {
      logger.error(`Error broadcasting data change for project ${projectId}:`, error);
    }
  }

  /**
   * Handle socket disconnection
   */
  private handleDisconnect(socket: Socket): void {
    try {
      // Remove user from all project rooms
      for (const [projectId, projectUsers] of this.activeUsers.entries()) {
        if (projectUsers.has(socket.id)) {
          projectUsers.delete(socket.id);

          // Notify other users
          socket.to(`project:${projectId}`).emit('user:left', {
            userId: socket.data.userId,
            userName: socket.data.userEmail,
          });

          // Clean up empty project maps
          if (projectUsers.size === 0) {
            this.activeUsers.delete(projectId);
          }
        }
      }

      logger.info(`Client disconnected: ${socket.id}, User: ${socket.data.userId}`);
    } catch (error) {
      logger.error(`Error handling disconnect for ${socket.id}:`, error);
    }
  }

  /**
   * Public API: Broadcast a change to all users in a project
   */
  public async broadcastChange(projectId: string, change: DataChange): Promise<void> {
    try {
      this.io.to(`project:${projectId}`).emit('data:changed', change);
      logger.info(`Change broadcast to project ${projectId}: ${change.action} ${change.entityType}`);
    } catch (error) {
      logger.error(`Error broadcasting change to project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Public API: Get active users in a project
   */
  public async getActiveUsers(projectId: string): Promise<ActiveUser[]> {
    const projectUsers = this.activeUsers.get(projectId);
    if (!projectUsers) {
      return [];
    }

    return Array.from(projectUsers.values());
  }

  /**
   * Public API: Track user cursor position
   */
  public async trackUserCursor(projectId: string, userId: string, position: CursorPosition): Promise<void> {
    try {
      // Find the socket for this user in this project
      const projectUsers = this.activeUsers.get(projectId);
      if (projectUsers) {
        for (const [socketId, user] of projectUsers.entries()) {
          if (user.userId === userId) {
            user.cursor = position;
            
            // Broadcast to other users
            this.io.to(`project:${projectId}`).except(socketId).emit('cursor:moved', {
              userId,
              userName: user.userName,
              position,
            });
            break;
          }
        }
      }
    } catch (error) {
      logger.error(`Error tracking cursor for user ${userId} in project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Public API: Resolve a conflict
   */
  public async resolveConflict(conflictId: string, resolution: ConflictResolution): Promise<void> {
    try {
      // Broadcast conflict resolution to all connected clients
      this.io.emit('conflict:resolved', {
        conflictId,
        resolution: resolution.resolution,
        resolvedBy: resolution.resolvedBy,
        timestamp: new Date(),
      });

      logger.info(`Conflict ${conflictId} resolved by ${resolution.resolvedBy}`);
    } catch (error) {
      logger.error(`Error resolving conflict ${conflictId}:`, error);
      throw error;
    }
  }

  /**
   * Get the Socket.io server instance
   */
  public getIO(): SocketIOServer {
    return this.io;
  }
}

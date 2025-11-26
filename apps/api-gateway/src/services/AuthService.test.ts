import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from './AuthService';
import { UserRepository } from '../repositories/UserRepository';
import { SessionService } from './SessionService';
import { User, UserCreate } from '../models/User';

// Mock UserRepository
const createMockUserRepository = (): UserRepository => {
  const mockUsers = new Map<string, User>();
  
  return {
    create: vi.fn(async (data: UserCreate): Promise<User> => {
      const user: User = {
        id: 'test-user-id',
        email: data.email,
        passwordHash: 'hashed-password',
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        organizationId: data.organizationId,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockUsers.set(user.id, user);
      return user;
    }),
    findByEmail: vi.fn(async (email: string): Promise<User | null> => {
      for (const user of mockUsers.values()) {
        if (user.email === email) {
          return user;
        }
      }
      return null;
    }),
    findById: vi.fn(async (id: string): Promise<User | null> => {
      return mockUsers.get(id) || null;
    }),
    verifyPassword: vi.fn(async (_user: User, password: string): Promise<boolean> => {
      return password === 'correct-password';
    }),
    updateLastLogin: vi.fn(async (_id: string): Promise<void> => {}),
    update: vi.fn(async (id: string, _data: any): Promise<User | null> => {
      return mockUsers.get(id) || null;
    }),
  } as any;
};

// Mock SessionService
const createMockSessionService = (): SessionService => {
  return {
    connect: vi.fn(async () => {}),
    disconnect: vi.fn(async () => {}),
    createSession: vi.fn(async (_sessionId: string, data: any) => ({
      ...data,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      expiresAt: Date.now() + 86400000,
    })),
    getSession: vi.fn(async () => null),
    deleteSession: vi.fn(async () => true),
    deleteUserSessions: vi.fn(async () => 1),
    getUserSessions: vi.fn(async () => []),
  } as any;
};

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepository: UserRepository;
  let mockSessionService: SessionService;

  beforeEach(() => {
    mockUserRepository = createMockUserRepository();
    mockSessionService = createMockSessionService();
    authService = new AuthService(mockUserRepository, mockSessionService);
  });

  describe('register', () => {
    it('should create a new user', async () => {
      const userData: UserCreate = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        role: 'viewer',
        organizationId: 'org-123',
      };

      const user = await authService.register(userData);

      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.firstName).toBe(userData.firstName);
      expect(mockUserRepository.create).toHaveBeenCalledWith(userData);
    });

    it('should throw error if user already exists', async () => {
      const userData: UserCreate = {
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        role: 'viewer',
        organizationId: 'org-123',
      };

      // First registration
      await authService.register(userData);

      // Second registration should fail
      await expect(authService.register(userData)).rejects.toThrow('User with this email already exists');
    });
  });

  describe('login', () => {
    it('should return auth token for valid credentials', async () => {
      // First create a user
      const userData: UserCreate = {
        email: 'test@example.com',
        password: 'correct-password',
        firstName: 'Test',
        lastName: 'User',
        role: 'viewer',
        organizationId: 'org-123',
      };
      await authService.register(userData);

      // Then login
      const result = await authService.login({
        email: 'test@example.com',
        password: 'correct-password',
      });

      expect(result).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.expiresIn).toBeGreaterThan(0);
      expect(result.user.email).toBe('test@example.com');
    });

    it('should throw error for invalid email', async () => {
      await expect(
        authService.login({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for invalid password', async () => {
      // First create a user
      const userData: UserCreate = {
        email: 'test@example.com',
        password: 'correct-password',
        firstName: 'Test',
        lastName: 'User',
        role: 'viewer',
        organizationId: 'org-123',
      };
      await authService.register(userData);

      // Then try to login with wrong password
      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'wrong-password',
        })
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('validateToken', () => {
    it('should validate a valid token', async () => {
      // Create and login user
      const userData: UserCreate = {
        email: 'test@example.com',
        password: 'correct-password',
        firstName: 'Test',
        lastName: 'User',
        role: 'viewer',
        organizationId: 'org-123',
      };
      await authService.register(userData);
      const authToken = await authService.login({
        email: 'test@example.com',
        password: 'correct-password',
      });

      // Validate token
      const payload = await authService.validateToken(authToken.token);

      expect(payload).toBeDefined();
      expect(payload.email).toBe('test@example.com');
      expect(payload.userId).toBeDefined();
    });

    it('should throw error for invalid token', async () => {
      await expect(authService.validateToken('invalid-token')).rejects.toThrow();
    });
  });

  describe('requestPasswordReset', () => {
    it('should generate reset token for existing user', async () => {
      // Create user
      const userData: UserCreate = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        role: 'viewer',
        organizationId: 'org-123',
      };
      await authService.register(userData);

      // Request reset
      const resetToken = await authService.requestPasswordReset('test@example.com');

      expect(resetToken).toBeDefined();
      expect(typeof resetToken).toBe('string');
      expect(resetToken.length).toBeGreaterThan(0);
    });

    it('should return token even for non-existent user (security)', async () => {
      const resetToken = await authService.requestPasswordReset('nonexistent@example.com');

      expect(resetToken).toBeDefined();
      expect(typeof resetToken).toBe('string');
    });
  });

  describe('logout', () => {
    it('should logout user and clear sessions', async () => {
      const userId = 'test-user-id';

      await authService.logout(userId);

      expect(mockSessionService.deleteUserSessions).toHaveBeenCalledWith(userId);
    });
  });
});

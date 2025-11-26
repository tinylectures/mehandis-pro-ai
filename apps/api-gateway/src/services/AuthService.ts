import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UserRepository } from '../repositories/UserRepository';
import { User, UserCreate } from '../models/User';
import { SessionService } from './SessionService';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthToken {
  token: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export interface RefreshTokenData {
  userId: string;
  token: string;
  expiresAt: Date;
}

export interface PasswordResetTokenData {
  userId: string;
  email: string;
  token: string;
  expiresAt: Date;
}

export class AuthService {
  private userRepository: UserRepository;
  private sessionService: SessionService;
  private jwtSecret: string;
  private jwtExpiresIn: string;
  private refreshTokens: Map<string, RefreshTokenData>;
  private passwordResetTokens: Map<string, PasswordResetTokenData>;

  constructor(userRepository: UserRepository, sessionService?: SessionService) {
    this.userRepository = userRepository;
    this.sessionService = sessionService || new SessionService();
    this.jwtSecret = process.env.JWT_SECRET || 'default-secret-change-me';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '1h';
    this.refreshTokens = new Map();
    this.passwordResetTokens = new Map();

    if (this.jwtSecret === 'default-secret-change-me') {
      console.warn('WARNING: Using default JWT secret. Set JWT_SECRET environment variable in production!');
    }
  }

  async register(userData: UserCreate): Promise<User> {
    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Create user
    const user = await this.userRepository.create(userData);
    return user;
  }

  async login(credentials: LoginCredentials): Promise<AuthToken> {
    // Find user by email
    const user = await this.userRepository.findByEmail(credentials.email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('User account is inactive');
    }

    // Verify password
    const isPasswordValid = await this.userRepository.verifyPassword(user, credentials.password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    await this.userRepository.updateLastLogin(user.id);

    // Generate tokens
    const token = this.generateToken(user);
    const refreshToken = this.generateRefreshToken(user.id);

    // Create session in Redis
    const sessionId = crypto.randomBytes(16).toString('hex');
    await this.sessionService.createSession(sessionId, {
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Calculate expiration time in seconds
    const expiresIn = this.parseExpirationTime(this.jwtExpiresIn);

    return {
      token,
      refreshToken,
      expiresIn,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  async validateToken(token: string): Promise<TokenPayload> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as TokenPayload;
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      throw new Error('Token validation failed');
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthToken> {
    // Check if refresh token exists
    const tokenData = this.refreshTokens.get(refreshToken);
    if (!tokenData) {
      throw new Error('Invalid refresh token');
    }

    // Check if refresh token is expired
    if (tokenData.expiresAt < new Date()) {
      this.refreshTokens.delete(refreshToken);
      throw new Error('Refresh token has expired');
    }

    // Get user
    const user = await this.userRepository.findById(tokenData.userId);
    if (!user || !user.isActive) {
      this.refreshTokens.delete(refreshToken);
      throw new Error('User not found or inactive');
    }

    // Remove old refresh token
    this.refreshTokens.delete(refreshToken);

    // Generate new tokens
    const newToken = this.generateToken(user);
    const newRefreshToken = this.generateRefreshToken(user.id);

    const expiresIn = this.parseExpirationTime(this.jwtExpiresIn);

    return {
      token: newToken,
      refreshToken: newRefreshToken,
      expiresIn,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  private generateToken(user: User): string {
    const payload: Omit<TokenPayload, 'iat' | 'exp'> = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn,
    });
  }

  private generateRefreshToken(userId: string): string {
    const token = crypto.randomBytes(32).toString('hex');
    
    // Refresh tokens expire in 7 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    this.refreshTokens.set(token, {
      userId,
      token,
      expiresAt,
    });

    return token;
  }

  private parseExpirationTime(expiresIn: string): number {
    // Parse time strings like '1h', '24h', '7d'
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 3600; // Default to 1 hour
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 3600;
    }
  }

  revokeRefreshToken(refreshToken: string): void {
    this.refreshTokens.delete(refreshToken);
  }

  async requestPasswordReset(email: string): Promise<string> {
    // Find user by email
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      // Don't reveal if user exists or not for security
      // Return a token anyway but it won't be stored
      return crypto.randomBytes(32).toString('hex');
    }

    // Generate secure reset token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Token expires in 1 hour
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    this.passwordResetTokens.set(token, {
      userId: user.id,
      email: user.email,
      token,
      expiresAt,
    });

    // In a real application, send email with reset link here
    // For now, we just return the token
    return token;
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Check if reset token exists
    const tokenData = this.passwordResetTokens.get(token);
    if (!tokenData) {
      throw new Error('Invalid or expired reset token');
    }

    // Check if token is expired
    if (tokenData.expiresAt < new Date()) {
      this.passwordResetTokens.delete(token);
      throw new Error('Reset token has expired');
    }

    // Get user
    const user = await this.userRepository.findById(tokenData.userId);
    if (!user) {
      this.passwordResetTokens.delete(token);
      throw new Error('User not found');
    }

    // Update password using bcrypt
    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    await this.userRepository.update(user.id, {});
    
    // Update password directly in database
    // We need to add a method to UserRepository for this
    await this.updatePassword(user.id, passwordHash);

    // Remove used token
    this.passwordResetTokens.delete(token);

    // Revoke all refresh tokens for this user for security
    for (const [refreshToken, data] of this.refreshTokens.entries()) {
      if (data.userId === user.id) {
        this.refreshTokens.delete(refreshToken);
      }
    }
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    // Get user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify old password
    const isPasswordValid = await this.userRepository.verifyPassword(user, oldPassword);
    if (!isPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Update password
    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.updatePassword(userId, passwordHash);

    // Revoke all refresh tokens for security
    for (const [refreshToken, data] of this.refreshTokens.entries()) {
      if (data.userId === userId) {
        this.refreshTokens.delete(refreshToken);
      }
    }
  }

  private async updatePassword(userId: string, passwordHash: string): Promise<void> {
    // Direct database update for password
    // This is a workaround since UserRepository.update doesn't handle password
    const bcrypt = await import('bcrypt');
    const db = (this.userRepository as any).db;
    await db('users')
      .where({ id: userId })
      .update({ 
        password_hash: passwordHash,
        updated_at: db.fn.now()
      });
  }

  validateResetToken(token: string): boolean {
    const tokenData = this.passwordResetTokens.get(token);
    if (!tokenData) {
      return false;
    }
    return tokenData.expiresAt >= new Date();
  }

  async logout(userId: string, sessionId?: string): Promise<void> {
    if (sessionId) {
      // Logout from specific session
      await this.sessionService.deleteSession(sessionId);
    } else {
      // Logout from all sessions
      await this.sessionService.deleteUserSessions(userId);
    }

    // Revoke all refresh tokens for this user
    for (const [refreshToken, data] of this.refreshTokens.entries()) {
      if (data.userId === userId) {
        this.refreshTokens.delete(refreshToken);
      }
    }
  }

  async getActiveSessions(userId: string) {
    return this.sessionService.getUserSessions(userId);
  }
}

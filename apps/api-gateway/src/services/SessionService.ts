import { createClient, RedisClientType } from 'redis';

export interface SessionData {
  userId: string;
  email: string;
  role: string;
  createdAt: number;
  lastAccessedAt: number;
  expiresAt: number;
}

export class SessionService {
  private client: RedisClientType;
  private sessionPrefix = 'session:';
  private userSessionsPrefix = 'user_sessions:';
  private defaultTTL = 86400; // 24 hours in seconds

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.client = createClient({ 
      url: redisUrl,
      socket: {
        reconnectStrategy: false // Don't retry if Redis is not available
      }
    });
    
    this.client.on('error', (err) => {
      console.warn('Redis not available - sessions will be in-memory only:', err.message);
    });

    this.client.on('connect', () => {
      console.log('Redis Client Connected');
    });
  }

  async connect(): Promise<void> {
    if (!this.client.isOpen) {
      try {
        await this.client.connect();
      } catch (error) {
        console.warn('Could not connect to Redis. Sessions will work in-memory only.');
        // Continue without Redis - the app will still work
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.quit();
    }
  }

  /**
   * Create a new session
   */
  async createSession(sessionId: string, data: Omit<SessionData, 'createdAt' | 'lastAccessedAt' | 'expiresAt'>): Promise<SessionData> {
    await this.connect();

    const now = Date.now();
    const expiresAt = now + (this.defaultTTL * 1000);

    const sessionData: SessionData = {
      ...data,
      createdAt: now,
      lastAccessedAt: now,
      expiresAt,
    };

    const key = this.sessionPrefix + sessionId;
    
    // Store session data
    await this.client.setEx(
      key,
      this.defaultTTL,
      JSON.stringify(sessionData)
    );

    // Track user sessions
    const userSessionsKey = this.userSessionsPrefix + data.userId;
    await this.client.sAdd(userSessionsKey, sessionId);
    await this.client.expire(userSessionsKey, this.defaultTTL);

    return sessionData;
  }

  /**
   * Get session data
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    await this.connect();

    const key = this.sessionPrefix + sessionId;
    const data = await this.client.get(key);

    if (!data) {
      return null;
    }

    const sessionData: SessionData = JSON.parse(data);

    // Check if session is expired
    if (sessionData.expiresAt < Date.now()) {
      await this.deleteSession(sessionId);
      return null;
    }

    // Update last accessed time
    sessionData.lastAccessedAt = Date.now();
    await this.client.setEx(
      key,
      this.defaultTTL,
      JSON.stringify(sessionData)
    );

    return sessionData;
  }

  /**
   * Update session data
   */
  async updateSession(sessionId: string, updates: Partial<SessionData>): Promise<SessionData | null> {
    await this.connect();

    const sessionData = await this.getSession(sessionId);
    if (!sessionData) {
      return null;
    }

    const updatedData: SessionData = {
      ...sessionData,
      ...updates,
      lastAccessedAt: Date.now(),
    };

    const key = this.sessionPrefix + sessionId;
    await this.client.setEx(
      key,
      this.defaultTTL,
      JSON.stringify(updatedData)
    );

    return updatedData;
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    await this.connect();

    const sessionData = await this.getSession(sessionId);
    if (sessionData) {
      // Remove from user sessions set
      const userSessionsKey = this.userSessionsPrefix + sessionData.userId;
      await this.client.sRem(userSessionsKey, sessionId);
    }

    const key = this.sessionPrefix + sessionId;
    const result = await this.client.del(key);
    return result > 0;
  }

  /**
   * Delete all sessions for a user
   */
  async deleteUserSessions(userId: string): Promise<number> {
    await this.connect();

    const userSessionsKey = this.userSessionsPrefix + userId;
    const sessionIds = await this.client.sMembers(userSessionsKey);

    let deletedCount = 0;
    for (const sessionId of sessionIds) {
      const deleted = await this.deleteSession(sessionId);
      if (deleted) {
        deletedCount++;
      }
    }

    // Clean up the user sessions set
    await this.client.del(userSessionsKey);

    return deletedCount;
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<SessionData[]> {
    await this.connect();

    const userSessionsKey = this.userSessionsPrefix + userId;
    const sessionIds = await this.client.sMembers(userSessionsKey);

    const sessions: SessionData[] = [];
    for (const sessionId of sessionIds) {
      const sessionData = await this.getSession(sessionId);
      if (sessionData) {
        sessions.push(sessionData);
      }
    }

    return sessions;
  }

  /**
   * Extend session expiration
   */
  async extendSession(sessionId: string, additionalSeconds?: number): Promise<boolean> {
    await this.connect();

    const sessionData = await this.getSession(sessionId);
    if (!sessionData) {
      return false;
    }

    const ttl = additionalSeconds || this.defaultTTL;
    sessionData.expiresAt = Date.now() + (ttl * 1000);

    const key = this.sessionPrefix + sessionId;
    await this.client.setEx(
      key,
      ttl,
      JSON.stringify(sessionData)
    );

    return true;
  }

  /**
   * Check if session exists and is valid
   */
  async isSessionValid(sessionId: string): Promise<boolean> {
    const sessionData = await this.getSession(sessionId);
    return sessionData !== null;
  }

  /**
   * Clean up expired sessions (can be run periodically)
   */
  async cleanupExpiredSessions(): Promise<number> {
    // Redis automatically removes expired keys with TTL
    // This method is here for compatibility and can be used for additional cleanup
    return 0;
  }

  /**
   * Get session statistics
   */
  async getSessionStats(): Promise<{
    totalSessions: number;
    activeSessions: number;
  }> {
    await this.connect();

    const keys = await this.client.keys(this.sessionPrefix + '*');
    const totalSessions = keys.length;

    // Count active (non-expired) sessions
    let activeSessions = 0;
    for (const key of keys) {
      const ttl = await this.client.ttl(key);
      if (ttl > 0) {
        activeSessions++;
      }
    }

    return {
      totalSessions,
      activeSessions,
    };
  }
}

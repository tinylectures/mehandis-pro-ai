import { AuditLogRepository } from '../repositories/AuditLogRepository';
import { AuditLog, AuditLogCreate } from '../models/AuditLog';

/**
 * Service for audit logging operations
 */
export class AuditLogService {
  constructor(private auditLogRepository: AuditLogRepository) {}

  /**
   * Log an audit event
   */
  async log(auditLogData: AuditLogCreate): Promise<AuditLog> {
    return this.auditLogRepository.create(auditLogData);
  }

  /**
   * Log a user login event
   */
  async logLogin(userId: string, ipAddress: string, userAgent: string): Promise<AuditLog> {
    return this.log({
      userId,
      action: 'login',
      entityType: 'user',
      entityId: userId,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log a user logout event
   */
  async logLogout(userId: string, ipAddress: string, userAgent: string): Promise<AuditLog> {
    return this.log({
      userId,
      action: 'logout',
      entityType: 'user',
      entityId: userId,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log a create operation
   */
  async logCreate(
    userId: string,
    entityType: string,
    entityId: string,
    data: Record<string, any>,
    ipAddress: string,
    userAgent: string
  ): Promise<AuditLog> {
    return this.log({
      userId,
      action: 'create',
      entityType,
      entityId,
      changes: {
        before: {},
        after: data,
      },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log an update operation
   */
  async logUpdate(
    userId: string,
    entityType: string,
    entityId: string,
    before: Record<string, any>,
    after: Record<string, any>,
    ipAddress: string,
    userAgent: string
  ): Promise<AuditLog> {
    return this.log({
      userId,
      action: 'update',
      entityType,
      entityId,
      changes: {
        before,
        after,
      },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log a delete operation
   */
  async logDelete(
    userId: string,
    entityType: string,
    entityId: string,
    data: Record<string, any>,
    ipAddress: string,
    userAgent: string
  ): Promise<AuditLog> {
    return this.log({
      userId,
      action: 'delete',
      entityType,
      entityId,
      changes: {
        before: data,
        after: {},
      },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Get audit logs for a user
   */
  async getUserLogs(userId: string, limit = 100): Promise<AuditLog[]> {
    return this.auditLogRepository.findByUserId(userId, limit);
  }

  /**
   * Get audit logs for an entity
   */
  async getEntityLogs(entityType: string, entityId: string, limit = 100): Promise<AuditLog[]> {
    return this.auditLogRepository.findByEntity(entityType, entityId, limit);
  }

  /**
   * Get audit logs by action type
   */
  async getLogsByAction(action: string, limit = 100): Promise<AuditLog[]> {
    return this.auditLogRepository.findByAction(action, limit);
  }

  /**
   * Get audit logs within a time range
   */
  async getLogsByTimeRange(startDate: Date, endDate: Date, limit = 1000): Promise<AuditLog[]> {
    return this.auditLogRepository.findByTimeRange(startDate, endDate, limit);
  }

  /**
   * Get all audit logs with pagination
   */
  async getAllLogs(page = 1, pageSize = 100): Promise<{ logs: AuditLog[]; total: number }> {
    return this.auditLogRepository.findAll(page, pageSize);
  }
}

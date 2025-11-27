import { Knex } from 'knex';
import { AuditLog, AuditLogCreate } from '../models/AuditLog';

/**
 * Repository for AuditLog operations
 */
export class AuditLogRepository {
  private tableName = 'audit_logs';

  constructor(private db: Knex) {}

  /**
   * Create a new audit log entry
   */
  async create(auditLogData: AuditLogCreate): Promise<AuditLog> {
    const [auditLog] = await this.db(this.tableName)
      .insert({
        user_id: auditLogData.userId,
        action: auditLogData.action,
        entity_type: auditLogData.entityType,
        entity_id: auditLogData.entityId,
        changes: auditLogData.changes ? JSON.stringify(auditLogData.changes) : null,
        ip_address: auditLogData.ipAddress,
        user_agent: auditLogData.userAgent,
        timestamp: new Date(),
      })
      .returning('*');

    return this.mapToAuditLog(auditLog);
  }

  /**
   * Get audit logs by user ID
   */
  async findByUserId(userId: string, limit = 100): Promise<AuditLog[]> {
    const logs = await this.db(this.tableName)
      .where({ user_id: userId })
      .orderBy('timestamp', 'desc')
      .limit(limit);

    return logs.map(this.mapToAuditLog);
  }

  /**
   * Get audit logs by entity
   */
  async findByEntity(entityType: string, entityId: string, limit = 100): Promise<AuditLog[]> {
    const logs = await this.db(this.tableName)
      .where({ 
        entity_type: entityType,
        entity_id: entityId,
      })
      .orderBy('timestamp', 'desc')
      .limit(limit);

    return logs.map(this.mapToAuditLog);
  }

  /**
   * Get audit logs by action
   */
  async findByAction(action: string, limit = 100): Promise<AuditLog[]> {
    const logs = await this.db(this.tableName)
      .where({ action })
      .orderBy('timestamp', 'desc')
      .limit(limit);

    return logs.map(this.mapToAuditLog);
  }

  /**
   * Get audit logs within a time range
   */
  async findByTimeRange(startDate: Date, endDate: Date, limit = 1000): Promise<AuditLog[]> {
    const logs = await this.db(this.tableName)
      .whereBetween('timestamp', [startDate, endDate])
      .orderBy('timestamp', 'desc')
      .limit(limit);

    return logs.map(this.mapToAuditLog);
  }

  /**
   * Get all audit logs with pagination
   */
  async findAll(page = 1, pageSize = 100): Promise<{ logs: AuditLog[]; total: number }> {
    const offset = (page - 1) * pageSize;

    const [logs, countResult] = await Promise.all([
      this.db(this.tableName)
        .orderBy('timestamp', 'desc')
        .limit(pageSize)
        .offset(offset),
      this.db(this.tableName).count('* as count').first(),
    ]);

    return {
      logs: logs.map(this.mapToAuditLog),
      total: Number(countResult?.count || 0),
    };
  }

  /**
   * Map database row to AuditLog entity
   */
  private mapToAuditLog(row: any): AuditLog {
    return {
      id: row.id,
      userId: row.user_id,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      changes: row.changes ? JSON.parse(row.changes) : undefined,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      timestamp: row.timestamp,
    };
  }
}

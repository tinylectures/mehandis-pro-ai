/**
 * AuditLog entity interface
 */
export interface AuditLog {
  id: string;
  userId: string;
  action: string; // 'create', 'update', 'delete', 'login', 'logout', etc.
  entityType: string; // 'user', 'project', 'bim_model', 'quantity', 'cost_item', etc.
  entityId: string;
  changes?: {
    before: Record<string, any>;
    after: Record<string, any>;
  };
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

/**
 * AuditLog creation data
 */
export interface AuditLogCreate {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  changes?: {
    before: Record<string, any>;
    after: Record<string, any>;
  };
  ipAddress: string;
  userAgent: string;
}

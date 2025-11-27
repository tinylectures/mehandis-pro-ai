import { Request, Response, NextFunction } from 'express';
import { AuditLogService } from '../services/AuditLogService';
import { logger } from './requestLogger';

/**
 * Sensitive operations that should be audited
 */
const SENSITIVE_OPERATIONS = [
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
];

/**
 * Paths that should be excluded from audit logging
 */
const EXCLUDED_PATHS = [
  '/health',
  '/api-docs',
  '/api-docs.json',
];

/**
 * Extract user ID from request
 * This should be set by authentication middleware
 */
const getUserId = (req: Request): string | null => {
  // Check if user is attached to request by auth middleware
  if ((req as any).user?.id) {
    return (req as any).user.id;
  }
  
  // For now, check body for userId (temporary until auth middleware is fully integrated)
  if (req.body?.userId) {
    return req.body.userId;
  }
  
  return null;
};

/**
 * Determine entity type from path
 */
const getEntityType = (path: string): string => {
  if (path.includes('/auth')) return 'auth';
  if (path.includes('/projects')) return 'project';
  if (path.includes('/models')) return 'bim_model';
  if (path.includes('/quantities')) return 'quantity';
  if (path.includes('/costs')) return 'cost_item';
  if (path.includes('/reports')) return 'report';
  return 'unknown';
};

/**
 * Determine action from method and path
 */
const getAction = (method: string, path: string): string => {
  if (path.includes('/login')) return 'login';
  if (path.includes('/logout')) return 'logout';
  if (path.includes('/register')) return 'register';
  
  switch (method) {
    case 'POST':
      return 'create';
    case 'PUT':
    case 'PATCH':
      return 'update';
    case 'DELETE':
      return 'delete';
    default:
      return 'read';
  }
};

/**
 * Create audit logging middleware
 */
export const createAuditLoggerMiddleware = (auditLogService: AuditLogService) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Skip non-sensitive operations
    if (!SENSITIVE_OPERATIONS.includes(req.method)) {
      next();
      return;
    }

    // Skip excluded paths
    if (EXCLUDED_PATHS.some(path => req.path.startsWith(path))) {
      next();
      return;
    }

    // Get user ID
    const userId = getUserId(req);
    
    // Skip if no user ID (unauthenticated requests)
    if (!userId) {
      next();
      return;
    }

    // Capture response
    const originalSend = res.send;
    let responseBody: any;

    res.send = function (data: any): Response {
      responseBody = data;
      return originalSend.call(this, data);
    };

    // Wait for response to complete
    res.on('finish', async () => {
      try {
        // Only log successful operations (2xx status codes)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const entityType = getEntityType(req.path);
          const action = getAction(req.method, req.path);
          
          // Extract entity ID from response or params
          let entityId = req.params.id || 'unknown';
          
          // Try to extract ID from response body
          if (responseBody) {
            try {
              const parsed = typeof responseBody === 'string' 
                ? JSON.parse(responseBody) 
                : responseBody;
              
              if (parsed.data?.id) {
                entityId = parsed.data.id;
              }
            } catch (e) {
              // Ignore parsing errors
            }
          }

          // Log the audit event
          await auditLogService.log({
            userId,
            action,
            entityType,
            entityId,
            changes: action === 'create' || action === 'update' ? {
              before: {},
              after: req.body,
            } : undefined,
            ipAddress: req.ip || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown',
          });

          logger.info('Audit log created', {
            userId,
            action,
            entityType,
            entityId,
            path: req.path,
            method: req.method,
          });
        }
      } catch (error) {
        // Don't fail the request if audit logging fails
        logger.error('Failed to create audit log', {
          error: error instanceof Error ? error.message : 'Unknown error',
          userId,
          path: req.path,
          method: req.method,
        });
      }
    });

    next();
  };
};

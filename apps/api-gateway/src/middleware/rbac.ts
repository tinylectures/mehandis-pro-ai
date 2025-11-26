import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { UserRole } from '../models/User';

// Define permissions for each role
export enum Permission {
  // User management
  CREATE_USER = 'create:user',
  READ_USER = 'read:user',
  UPDATE_USER = 'update:user',
  DELETE_USER = 'delete:user',
  
  // Project management
  CREATE_PROJECT = 'create:project',
  READ_PROJECT = 'read:project',
  UPDATE_PROJECT = 'update:project',
  DELETE_PROJECT = 'delete:project',
  ARCHIVE_PROJECT = 'archive:project',
  
  // Team management
  ASSIGN_TEAM_MEMBER = 'assign:team_member',
  REMOVE_TEAM_MEMBER = 'remove:team_member',
  
  // BIM models
  UPLOAD_BIM_MODEL = 'upload:bim_model',
  READ_BIM_MODEL = 'read:bim_model',
  DELETE_BIM_MODEL = 'delete:bim_model',
  
  // Quantities
  CALCULATE_QUANTITIES = 'calculate:quantities',
  READ_QUANTITIES = 'read:quantities',
  UPDATE_QUANTITIES = 'update:quantities',
  
  // Costs
  CREATE_COST_ESTIMATE = 'create:cost_estimate',
  READ_COST_ESTIMATE = 'read:cost_estimate',
  UPDATE_COST_ESTIMATE = 'update:cost_estimate',
  APPROVE_COST_ESTIMATE = 'approve:cost_estimate',
  
  // Reports
  GENERATE_REPORT = 'generate:report',
  EXPORT_REPORT = 'export:report',
  
  // System
  VIEW_AUDIT_LOGS = 'view:audit_logs',
  MANAGE_ORGANIZATION = 'manage:organization',
}

// Role-based permissions mapping
const rolePermissions: Record<UserRole, Permission[]> = {
  admin: [
    // Admins have all permissions
    Permission.CREATE_USER,
    Permission.READ_USER,
    Permission.UPDATE_USER,
    Permission.DELETE_USER,
    Permission.CREATE_PROJECT,
    Permission.READ_PROJECT,
    Permission.UPDATE_PROJECT,
    Permission.DELETE_PROJECT,
    Permission.ARCHIVE_PROJECT,
    Permission.ASSIGN_TEAM_MEMBER,
    Permission.REMOVE_TEAM_MEMBER,
    Permission.UPLOAD_BIM_MODEL,
    Permission.READ_BIM_MODEL,
    Permission.DELETE_BIM_MODEL,
    Permission.CALCULATE_QUANTITIES,
    Permission.READ_QUANTITIES,
    Permission.UPDATE_QUANTITIES,
    Permission.CREATE_COST_ESTIMATE,
    Permission.READ_COST_ESTIMATE,
    Permission.UPDATE_COST_ESTIMATE,
    Permission.APPROVE_COST_ESTIMATE,
    Permission.GENERATE_REPORT,
    Permission.EXPORT_REPORT,
    Permission.VIEW_AUDIT_LOGS,
    Permission.MANAGE_ORGANIZATION,
  ],
  project_manager: [
    Permission.READ_USER,
    Permission.CREATE_PROJECT,
    Permission.READ_PROJECT,
    Permission.UPDATE_PROJECT,
    Permission.ARCHIVE_PROJECT,
    Permission.ASSIGN_TEAM_MEMBER,
    Permission.REMOVE_TEAM_MEMBER,
    Permission.UPLOAD_BIM_MODEL,
    Permission.READ_BIM_MODEL,
    Permission.DELETE_BIM_MODEL,
    Permission.CALCULATE_QUANTITIES,
    Permission.READ_QUANTITIES,
    Permission.UPDATE_QUANTITIES,
    Permission.CREATE_COST_ESTIMATE,
    Permission.READ_COST_ESTIMATE,
    Permission.UPDATE_COST_ESTIMATE,
    Permission.APPROVE_COST_ESTIMATE,
    Permission.GENERATE_REPORT,
    Permission.EXPORT_REPORT,
  ],
  quantity_surveyor: [
    Permission.READ_USER,
    Permission.READ_PROJECT,
    Permission.UPLOAD_BIM_MODEL,
    Permission.READ_BIM_MODEL,
    Permission.CALCULATE_QUANTITIES,
    Permission.READ_QUANTITIES,
    Permission.UPDATE_QUANTITIES,
    Permission.CREATE_COST_ESTIMATE,
    Permission.READ_COST_ESTIMATE,
    Permission.UPDATE_COST_ESTIMATE,
    Permission.GENERATE_REPORT,
    Permission.EXPORT_REPORT,
  ],
  viewer: [
    Permission.READ_USER,
    Permission.READ_PROJECT,
    Permission.READ_BIM_MODEL,
    Permission.READ_QUANTITIES,
    Permission.READ_COST_ESTIMATE,
    Permission.GENERATE_REPORT,
    Permission.EXPORT_REPORT,
  ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = rolePermissions[role];
  return permissions.includes(permission);
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission));
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission));
}

/**
 * Middleware to require specific permissions
 */
export const requirePermission = (...permissions: Permission[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
          path: req.path,
        },
      });
    }

    const userRole = req.user.role as UserRole;

    // Check if user has required permissions
    const hasRequiredPermissions = permissions.every(permission =>
      hasPermission(userRole, permission)
    );

    if (!hasRequiredPermissions) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
          details: {
            required: permissions,
            userRole,
          },
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
          path: req.path,
        },
      });
    }

    next();
  };
};

/**
 * Middleware to require any of the specified permissions
 */
export const requireAnyPermission = (...permissions: Permission[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
          path: req.path,
        },
      });
    }

    const userRole = req.user.role as UserRole;

    // Check if user has any of the required permissions
    const hasAnyRequiredPermission = permissions.some(permission =>
      hasPermission(userRole, permission)
    );

    if (!hasAnyRequiredPermission) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
          details: {
            requiredAny: permissions,
            userRole,
          },
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
          path: req.path,
        },
      });
    }

    next();
  };
};

/**
 * Middleware to require specific role(s)
 */
export const requireRole = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
          path: req.path,
        },
      });
    }

    const userRole = req.user.role as UserRole;

    // Check if user has required role
    if (!roles.includes(userRole)) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
          details: {
            required: roles,
            userRole,
          },
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
          path: req.path,
        },
      });
    }

    next();
  };
};

/**
 * Resource-level access check helper
 * This can be used in route handlers to check if a user has access to a specific resource
 */
export interface ResourceAccessCheck {
  userId: string;
  resourceOwnerId?: string;
  projectTeamMembers?: string[];
  organizationId?: string;
}

export function canAccessResource(
  userRole: UserRole,
  userId: string,
  check: ResourceAccessCheck
): boolean {
  // Admins can access everything
  if (userRole === 'admin') {
    return true;
  }

  // User can access their own resources
  if (check.resourceOwnerId && check.resourceOwnerId === userId) {
    return true;
  }

  // User can access resources if they're part of the project team
  if (check.projectTeamMembers && check.projectTeamMembers.includes(userId)) {
    return true;
  }

  // Additional organization-level checks can be added here

  return false;
}

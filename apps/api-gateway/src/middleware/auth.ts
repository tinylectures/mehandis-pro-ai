import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

export const authenticate = (authService: AuthService) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Get token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Missing or invalid authorization header',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown',
            path: req.path,
          },
        });
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Validate token
      const payload = await authService.validateToken(token);

      // Attach user info to request
      req.user = {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
      };

      next();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication failed';
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message,
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
          path: req.path,
        },
      });
    }
  };
};

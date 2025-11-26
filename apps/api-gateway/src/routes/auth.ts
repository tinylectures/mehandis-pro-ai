import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthService } from '../services/AuthService';
import { UserCreate } from '../models/User';

export const createAuthRouter = (authService: AuthService): Router => {
  const router = Router();

  // Register endpoint
  router.post(
    '/register',
    [
      body('email').isEmail().withMessage('Valid email is required'),
      body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
      body('firstName').notEmpty().withMessage('First name is required'),
      body('lastName').notEmpty().withMessage('Last name is required'),
      body('role').isIn(['admin', 'project_manager', 'quantity_surveyor', 'viewer']).withMessage('Valid role is required'),
      body('organizationId').isUUID().withMessage('Valid organization ID is required'),
    ],
    async (req: Request, res: Response) => {
      try {
        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(422).json({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid input data',
              details: errors.array(),
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id'] || 'unknown',
              path: req.path,
            },
          });
        }

        const userData: UserCreate = {
          email: req.body.email,
          password: req.body.password,
          firstName: req.body.firstName,
          lastName: req.body.lastName,
          role: req.body.role,
          organizationId: req.body.organizationId,
        };

        const user = await authService.register(userData);

        // Return user without password
        const { passwordHash, ...userPublic } = user;

        res.status(201).json({
          data: userPublic,
          message: 'User registered successfully',
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Registration failed';
        const statusCode = message.includes('already exists') ? 409 : 500;

        res.status(statusCode).json({
          error: {
            code: statusCode === 409 ? 'CONFLICT' : 'INTERNAL_ERROR',
            message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown',
            path: req.path,
          },
        });
      }
    }
  );

  // Login endpoint
  router.post(
    '/login',
    [
      body('email').isEmail().withMessage('Valid email is required'),
      body('password').notEmpty().withMessage('Password is required'),
    ],
    async (req: Request, res: Response) => {
      try {
        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(422).json({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid input data',
              details: errors.array(),
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id'] || 'unknown',
              path: req.path,
            },
          });
        }

        const credentials = {
          email: req.body.email,
          password: req.body.password,
        };

        const authToken = await authService.login(credentials);

        res.json({
          data: authToken,
          message: 'Login successful',
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Login failed';
        const statusCode = message.includes('Invalid credentials') || message.includes('inactive') ? 401 : 500;

        res.status(statusCode).json({
          error: {
            code: statusCode === 401 ? 'UNAUTHORIZED' : 'INTERNAL_ERROR',
            message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown',
            path: req.path,
          },
        });
      }
    }
  );

  // Refresh token endpoint
  router.post(
    '/refresh',
    [body('refreshToken').notEmpty().withMessage('Refresh token is required')],
    async (req: Request, res: Response) => {
      try {
        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(422).json({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid input data',
              details: errors.array(),
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id'] || 'unknown',
              path: req.path,
            },
          });
        }

        const authToken = await authService.refreshToken(req.body.refreshToken);

        res.json({
          data: authToken,
          message: 'Token refreshed successfully',
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Token refresh failed';

        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown',
            path: req.path,
          },
        });
      }
    }
  );

  // Request password reset endpoint
  router.post(
    '/password-reset/request',
    [body('email').isEmail().withMessage('Valid email is required')],
    async (req: Request, res: Response) => {
      try {
        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(422).json({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid input data',
              details: errors.array(),
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id'] || 'unknown',
              path: req.path,
            },
          });
        }

        const resetToken = await authService.requestPasswordReset(req.body.email);

        // In production, this would send an email
        // For now, return the token (only for development/testing)
        res.json({
          message: 'If the email exists, a password reset link has been sent',
          // Remove this in production:
          resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Password reset request failed';

        res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown',
            path: req.path,
          },
        });
      }
    }
  );

  // Reset password endpoint
  router.post(
    '/password-reset/confirm',
    [
      body('token').notEmpty().withMessage('Reset token is required'),
      body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    ],
    async (req: Request, res: Response) => {
      try {
        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(422).json({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid input data',
              details: errors.array(),
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id'] || 'unknown',
              path: req.path,
            },
          });
        }

        await authService.resetPassword(req.body.token, req.body.newPassword);

        res.json({
          message: 'Password reset successfully',
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Password reset failed';

        res.status(400).json({
          error: {
            code: 'BAD_REQUEST',
            message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown',
            path: req.path,
          },
        });
      }
    }
  );

  // Change password endpoint (requires authentication)
  router.post(
    '/password/change',
    [
      body('oldPassword').notEmpty().withMessage('Current password is required'),
      body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
    ],
    async (req: Request, res: Response) => {
      try {
        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(422).json({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid input data',
              details: errors.array(),
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id'] || 'unknown',
              path: req.path,
            },
          });
        }

        // This would normally require authentication middleware
        // For now, we'll require userId in the body
        if (!req.body.userId) {
          return res.status(401).json({
            error: {
              code: 'UNAUTHORIZED',
              message: 'User ID is required',
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id'] || 'unknown',
              path: req.path,
            },
          });
        }

        await authService.changePassword(
          req.body.userId,
          req.body.oldPassword,
          req.body.newPassword
        );

        res.json({
          message: 'Password changed successfully',
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Password change failed';
        const statusCode = message.includes('incorrect') ? 401 : 500;

        res.status(statusCode).json({
          error: {
            code: statusCode === 401 ? 'UNAUTHORIZED' : 'INTERNAL_ERROR',
            message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown',
            path: req.path,
          },
        });
      }
    }
  );

  // Logout endpoint
  router.post(
    '/logout',
    [body('userId').notEmpty().withMessage('User ID is required')],
    async (req: Request, res: Response) => {
      try {
        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(422).json({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid input data',
              details: errors.array(),
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id'] || 'unknown',
              path: req.path,
            },
          });
        }

        await authService.logout(req.body.userId, req.body.sessionId);

        res.json({
          message: 'Logged out successfully',
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Logout failed';

        res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown',
            path: req.path,
          },
        });
      }
    }
  );

  // Get active sessions endpoint
  router.get(
    '/sessions/:userId',
    async (req: Request, res: Response) => {
      try {
        const sessions = await authService.getActiveSessions(req.params.userId);

        res.json({
          data: sessions,
          message: 'Active sessions retrieved successfully',
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to retrieve sessions';

        res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown',
            path: req.path,
          },
        });
      }
    }
  );

  return router;
};

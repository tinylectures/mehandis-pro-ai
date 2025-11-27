import { Request, Response, NextFunction } from 'express';

/**
 * Error response interface
 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId: string;
    path: string;
  };
}

/**
 * Custom error class for application errors
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handling middleware
 * Must be registered after all routes
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log error for monitoring
  console.error('Error:', {
    name: err.name,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Handle AppError instances
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown',
        path: req.path,
      },
    } as ErrorResponse);
    return;
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown',
        path: req.path,
      },
    } as ErrorResponse);
    return;
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown',
        path: req.path,
      },
    } as ErrorResponse);
    return;
  }

  // Handle database errors
  if (err.message.includes('duplicate key') || err.message.includes('unique constraint')) {
    res.status(409).json({
      error: {
        code: 'CONFLICT',
        message: 'Resource already exists',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown',
        path: req.path,
      },
    } as ErrorResponse);
    return;
  }

  // Default to 500 Internal Server Error
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : err.message,
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] as string || 'unknown',
      path: req.path,
    },
  } as ErrorResponse);
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] as string || 'unknown',
      path: req.path,
    },
  } as ErrorResponse);
};

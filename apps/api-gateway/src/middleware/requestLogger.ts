import { Request, Response, NextFunction } from 'express';
import winston from 'winston';

/**
 * Configure Winston logger
 */
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'api-gateway' },
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write all logs to combined.log
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

/**
 * Request logging middleware
 * Logs all incoming requests with timing information
 */
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();
  
  // Generate or use existing request ID
  const requestId = (req.headers['x-request-id'] as string) || 
    `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Attach request ID to request headers for downstream use
  req.headers['x-request-id'] = requestId;

  // Log request
  logger.info('Incoming request', {
    requestId,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });

  // Capture response
  const originalSend = res.send;
  res.send = function (data: any): Response {
    const duration = Date.now() - startTime;
    
    logger.info('Request completed', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });

    return originalSend.call(this, data);
  };

  next();
};

/**
 * Request ID middleware
 * Ensures all requests have a unique request ID
 */
export const requestIdMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.headers['x-request-id']) {
    req.headers['x-request-id'] = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  next();
};

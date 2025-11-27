import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';
import { logger } from './requestLogger';

/**
 * Create Redis client for rate limiting
 */
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.on('error', (err) => {
  logger.error('Redis rate limiter error:', err);
});

// Connect to Redis
redisClient.connect().catch((err) => {
  logger.error('Failed to connect Redis for rate limiting:', err);
});

/**
 * Default rate limiter configuration
 * 100 requests per 15 minutes per IP
 */
export const defaultRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Using in-memory store for development (Redis optional)
  // store: new RedisStore({
  //   sendCommand: (...args: string[]) => redisClient.sendCommand(args),
  //   prefix: 'rl:default:',
  // }),
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });

    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown',
        path: req.path,
      },
    });
  },
});

/**
 * Strict rate limiter for authentication endpoints
 * 5 requests per 15 minutes per IP
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  // Using in-memory store for development (Redis optional)
  // store: new RedisStore({
  //   sendCommand: (...args: string[]) => redisClient.sendCommand(args),
  //   prefix: 'rl:auth:',
  // }),
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });

    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many authentication attempts, please try again later',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown',
        path: req.path,
      },
    });
  },
});

/**
 * API rate limiter for general API endpoints
 * 1000 requests per hour per IP
 */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // Limit each IP to 1000 requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  // Using in-memory store for development (Redis optional)
  // store: new RedisStore({
  //   sendCommand: (...args: string[]) => redisClient.sendCommand(args),
  //   prefix: 'rl:api:',
  // }),
  handler: (req, res) => {
    logger.warn('API rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });

    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'API rate limit exceeded, please try again later',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown',
        path: req.path,
      },
    });
  },
});

/**
 * File upload rate limiter
 * 10 uploads per hour per IP
 */
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 uploads per hour
  standardHeaders: true,
  legacyHeaders: false,
  // Using in-memory store for development (Redis optional)
  // store: new RedisStore({
  //   sendCommand: (...args: string[]) => redisClient.sendCommand(args),
  //   prefix: 'rl:upload:',
  // }),
  handler: (req, res) => {
    logger.warn('Upload rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });

    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Upload rate limit exceeded, please try again later',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown',
        path: req.path,
      },
    });
  },
});

/**
 * Create a custom rate limiter with specific configuration
 */
export const createRateLimiter = (options: {
  windowMs: number;
  max: number;
  prefix: string;
  message?: string;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    // Using in-memory store for development (Redis optional)
    // store: new RedisStore({
    //   sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    //   prefix: `rl:${options.prefix}:`,
    // }),
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for ${options.prefix}`, {
        ip: req.ip,
        path: req.path,
        method: req.method,
      });

      res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: options.message || 'Rate limit exceeded, please try again later',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
          path: req.path,
        },
      });
    },
  });
};

export { redisClient as rateLimiterRedisClient };

import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import db from './database/db';
import { UserRepository } from './repositories/UserRepository';
import { AuditLogRepository } from './repositories/AuditLogRepository';
import { ProjectRepository } from './repositories/ProjectRepository';
import { VersionHistoryRepository } from './repositories/VersionHistoryRepository';
import { CommentRepository } from './repositories/CommentRepository';
import { AuthService } from './services/AuthService';
import { SessionService } from './services/SessionService';
import { AuditLogService } from './services/AuditLogService';
import { ProjectService } from './services/ProjectService';
import { CollaborationService } from './services/CollaborationService';
import { CommentService } from './services/CommentService';
import { createAuthRouter } from './routes/auth';
import { createProjectRouter } from './routes/projects';
import createQuantityRouter from './routes/quantities';
import riskRouter from './routes/risk';
import { createCommentRouter } from './routes/comments';
import { authenticate } from './middleware/auth';
import { createAuditLoggerMiddleware } from './middleware/auditLogger';
import { requestLogger, requestIdMiddleware, logger } from './middleware/requestLogger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { defaultRateLimiter, authRateLimiter } from './middleware/rateLimiter';
import { setupSwagger } from './config/swagger';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 4000;

// Security middleware
app.use(helmet());
app.use(cors());

// Request parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request ID and logging middleware
app.use(requestIdMiddleware);
app.use(requestLogger);

// Initialize repositories and services
const userRepository = new UserRepository(db);
const auditLogRepository = new AuditLogRepository(db);
const projectRepository = new ProjectRepository(db);
const versionHistoryRepository = new VersionHistoryRepository(db);
const commentRepository = new CommentRepository(db);
const sessionService = new SessionService();
const authService = new AuthService(userRepository, sessionService);
const auditLogService = new AuditLogService(auditLogRepository);
const projectService = new ProjectService(projectRepository, versionHistoryRepository);

// Initialize collaboration service with Socket.io
const collaborationService = new CollaborationService(httpServer, authService);

// Initialize comment service with collaboration support
const commentService = new CommentService(commentRepository, collaborationService);

// Apply default rate limiting to all routes
app.use(defaultRateLimiter);

// Audit logging middleware (after authentication would be set up)
app.use(createAuditLoggerMiddleware(auditLogService));

// Initialize Redis connection
sessionService.connect().catch(err => {
  logger.error('Failed to connect to Redis:', err);
});

// Setup Swagger documentation
setupSwagger(app);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'api-gateway', timestamp: new Date().toISOString() });
});

// Serve demo UI
app.get('/', (_req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ConstructAI - API Gateway</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            max-width: 600px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            text-align: center;
        }
        h1 {
            color: #667eea;
            margin-bottom: 20px;
        }
        .status {
            display: inline-block;
            background: #4caf50;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            margin: 20px 0;
            font-weight: 600;
        }
        .links {
            margin-top: 30px;
        }
        .link-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 24px;
            border-radius: 6px;
            text-decoration: none;
            margin: 10px;
            font-weight: 600;
            transition: transform 0.2s;
        }
        .link-button:hover {
            transform: translateY(-2px);
        }
        .info {
            margin-top: 30px;
            padding: 20px;
            background: #f5f5f5;
            border-radius: 8px;
            text-align: left;
        }
        .info h3 {
            color: #667eea;
            margin-bottom: 10px;
        }
        .info ul {
            margin-left: 20px;
        }
        .info li {
            margin: 8px 0;
        }
        code {
            background: #e0e0e0;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏗️ ConstructAI API Gateway</h1>
        <div class="status">✓ Server Online</div>
        
        <div class="info">
            <h3>Available Endpoints:</h3>
            <ul>
                <li><code>GET /health</code> - Health check</li>
                <li><code>GET /api-docs</code> - API Documentation (Swagger)</li>
                <li><code>POST /api/auth/register</code> - Register user</li>
                <li><code>POST /api/auth/login</code> - Login</li>
                <li><code>GET /api/projects</code> - List projects</li>
                <li><code>POST /api/quantities/calculate/:modelId</code> - Calculate quantities</li>
            </ul>
        </div>
        
        <div class="links">
            <a href="/api-docs" class="link-button">📚 View API Docs</a>
            <a href="/health" class="link-button">💚 Health Check</a>
        </div>
        
        <p style="margin-top: 30px; color: #666;">
            Server running on <strong>http://localhost:4000</strong>
        </p>
    </div>
</body>
</html>
  `);
});

// API routes
// Apply stricter rate limiting to auth endpoints
app.use('/api/auth', authRateLimiter, createAuthRouter(authService));
app.use('/api/projects', createProjectRouter(projectService));
app.use('/api/quantities', createQuantityRouter(authService));
app.use('/api/risk', riskRouter);
app.use('/api/comments', createCommentRouter(commentService, authenticate(authService)));

// 404 handler - must be after all routes
app.use(notFoundHandler);

// Global error handler - must be last
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing connections...');
  await sessionService.disconnect();
  process.exit(0);
});

httpServer.listen(PORT, () => {
  logger.info(`API Gateway running on port ${PORT}`);
  logger.info(`WebSocket server ready for connections`);
});

export default app;
export { authService, sessionService, auditLogService, collaborationService, commentService, logger };

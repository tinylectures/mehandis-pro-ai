import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import db from './database/db';
import { UserRepository } from './repositories/UserRepository';
import { AuthService } from './services/AuthService';
import { SessionService } from './services/SessionService';
import { createAuthRouter } from './routes/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Initialize repositories and services
const userRepository = new UserRepository(db);
const sessionService = new SessionService();
const authService = new AuthService(userRepository, sessionService);

// Initialize Redis connection
sessionService.connect().catch(err => {
  console.error('Failed to connect to Redis:', err);
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'api-gateway' });
});

// Auth routes
app.use('/api/auth', createAuthRouter(authService));

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing connections...');
  await sessionService.disconnect();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});

export default app;
export { authService, sessionService };

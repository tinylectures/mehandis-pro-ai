# Development Guide

## Project Setup

This monorepo uses:
- **Turborepo** for build orchestration
- **npm workspaces** for dependency management
- **TypeScript** for type safety
- **ESLint** and **Prettier** for code quality
- **Husky** for Git hooks
- **Docker** for containerization

## Directory Structure

```
construct-ai-platform/
├── apps/
│   ├── web/                    # React frontend (Vite + TypeScript)
│   │   ├── src/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vite.config.ts
│   └── api-gateway/            # Express.js API Gateway
│       ├── src/
│       ├── package.json
│       └── tsconfig.json
├── services/
│   ├── bim-processor/          # Python FastAPI - BIM processing
│   │   ├── main.py
│   │   └── requirements.txt
│   └── ai-ml/                  # Python FastAPI - AI/ML
│       ├── main.py
│       └── requirements.txt
├── packages/                   # Shared packages (future)
├── .github/workflows/          # CI/CD pipelines
├── docker-compose.yml
├── turbo.json
└── package.json
```

## Development Workflow

### 1. Initial Setup

```bash
# Install Node.js dependencies
npm install

# Set up Git hooks
npm run prepare

# Copy environment files
cp apps/api-gateway/.env.example apps/api-gateway/.env
cp services/bim-processor/.env.example services/bim-processor/.env
cp services/ai-ml/.env.example services/ai-ml/.env
```

### 2. Start Development Environment

**Option A: Docker (Recommended)**
```bash
docker-compose up
```

**Option B: Native**
```bash
# Terminal 1: Start databases
docker-compose up postgres redis

# Terminal 2: Start all services
npm run dev
```

### 3. Running Tests

```bash
# Run all tests
npm run test

# Run tests for specific workspace
npm run test --workspace=@construct-ai/api-gateway

# Run Python tests
cd services/bim-processor && pytest
cd services/ai-ml && pytest
```

### 4. Code Quality

```bash
# Lint all code
npm run lint

# Format all code
npm run format

# Type check
npm run type-check
```

## Adding New Services

### Node.js Service

1. Create directory under `apps/` or `packages/`
2. Add `package.json` with workspace reference
3. Add `tsconfig.json` extending `tsconfig.base.json`
4. Update root `package.json` workspaces if needed

### Python Service

1. Create directory under `services/`
2. Add `requirements.txt`
3. Add `main.py` with FastAPI app
4. Add Dockerfile
5. Update `docker-compose.yml`

## Environment Variables

### API Gateway
- `PORT` - Server port (default: 4000)
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - Secret for JWT signing
- `JWT_EXPIRES_IN` - Token expiration time

### BIM Processor
- `PORT` - Server port (default: 5000)
- `API_GATEWAY_URL` - API Gateway URL

### AI/ML Service
- `PORT` - Server port (default: 5001)
- `API_GATEWAY_URL` - API Gateway URL

## Database Migrations

Database migrations will be handled using a migration tool (to be set up in future tasks).

## Troubleshooting

### Port Already in Use
```bash
# Find process using port
lsof -i :4000  # macOS/Linux
netstat -ano | findstr :4000  # Windows

# Kill process
kill -9 <PID>
```

### Docker Issues
```bash
# Clean up Docker
docker-compose down -v
docker system prune -a

# Rebuild images
docker-compose build --no-cache
```

### Node Modules Issues
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

## CI/CD

The project uses GitHub Actions for CI/CD:

- **CI Pipeline** (`.github/workflows/ci.yml`)
  - Runs on push and PR
  - Linting, formatting, type checking
  - Unit tests for all services
  - Docker build test

- **CD Pipeline** (`.github/workflows/cd.yml`)
  - Runs on main branch push
  - Builds and deploys to production
  - Pushes Docker images to registry

## Best Practices

1. **Commits**: Use conventional commits (feat:, fix:, docs:, etc.)
2. **Branches**: Create feature branches from `develop`
3. **PRs**: Ensure all checks pass before merging
4. **Tests**: Write tests for new features
5. **Types**: Use TypeScript types, avoid `any`
6. **Formatting**: Let Prettier handle formatting
7. **Linting**: Fix ESLint warnings before committing

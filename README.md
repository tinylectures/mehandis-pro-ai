# ConstructAI Platform

Enterprise construction quantity surveying automation platform with BIM integration, AI-powered validation, and real-time collaboration.

## Architecture

This is a monorepo containing:

- **apps/web** - React frontend application
- **apps/api-gateway** - Express.js API Gateway
- **services/bim-processor** - Python FastAPI microservice for BIM processing
- **services/ai-ml** - Python FastAPI microservice for AI/ML operations

## Prerequisites

- Node.js 20+
- Python 3.11+
- Docker and Docker Compose
- PostgreSQL 15+ with PostGIS
- Redis 7+

## Getting Started

### Local Development (Docker)

1. Clone the repository:
```bash
git clone <repository-url>
cd construct-ai-platform
```

2. Start all services with Docker Compose:
```bash
docker-compose up
```

Services will be available at:
- Frontend: http://localhost:3000
- API Gateway: http://localhost:4000
- BIM Processor: http://localhost:5000
- AI/ML Service: http://localhost:5001
- PostgreSQL: localhost:5432
- Redis: localhost:6379

### Local Development (Native)

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp apps/api-gateway/.env.example apps/api-gateway/.env
cp services/bim-processor/.env.example services/bim-processor/.env
cp services/ai-ml/.env.example services/ai-ml/.env
```

3. Start PostgreSQL and Redis:
```bash
docker-compose up postgres redis
```

4. Start all services:
```bash
npm run dev
```

## Available Scripts

- `npm run dev` - Start all services in development mode
- `npm run build` - Build all services
- `npm run test` - Run all tests
- `npm run lint` - Lint all code
- `npm run format` - Format all code with Prettier
- `npm run type-check` - Run TypeScript type checking

## Project Structure

```
construct-ai-platform/
├── apps/
│   ├── web/                 # React frontend
│   └── api-gateway/         # Express.js API
├── services/
│   ├── bim-processor/       # BIM processing microservice
│   └── ai-ml/               # AI/ML microservice
├── packages/                # Shared packages (future)
├── .github/
│   └── workflows/           # CI/CD pipelines
├── docker-compose.yml       # Docker orchestration
└── turbo.json              # Turborepo configuration
```

## Technology Stack

### Frontend
- React 18 with TypeScript
- Material-UI (MUI)
- Redux Toolkit
- Three.js for 3D visualization
- Socket.io for real-time features

### Backend
- Node.js 20 with Express
- PostgreSQL 15 with PostGIS
- Redis 7
- Socket.io for WebSockets
- JWT authentication

### Microservices
- Python 3.11 with FastAPI
- TensorFlow for AI/ML
- IfcOpenShell for IFC processing
- OpenCV for computer vision

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linting
4. Submit a pull request

## License

Proprietary - All rights reserved

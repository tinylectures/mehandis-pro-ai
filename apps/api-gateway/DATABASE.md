# Database Setup Guide

## Overview

The ConstructAI platform uses PostgreSQL with PostGIS extension for spatial data support. The database layer is implemented using Knex.js for migrations and query building, with a repository pattern for data access.

## Prerequisites

- PostgreSQL 15+ installed
- PostGIS extension available
- Node.js 20+ with npm

## Database Configuration

### Environment Variables

Create a `.env` file in the `apps/api-gateway` directory:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=construct_ai_dev
DB_USER=postgres
DB_PASSWORD=postgres
```

### Database Creation

```bash
# Create the database
createdb construct_ai_dev

# Or using psql
psql -U postgres -c "CREATE DATABASE construct_ai_dev;"
```

## Running Migrations

### Apply Migrations

```bash
cd apps/api-gateway
npm run migrate:latest
```

### Rollback Migrations

```bash
npm run migrate:rollback
```

### Create New Migration

```bash
npm run migrate:make migration_name
```

## Database Schema

### Core Tables

1. **organizations** - Organization/company information
2. **users** - User accounts with authentication
3. **projects** - Construction projects
4. **project_team_members** - Project access control
5. **bim_models** - BIM model metadata
6. **elements** - BIM elements with geometry
7. **quantities** - Calculated quantities
8. **cost_items** - Cost line items
9. **cost_estimates** - Cost estimate summaries
10. **comments** - User comments and annotations
11. **audit_logs** - Audit trail for sensitive operations

### Extensions

- **PostGIS** - Spatial data support for geographic queries
- **uuid-ossp** - UUID generation for primary keys

## Repository Pattern

All data access is implemented through repository classes:

### Available Repositories

- `OrganizationRepository` - Organization CRUD operations
- `UserRepository` - User management and authentication
- `ProjectRepository` - Project and team management
- `BIMModelRepository` - BIM model tracking
- `ElementRepository` - BIM element storage
- `QuantityRepository` - Quantity calculations
- `CostRepository` - Cost items and estimates

### Usage Example

```typescript
import db from './database/db';
import { UserRepository } from './repositories/UserRepository';

const userRepo = new UserRepository(db);

// Create a user
const user = await userRepo.create({
  email: 'user@example.com',
  password: 'securepassword',
  firstName: 'John',
  lastName: 'Doe',
  role: 'quantity_surveyor',
  organizationId: 'org-uuid',
});

// Find by email
const foundUser = await userRepo.findByEmail('user@example.com');
```

## Testing

Run database-related tests:

```bash
npm test
```

Note: Integration tests that require a live database connection should be run separately with a test database configured.

## Performance Considerations

### Indexes

The migration creates indexes on frequently queried columns:
- Organization IDs
- User emails
- Project status
- Element categories
- CSI codes
- Audit log timestamps

### Connection Pooling

Knex is configured with connection pooling:
- Development: 2-10 connections
- Production: 2-20 connections

## Troubleshooting

### PostGIS Extension Not Found

```bash
# Install PostGIS (Ubuntu/Debian)
sudo apt-get install postgresql-15-postgis-3

# Install PostGIS (macOS with Homebrew)
brew install postgis
```

### Migration Errors

If migrations fail, check:
1. Database connection settings in `.env`
2. PostgreSQL service is running
3. User has CREATE privileges
4. PostGIS extension is available

### Connection Issues

```bash
# Test PostgreSQL connection
psql -h localhost -U postgres -d construct_ai_dev

# Check PostgreSQL is running
sudo systemctl status postgresql  # Linux
brew services list                # macOS
```

## Production Deployment

For production:
1. Use environment-specific configuration
2. Enable SSL connections
3. Use managed PostgreSQL service (AWS RDS, Azure Database, etc.)
4. Configure automated backups
5. Set up read replicas for scaling
6. Monitor query performance

## Additional Resources

- [Knex.js Documentation](https://knexjs.org/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [PostGIS Documentation](https://postgis.net/documentation/)

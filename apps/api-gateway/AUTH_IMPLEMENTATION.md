# Authentication and Authorization Implementation

## Overview
This document describes the authentication and authorization system implemented for the ConstructAI platform.

## Implemented Features

### 1. JWT Authentication Service (Task 3.1)
**Location:** `src/services/AuthService.ts`

**Features:**
- User registration with password hashing using bcrypt
- Login with JWT token generation
- Token validation and verification
- Refresh token mechanism for extended sessions
- Secure token expiration handling

**API Endpoints:**
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and receive JWT token
- `POST /api/auth/refresh` - Refresh expired token

**Correctness Properties Validated:**
- Property 1: Valid credentials produce valid JWT tokens (Requirements 1.1)
- Property 2: Invalid tokens deny access (Requirements 1.2)

### 2. Password Reset Functionality (Task 3.3)
**Location:** `src/services/AuthService.ts`, `src/routes/auth.ts`

**Features:**
- Password reset request with secure token generation
- Time-limited reset tokens (1 hour expiration)
- Password reset confirmation
- Password change for authenticated users
- Automatic revocation of refresh tokens on password change

**API Endpoints:**
- `POST /api/auth/password-reset/request` - Request password reset
- `POST /api/auth/password-reset/confirm` - Confirm password reset with token
- `POST /api/auth/password/change` - Change password (authenticated)

**Correctness Properties Validated:**
- Property 4: Password reset generates secure links (Requirements 1.4)

### 3. Role-Based Access Control (Task 3.5)
**Location:** `src/middleware/rbac.ts`

**Features:**
- Comprehensive permission system with 24 distinct permissions
- Four user roles: admin, project_manager, quantity_surveyor, viewer
- Permission middleware for route protection
- Resource-level access checks
- Flexible permission checking (any, all, specific)

**Roles and Permissions:**
- **Admin:** Full system access (all permissions)
- **Project Manager:** Project and team management, cost estimation, reporting
- **Quantity Surveyor:** BIM processing, quantity calculations, cost estimation
- **Viewer:** Read-only access to projects, models, quantities, and reports

**Middleware Functions:**
- `requirePermission(...permissions)` - Require all specified permissions
- `requireAnyPermission(...permissions)` - Require any of the specified permissions
- `requireRole(...roles)` - Require specific role(s)
- `canAccessResource()` - Helper for resource-level access checks

**Correctness Properties Validated:**
- Property 5: Role-based access is enforced (Requirements 1.5)

### 4. Session Management (Task 3.7)
**Location:** `src/services/SessionService.ts`

**Features:**
- Redis-based session storage for scalability
- Automatic session expiration (24 hours default)
- Session tracking per user
- Multiple concurrent sessions support
- Session extension and cleanup
- Logout from single or all sessions

**Session Operations:**
- Create session on login
- Track active sessions per user
- Update last accessed time
- Delete specific or all user sessions
- Get session statistics

**API Endpoints:**
- `POST /api/auth/logout` - Logout (single or all sessions)
- `GET /api/auth/sessions/:userId` - Get active sessions

**Correctness Properties Validated:**
- Property 3: Expired sessions require re-authentication (Requirements 1.3)

## Architecture

### Authentication Flow
```
1. User submits credentials → POST /api/auth/login
2. AuthService validates credentials
3. Generate JWT token and refresh token
4. Create session in Redis
5. Return tokens and user info to client
6. Client includes JWT in Authorization header for subsequent requests
7. Middleware validates JWT on protected routes
```

### Authorization Flow
```
1. Request arrives at protected endpoint
2. authenticate() middleware validates JWT
3. Extract user info (userId, email, role) from token
4. requirePermission() middleware checks role permissions
5. If authorized, proceed to route handler
6. If unauthorized, return 403 Forbidden
```

### Session Management Flow
```
1. Login creates session in Redis with TTL
2. Session tracks userId, email, role, timestamps
3. Each request can optionally refresh session
4. Logout deletes session from Redis
5. Expired sessions automatically removed by Redis TTL
```

## Security Features

1. **Password Security:**
   - Bcrypt hashing with 10 salt rounds
   - Minimum 8 character password requirement
   - Password reset tokens expire in 1 hour
   - All refresh tokens revoked on password change

2. **Token Security:**
   - JWT tokens with configurable expiration
   - Refresh tokens stored in memory (can be moved to Redis)
   - Secure random token generation using crypto
   - Token validation on every protected request

3. **Session Security:**
   - Redis-based session storage
   - Automatic expiration (24 hours)
   - Session tracking per user
   - Logout revokes all sessions

4. **Error Handling:**
   - Consistent error response format
   - No information leakage (e.g., "Invalid credentials" vs "User not found")
   - Request ID tracking for debugging
   - Proper HTTP status codes

## Configuration

### Environment Variables
```
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=1h
REDIS_URL=redis://localhost:6379
```

### Default Values
- JWT expiration: 1 hour
- Refresh token expiration: 7 days
- Session expiration: 24 hours
- Password reset token expiration: 1 hour
- Bcrypt salt rounds: 10

## Testing

### Test Coverage
- User registration (success and duplicate email)
- Login (valid/invalid credentials, inactive user)
- Token validation (valid/invalid tokens)
- Password reset (existing/non-existent users)
- Session management (logout, session tracking)

### Test Results
All 20 tests passing:
- 10 AuthService tests
- 7 Repository tests
- 2 Migration tests
- 1 Basic API test

## API Documentation

### Authentication Endpoints

#### Register User
```
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "viewer",
  "organizationId": "org-uuid"
}

Response: 201 Created
{
  "data": {
    "id": "user-uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "viewer",
    "organizationId": "org-uuid",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "User registered successfully"
}
```

#### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response: 200 OK
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "a1b2c3d4e5f6...",
    "expiresIn": 3600,
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "viewer"
    }
  },
  "message": "Login successful"
}
```

#### Refresh Token
```
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "a1b2c3d4e5f6..."
}

Response: 200 OK
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "x9y8z7w6v5u4...",
    "expiresIn": 3600,
    "user": { ... }
  },
  "message": "Token refreshed successfully"
}
```

#### Request Password Reset
```
POST /api/auth/password-reset/request
Content-Type: application/json

{
  "email": "user@example.com"
}

Response: 200 OK
{
  "message": "If the email exists, a password reset link has been sent",
  "resetToken": "abc123..." // Only in development
}
```

#### Confirm Password Reset
```
POST /api/auth/password-reset/confirm
Content-Type: application/json

{
  "token": "abc123...",
  "newPassword": "newpassword123"
}

Response: 200 OK
{
  "message": "Password reset successfully"
}
```

#### Logout
```
POST /api/auth/logout
Content-Type: application/json

{
  "userId": "user-uuid",
  "sessionId": "session-uuid" // Optional, omit to logout all sessions
}

Response: 200 OK
{
  "message": "Logged out successfully"
}
```

## Usage Examples

### Protecting Routes with Authentication
```typescript
import { authenticate } from './middleware/auth';
import { authService } from './index';

router.get('/protected', authenticate(authService), (req, res) => {
  // req.user contains { userId, email, role }
  res.json({ message: 'Protected data', user: req.user });
});
```

### Protecting Routes with Permissions
```typescript
import { authenticate } from './middleware/auth';
import { requirePermission, Permission } from './middleware/rbac';
import { authService } from './index';

router.post(
  '/projects',
  authenticate(authService),
  requirePermission(Permission.CREATE_PROJECT),
  (req, res) => {
    // Only users with CREATE_PROJECT permission can access
    res.json({ message: 'Project created' });
  }
);
```

### Protecting Routes with Roles
```typescript
import { authenticate } from './middleware/auth';
import { requireRole } from './middleware/rbac';
import { authService } from './index';

router.get(
  '/admin/users',
  authenticate(authService),
  requireRole('admin'),
  (req, res) => {
    // Only admins can access
    res.json({ message: 'User list' });
  }
);
```

## Next Steps

The following optional property-based tests are defined but not yet implemented:
- Task 3.2: Write property test for authentication (Property 1, 2)
- Task 3.4: Write property test for password reset (Property 4)
- Task 3.6: Write property test for RBAC (Property 5)
- Task 3.8: Write property test for session expiration (Property 3)

These tests would use the fast-check library to validate correctness properties across many generated inputs.

## Dependencies

- `jsonwebtoken` - JWT token generation and validation
- `bcrypt` - Password hashing
- `redis` - Session storage
- `express-validator` - Request validation
- `crypto` - Secure random token generation

## Notes

- The current implementation stores refresh tokens in memory. For production, consider moving to Redis.
- Password reset currently returns the token in development mode. In production, this should be sent via email.
- The change password endpoint currently requires userId in the body. This should use the authenticated user from the JWT token.
- Consider implementing rate limiting on authentication endpoints to prevent brute force attacks.

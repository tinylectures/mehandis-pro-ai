import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

/**
 * OpenAPI 3.0 specification for ConstructAI API
 */
const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'ConstructAI API',
    version: '1.0.0',
    description: 'Enterprise construction quantity surveying automation platform API',
    contact: {
      name: 'ConstructAI Support',
      email: 'support@constructai.com',
    },
    license: {
      name: 'Proprietary',
    },
  },
  servers: [
    {
      url: process.env.API_URL || 'http://localhost:4000',
      description: 'API Gateway',
    },
  ],
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and authorization endpoints',
    },
    {
      name: 'Projects',
      description: 'Project management endpoints',
    },
    {
      name: 'BIM Models',
      description: 'BIM model upload and processing endpoints',
    },
    {
      name: 'Quantities',
      description: 'Quantity takeoff and calculation endpoints',
    },
    {
      name: 'Costs',
      description: 'Cost estimation endpoints',
    },
    {
      name: 'Reports',
      description: 'Report generation and export endpoints',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtained from login endpoint',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                example: 'VALIDATION_ERROR',
              },
              message: {
                type: 'string',
                example: 'Invalid input data',
              },
              details: {
                type: 'object',
              },
              timestamp: {
                type: 'string',
                format: 'date-time',
              },
              requestId: {
                type: 'string',
              },
              path: {
                type: 'string',
              },
            },
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
          email: {
            type: 'string',
            format: 'email',
          },
          firstName: {
            type: 'string',
          },
          lastName: {
            type: 'string',
          },
          role: {
            type: 'string',
            enum: ['admin', 'project_manager', 'quantity_surveyor', 'viewer'],
          },
          organizationId: {
            type: 'string',
            format: 'uuid',
          },
          isActive: {
            type: 'boolean',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      AuthToken: {
        type: 'object',
        properties: {
          token: {
            type: 'string',
            description: 'JWT access token',
          },
          refreshToken: {
            type: 'string',
            description: 'Refresh token for obtaining new access tokens',
          },
          expiresIn: {
            type: 'number',
            description: 'Token expiration time in seconds',
          },
          user: {
            $ref: '#/components/schemas/User',
          },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        description: 'Check if the API is running',
        tags: ['System'],
        responses: {
          '200': {
            description: 'API is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      example: 'ok',
                    },
                    service: {
                      type: 'string',
                      example: 'api-gateway',
                    },
                    timestamp: {
                      type: 'string',
                      format: 'date-time',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/auth/register': {
      post: {
        summary: 'Register new user',
        description: 'Create a new user account',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'firstName', 'lastName', 'role', 'organizationId'],
                properties: {
                  email: {
                    type: 'string',
                    format: 'email',
                    example: 'user@example.com',
                  },
                  password: {
                    type: 'string',
                    minLength: 8,
                    example: 'SecurePassword123!',
                  },
                  firstName: {
                    type: 'string',
                    example: 'John',
                  },
                  lastName: {
                    type: 'string',
                    example: 'Doe',
                  },
                  role: {
                    type: 'string',
                    enum: ['admin', 'project_manager', 'quantity_surveyor', 'viewer'],
                    example: 'quantity_surveyor',
                  },
                  organizationId: {
                    type: 'string',
                    format: 'uuid',
                    example: '123e4567-e89b-12d3-a456-426614174000',
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'User registered successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      $ref: '#/components/schemas/User',
                    },
                    message: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
          '409': {
            description: 'User already exists',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
          '422': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
        },
      },
    },
    '/api/auth/login': {
      post: {
        summary: 'User login',
        description: 'Authenticate user and receive JWT token',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: {
                    type: 'string',
                    format: 'email',
                    example: 'user@example.com',
                  },
                  password: {
                    type: 'string',
                    example: 'SecurePassword123!',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      $ref: '#/components/schemas/AuthToken',
                    },
                    message: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Invalid credentials',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
          '422': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
        },
      },
    },
    '/api/auth/refresh': {
      post: {
        summary: 'Refresh access token',
        description: 'Get a new access token using refresh token',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: {
                  refreshToken: {
                    type: 'string',
                    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Token refreshed successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      $ref: '#/components/schemas/AuthToken',
                    },
                    message: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Invalid refresh token',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
        },
      },
    },
    '/api/auth/password-reset/request': {
      post: {
        summary: 'Request password reset',
        description: 'Send password reset link to user email',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: {
                  email: {
                    type: 'string',
                    format: 'email',
                    example: 'user@example.com',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Password reset email sent',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/auth/password-reset/confirm': {
      post: {
        summary: 'Confirm password reset',
        description: 'Reset password using reset token',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token', 'newPassword'],
                properties: {
                  token: {
                    type: 'string',
                    example: 'reset-token-here',
                  },
                  newPassword: {
                    type: 'string',
                    minLength: 8,
                    example: 'NewSecurePassword123!',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Password reset successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid or expired token',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
        },
      },
    },
    '/api/auth/logout': {
      post: {
        summary: 'User logout',
        description: 'Invalidate user session',
        tags: ['Authentication'],
        security: [
          {
            bearerAuth: [],
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['userId'],
                properties: {
                  userId: {
                    type: 'string',
                    format: 'uuid',
                  },
                  sessionId: {
                    type: 'string',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Logged out successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

/**
 * Configure Swagger UI for the Express app
 */
export const setupSwagger = (app: Express): void => {
  // Swagger UI options
  const options = {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'ConstructAI API Documentation',
  };

  // Serve Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, options));

  // Serve OpenAPI JSON
  app.get('/api-docs.json', (_req, res) => {
    res.json(swaggerDocument);
  });
};

export default swaggerDocument;

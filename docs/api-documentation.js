const fs = require('fs');
const path = require('path');

// API Documentation Generator
class APIDocumentationGenerator {
  constructor() {
    this.docs = {
      info: {
        title: 'Ticketing Platform API',
        version: '1.0.0',
        description: 'RESTful API for comprehensive ticketing and event management',
        contact: {
          name: 'Development Team',
          email: 'dev@ticketing-platform.com'
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT'
        }
      },
      servers: [
        {
          url: 'http://localhost:5000',
          description: 'Development server'
        },
        {
          url: 'https://api.ticketing-platform.com',
          description: 'Production server'
        }
      ],
      tags: [
        { name: 'Authentication', description: 'User authentication and authorization' },
        { name: 'Events', description: 'Event management operations' },
        { name: 'Orders', description: 'Order and ticket purchase operations' },
        { name: 'Users', description: 'User profile management' },
        { name: 'Admin', description: 'Administrative operations' },
        { name: 'Health', description: 'System health and monitoring' }
      ],
      paths: {},
      components: {
        schemas: {},
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          },
          apiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key'
          }
        },
        responses: {
          UnauthorizedError: {
            description: 'Access token is missing or invalid',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'Access token required' }
                  }
                }
              }
            }
          },
          ValidationError: {
            description: 'Request validation failed',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'Validation failed' },
                    errors: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          field: { type: 'string', example: 'email' },
                          message: { type: 'string', example: 'Valid email address is required' },
                          value: { type: 'string', example: 'invalid-email' }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          NotFoundError: {
            description: 'Resource not found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'Resource not found' }
                  }
                }
              }
            }
          }
        }
      }
    };
    
    this.defineSchemas();
    this.definePaths();
  }

  defineSchemas() {
    this.docs.components.schemas = {
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          email: { type: 'string', format: 'email', example: 'user@example.com' },
          firstName: { type: 'string', example: 'John' },
          lastName: { type: 'string', example: 'Doe' },
          role: { type: 'string', enum: ['customer', 'organizer', 'admin'], example: 'customer' },
          isVerified: { type: 'boolean', example: true },
          phone: { type: 'string', example: '+1234567890' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      Event: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          title: { type: 'string', example: 'Tech Conference 2024' },
          description: { type: 'string', example: 'Annual technology conference' },
          venue: { type: 'string', example: 'Convention Center' },
          address: { type: 'string', example: '123 Tech Street' },
          city: { type: 'string', example: 'San Francisco' },
          state: { type: 'string', example: 'California' },
          country: { type: 'string', example: 'USA' },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
          category: { type: 'string', enum: ['Technology', 'Business', 'Arts', 'Music', 'Sports', 'Education', 'Food', 'Health', 'Science', 'Entertainment', 'Other'] },
          status: { type: 'string', enum: ['draft', 'published', 'cancelled', 'completed'] },
          maxAttendees: { type: 'integer', example: 500 },
          imageUrl: { type: 'string', format: 'uri' },
          organizerId: { type: 'integer' },
          organizerName: { type: 'string', example: 'Event Organizer' },
          ticketTiersCount: { type: 'integer', example: 3 },
          totalTickets: { type: 'integer', example: 500 },
          soldTickets: { type: 'integer', example: 150 },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      TicketTier: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          eventId: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'General Admission' },
          description: { type: 'string', example: 'Standard conference ticket' },
          price: { type: 'number', format: 'decimal', example: 99.99 },
          quantity: { type: 'integer', example: 100 },
          soldQuantity: { type: 'integer', example: 25 },
          salesStartDate: { type: 'string', format: 'date-time' },
          salesEndDate: { type: 'string', format: 'date-time' },
          isActive: { type: 'boolean', example: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      Order: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          userId: { type: 'integer', example: 1 },
          eventId: { type: 'integer', example: 1 },
          orderNumber: { type: 'string', example: 'ORD-1234567890' },
          totalAmount: { type: 'number', format: 'decimal', example: 199.98 },
          status: { type: 'string', enum: ['pending', 'paid', 'cancelled', 'refunded'], example: 'paid' },
          billingEmail: { type: 'string', format: 'email' },
          billingName: { type: 'string', example: 'John Doe' },
          billingAddress: { type: 'string', example: '123 Main St' },
          billingCity: { type: 'string', example: 'New York' },
          billingState: { type: 'string', example: 'NY' },
          billingCountry: { type: 'string', example: 'USA' },
          billingPostalCode: { type: 'string', example: '10001' },
          stripePaymentIntentId: { type: 'string' },
          stripeSessionId: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      Ticket: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          orderId: { type: 'integer', example: 1 },
          ticketTierId: { type: 'integer', example: 1 },
          ticketCode: { type: 'string', example: 'TKT-ABC123' },
          attendeeName: { type: 'string', example: 'John Doe' },
          attendeeEmail: { type: 'string', format: 'email', example: 'john@example.com' },
          status: { type: 'string', enum: ['active', 'used', 'cancelled', 'refunded'], example: 'active' },
          usedAt: { type: 'string', format: 'date-time' },
          qrCode: { type: 'string', format: 'uri' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      AuthResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Login successful' },
          data: {
            type: 'object',
            properties: {
              user: { $ref: '#/components/schemas/User' },
              token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }
            }
          }
        }
      },
      SuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operation completed successfully' },
          data: { type: 'object' }
        }
      },
      PaginationResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              items: { type: 'array', items: {} },
              pagination: {
                type: 'object',
                properties: {
                  page: { type: 'integer', example: 1 },
                  limit: { type: 'integer', example: 10 },
                  total: { type: 'integer', example: 100 },
                  pages: { type: 'integer', example: 10 }
                }
              }
            }
          }
        }
      },
      HealthResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'OK' },
          timestamp: { type: 'string', format: 'date-time' },
          uptime: { type: 'number', example: 3600 },
          version: { type: 'string', example: '1.0.0' },
          environment: { type: 'string', example: 'production' },
          services: {
            type: 'object',
            properties: {
              database: { type: 'string', example: 'healthy' },
              redis: { type: 'string', example: 'healthy' },
              rabbitmq: { type: 'string', example: 'healthy' }
            }
          }
        }
      }
    };
  }

  definePaths() {
    this.docs.paths = {
      // Health Endpoints
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'Get system health status',
          description: 'Returns the current health status of the system and its dependencies',
          responses: {
            '200': {
              description: 'System health information',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/HealthResponse' }
                }
              }
            }
          }
        }
      },
      
      // Authentication Endpoints
      '/api/auth/register': {
        post: {
          tags: ['Authentication'],
          summary: 'Register a new user',
          description: 'Create a new user account with email verification',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password', 'firstName', 'lastName'],
                  properties: {
                    email: { type: 'string', format: 'email', example: 'user@example.com' },
                    password: { type: 'string', minLength: 8, example: 'SecurePass123!' },
                    firstName: { type: 'string', example: 'John' },
                    lastName: { type: 'string', example: 'Doe' },
                    phone: { type: 'string', example: '+1234567890' },
                    role: { type: 'string', enum: ['customer', 'organizer'], example: 'customer' }
                  }
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'User registered successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/AuthResponse' }
                }
              }
            },
            '400': { $ref: '#/components/responses/ValidationError' }
          }
        }
      },
      
      '/api/auth/login': {
        post: {
          tags: ['Authentication'],
          summary: 'Login user',
          description: 'Authenticate user and return JWT token',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email', example: 'user@example.com' },
                    password: { type: 'string', example: 'password123' }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Login successful',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/AuthResponse' }
                }
              }
            },
            '401': {
              description: 'Invalid credentials',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      message: { type: 'string', example: 'Invalid credentials' }
                    }
                  }
                }
              }
            },
            '429': {
              description: 'Too many login attempts',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      message: { type: 'string', example: 'Too many authentication attempts' },
                      type: { type: 'string', example: 'AUTH_LIMIT_EXCEEDED' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      
      '/api/auth/me': {
        get: {
          tags: ['Authentication'],
          summary: 'Get current user profile',
          description: 'Retrieve the authenticated user\'s profile information',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'User profile retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          user: { $ref: '#/components/schemas/User' }
                        }
                      }
                    }
                  }
                }
              }
            },
            '401': { $ref: '#/components/responses/UnauthorizedError' }
          }
        }
      },
      
      // Events Endpoints
      '/api/events': {
        get: {
          tags: ['Events'],
          summary: 'List all events',
          description: 'Retrieve a paginated list of published events with optional filtering',
          parameters: [
            {
              name: 'page',
              in: 'query',
              description: 'Page number for pagination',
              schema: { type: 'integer', minimum: 1, default: 1 }
            },
            {
              name: 'limit',
              in: 'query',
              description: 'Number of events per page',
              schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 }
            },
            {
              name: 'search',
              in: 'query',
              description: 'Search query for event title, description, or venue',
              schema: { type: 'string', maxLength: 200 }
            },
            {
              name: 'category',
              in: 'query',
              description: 'Filter by event category',
              schema: { type: 'string', enum: ['Technology', 'Business', 'Arts', 'Music', 'Sports', 'Education', 'Food', 'Health', 'Science', 'Entertainment', 'Other'] }
            },
            {
              name: 'city',
              in: 'query',
              description: 'Filter by city',
              schema: { type: 'string', maxLength: 100 }
            }
          ],
          responses: {
            '200': {
              description: 'Events retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          events: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Event' }
                          },
                          pagination: {
                            type: 'object',
                            properties: {
                              page: { type: 'integer', example: 1 },
                              limit: { type: 'integer', example: 10 },
                              total: { type: 'integer', example: 50 },
                              pages: { type: 'integer', example: 5 }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              },
              headers: {
                'X-Cache': {
                  description: 'Cache status (HIT or MISS)',
                  schema: { type: 'string', example: 'HIT' }
                },
                'Cache-Control': {
                  description: 'Cache control header',
                  schema: { type: 'string', example: 'public, max-age=300' }
                }
              }
            }
          }
        },
        
        post: {
          tags: ['Events'],
          summary: 'Create a new event',
          description: 'Create a new event (organizer or admin only)',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['title', 'description', 'venue', 'address', 'city', 'state', 'country', 'startDate', 'endDate', 'category'],
                  properties: {
                    title: { type: 'string', minLength: 3, maxLength: 200, example: 'Tech Conference 2024' },
                    description: { type: 'string', minLength: 10, maxLength: 5000, example: 'Annual technology conference featuring the latest innovations' },
                    venue: { type: 'string', minLength: 2, maxLength: 200, example: 'Convention Center' },
                    address: { type: 'string', minLength: 5, maxLength: 500, example: '123 Tech Street' },
                    city: { type: 'string', minLength: 2, maxLength: 100, example: 'San Francisco' },
                    state: { type: 'string', minLength: 2, maxLength: 100, example: 'California' },
                    country: { type: 'string', minLength: 2, maxLength: 100, example: 'USA' },
                    startDate: { type: 'string', format: 'date-time', example: '2024-06-15T09:00:00Z' },
                    endDate: { type: 'string', format: 'date-time', example: '2024-06-15T18:00:00Z' },
                    category: { type: 'string', enum: ['Technology', 'Business', 'Arts', 'Music', 'Sports', 'Education', 'Food', 'Health', 'Science', 'Entertainment', 'Other'] },
                    maxAttendees: { type: 'integer', minimum: 1, maximum: 100000, example: 500 },
                    imageUrl: { type: 'string', format: 'uri', example: 'https://example.com/event-image.jpg' }
                  }
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'Event created successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Event created successfully' },
                      data: {
                        type: 'object',
                        properties: {
                          eventId: { type: 'integer', example: 1 }
                        }
                      }
                    }
                  }
                }
              }
            },
            '400': { $ref: '#/components/responses/ValidationError' },
            '401': { $ref: '#/components/responses/UnauthorizedError' },
            '403': {
              description: 'Insufficient permissions',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      message: { type: 'string', example: 'Insufficient permissions' },
                      required: { type: 'array', items: { type: 'string' }, example: ['organizer', 'admin'] },
                      current: { type: 'string', example: 'customer' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    };
  }

  // Generate OpenAPI JSON
  generateJSON() {
    return JSON.stringify(this.docs, null, 2);
  }

  // Generate HTML documentation
  generateHTML() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.docs.info.title} - API Documentation</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css" />
    <style>
        html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
        *, *:before, *:after { box-sizing: inherit; }
        body { margin:0; background: #fafafa; }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-standalone-preset.js"></script>
    <script>
        window.onload = function() {
            const ui = SwaggerUIBundle({
                url: '/api/docs/openapi.json',
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "StandaloneLayout",
                validatorUrl: null,
                tryItOutEnabled: true,
                supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
                onComplete: function() {
                    console.log('Swagger UI loaded successfully');
                }
            });
        };
    </script>
</body>
</html>
    `.trim();
  }

  // Save documentation files
  async saveDocumentation(outputDir = path.join(__dirname, '../public/docs')) {
    try {
      // Ensure output directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Save OpenAPI JSON
      const jsonPath = path.join(outputDir, 'openapi.json');
      fs.writeFileSync(jsonPath, this.generateJSON());

      // Save HTML documentation
      const htmlPath = path.join(outputDir, 'index.html');
      fs.writeFileSync(htmlPath, this.generateHTML());

      // Save Markdown documentation
      const markdownPath = path.join(outputDir, 'README.md');
      fs.writeFileSync(markdownPath, this.generateMarkdown());

      console.log(`✅ API documentation saved to ${outputDir}`);
      console.log(`📄 OpenAPI JSON: ${jsonPath}`);
      console.log(`🌐 HTML docs: ${htmlPath}`);
      console.log(`📝 Markdown: ${markdownPath}`);

      return {
        json: jsonPath,
        html: htmlPath,
        markdown: markdownPath
      };
    } catch (error) {
      console.error('❌ Error saving documentation:', error);
      throw error;
    }
  }

  // Generate Markdown documentation
  generateMarkdown() {
    return `# ${this.docs.info.title}

${this.docs.info.description}

**Version:** ${this.docs.info.version}
**License:** ${this.docs.info.license.name}

## Base URLs

${this.docs.servers.map(server => `- **${server.description}**: \`${server.url}\``).join('\n')}

## Authentication

This API uses JWT Bearer tokens for authentication. Include the token in the Authorization header:

\`\`\`
Authorization: Bearer YOUR_JWT_TOKEN
\`\`\`

For admin endpoints, you may also need to provide an API key:

\`\`\`
X-API-Key: YOUR_API_KEY
\`\`\`

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **Authentication endpoints**: 5 requests per 15 minutes
- **Order endpoints**: 10 requests per minute
- **Search endpoints**: 50 requests per minute
- **General endpoints**: 100 requests per 15 minutes

## Response Format

All API responses follow a consistent format:

\`\`\`json
{
  "success": true|false,
  "message": "Human-readable message",
  "data": {
    // Response data
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
\`\`\`

## Error Handling

The API returns standard HTTP status codes:

- **200** - OK: Request successful
- **201** - Created: Resource created successfully
- **400** - Bad Request: Invalid request data
- **401** - Unauthorized: Authentication required
- **403** - Forbidden: Insufficient permissions
- **404** - Not Found: Resource not found
- **429** - Too Many Requests: Rate limit exceeded
- **500** - Internal Server Error: Server error

## Endpoints

### Authentication

#### POST /api/auth/register
Register a new user account.

**Request Body:**
\`\`\`json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "role": "customer"
}
\`\`\`

#### POST /api/auth/login
Authenticate user and receive JWT token.

**Request Body:**
\`\`\`json
{
  "email": "user@example.com",
  "password": "password123"
}
\`\`\`

#### GET /api/auth/me
Get current user profile (requires authentication).

### Events

#### GET /api/events
List published events with optional filtering and pagination.

**Query Parameters:**
- \`page\` (optional): Page number (default: 1)
- \`limit\` (optional): Items per page (default: 10, max: 100)
- \`search\` (optional): Search query
- \`category\` (optional): Event category
- \`city\` (optional): Filter by city

#### POST /api/events
Create a new event (organizer/admin only).

**Request Body:**
\`\`\`json
{
  "title": "Tech Conference 2024",
  "description": "Annual technology conference",
  "venue": "Convention Center",
  "address": "123 Tech Street",
  "city": "San Francisco",
  "state": "California",
  "country": "USA",
  "startDate": "2024-06-15T09:00:00Z",
  "endDate": "2024-06-15T18:00:00Z",
  "category": "Technology",
  "maxAttendees": 500
}
\`\`\`

### Orders

#### POST /api/orders
Create a new ticket order.

**Request Body:**
\`\`\`json
{
  "eventId": 1,
  "tickets": [
    {
      "tierId": 1,
      "quantity": 2,
      "attendeeName": "John Doe",
      "attendeeEmail": "john@example.com"
    }
  ],
  "billingEmail": "user@example.com",
  "billingName": "John Doe"
}
\`\`\`

#### GET /api/orders/my
Get user's order history (requires authentication).

### Health

#### GET /health
Get system health status.

## Data Models

### User
- \`id\`: Integer - Unique identifier
- \`email\`: String - User's email address
- \`firstName\`: String - User's first name
- \`lastName\`: String - User's last name
- \`role\`: Enum - User role (customer, organizer, admin)
- \`isVerified\`: Boolean - Email verification status
- \`phone\`: String - Phone number (optional)
- \`createdAt\`: DateTime - Account creation timestamp
- \`updatedAt\`: DateTime - Last update timestamp

### Event
- \`id\`: Integer - Unique identifier
- \`title\`: String - Event title
- \`description\`: String - Event description
- \`venue\`: String - Venue name
- \`address\`: String - Venue address
- \`city\`: String - Event city
- \`state\`: String - Event state/province
- \`country\`: String - Event country
- \`startDate\`: DateTime - Event start time
- \`endDate\`: DateTime - Event end time
- \`category\`: Enum - Event category
- \`status\`: Enum - Event status (draft, published, cancelled, completed)
- \`maxAttendees\`: Integer - Maximum number of attendees
- \`organizerId\`: Integer - Organizer user ID
- \`createdAt\`: DateTime - Creation timestamp
- \`updatedAt\`: DateTime - Last update timestamp

## Security Considerations

- All passwords are hashed using bcrypt with 12 salt rounds
- JWT tokens expire after 7 days by default
- API keys should be kept secure and rotated regularly
- Input validation is performed on all endpoints
- Rate limiting prevents abuse and DDoS attacks
- HTTPS should be used in production environments

## Support

For API support, please contact:
- Email: ${this.docs.info.contact.email}
- Documentation: Available at \`/api/docs\` endpoint
`;
  }
}

// Create documentation generator instance
const apiDocs = new APIDocumentationGenerator();

module.exports = {
  APIDocumentationGenerator,
  apiDocs
};
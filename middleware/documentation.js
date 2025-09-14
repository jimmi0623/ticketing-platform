const express = require('express');
const path = require('path');
const { apiDocs } = require('../docs/api-documentation');
const logger = require('../config/logger');

/**
 * Documentation Middleware
 * Serves OpenAPI documentation and Swagger UI interface
 */
class DocumentationMiddleware {
  constructor() {
    this.router = express.Router();
    this.setupRoutes();
  }

  /**
   * Setup documentation routes
   */
  setupRoutes() {
    // Serve OpenAPI JSON specification
    this.router.get('/openapi.json', this.serveOpenAPISpec.bind(this));
    
    // Serve Swagger UI HTML interface
    this.router.get('/', this.serveSwaggerUI.bind(this));
    this.router.get('/index.html', this.serveSwaggerUI.bind(this));
    
    // Serve API documentation as Markdown
    this.router.get('/README.md', this.serveMarkdownDocs.bind(this));
    
    // API health documentation endpoint
    this.router.get('/health', this.serveHealthDocs.bind(this));
    
    // Serve static assets for Swagger UI
    this.router.use('/static', express.static(path.join(__dirname, '../public/docs/static')));
    
    // Serve additional documentation files
    this.router.get('/postman', this.servePostmanCollection.bind(this));
    this.router.get('/examples', this.serveExamples.bind(this));
  }

  /**
   * Serve OpenAPI JSON specification
   */
  async serveOpenAPISpec(req, res) {
    try {
      const openAPISpec = JSON.parse(apiDocs.generateJSON());
      
      // Update server URLs based on current request
      openAPISpec.servers = [
        {
          url: `${req.protocol}://${req.get('host')}`,
          description: `${process.env.NODE_ENV || 'development'} server`
        }
      ];
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.status(200).json(openAPISpec);
      
      logger.info('OpenAPI specification served', {
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
    } catch (error) {
      logger.error('Error serving OpenAPI specification', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate API documentation'
      });
    }
  }

  /**
   * Serve Swagger UI HTML interface
   */
  async serveSwaggerUI(req, res) {
    try {
      const htmlContent = apiDocs.generateHTML();
      
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.status(200).send(htmlContent);
      
      logger.info('Swagger UI served', {
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
    } catch (error) {
      logger.error('Error serving Swagger UI', error);
      res.status(500).send('<h1>Error loading API documentation</h1>');
    }
  }

  /**
   * Serve API documentation as Markdown
   */
  async serveMarkdownDocs(req, res) {
    try {
      const markdownContent = apiDocs.generateMarkdown();
      
      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', 'inline; filename="api-documentation.md"');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.status(200).send(markdownContent);
      
      logger.info('Markdown documentation served', {
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
    } catch (error) {
      logger.error('Error serving Markdown documentation', error);
      res.status(500).send('# Error\n\nFailed to generate API documentation');
    }
  }

  /**
   * Serve API health documentation
   */
  async serveHealthDocs(req, res) {
    try {
      const healthDocs = {
        title: 'API Health Documentation',
        description: 'Documentation for health and monitoring endpoints',
        endpoints: {
          '/health': {
            method: 'GET',
            description: 'Basic health check endpoint',
            response: {
              status: 'OK | ERROR',
              timestamp: 'ISO datetime string',
              uptime: 'Uptime in seconds',
              version: 'Application version',
              environment: 'Current environment',
              services: {
                database: 'healthy | unhealthy',
                redis: 'healthy | unhealthy',
                rabbitmq: 'healthy | unhealthy'
              }
            }
          },
          '/health/detailed': {
            method: 'GET',
            description: 'Detailed health check with system metrics',
            authentication: 'Required (admin or monitoring role)',
            response: {
              status: 'Overall system status',
              checks: 'Array of individual service checks',
              metrics: {
                memory: 'Memory usage statistics',
                cpu: 'CPU usage statistics',
                disk: 'Disk usage statistics'
              }
            }
          }
        },
        statusCodes: {
          200: 'System is healthy',
          503: 'Service unavailable - one or more dependencies are unhealthy',
          500: 'Internal server error during health check'
        }
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'public, max-age=1800'); // Cache for 30 minutes
      res.status(200).json(healthDocs);
      
      logger.info('Health documentation served', {
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
    } catch (error) {
      logger.error('Error serving health documentation', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate health documentation'
      });
    }
  }

  /**
   * Generate and serve Postman collection
   */
  async servePostmanCollection(req, res) {
    try {
      const postmanCollection = this.generatePostmanCollection(req);
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="ticketing-api-collection.json"');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.status(200).json(postmanCollection);
      
      logger.info('Postman collection served', {
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
    } catch (error) {
      logger.error('Error serving Postman collection', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate Postman collection'
      });
    }
  }

  /**
   * Serve API usage examples
   */
  async serveExamples(req, res) {
    try {
      const examples = {
        title: 'API Usage Examples',
        authentication: {
          description: 'How to authenticate with the API',
          examples: [
            {
              language: 'curl',
              code: `curl -X POST ${req.protocol}://${req.get('host')}/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'`
            },
            {
              language: 'javascript',
              code: `const response = await fetch('${req.protocol}://${req.get('host')}/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});
const data = await response.json();`
            }
          ]
        },
        eventManagement: {
          description: 'Creating and managing events',
          examples: [
            {
              language: 'curl',
              code: `curl -X POST ${req.protocol}://${req.get('host')}/api/events \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
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
  }'`
            }
          ]
        },
        orderProcessing: {
          description: 'Creating ticket orders',
          examples: [
            {
              language: 'curl',
              code: `curl -X POST ${req.protocol}://${req.get('host')}/api/orders \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
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
  }'`
            }
          ]
        },
        errorHandling: {
          description: 'Handling API errors',
          examples: [
            {
              language: 'javascript',
              code: `try {
  const response = await fetch('/api/events', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(eventData)
  });
  
  if (!response.ok) {
    const error = await response.json();
    if (error.errors) {
      // Handle validation errors
      error.errors.forEach(err => {
        console.log(\`Validation error in \${err.field}: \${err.message}\`);
      });
    } else {
      // Handle other errors
      console.log('Error:', error.message);
    }
    return;
  }
  
  const result = await response.json();
  console.log('Success:', result);
} catch (error) {
  console.error('Network error:', error);
}`
            }
          ]
        }
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.status(200).json(examples);
      
      logger.info('API examples served', {
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
    } catch (error) {
      logger.error('Error serving API examples', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate API examples'
      });
    }
  }

  /**
   * Generate Postman collection from OpenAPI spec
   */
  generatePostmanCollection(req) {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    return {
      info: {
        name: 'Ticketing Platform API',
        description: 'Comprehensive API for ticketing and event management',
        version: '1.0.0',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      auth: {
        type: 'bearer',
        bearer: [
          {
            key: 'token',
            value: '{{jwt_token}}',
            type: 'string'
          }
        ]
      },
      variable: [
        {
          key: 'base_url',
          value: baseUrl,
          type: 'string'
        },
        {
          key: 'jwt_token',
          value: '',
          type: 'string'
        }
      ],
      item: [
        {
          name: 'Authentication',
          item: [
            {
              name: 'Register User',
              request: {
                method: 'POST',
                header: [
                  {
                    key: 'Content-Type',
                    value: 'application/json'
                  }
                ],
                body: {
                  mode: 'raw',
                  raw: JSON.stringify({
                    email: 'user@example.com',
                    password: 'SecurePass123!',
                    firstName: 'John',
                    lastName: 'Doe',
                    role: 'customer'
                  }, null, 2)
                },
                url: {
                  raw: '{{base_url}}/api/auth/register',
                  host: ['{{base_url}}'],
                  path: ['api', 'auth', 'register']
                }
              }
            },
            {
              name: 'Login User',
              event: [
                {
                  listen: 'test',
                  script: {
                    exec: [
                      'if (pm.response.code === 200) {',
                      '    const response = pm.response.json();',
                      '    pm.environment.set("jwt_token", response.data.token);',
                      '}'
                    ]
                  }
                }
              ],
              request: {
                method: 'POST',
                header: [
                  {
                    key: 'Content-Type',
                    value: 'application/json'
                  }
                ],
                body: {
                  mode: 'raw',
                  raw: JSON.stringify({
                    email: 'user@example.com',
                    password: 'password123'
                  }, null, 2)
                },
                url: {
                  raw: '{{base_url}}/api/auth/login',
                  host: ['{{base_url}}'],
                  path: ['api', 'auth', 'login']
                }
              }
            }
          ]
        },
        {
          name: 'Events',
          item: [
            {
              name: 'List Events',
              request: {
                method: 'GET',
                url: {
                  raw: '{{base_url}}/api/events?page=1&limit=10',
                  host: ['{{base_url}}'],
                  path: ['api', 'events'],
                  query: [
                    { key: 'page', value: '1' },
                    { key: 'limit', value: '10' }
                  ]
                }
              }
            },
            {
              name: 'Create Event',
              request: {
                auth: {
                  type: 'bearer',
                  bearer: [
                    {
                      key: 'token',
                      value: '{{jwt_token}}',
                      type: 'string'
                    }
                  ]
                },
                method: 'POST',
                header: [
                  {
                    key: 'Content-Type',
                    value: 'application/json'
                  }
                ],
                body: {
                  mode: 'raw',
                  raw: JSON.stringify({
                    title: 'Tech Conference 2024',
                    description: 'Annual technology conference',
                    venue: 'Convention Center',
                    address: '123 Tech Street',
                    city: 'San Francisco',
                    state: 'California',
                    country: 'USA',
                    startDate: '2024-06-15T09:00:00Z',
                    endDate: '2024-06-15T18:00:00Z',
                    category: 'Technology',
                    maxAttendees: 500
                  }, null, 2)
                },
                url: {
                  raw: '{{base_url}}/api/events',
                  host: ['{{base_url}}'],
                  path: ['api', 'events']
                }
              }
            }
          ]
        },
        {
          name: 'Health',
          item: [
            {
              name: 'Health Check',
              request: {
                method: 'GET',
                url: {
                  raw: '{{base_url}}/health',
                  host: ['{{base_url}}'],
                  path: ['health']
                }
              }
            }
          ]
        }
      ]
    };
  }

  /**
   * Get router instance
   */
  getRouter() {
    return this.router;
  }

  /**
   * Generate documentation files on startup
   */
  static async generateDocumentationFiles() {
    try {
      const outputDir = path.join(__dirname, '../public/docs');
      await apiDocs.saveDocumentation(outputDir);
      logger.info('✅ API documentation files generated successfully');
    } catch (error) {
      logger.error('❌ Failed to generate documentation files', error);
    }
  }
}

// Create and export documentation middleware instance
const documentationMiddleware = new DocumentationMiddleware();

module.exports = {
  DocumentationMiddleware,
  documentationRouter: documentationMiddleware.getRouter(),
  generateDocumentationFiles: DocumentationMiddleware.generateDocumentationFiles
};
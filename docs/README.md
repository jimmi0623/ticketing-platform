# Ticketing Platform API Documentation

This directory contains a comprehensive API documentation system for the ticketing platform, including OpenAPI specifications, interactive Swagger UI, Postman collections, and usage examples.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Quick Start](#quick-start)
- [Documentation Formats](#documentation-formats)
- [Integration Guide](#integration-guide)
- [Available Endpoints](#available-endpoints)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [Examples](#examples)
- [Development](#development)
- [Deployment](#deployment)

## 🎯 Overview

The API documentation system provides comprehensive, interactive documentation for the Ticketing Platform API. It includes:

- **Interactive Swagger UI** - Browse and test endpoints directly in your browser
- **OpenAPI 3.0 Specification** - Machine-readable API specification
- **Postman Collection** - Import directly into Postman for testing
- **Code Examples** - Sample requests in multiple programming languages
- **Health Monitoring Documentation** - System health and monitoring endpoints

## ✨ Features

### 🚀 Interactive Documentation
- **Swagger UI Integration** - Test API endpoints directly in the browser
- **Try It Out** functionality - Execute real API requests with sample data
- **Response Examples** - See actual response formats and status codes
- **Schema Validation** - Automatic request/response validation

### 📊 Multiple Formats
- **OpenAPI JSON** - Standard OpenAPI 3.0 specification
- **Markdown Documentation** - Human-readable documentation
- **Postman Collection** - Ready-to-import collection for API testing
- **HTML Documentation** - Self-contained documentation site

### 🔒 Security Features
- **Rate Limited Access** - Prevents documentation endpoint abuse
- **CORS Enabled** - Cross-origin access for development
- **Content Security Policy** - Secure loading of external resources
- **Authentication Documentation** - Clear auth flow explanations

### 📈 Monitoring Integration
- **Health Check Documentation** - System monitoring endpoints
- **Performance Metrics** - API performance documentation
- **Error Tracking** - Comprehensive error response documentation

## 🚀 Quick Start

### 1. Installation

Ensure you have the required dependencies:

```bash
npm install express cors helmet compression express-rate-limit
```

### 2. Integration

Add the documentation middleware to your Express server:

```javascript
const { documentationRouter, generateDocumentationFiles } = require('./middleware/documentation');

// Mount documentation router
app.use('/api/docs', documentationRouter);

// Generate static files on startup
await generateDocumentationFiles();
```

### 3. Access Documentation

Start your server and navigate to:

- **Interactive Docs**: `http://localhost:5000/api/docs`
- **OpenAPI Spec**: `http://localhost:5000/api/docs/openapi.json`
- **Postman Collection**: `http://localhost:5000/api/docs/postman`
- **Examples**: `http://localhost:5000/api/docs/examples`

## 📚 Documentation Formats

### Swagger UI (`/api/docs`)
Interactive web interface for exploring and testing the API:
- Browse all available endpoints
- Test requests with sample data
- View response formats and status codes
- Download OpenAPI specification

### OpenAPI JSON (`/api/docs/openapi.json`)
Machine-readable OpenAPI 3.0 specification:
- Import into API development tools
- Generate client SDKs
- Validate API requests/responses
- Integration with CI/CD pipelines

### Markdown (`/api/docs/README.md`)
Human-readable documentation:
- Comprehensive API overview
- Authentication instructions
- Code examples
- Error handling guide

### Postman Collection (`/api/docs/postman`)
Ready-to-import Postman collection:
- Pre-configured requests
- Environment variables
- Authentication setup
- Test scripts

## 🔧 Integration Guide

### Basic Integration

```javascript
const express = require('express');
const { documentationRouter } = require('./middleware/documentation');

const app = express();

// Mount documentation
app.use('/api/docs', documentationRouter);

// Start server
app.listen(5000, () => {
  console.log('📚 API Documentation: http://localhost:5000/api/docs');
});
```

### Advanced Integration

```javascript
const { 
  documentationRouter, 
  generateDocumentationFiles 
} = require('./middleware/documentation');

class APIServer {
  constructor() {
    this.app = express();
    this.setupDocumentation();
  }

  async setupDocumentation() {
    // Generate static files
    await generateDocumentationFiles();
    
    // Mount router with rate limiting
    const docRateLimit = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100
    });
    
    this.app.use('/api/docs', docRateLimit, documentationRouter);
    
    // Alternative endpoints
    this.app.get('/docs', (req, res) => res.redirect('/api/docs'));
  }
}
```

## 🛠 Available Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile

### Events
- `GET /api/events` - List events (with filtering & pagination)
- `POST /api/events` - Create new event
- `GET /api/events/:id` - Get event details
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event

### Orders
- `POST /api/orders` - Create ticket order
- `GET /api/orders/my` - Get user's orders
- `GET /api/orders/:id` - Get order details
- `PUT /api/orders/:id/cancel` - Cancel order

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `POST /api/users/verify-email` - Verify email address

### Admin
- `GET /api/admin/stats` - System statistics
- `GET /api/admin/users` - User management
- `GET /api/admin/events` - Event management

### Health
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed system health

## 🔐 Authentication

The API uses JWT Bearer tokens for authentication:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:5000/api/auth/me
```

### Getting a Token

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

## 🚦 Rate Limiting

API endpoints are rate-limited to prevent abuse:

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Authentication | 5 requests | 15 minutes |
| Orders | 10 requests | 1 minute |
| Search | 50 requests | 1 minute |
| General | 100 requests | 15 minutes |
| Documentation | 100 requests | 15 minutes |

## ❌ Error Handling

All API responses follow a consistent format:

```json
{
  "success": true|false,
  "message": "Human-readable message",
  "data": { /* Response data */ },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### HTTP Status Codes

- `200` - OK: Request successful
- `201` - Created: Resource created successfully
- `400` - Bad Request: Invalid request data
- `401` - Unauthorized: Authentication required
- `403` - Forbidden: Insufficient permissions
- `404` - Not Found: Resource not found
- `429` - Too Many Requests: Rate limit exceeded
- `500` - Internal Server Error: Server error

### Error Response Example

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Valid email address is required",
      "value": "invalid-email"
    }
  ],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 💡 Examples

### JavaScript/Node.js

```javascript
// Authentication
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});

const { data } = await response.json();
const token = data.token;

// Create Event
const eventResponse = await fetch('/api/events', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Tech Conference 2024',
    description: 'Annual technology conference',
    venue: 'Convention Center',
    startDate: '2024-06-15T09:00:00Z',
    endDate: '2024-06-15T18:00:00Z',
    category: 'Technology'
  })
});
```

### Python

```python
import requests

# Authentication
auth_response = requests.post('http://localhost:5000/api/auth/login', 
  json={
    'email': 'user@example.com',
    'password': 'password123'
  }
)
token = auth_response.json()['data']['token']

# List Events
events_response = requests.get('http://localhost:5000/api/events',
  headers={'Authorization': f'Bearer {token}'},
  params={'page': 1, 'limit': 10}
)
```

### cURL

```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# List Events
curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:5000/api/events?page=1&limit=10"

# Create Order
curl -X POST http://localhost:5000/api/orders \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": 1,
    "tickets": [{
      "tierId": 1,
      "quantity": 2,
      "attendeeName": "John Doe",
      "attendeeEmail": "john@example.com"
    }]
  }'
```

## 🛠 Development

### Adding New Endpoints

1. **Update the OpenAPI specification** in `api-documentation.js`:

```javascript
// Add new path to definePaths() method
'/api/tickets': {
  get: {
    tags: ['Tickets'],
    summary: 'List user tickets',
    // ... endpoint definition
  }
}
```

2. **Update schemas** if needed:

```javascript
// Add new schema to defineSchemas() method
Ticket: {
  type: 'object',
  properties: {
    // ... schema definition
  }
}
```

3. **Regenerate documentation**:

```bash
node -e "require('./docs/api-documentation').apiDocs.saveDocumentation()"
```

### Customizing Documentation

#### Update API Information

```javascript
// In api-documentation.js constructor
this.docs.info = {
  title: 'Your API Name',
  version: '2.0.0',
  description: 'Your API description',
  contact: {
    name: 'Your Team',
    email: 'your-email@example.com'
  }
}
```

#### Add Custom Endpoints

```javascript
// Add to definePaths() method
'/api/your-endpoint': {
  get: {
    tags: ['Your Tag'],
    summary: 'Your endpoint summary',
    parameters: [/* parameters */],
    responses: {/* responses */}
  }
}
```

### Testing Documentation

```bash
# Start server with documentation
npm start

# Test endpoints
curl http://localhost:5000/api/docs/openapi.json
curl http://localhost:5000/api/docs/health
curl http://localhost:5000/api/docs/postman
```

## 🚀 Deployment

### Production Considerations

1. **Enable HTTPS** for production:
```javascript
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});
```

2. **Set proper CORS origins**:
```javascript
app.use(cors({
  origin: ['https://yourdomain.com', 'https://api.yourdomain.com'],
  credentials: true
}));
```

3. **Configure rate limiting**:
```javascript
const docRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // Lower limit for production
  message: 'Documentation rate limit exceeded'
});
```

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Generate documentation on build
RUN node -e "require('./docs/api-documentation').apiDocs.saveDocumentation()"

EXPOSE 5000
CMD ["npm", "start"]
```

### Environment Variables

```bash
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://yourdomain.com
API_URL=https://api.yourdomain.com
```

## 📞 Support

For API documentation support:

- **Email**: dev@ticketing-platform.com
- **Documentation**: Available at `/api/docs` endpoint
- **GitHub**: [Repository Link]
- **Slack**: #api-support

## 📝 License

This API documentation system is released under the MIT License.

---

## 🔗 Quick Links

- [Interactive API Documentation](http://localhost:5000/api/docs)
- [OpenAPI Specification](http://localhost:5000/api/docs/openapi.json)
- [Postman Collection](http://localhost:5000/api/docs/postman)
- [Code Examples](http://localhost:5000/api/docs/examples)
- [Health Check](http://localhost:5000/health)
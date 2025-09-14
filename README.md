# 🎫 Ticketing & Event Management Platform
#@Author: James Rono aka jimmi 
#@contact me: <jimmironno@gmail.com> <ronojames@proton.me>
 **********I am only publishing it as "PUBLIC", for Client/Hirer Demo purpose**********

⚠️ **PROPRIETARY SOFTWARE - CONFIDENTIAL AND RESTRICTED** ⚠️

A full-stack, scalable ticketing and event management platform built with Node.js, React, and modern technologies. This platform supports horizontal scaling, handles concurrent ticket purchases safely, and provides comprehensive analytics.

## ⚖️ License & Copyright

**🚨 PROPRIETARY SOFTWARE - ALL RIGHTS RESERVED**

© 2024-2025 James Rono. All Rights reseved. This software is proprietary.

### ⛔ Important Legal Notice:
- This software is protected by copyright and intellectual property laws
- **Unauthorized copying, distribution, or use is strictly prohibited**
- **Commercial use requires explicit written permission**
- **No license is granted for any use without express written consent**
- See [LICENSE](LICENSE) and [COPYRIGHT](COPYRIGHT) for complete terms

### 🔒 Repository Access:

- Viewing this code does not grant any rights or permissions
- All code and algorithms are copyrighted.

### 📞 Contact:
- **Licensing Inquiries**: Jimmironno@gmail.com
- **Legal Matters**: Jimmironno@gmail.com
- **General Support**: Jimmironno@gmail.com

### 🚫 Contributing:
This is proprietary software. **No external contributions are accepted.** 
All development is handled internally by authorized james rono.

---

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React SPA     │    │   Load Balancer │    │   Admin Panel   │
│   (Frontend)    │◄───┤     (Nginx)     │◄───┤   (Analytics)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │    Node.js Cluster     │
                    │   (Express.js API)     │
                    │  ┌─────────────────┐   │
                    │  │   Worker 1      │   │
                    │  │   Worker 2      │   │
                    │  │   Worker N      │   │
                    │  └─────────────────┘   │
                    └─────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
                ▼               ▼               ▼
    ┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐
    │   MySQL DB      │ │   Redis     │ │   RabbitMQ      │
    │  (Primary DB)   │ │  (Cache)    │ │ (Message Queue) │
    └─────────────────┘ └─────────────┘ └─────────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │     External APIs       │
                    │  ┌─────────────────┐   │
                    │  │     Stripe      │   │
                    │  │   (Payments)    │   │
                    │  └─────────────────┘   │
                    │  ┌─────────────────┐   │
                    │  │   Email Service │   │
                    │  │   (SMTP)        │   │
                    │  └─────────────────┘   │
                    └─────────────────────────┘
```

## 🚀 Features

### Core Functionality
- **Event Management**: Create, manage, and publish events with detailed information
- **Ticket Sales**: Multi-tier ticket system with real-time availability
- **Payment Processing**: Secure Stripe integration with webhook handling
- **User Management**: Role-based access (Admin, Organizer, Customer)
- **Analytics Dashboard**: Comprehensive reporting and insights

### Scalability & Performance
- **Horizontal Scaling**: Node.js Cluster with load balancing
- **Caching**: Redis for frequently accessed data
- **Message Queues**: RabbitMQ for async task processing
- **Database Optimization**: Proper indexing and query optimization
- **Concurrency Safety**: Row-level locking for ticket purchases

### Security & Compliance
- **Authentication**: JWT-based with role-based authorization
- **Data Protection**: GDPR-compliant data export/deletion
- **PCI Compliance**: No local credit card storage
- **Input Validation**: Comprehensive validation and sanitization
- **Rate Limiting**: API protection against abuse

## 🛠️ Tech Stack

### Backend
- **Node.js** with Express.js framework
- **MySQL** for primary database
- **Redis** for caching and session storage
- **RabbitMQ** for message queuing
- **Stripe** for payment processing
- **JWT** for authentication
- **bcrypt** for password hashing

### Frontend
- **React 18** with modern hooks
- **TailwindCSS** for styling
- **React Query** for data fetching
- **React Router** for navigation
- **React Hook Form** for form handling
- **Recharts** for analytics visualization

### Infrastructure
- **Docker** for containerization
- **Nginx** for load balancing and reverse proxy
- **Node.js Cluster** for multi-core utilization

## 📋 Prerequisites

- Node.js 18+ 
- MySQL 8.0+
- Redis 6.0+
- RabbitMQ 3.8+
- Docker & Docker Compose (optional)

## 🚀 Quick Start

**⚠️ AUTHORIZED PERSONNEL ONLY**

### Using Docker Compose (Recommended)

1. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. **Start all services**
   ```bash
   docker-compose up -d
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - Admin Dashboard: http://localhost:3000/admin
   - API Documentation: http://localhost:5000/api/docs
   - RabbitMQ Management: http://localhost:15672

### Manual Setup

1. **Install dependencies**
   ```bash
   # Backend
   npm install
   
   # Frontend
   cd frontend
   npm install
   ```

2. **Set up databases**
   ```bash
   # Start MySQL, Redis, and RabbitMQ
   # Update .env with your database credentials
   ```

3. **Initialize database**
   ```bash
   npm run db:init
   ```

4. **Start development servers**
   ```bash
   # Backend (Terminal 1)
   npm run dev
   
   # Frontend (Terminal 2)
   cd frontend
   npm start
   ```

## 🔧 Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

**🔐 SECURITY NOTICE**: Never commit actual environment variables to version control.

## 📊 Database Schema

### Core Tables

```sql
-- Users table
users (id, email, password, first_name, last_name, role, is_verified, ...)

-- Events table  
events (id, organizer_id, title, description, venue, start_date, end_date, ...)

-- Ticket tiers
ticket_tiers (id, event_id, name, price, quantity, sold_quantity, ...)

-- Orders
orders (id, user_id, event_id, order_number, total_amount, status, ...)

-- Tickets
tickets (id, order_id, ticket_tier_id, ticket_code, attendee_name, ...)
```

## 🔄 Scaling Architecture

### Horizontal Scaling Strategy

1. **Load Balancer (Nginx)**
   - Distributes requests across multiple Node.js instances
   - Handles SSL termination and static file serving
   - Implements rate limiting and security headers

2. **Node.js Cluster**
   - Utilizes all CPU cores
   - Automatic worker process management
   - Graceful shutdown handling

3. **Database Scaling**
   - Read replicas for query distribution
   - Connection pooling
   - Query optimization and indexing

4. **Caching Strategy**
   - Multi-layer caching with Redis
   - Query result caching
   - Application-level caching

### Message Queue Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Email     │    │  Analytics  │    │   Ticket    │
│ Notifications│   │ Processing  │    │ Generation  │
└─────────────┘    └─────────────┘    └─────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                    ┌─────────────┐
                    │  RabbitMQ   │
                    │   Broker    │
                    └─────────────┘
                            │
                    ┌─────────────┐
                    │  Consumers  │
                    │ (Background │
                    │   Workers)  │
                    └─────────────┘
```

## 🔒 Security Features

### Authentication & Authorization
- JWT-based authentication with configurable expiration
- Role-based access control (RBAC)  
- Password hashing with bcrypt (12+ salt rounds)
- Email verification system
- API key authentication for admin endpoints

### Data Protection
- Comprehensive input validation and sanitization
- XSS protection with DOMPurify
- NoSQL injection prevention
- CSRF protection
- Rate limiting with custom rules per endpoint

### Infrastructure Security
- Security headers (CSP, HSTS, etc.)
- Docker container security
- Reverse proxy security configuration
- SSL/TLS encryption
- Environment variable protection

## 📈 Performance Optimizations

### Backend Optimizations
- Database connection pooling with monitoring
- Query optimization with EXPLAIN analysis
- Multi-layer caching (in-memory + Redis)
- Async task processing with RabbitMQ
- Request/response compression

### Frontend Optimizations
- Code splitting and lazy loading
- Image optimization and lazy loading
- Bundle size optimization
- Progressive Web App features
- Service worker caching

## 🧪 Testing

### Backend Testing
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suite
npm run test:unit
npm run test:integration
npm run test:security
```

### Frontend Testing
```bash
cd frontend

# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## 🚀 Deployment

**⚠️ AUTHORIZED DEPLOYMENTS ONLY**

### Production Deployment

1. **Prepare environment**
   ```bash
   export NODE_ENV=production
   ```

2. **Build applications**
   ```bash
   # Build frontend
   cd frontend
   npm run build
   ```

3. **Deploy with Docker**
   ```bash
   docker-compose -f docker-compose.yml up -d
   ```

### Security Considerations for Deployment

- All secrets managed through environment variables
- HTTPS enforced in production
- Database connections encrypted
- Rate limiting configured
- Monitoring and alerting enabled

## 📱 API Documentation

**Interactive API Documentation**: http://localhost:5000/api/docs

### Key Endpoints

#### Authentication
- `POST /api/auth/register` - User registration with validation
- `POST /api/auth/login` - User login with rate limiting
- `GET /api/auth/me` - Get current user profile

#### Events
- `GET /api/events` - List events (with caching)
- `GET /api/events/:id` - Get event details
- `POST /api/events` - Create event (Organizer/Admin only)

#### Orders
- `POST /api/orders` - Create order with concurrency control
- `GET /api/orders/my` - Get user orders
- `GET /api/orders/:id` - Get order details

#### Admin
- `GET /api/admin/stats` - Platform statistics
- `GET /api/admin/analytics/revenue` - Revenue analytics

## 🛡️ Security Policy

See [SECURITY.md](SECURITY.md) for our comprehensive security policy, including:
- Vulnerability reporting procedures
- Security best practices
- Supported versions
- Contact information for security issues

## 📋 Monitoring & Analytics

### System Monitoring
- Performance metrics tracking
- Error logging and alerting
- Database query performance monitoring
- Cache hit/miss ratios
- API endpoint response times

### Business Analytics
- Event performance metrics
- Revenue tracking and forecasting
- User engagement analytics
- Ticket sales patterns

---

## 🔐 Confidentiality Notice

This software contains proprietary and confidential information. Any unauthorized access, use, or disclosure is strictly prohibited and may result in legal action.

**© 2024-2025 James Rono. All Rights Reserved.**

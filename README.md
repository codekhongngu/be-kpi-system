# NestJS Boilerplate - Quick Start for Your API Project

**A feature-rich and production-ready NestJS starter** with built-in enterprise-grade architecture and popular libraries. Supports TypeScript, PostgreSQL/MySQL, TypeORM, JWT Authentication, Docker, and other essential features.

## Features

- 🚀 Built with NestJS 11.x & Node.js 18+
- 📝 TypeScript for type safety and better development experience
- 🏗️ Clean Architecture and Domain-Driven Design principles
- 🔐 JWT Authentication (token-based, stateless) & Role-based Authorization
- 🔐 Sign in and sign up via email
- 🗃️ TypeORM with PostgreSQL integration
- 📊 Swagger API documentation
- 🔍 Request validation using class-validator
- 🎯 Unit & Integration testing setup with Jest
- 📝 E2E testing with Supertest
- 🐳 Docker & Docker Compose configuration
- 📝 ESLint & Prettier configuration

### Boilerplate Features

Dự án này bao gồm đầy đủ các tính năng boilerplate của NestJS:

- **Controllers**: Ví dụ về cách tổ chức controllers
- **Providers**: Services và dependency injection
- **Modules**: Module structure và organization
- **Middleware**: 
  - Logging middleware (ghi log requests/responses)
  - Request ID middleware (tracking requests)
- **Exception Filters**: Global exception filter với format response chuẩn
- **Pipes**: 
  - ParseIntPipe (validate integers)
  - ParseUuidPipe (validate UUIDs)
  - TrimPipe (auto-trim strings)
- **Guards**: 
  - JWT Auth Guard
  - Roles Guard (role-based access control)
  - API Key Guard
- **Interceptors**: 
  - Logging interceptor
  - Transform interceptor (standardize responses)
  - Timeout interceptor
  - Cache interceptor
- **Custom Decorators**: 
  - @CurrentUser()
  - @Roles()
  - @Public()
  - @RequestId()
  - @IpAddress()
  - @UserAgent()
  - @ApiVersion()

Xem chi tiết tại [BOILERPLATE_FEATURES.md](./docs/BOILERPLATE_FEATURES.md)

## Prerequisites

- Node.js 18+
- PostgreSQL
- Redis
- Docker (optional)

## Getting Started

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/nestjs-boilerplate.git

# Install dependencies
npm install
```

### Configuration

1. Copy `.env.example` to `.env`
```bash
cp .env.example .env
```

2. Update environment variables in `.env` file

### Running the app

```bash
# Development
npm run start:dev

# Production mode
npm run start:prod

# Using Docker
npm run docker:prod:up

# Or use deployment script
./scripts/deploy.sh production up
```

### Running tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Project Structure

```
project-root/
│
├── src/              # Business logic (NestJS)
│   ├── common/      # Common utilities (middleware, filters, pipes, guards, interceptors, decorators)
│   └── modules/     # Feature modules (auth, user, example)
│
├── infra/            # Infrastructure configuration
│   ├── docker/      # Docker configurations
│   │   ├── Dockerfile
│   │   ├── Dockerfile.dev
│   │   ├── docker-compose.yml        # Development
│   │   └── docker-compose.prod.yml   # Production
│   ├── nginx/       # Nginx reverse proxy config
│   ├── redis/       # Redis configuration
│   ├── postgres/    # PostgreSQL init scripts
│   ├── monitoring/  # Prometheus & Grafana configs
│   └── cloud/       # Cloud infrastructure (AWS, Terraform)
│
├── scripts/          # Automation scripts
│   ├── docker/      # Docker helper scripts
│   ├── build.sh     # Build script
│   ├── deploy.sh    # Deployment script
│   ├── migrate.sh   # Database migration script
│   ├── backup-db.sh # Database backup script
│   └── seed.sh      # Database seeding script
│
├── .env              # Environment variables
├── package.json
└── README.md
```
### Auth Module

```
src/
└── modules/
    └── auth/
        ├── domain/                  # Domain layer
        │   ├── entities/           # Domain entities
        │   ├── value-objects/      # Value objects
        │   ├── repositories/       # Repository interfaces
        │   └── services/          # Domain services
        │
        ├── infrastructure/          # Infrastructure layer
        │   ├── persistence/        # Database related
        │   │   ├── entities/      # TypeORM entities
        │   │   ├── repositories/  # TypeORM repositories
        │   │   └── migrations/    # Database migrations
        │   ├── services/          # External services implementation
        │   └── security/          # Security related implementations
        │
        ├── interfaces/              # Interface layer
        │   ├── http/              # HTTP controllers
        │   │   ├── controllers/
        │   │   ├── middlewares/
        │   │   ├── guards/
        │   │   └── dtos/
        │   └── graphql/           # GraphQL resolvers (if needed)
        │
        ├── services/               # Application Services
        │   ├── auth.service.ts
        │   └── social-auth.service.ts
        │
        └── auth.module.ts          # Module definition 
```

Auth hiện dùng **JWT token-based (stateless)**. Chi tiết xem [docs/AUTH.md](./docs/AUTH.md).

## API Documentation

Once the application is running, you can access the Swagger documentation at:
```
http://localhost:3000/api/docs
```

## Database Migrations

```bash
# Generate migration
npm run migration:generate -- src/modules/auth/infrastructure/persistence/migrations/CreateUsersTable

# Run migrations
npm run migration:run

# Revert migrations
npm run migration:revert
```
## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you find this project useful, please give it a ⭐️ on GitHub!

## Authors

- NETKO Solution

## Acknowledgments

- NestJS Team for the amazing framework
- The open-source community for inspiration and support


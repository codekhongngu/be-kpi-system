# Infrastructure Directory

Thư mục này chứa tất cả các cấu hình hạ tầng cho dự án NestJS.

## Cấu trúc

```
infra/
├── docker/              # Docker configurations
│   ├── Dockerfile       # Production Dockerfile (multi-stage build)
│   ├── Dockerfile.dev   # Development Dockerfile
│   ├── docker-compose.yml        # Development compose file
│   └── docker-compose.prod.yml  # Production compose file
│
├── nginx/               # Nginx reverse proxy
│   └── nginx.conf       # Nginx configuration
│
├── redis/               # Redis cache/session store
│   └── redis.conf       # Redis configuration
│
├── postgres/            # PostgreSQL database
│   └── init.sql         # Database initialization script
│
├── monitoring/          # Monitoring & observability
│   ├── prometheus/      # Prometheus metrics
│   │   └── prometheus.yml
│   └── grafana/        # Grafana dashboards
│       └── dashboard.json
│
└── cloud/              # Cloud infrastructure
    ├── aws/            # AWS-specific configs
    └── terraform/      # Terraform IaC
```

## Sử dụng

### Docker

Xem chi tiết tại [DOCKER.md](../DOCKER.md)

```bash
# Development
npm run docker:dev:up

# Production
npm run docker:prod:up
```

### Nginx

Cấu hình Nginx reverse proxy cho production. Mount vào container hoặc sử dụng với Docker Compose.

### Redis

Cấu hình Redis cho caching và session storage. Có thể thêm vào docker-compose nếu cần.

### PostgreSQL

Script khởi tạo database. Chạy tự động khi container PostgreSQL được tạo lần đầu.

### Monitoring

- **Prometheus**: Thu thập metrics từ ứng dụng
- **Grafana**: Dashboard để visualize metrics

### Cloud

- **AWS**: Cấu hình cho AWS (ECS, RDS, S3, etc.)
- **Terraform**: Infrastructure as Code cho multi-cloud

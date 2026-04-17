# Hướng dẫn chạy dự án với Docker

## Yêu cầu

- Docker (version 20.10 trở lên)
- Docker Compose (version 2.0 trở lên)

## Cài đặt và chạy

### Bước 1: Tạo file .env

Sao chép file `.env.example` thành `.env`:

```bash
cp .env.example .env
```

### Bước 2: Cấu hình biến môi trường (tùy chọn)

Mở file `.env` và chỉnh sửa các giá trị nếu cần:

```env
PORT=3000
NODE_ENV=production
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=starter_db
DB_SYNCHRONIZE=false
DB_LOGGING=true
```

**Lưu ý:** 
- `DB_HOST=postgres` là tên service trong docker-compose.yml, không đổi khi chạy với Docker
- Nếu chạy local (không dùng Docker), đổi `DB_HOST=localhost`

### Bước 3: Chọn môi trường chạy

#### Môi trường Production (Build và chạy file đã build)

```bash
# Sử dụng yarn scripts
yarn docker:prod:up

# Hoặc sử dụng docker-compose trực tiếp
docker compose -f infra/docker/docker-compose.prod.yml up -d

# Xem logs
yarn docker:prod:logs
# hoặc
docker compose -f infra/docker/docker-compose.prod.yml logs -f
```

#### Môi trường Development (Hot-reload với start:dev)

```bash
# Sử dụng yarn scripts
yarn docker:dev:up

# Hoặc sử dụng docker-compose trực tiếp
docker compose -f infra/docker/docker-compose.yml up -d

# Xem logs
yarn docker:dev:logs
# hoặc
docker compose -f infra/docker/docker-compose.yml logs -f
```

### Bước 4: Kiểm tra ứng dụng

Ứng dụng sẽ chạy tại: http://localhost:3000

**Lưu ý:** 
- Production: Chạy file đã build (`dist/main.js`)
- Development: Chạy với `yarn start:dev` (hot-reload, không cần build)

## Các lệnh Docker Compose hữu ích

### Dừng services

```bash
docker compose -f infra/docker/docker-compose.prod.yml stop
```

### Dừng và xóa containers

```bash
docker compose -f infra/docker/compose/docker-compose.yml down
```

### Dừng và xóa containers, volumes (xóa cả database)

```bash
docker compose -f infra/docker/compose/docker-compose.yml down -v
```

### Rebuild lại images

```bash
docker compose -f infra/docker/compose/docker-compose.yml build --no-cache
docker compose -f infra/docker/compose/docker-compose.yml up -d
```

### Xem trạng thái services

```bash
docker compose -f infra/docker/docker-compose.prod.yml ps
```

### Chạy lệnh trong container

```bash
# Chạy lệnh trong container app
docker compose -f infra/docker/docker-compose.prod.yml exec app sh

# Chạy lệnh trong container postgres
docker compose -f infra/docker/docker-compose.prod.yml exec postgres psql -U postgres -d starter_db
```

## Môi trường Development với Docker

Để chạy ở chế độ development với hot-reload (tương tự `yarn start:dev`):

### Sử dụng yarn scripts (Khuyến nghị)

```bash
# Build và chạy development environment
yarn docker:dev:up

# Xem logs
yarn docker:dev:logs

# Dừng services
yarn docker:dev:down

# Rebuild images
yarn docker:dev:build
yarn docker:dev:up
```

### Sử dụng docker-compose trực tiếp

```bash
# Chạy development environment
docker compose -f infra/docker/docker-compose.yml up -d

# Xem logs
docker compose -f infra/docker/docker-compose.yml logs -f

# Dừng services
docker compose -f infra/docker/docker-compose.yml down
```

### Đặc điểm của môi trường Development

- ✅ **Hot-reload**: Tự động reload khi code thay đổi (sử dụng `yarn start:dev`)
- ✅ **Volume mounting**: Source code được mount vào container, thay đổi code sẽ được phản ánh ngay
- ✅ **DB_SYNCHRONIZE=true**: Tự động sync database schema (chỉ dùng cho dev)
- ✅ **Full logging**: Bật logging để debug dễ dàng
- ✅ **Separate volumes**: Database dev tách biệt với production

### So sánh Production vs Development

| Tính năng | Production | Development |
|-----------|-----------|-------------|
| Build | ✅ Build trước khi chạy | ❌ Không build, chạy trực tiếp |
| Hot-reload | ❌ Không | ✅ Có (watch mode) |
| Volume mount | ❌ Không | ✅ Có (source code) |
| DB_SYNCHRONIZE | ❌ false (an toàn) | ✅ true (tự động sync) |
| Dependencies | Production only | Tất cả (bao gồm dev) |
| File chạy | `dist/main.js` | `yarn start:dev` |

## Troubleshooting

### Lỗi kết nối database

- Kiểm tra service postgres đã chạy: `docker-compose ps`
- Kiểm tra logs: `docker-compose logs postgres`
- Đảm bảo `DB_HOST=postgres` trong file `.env`

### Port đã được sử dụng

- Đổi port trong file `.env` hoặc `docker-compose.yml`
- Hoặc dừng service đang sử dụng port đó

### Xóa và tạo lại từ đầu

```bash
docker compose -f infra/docker/docker-compose.prod.yml down -v
docker compose -f infra/docker/docker-compose.prod.yml build --no-cache
docker compose -f infra/docker/docker-compose.prod.yml up -d
```

## Automation Scripts

Dự án cung cấp các scripts tự động hóa trong thư mục `scripts/`:

### Build Script

```bash
# Build production
./scripts/build.sh production
# hoặc
npm run build:prod

# Build development
./scripts/build.sh development
# hoặc
npm run build:dev
```

### Deploy Script

```bash
# Deploy production
./scripts/deploy.sh production up
# hoặc
npm run deploy:prod

# Deploy development
./scripts/deploy.sh development up
# hoặc
npm run deploy:dev

# Các actions: up, down, restart, logs, clean
./scripts/deploy.sh production logs
./scripts/deploy.sh production restart
./scripts/deploy.sh production clean
```

### Migration Script

```bash
# Run migrations
./scripts/migrate.sh run
# hoặc
npm run migrate

# Revert last migration
./scripts/migrate.sh revert
# hoặc
npm run migrate:revert

# Generate new migration
./scripts/migrate.sh generate MigrationName
# hoặc
npm run migrate:generate MigrationName

# Show migration status
./scripts/migrate.sh show
```

### Backup Database Script

```bash
# Create backup
./scripts/backup-db.sh
# hoặc
npm run backup:db

# Custom backup name
./scripts/backup-db.sh my_backup_20240121
```

### Seed Database Script

```bash
# Seed database
./scripts/seed.sh
# hoặc
npm run seed

# Seed specific file
./scripts/seed.sh users
```

## Backup và Restore Database

### Backup

```bash
# Sử dụng script (khuyến nghị)
./scripts/backup-db.sh

# Hoặc manual
docker compose -f infra/docker/docker-compose.prod.yml exec postgres pg_dump -U postgres starter_db > backup.sql
```

### Restore

```bash
docker compose -f infra/docker/docker-compose.prod.yml exec -T postgres psql -U postgres starter_db < backup.sql
```

# Scripts Directory

Thư mục này chứa các scripts tự động hóa cho dự án.

## Scripts

### Docker Scripts (`docker/`)

- `dev.sh` - Wrapper cho docker-compose development
- `prod.sh` - Wrapper cho docker-compose production

### Build & Deploy

- **`build.sh`** - Build application cho production/development
  ```bash
  ./scripts/build.sh production
  ./scripts/build.sh development
  ```

- **`deploy.sh`** - Deploy application với Docker
  ```bash
  ./scripts/deploy.sh production up
  ./scripts/deploy.sh production down
  ./scripts/deploy.sh production logs
  ```

### Database

- **`migrate.sh`** - Quản lý database migrations
  ```bash
  ./scripts/migrate.sh run          # Run migrations
  ./scripts/migrate.sh revert       # Revert last migration
  ./scripts/migrate.sh generate MigrationName  # Generate new migration
  ./scripts/migrate.sh show         # Show migration status
  ```

- **`backup-db.sh`** - Backup database
  ```bash
  ./scripts/backup-db.sh                    # Auto-named backup
  ./scripts/backup-db.sh my_backup_20240121 # Custom name
  ```

- **`seed.sh`** - Seed database với dữ liệu mẫu
  ```bash
  ./scripts/seed.sh        # Seed all
  ./scripts/seed.sh users   # Seed specific file
  ```

## NPM Scripts

Tất cả scripts có thể được gọi qua npm:

```bash
npm run build:prod        # Build production
npm run build:dev         # Build development
npm run deploy:prod       # Deploy production
npm run deploy:dev        # Deploy development
npm run migrate           # Run migrations
npm run migrate:revert    # Revert migration
npm run migrate:generate # Generate migration
npm run backup:db         # Backup database
npm run seed              # Seed database
```

## Best Practices

1. **Luôn chạy từ project root**: Scripts tự động detect root directory
2. **Kiểm tra .env**: Một số scripts yêu cầu file `.env` tồn tại
3. **Backup trước khi migrate**: Luôn backup database trước khi chạy migrations quan trọng
4. **Review scripts**: Đọc script trước khi chạy để hiểu nó làm gì

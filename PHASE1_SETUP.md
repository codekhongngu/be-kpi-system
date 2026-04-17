# Phase 1: Auth & User Module - Hướng dẫn Setup

## 📦 Cài đặt Dependencies

Trước khi chạy ứng dụng, bạn cần cài đặt các dependencies sau:

```bash
yarn add @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt class-validator class-transformer
yarn add -D @types/passport-jwt @types/bcrypt
```

## 🔧 Cấu hình Environment Variables

Thêm các biến môi trường sau vào file `.env`:

```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=1h
JWT_EXPIRES_IN_SECONDS=3600
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_REFRESH_EXPIRES_IN=7d
```

## 📁 Cấu trúc Module đã tạo

### Auth Module
```
src/modules/auth/
├── entities/
│   └── password-reset.entity.ts
├── dto/
│   ├── login.dto.ts
│   ├── register.dto.ts
│   ├── change-password.dto.ts
│   ├── forgot-password.dto.ts
│   ├── reset-password.dto.ts
│   └── auth-response.dto.ts
├── guards/
│   └── jwt-auth.guard.ts
├── strategies/
│   └── jwt.strategy.ts
├── decorators/
│   └── current-user.decorator.ts
├── auth.service.ts
├── auth.controller.ts
└── auth.module.ts
```

### User Module
```
src/modules/user/
├── entities/
│   └── user.entity.ts
├── dto/
│   ├── create-user.dto.ts
│   ├── update-user.dto.ts
│   └── user-query.dto.ts
├── user.service.ts
├── user.controller.ts
└── user.module.ts
```

## 🔌 API Endpoints

### Auth Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/login` | Đăng nhập | ❌ |
| POST | `/api/auth/register` | Đăng ký | ❌ |
| POST | `/api/auth/refresh-token` | Làm mới token | ❌ |
| GET | `/api/auth/me` | Lấy thông tin user hiện tại | ✅ |
| POST | `/api/auth/change-password` | Đổi mật khẩu | ✅ |
| POST | `/api/auth/forgot-password` | Quên mật khẩu | ❌ |
| POST | `/api/auth/reset-password` | Reset mật khẩu | ❌ |
| POST | `/api/auth/logout` | Đăng xuất | ✅ |

### User Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/users` | Danh sách users (có pagination, search, filter) | ✅ |
| GET | `/api/users/:id` | Chi tiết user | ✅ |
| POST | `/api/users` | Tạo user mới | ✅ |
| PATCH | `/api/users/:id` | Cập nhật user | ✅ |
| DELETE | `/api/users/:id` | Xóa user (soft delete) | ✅ |
| PATCH | `/api/users/:id/status` | Thay đổi trạng thái user | ✅ |
| GET | `/api/users/departments/:departmentId` | Users theo phòng ban | ✅ |

## 📝 Ví dụ sử dụng API

### 1. Đăng ký

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "fullName": "Test User"
  }'
```

### 2. Đăng nhập

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "usernameOrEmail": "testuser",
    "password": "password123"
  }'
```

Response:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "username": "testuser",
    "email": "test@example.com",
    "fullName": "Test User",
    "status": "active"
  },
  "expiresIn": 3600
}
```

### 3. Lấy thông tin user hiện tại

```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 4. Tạo user mới (Admin)

```bash
curl -X POST http://localhost:5000/api/users \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "email": "newuser@example.com",
    "password": "password123",
    "fullName": "New User",
    "status": "active"
  }'
```

### 5. Danh sách users với pagination và search

```bash
curl -X GET "http://localhost:5000/api/users?page=1&limit=10&search=test" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 🗄️ Database Tables

Các bảng sẽ được tạo tự động khi chạy ứng dụng (nếu `DB_SYNCHRONIZE=true`):

1. **users** - Thông tin người dùng
2. **password_resets** - Token reset mật khẩu

## 🔒 Security Features

- ✅ Password hashing với bcrypt (10 rounds)
- ✅ JWT authentication (token-based, stateless) với access token và refresh token
- ✅ Soft delete cho users
- ✅ Input validation với class-validator
- ✅ CORS enabled

## ⚠️ Lưu ý

1. **JWT_SECRET**: Thay đổi giá trị mặc định trong production
2. **DB_SYNCHRONIZE**: Chỉ bật `true` trong development, tắt trong production
3. **Password Reset**: Hiện tại chỉ tạo token, chưa có email service. Cần implement email service để gửi email reset password.
4. **Role & Permission**: Sẽ được implement trong Phase 1 tiếp theo

## 🚀 Chạy ứng dụng

```bash
# Development
yarn start:dev

# Production
yarn build
yarn start:prod
```

## 📚 Next Steps

Sau khi hoàn thành Phase 1 (Auth & User), tiếp tục với:
- Role & Permission Module
- Category Module

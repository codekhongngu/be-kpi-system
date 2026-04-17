# Role & Permission Module

Module quản lý vai trò (Roles) và quyền (Permissions) cho hệ thống.

## Tổng quan

Module này cung cấp:
- Quản lý Roles (CRUD)
- Quản lý Permissions (CRUD)
- Gán permissions cho roles
- Gán roles cho users
- 3 roles hệ thống mặc định: `admin`, `manager`, `guest`

## Cấu trúc

```
role/
├── entities/
│   ├── role.entity.ts          # Role entity
│   └── permission.entity.ts     # Permission entity
├── dto/
│   ├── create-role.dto.ts
│   ├── update-role.dto.ts
│   ├── role-query.dto.ts
│   ├── update-role-permissions.dto.ts
│   ├── create-permission.dto.ts
│   ├── update-permission.dto.ts
│   └── permission-query.dto.ts
├── services/
│   ├── role.service.ts          # Role business logic
│   ├── permission.service.ts    # Permission business logic
│   └── role-seeder.service.ts   # Seed data cho roles và permissions
├── controllers/
│   ├── role.controller.ts       # Role API endpoints
│   └── permission.controller.ts  # Permission API endpoints
└── role.module.ts
```

## API Endpoints

### Roles

- `GET /api/roles` - Danh sách roles (có phân trang, search)
- `GET /api/roles/:id` - Chi tiết role
- `POST /api/roles` - Tạo role mới
- `PATCH /api/roles/:id` - Cập nhật role
- `DELETE /api/roles/:id` - Xóa role (không thể xóa system role)
- `GET /api/roles/:id/permissions` - Lấy permissions của role
- `PATCH /api/roles/:id/permissions` - Cập nhật permissions cho role

### Permissions

- `GET /api/permissions` - Danh sách permissions (có phân trang, search, filter theo category)
- `GET /api/permissions/:id` - Chi tiết permission
- `POST /api/permissions` - Tạo permission mới
- `PATCH /api/permissions/:id` - Cập nhật permission
- `DELETE /api/permissions/:id` - Xóa permission
- `GET /api/permissions/categories` - Danh sách categories

### Users (tích hợp với User Module)

- `GET /api/users/:id/permissions` - Lấy permissions của user
- `PATCH /api/users/:id/roles` - Gán roles cho user

## Roles mặc định

Module tự động tạo 3 roles hệ thống:

### 1. Admin (`admin`)
- **Mô tả**: Quản trị viên hệ thống, có tất cả quyền
- **Permissions**: Tất cả permissions

### 2. Manager (`manager`)
- **Mô tả**: Quản lý, có thể xem và phê duyệt báo cáo
- **Permissions**:
  - `users.read`
  - `reports.read`
  - `reports.update`
  - `reports.approve`
  - `reports.submit`
  - `dashboard.view`

### 3. Guest (`guest`)
- **Mô tả**: Khách, chỉ có thể xem và nộp báo cáo
- **Permissions**:
  - `reports.read`
  - `reports.submit`

## Permissions mặc định

Module tạo các permissions theo categories:

### Users
- `users.create` - Tạo người dùng
- `users.read` - Xem người dùng
- `users.update` - Cập nhật người dùng
- `users.delete` - Xóa người dùng

### Roles
- `roles.create` - Tạo vai trò
- `roles.read` - Xem vai trò
- `roles.update` - Cập nhật vai trò
- `roles.delete` - Xóa vai trò
- `roles.assign` - Gán vai trò

### Permissions
- `permissions.create` - Tạo quyền
- `permissions.read` - Xem quyền
- `permissions.update` - Cập nhật quyền
- `permissions.delete` - Xóa quyền

### Reports
- `reports.create` - Tạo báo cáo
- `reports.read` - Xem báo cáo
- `reports.update` - Cập nhật báo cáo
- `reports.delete` - Xóa báo cáo
- `reports.approve` - Phê duyệt báo cáo
- `reports.submit` - Nộp báo cáo

### Dashboard
- `dashboard.view` - Xem dashboard

## Sử dụng Guards và Decorators

### Roles Guard

```typescript
import { UseGuards } from '@nestjs/common';
import { RolesGuard, Roles } from '../../common';

@Get('admin-only')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
getAdminData() {
  return { message: 'Admin only' };
}
```

### Permissions Guard

```typescript
import { UseGuards } from '@nestjs/common';
import { PermissionsGuard, Permissions } from '../../common';

@Post('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('users.create')
createUser(@Body() dto: CreateUserDto) {
  return this.userService.create(dto);
}
```

### Kết hợp cả hai

```typescript
@Get('reports')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('admin', 'manager')
@Permissions('reports.read')
getReports() {
  return this.reportService.findAll();
}
```

## Seed Data

Để chạy seeder và tạo roles/permissions mặc định:

1. Set environment variable:
```bash
RUN_SEEDER=true
```

2. Hoặc chạy ứng dụng với flag:
```bash
RUN_SEEDER=true npm run start:dev
```

Seeder sẽ tự động:
- Tạo tất cả permissions mặc định
- Tạo 3 roles hệ thống (admin, manager, guest)
- Gán permissions cho từng role

## Lưu ý

1. **System Roles**: Không thể xóa hoặc cập nhật các system roles (`isSystem: true`)
2. **User Roles**: Khi user đăng nhập, roles và permissions sẽ được load tự động
3. **Performance**: Để tối ưu, chỉ load roles khi cần thiết bằng cách truyền `loadRelations: true` vào service methods
4. **Validation**: Tất cả DTOs đều có validation với class-validator

## Ví dụ sử dụng

### Tạo role mới

```typescript
POST /api/roles
{
  "code": "editor",
  "name": "Biên tập viên",
  "description": "Quyền biên tập nội dung"
}
```

### Gán permissions cho role

```typescript
PATCH /api/roles/:id/permissions
{
  "permissionIds": [
    "uuid-permission-1",
    "uuid-permission-2"
  ]
}
```

### Gán roles cho user

```typescript
PATCH /api/users/:id/roles
{
  "roleIds": [
    "uuid-role-1",
    "uuid-role-2"
  ]
}
```

### Lấy permissions của user

```typescript
GET /api/users/:id/permissions
// Returns: ["users.read", "reports.create", ...]
```

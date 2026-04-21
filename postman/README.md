# Postman Collections

Thư mục này chứa các Postman collections và environments để test API.

## Files

- `Role-Permission.postman_collection.json` - Collection cho module Role & Permission
- `Role-Permission.postman_environment.json` - Environment variables cho local development

## Cách sử dụng

### 1. Import vào Postman

1. Mở Postman
2. Click **Import** button
3. Chọn cả 2 files:
   - `Role-Permission.postman_collection.json`
   - `Role-Permission.postman_environment.json`
4. Click **Import**

### 2. Cấu hình Environment

1. Chọn environment **"Role & Permission - Local"** ở góc trên bên phải
2. Cập nhật các variables nếu cần:
   - `baseUrl`: URL của API server (mặc định: `http://localhost:5000/api`)
   - `accessToken`: JWT token để authenticate (lấy từ login API)

### 3. Lấy Access Token

Trước khi test các endpoints, bạn cần đăng nhập để lấy access token:

1. Sử dụng Auth collection hoặc tạo request mới:
   ```
   POST http://localhost:5000/api/auth/login
   Body:
   {
     "usernameOrEmail": "admin@example.com",
     "password": "Password@123"
   }
   ```

2. Copy `accessToken` từ response
3. Paste vào environment variable `accessToken` trong Postman

### 3.1 Refresh token (rotate)

- API `POST /api/auth/refresh-token` sẽ **cấp accessToken mới** và **cấp refreshToken mới** (rotate).
- Trong Postman collection, script test đã tự động overwrite `refreshToken` sau mỗi lần refresh.

### 3.2 Logout (revoke refresh token)

- API `POST /api/auth/logout` hỗ trợ body:
  - Có `refreshToken`: revoke đúng session hiện tại
  - Không có `refreshToken`: revoke tất cả session của user

### 4. Test các endpoints

Sau khi có access token, bạn có thể test tất cả các endpoints trong collection.

## Collection Structure

### Roles
- **Get All Roles** - Lấy danh sách roles (có phân trang, search)
- **Get Role By ID** - Lấy chi tiết role
- **Create Role** - Tạo role mới
- **Update Role** - Cập nhật role
- **Delete Role** - Xóa role
- **Get Role Permissions** - Lấy permissions của role
- **Update Role Permissions** - Gán permissions cho role

### Permissions
- **Get All Permissions** - Lấy danh sách permissions (có phân trang, search, filter category)
- **Get Permission By ID** - Lấy chi tiết permission
- **Create Permission** - Tạo permission mới
- **Update Permission** - Cập nhật permission
- **Delete Permission** - Xóa permission
- **Get Permission Categories** - Lấy danh sách categories

### Users (Roles & Permissions)
- **Get User Permissions** - Lấy tất cả permissions của user
- **Assign Roles to User** - Gán roles cho user

## Variables

### Collection Variables
- `baseUrl`: Base URL của API (mặc định: `http://localhost:5000/api`)
- `accessToken`: JWT access token

### Environment Variables
- `baseUrl`: Base URL của API
- `accessToken`: JWT access token
- `roleId`: ID của role để test (set sau khi tạo role)
- `permissionId`: ID của permission để test (set sau khi tạo permission)
- `userId`: ID của user để test roles và permissions

## Lưu ý

1. **Authentication**: Tất cả endpoints đều yêu cầu JWT authentication
2. **System Roles**: Không thể xóa hoặc cập nhật các system roles (admin, manager, guest)
3. **UUID Format**: Tất cả IDs phải là UUID format hợp lệ
4. **Code Format**: 
   - Role code: chỉ chứa chữ thường, số và dấu gạch dưới (ví dụ: `editor`, `content_manager`)
   - Permission code: chỉ chứa chữ thường, số, dấu chấm và dấu gạch dưới (ví dụ: `users.create`, `reports.export`)

## Example Workflow

1. **Login** để lấy access token
2. **Get All Roles** để xem các roles có sẵn
3. **Get All Permissions** để xem các permissions có sẵn
4. **Create Role** để tạo role mới (ví dụ: `editor`)
5. **Get Role By ID** để lấy ID của role vừa tạo
6. **Update Role Permissions** để gán permissions cho role
7. **Get User Permissions** để xem permissions của user
8. **Assign Roles to User** để gán roles cho user

## Troubleshooting

### 401 Unauthorized
- Kiểm tra `accessToken` đã được set chưa
- Kiểm tra token còn hạn không (thường là 1 giờ)
- Đăng nhập lại để lấy token mới

### 404 Not Found
- Kiểm tra `baseUrl` đúng chưa
- Kiểm tra server đang chạy không
- Kiểm tra UUID trong path parameters

### 400 Bad Request
- Kiểm tra format của request body
- Kiểm tra validation rules trong DTOs
- Xem error message trong response để biết lỗi cụ thể

### 403 Forbidden
- Kiểm tra user có đủ quyền không
- Kiểm tra roles và permissions của user

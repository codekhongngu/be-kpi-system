# Authentication – JWT Token-based (Stateless)

## Tổng quan

Hệ thống dùng **JWT (JSON Web Token)** theo mô hình **stateless**: server không lưu session, mỗi request được xác thực qua access token trong header.

## Luồng hoạt động

1. **Login** – Client gửi `usernameOrEmail` + `password` → server trả `accessToken`, `refreshToken`, `user`, `expiresIn`.
2. **Gọi API** – Client gửi `Authorization: Bearer <accessToken>`.
3. **Refresh** – Khi access token hết hạn, gửi `refreshToken` lên `POST /api/auth/refresh-token` để lấy cặp token mới.
4. **Logout** – Client xóa access/refresh token (localStorage, cookie, v.v.). Endpoint `POST /api/auth/logout` chỉ trả success, không lưu trạng thái phía server.

## Cấu hình

- `JWT_SECRET`, `JWT_EXPIRES_IN` (access token)
- `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN` (refresh token)
- `JWT_EXPIRES_IN_SECONDS` (dùng cho client)

## Nâng cấp sau (Session)

Nếu cần session (ví dụ: tracking đăng nhập, logout thật sự phía server, audit):

- Thêm entity/store session (DB hoặc Redis).
- Login: tạo session, gắn với user/token.
- Logout: xóa hoặc vô hiệu hóa session.
- Trong JWT strategy (hoặc guard): kiểm tra session còn hiệu lực trước khi chấp nhận token.

Có thể tham khảo thiết kế session trong `BACKEND_MODULES.md` (phần Auth) khi nâng cấp.

# Postman Workspace

Thư mục `postman/` chứa collection tách riêng theo từng module và environment cho môi trường dev.

## Cấu trúc file

- `auth.json`
- `user.json`
- `organizations-admin.json`
- `rbac-qldl.json`
- `form-designer-qldl.json`
- `assignments-submissions-approvals-qldl.json`
- `monitoring-query-notifications-analytics-qldl.json`
- `dev.environment.json`

## Environment dev

- File: `dev.environment.json`
- `baseUrl`: `http://localhost:5005`
- Có sẵn các biến dùng chung: `accessToken`, `refreshToken`, `formId`, `fieldCategoryId`, ...

## Cách import

1. Import `dev.environment.json`.
2. Import các collection module cần test (ví dụ `auth.json`, `form-designer-qldl.json`).
3. Chọn environment `Starter BE Dev`.

## Auth token tự động

Trong `auth.json`, request `Login` có test script:

- đọc response login
- tự động lưu `accessToken` vào **environment** (`pm.environment.set('accessToken', ...)`)
- nếu có `refreshToken` thì cũng lưu vào environment

Vì vậy sau khi login thành công, các request khác dùng `Bearer {{accessToken}}` chạy được ngay.

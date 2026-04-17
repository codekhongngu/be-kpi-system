# Tài liệu Phân tích Module Backend

## Tổng quan dự án

Hệ thống báo cáo quản lý chỉ tiêu (KPI/Indicator Reporting System) với các tính năng:

- Xác thực và phân quyền người dùng
- Quản lý biểu mẫu báo cáo theo kỳ (năm/quý/tháng)
- Nhập liệu phân tán theo phòng ban
- Chỉ tiêu giao thoa nhiều phòng ban
- Tổng hợp và tính toán tự động
- Workflow phê duyệt báo cáo
- Dashboard thống kê

---

## Phân tích Module Frontend → Backend

### 1. Authentication Module (Xác thực)

#### Frontend Features:

- Login/Logout
- Protected Routes
- Token Management (JWT, stateless)

#### Backend Module: **Auth Module**

**Các API cần thiết:**

```
POST   /api/auth/login              - Đăng nhập
POST   /api/auth/logout             - Đăng xuất
POST   /api/auth/refresh-token      - Làm mới token
GET    /api/auth/me                 - Lấy thông tin user hiện tại
POST   /api/auth/change-password    - Đổi mật khẩu
POST   /api/auth/forgot-password    - Quên mật khẩu
POST   /api/auth/reset-password     - Reset mật khẩu
```

**Database Tables:**

- `users` (username, email, password_hash, status, etc.)
- `password_resets` (email, token, expires_at)

**Dependencies:**

- JWT Token Service (access + refresh token)
- Password Hashing (bcrypt)

**Ghi chú:** Auth theo mô hình JWT token-based, stateless. Logout thực hiện phía client (hủy token). Nếu cần session/tracking sau này có thể nâng cấp thêm.

---

### 2. User Management Module (Quản lý người dùng)

#### Frontend Features:

- Danh sách users
- Thêm/Sửa/Xóa users
- Gán roles cho users
- Quản lý trạng thái (active/inactive)
- Xem thông tin chi tiết user

#### Backend Module: **User Module**

**Các API cần thiết:**

```
GET    /api/users                   - Danh sách users (có phân trang, filter, search)
GET    /api/users/:id               - Chi tiết user
POST   /api/users                   - Tạo user mới
PUT    /api/users/:id               - Cập nhật user
DELETE /api/users/:id               - Xóa user
PUT    /api/users/:id/status        - Thay đổi trạng thái
PUT    /api/users/:id/roles        - Gán roles cho user
GET    /api/users/:id/permissions   - Lấy danh sách permissions của user
GET    /api/users/departments/:deptId - Users theo phòng ban
```

**Database Tables:**

- `users` (id, username, email, full_name, phone, department_id, status, created_at, updated_at, last_login)
- `user_roles` (user_id, role_id) - Many-to-Many

**Dependencies:**

- Role Module (để gán roles)
- Department Module (để filter theo phòng ban)

---

### 3. Role & Permission Module (Quản lý vai trò và quyền)

#### Frontend Features:

- Quản lý roles (CRUD)
- Quản lý permissions (CRUD)
- Phân quyền cho roles
- Xem danh sách permissions theo category

#### Backend Module: **Role & Permission Module**

**Các API cần thiết:**

**Roles:**

```
GET    /api/roles                   - Danh sách roles
GET    /api/roles/:id              - Chi tiết role
POST   /api/roles                  - Tạo role mới
PUT    /api/roles/:id              - Cập nhật role
DELETE /api/roles/:id              - Xóa role (chỉ role không phải system)
GET    /api/roles/:id/permissions  - Permissions của role
PUT    /api/roles/:id/permissions  - Cập nhật permissions cho role
```

**Permissions:**

```
GET    /api/permissions            - Danh sách permissions (có filter theo category)
GET    /api/permissions/:id        - Chi tiết permission
POST   /api/permissions            - Tạo permission mới
PUT    /api/permissions/:id        - Cập nhật permission
DELETE /api/permissions/:id        - Xóa permission
GET    /api/permissions/categories - Danh sách categories
```

**Database Tables:**

- `roles` (id, code, name, description, is_system, created_at, updated_at)
- `permissions` (id, code, name, description, category, created_at, updated_at)
- `role_permissions` (role_id, permission_id) - Many-to-Many
- `user_roles` (user_id, role_id) - Many-to-Many

**Dependencies:**

- User Module (để kiểm tra user có role nào)

---

### 4. Category Management Module (Quản lý danh mục)

#### Frontend Features:

- Quản lý categories (Phòng ban, Loại chỉ tiêu, Loại kỳ báo cáo)
- CRUD categories
- CRUD items trong category
- Hỗ trợ nested items

#### Backend Module: **Category Module**

**Các API cần thiết:**

```
GET    /api/categories             - Danh sách categories
GET    /api/categories/:id         - Chi tiết category
POST   /api/categories             - Tạo category mới
PUT    /api/categories/:id         - Cập nhật category
DELETE /api/categories/:id         - Xóa category

GET    /api/categories/:id/items   - Danh sách items trong category
GET    /api/categories/:id/items/:itemId - Chi tiết item
POST   /api/categories/:id/items   - Thêm item vào category
PUT    /api/categories/:id/items/:itemId - Cập nhật item
DELETE /api/categories/:id/items/:itemId - Xóa item

GET    /api/categories/type/:type  - Categories theo type (department, indicator, period)
```

**Database Tables:**

- `categories` (id, code, name, description, type, created_at, updated_at)
- `category_items` (id, category_id, code, name, parent_id, order, created_at, updated_at)

**Dependencies:**

- Có thể được sử dụng bởi Reporting Module (để lấy danh sách departments, indicator types)

---

### 5. Reporting Module (Hệ thống báo cáo)

#### Frontend Features:

- Dashboard báo cáo
- Quản lý biểu mẫu (Forms)
- Quản lý chỉ tiêu (Indicators)
- Phân công chỉ tiêu cho phòng ban
- Nhập liệu báo cáo
- Tổng hợp và tính toán
- Phê duyệt báo cáo
- Thống kê và dashboard

#### Backend Module: **Reporting Module** (Có thể chia thành sub-modules)

#### 5.1. Form Management Sub-module

**Các API cần thiết:**

```
GET    /api/forms                   - Danh sách forms (có filter, search, pagination)
GET    /api/forms/:id               - Chi tiết form
POST   /api/forms                   - Tạo form mới
PUT    /api/forms/:id               - Cập nhật form
DELETE /api/forms/:id               - Xóa form
PUT    /api/forms/:id/status        - Thay đổi trạng thái form
GET    /api/forms/:id/indicators    - Chỉ tiêu trong form
PUT    /api/forms/:id/indicators    - Cập nhật chỉ tiêu cho form
```

**Database Tables:**

- `forms` (id, code, name, year, period, period_type, status, created_by, created_at, updated_at)
- `form_indicators` (form_id, indicator_id, assigned_departments, is_cross_department, weight, order)

#### 5.2. Indicator Management Sub-module

**Các API cần thiết:**

```
GET    /api/indicators             - Danh sách indicators
GET    /api/indicators/:id         - Chi tiết indicator
POST   /api/indicators             - Tạo indicator mới
PUT    /api/indicators/:id         - Cập nhật indicator
DELETE /api/indicators/:id        - Xóa indicator
GET    /api/indicators/categories  - Indicators theo category
```

**Database Tables:**

- `indicators` (id, code, name, unit, type, category, calculation_type, description, created_at, updated_at)

#### 5.3. Submission Management Sub-module

**Các API cần thiết:**

```
GET    /api/submissions            - Danh sách submissions (có filter theo form, department, status)
GET    /api/submissions/:id        - Chi tiết submission
POST   /api/submissions            - Tạo submission (nhập liệu)
PUT    /api/submissions/:id        - Cập nhật submission
DELETE /api/submissions/:id        - Xóa submission
POST   /api/submissions/:id/submit - Nộp báo cáo
GET    /api/submissions/form/:formId - Submissions theo form
GET    /api/submissions/department/:deptId - Submissions theo phòng ban
GET    /api/submissions/user/:userId - Submissions của user
```

**Database Tables:**

- `submissions` (id, form_id, department_id, user_id, status, submitted_at, approved_at, approved_by, rejected_at, rejected_by, reject_reason, created_at, updated_at)
- `submission_data` (id, submission_id, indicator_id, value, note, created_at, updated_at)

#### 5.4. Approval Management Sub-module

**Các API cần thiết:**

```
GET    /api/approvals              - Danh sách approvals (chờ phê duyệt)
GET    /api/approvals/:id          - Chi tiết approval
POST   /api/approvals/:id/approve  - Phê duyệt báo cáo
POST   /api/approvals/:id/reject   - Từ chối báo cáo (yêu cầu bổ sung)
GET    /api/approvals/pending     - Danh sách chờ phê duyệt
GET    /api/approvals/form/:formId - Approvals theo form
POST   /api/approvals/:id/aggregate - Tổng hợp dữ liệu báo cáo
```

**Database Tables:**

- `approvals` (id, form_id, status, submitted_at, total_departments, submitted_departments, pending_departments, approved_at, approved_by, rejected_at, rejected_by, reject_reason, created_at, updated_at)
- `approval_aggregated_data` (id, approval_id, indicator_id, value, target, achievement, created_at)

#### 5.5. Statistics & Dashboard Sub-module

**Các API cần thiết:**

```
GET    /api/statistics/dashboard   - Thống kê tổng quan dashboard
GET    /api/statistics/forms      - Thống kê theo forms
GET    /api/statistics/indicators - Thống kê theo indicators
GET    /api/statistics/departments - Thống kê theo phòng ban
GET    /api/statistics/users      - Thống kê theo users
GET    /api/statistics/period     - Thống kê theo kỳ báo cáo
GET    /api/statistics/completion - Tỷ lệ hoàn thành
GET    /api/statistics/approval-rate - Tỷ lệ phê duyệt
```

**Database Tables:**

- Sử dụng các bảng hiện có, có thể tạo view hoặc materialized views để tối ưu query

---

### 6. Department Module (Quản lý phòng ban)

#### Frontend Features:

- Sử dụng từ Category Module (category type = 'department')

#### Backend Module: **Department Module** (Có thể tích hợp vào Category hoặc tách riêng)

**Các API cần thiết:**

```
GET    /api/departments            - Danh sách phòng ban
GET    /api/departments/:id       - Chi tiết phòng ban
POST   /api/departments            - Tạo phòng ban mới
PUT    /api/departments/:id       - Cập nhật phòng ban
DELETE /api/departments/:id       - Xóa phòng ban
GET    /api/departments/:id/users - Users trong phòng ban
GET    /api/departments/:id/forms - Forms được phân công cho phòng ban
```

**Database Tables:**

- `departments` (id, code, name, description, parent_id, manager_id, created_at, updated_at)
- Hoặc sử dụng `category_items` với `category_id` = department category

**Dependencies:**

- User Module (để gán manager)
- Category Module (nếu tích hợp)

---

## Tổng kết Module Backend

### Số lượng Module chính: **6 Modules**

1. **Auth Module** - Xác thực và quản lý session
2. **User Module** - Quản lý người dùng
3. **Role & Permission Module** - Quản lý vai trò và quyền
4. **Category Module** - Quản lý danh mục hệ thống
5. **Reporting Module** - Hệ thống báo cáo (5 sub-modules)
   - Form Management
   - Indicator Management
   - Submission Management
   - Approval Management
   - Statistics & Dashboard
6. **Department Module** - Quản lý phòng ban (có thể tích hợp vào Category)

### Tổng số API Endpoints: **~60-70 endpoints**

### Database Tables chính: **~20-25 tables**

---

## Kiến trúc Backend đề xuất

### Cấu trúc thư mục:

```
backend/
├── modules/
│   ├── auth/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── models/
│   │   ├── routes/
│   │   └── middleware/
│   ├── user/
│   ├── role/
│   ├── category/
│   ├── reporting/
│   │   ├── forms/
│   │   ├── indicators/
│   │   ├── submissions/
│   │   ├── approvals/
│   │   └── statistics/
│   └── department/
├── shared/
│   ├── database/
│   ├── middleware/
│   ├── utils/
│   └── validators/
└── config/
```

### Technology Stack đề xuất:

- **Framework:** Nestjs 10
- **Database:** PostgreSQL
- **Authentication:** JWT (JSON Web Tokens)
- **ORM:** Sequelize/TypeORM (Node.js)
- **Validation:** Joi/Yup (Node.js)
- **API Documentation:** Swagger

### Security:

- JWT Authentication
- Role-Based Access Control (RBAC)
- Permission-based authorization
- Password hashing (bcrypt)
- SQL Injection prevention (ORM)
- XSS protection
- CORS configuration
- Rate limiting

### Performance:

- Database indexing
- Query optimization
- Caching (Redis) cho statistics
- Pagination cho danh sách
- Lazy loading cho relationships

---

## Workflow Integration

### Flow hoạt động:

1. **Khởi tạo biểu mẫu:**

   - Form Module → Tạo form
   - Indicator Module → Gán indicators
   - Form-Indicator Assignment → Phân công departments
2. **Phân tiêu chí cho phòng ban:**

   - Form Module → Update form_indicators với assigned_departments
3. **Phòng ban nhập liệu:**

   - Submission Module → Tạo submission
   - Submission Data → Lưu dữ liệu theo indicators
4. **Submit:**

   - Submission Module → Update status = 'submitted'
   - Approval Module → Tạo approval record
5. **Tổng hợp tự động:**

   - Approval Module → Aggregate data từ submissions
   - Tính toán theo calculation_type (sum, average, etc.)
6. **Trình lãnh đạo:**

   - Approval Module → List pending approvals
   - Statistics Module → Generate dashboard data
7. **Phê duyệt / Yêu cầu bổ sung:**

   - Approval Module → Approve/Reject
   - Notification → Thông báo cho departments

---

## Dependencies giữa các Module

```
Auth Module
    ↓
User Module ← Role & Permission Module
    ↓
Category Module ← Department Module
    ↓
Reporting Module
    ├── Form Module (uses: Indicator, Department)
    ├── Indicator Module (uses: Category)
    ├── Submission Module (uses: Form, Indicator, Department, User)
    ├── Approval Module (uses: Form, Submission)
    └── Statistics Module (uses: Form, Submission, Approval)
```

---

## Ưu tiên phát triển

### Phase 1: Foundation (Tuần 1-2)

1. Auth Module
2. User Module
3. Role & Permission Module
4. Category Module

### Phase 2: Core Features (Tuần 3-4)

1. Form Management
2. Indicator Management
3. Submission Management

### Phase 3: Advanced Features (Tuần 5-6)

1. Approval Management
2. Statistics & Dashboard
3. Department Module (nếu tách riêng)

### Phase 4: Optimization (Tuần 7-8)

1. Performance optimization
2. Caching
3. Testing
4. Documentation

---

## Notes

- Tất cả API cần có authentication middleware
- Các API quản lý cần có permission check
- Implement soft delete cho các bảng quan trọng
- Logging cho audit trail
- Validation cho tất cả input
- Error handling chuẩn hóa
- API versioning (v1, v2, ...)

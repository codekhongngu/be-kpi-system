# Tóm tắt Module Backend

## Tổng quan

Dự án **Hệ thống báo cáo quản lý chỉ tiêu (KPI/Indicator Reporting System)** cần **6 Module Backend chính** với **~60-70 API endpoints** và **~20-25 database tables**.

---

## Danh sách Module Backend

### 1. Auth Module (Xác thực)

- **Mục đích:** Quản lý đăng nhập, đăng xuất, token (JWT token-based, stateless)
- **API:** 7 endpoints
- **Tables:** users, password_resets
- **Ưu tiên:** ⭐⭐⭐⭐⭐ (Cao nhất)

### 2. User Module (Quản lý người dùng)

- **Mục đích:** CRUD users, gán roles, quản lý trạng thái
- **API:** 8 endpoints
- **Tables:** users, user_roles
- **Ưu tiên:** ⭐⭐⭐⭐⭐

### 3. Role & Permission Module (Vai trò & Quyền)

- **Mục đích:** Quản lý roles, permissions, phân quyền
- **API:** 12 endpoints (6 roles + 6 permissions)
- **Tables:** roles, permissions, role_permissions, user_roles
- **Ưu tiên:** ⭐⭐⭐⭐⭐

### 4. Category Module (Danh mục)

- **Mục đích:** Quản lý danh mục hệ thống (phòng ban, loại chỉ tiêu, kỳ báo cáo)
- **API:** 10 endpoints
- **Tables:** categories, category_items
- **Ưu tiên:** ⭐⭐⭐⭐

### 5. Reporting Module (Báo cáo) - **Module lớn nhất**

Chia thành 5 sub-modules:

#### 5.1. Form Management

- **API:** 7 endpoints
- **Tables:** forms, form_indicators
- **Ưu tiên:** ⭐⭐⭐⭐⭐

#### 5.2. Indicator Management

- **API:** 6 endpoints
- **Tables:** indicators
- **Ưu tiên:** ⭐⭐⭐⭐

#### 5.3. Submission Management

- **API:** 8 endpoints
- **Tables:** submissions, submission_data
- **Ưu tiên:** ⭐⭐⭐⭐⭐

#### 5.4. Approval Management

- **API:** 7 endpoints
- **Tables:** approvals, approval_aggregated_data
- **Ưu tiên:** ⭐⭐⭐⭐

#### 5.5. Statistics & Dashboard

- **API:** 8 endpoints
- **Tables:** Sử dụng views/materialized views
- **Ưu tiên:** ⭐⭐⭐

### 6. Department Module (Phòng ban)

- **Mục đích:** Quản lý phòng ban (có thể tích hợp vào Category)
- **API:** 6 endpoints
- **Tables:** departments (hoặc dùng category_items)
- **Ưu tiên:** ⭐⭐⭐

---

## Thống kê

| Module                  | Số API      | Số Tables   | Ưu tiên  |
| ----------------------- | ------------ | ------------ | ---------- |
| Auth                    | 7            | 2            | ⭐⭐⭐⭐⭐ |
| User                    | 8            | 2            | ⭐⭐⭐⭐⭐ |
| Role & Permission       | 12           | 4            | ⭐⭐⭐⭐⭐ |
| Category                | 10           | 2            | ⭐⭐⭐⭐   |
| Reporting - Forms       | 7            | 2            | ⭐⭐⭐⭐⭐ |
| Reporting - Indicators  | 6            | 1            | ⭐⭐⭐⭐   |
| Reporting - Submissions | 8            | 2            | ⭐⭐⭐⭐⭐ |
| Reporting - Approvals   | 7            | 2            | ⭐⭐⭐⭐   |
| Reporting - Statistics  | 8            | 0*           | ⭐⭐⭐     |
| Department              | 6            | 1            | ⭐⭐⭐     |
| **TỔNG**         | **79** | **19** |            |

*Statistics sử dụng views, không tạo table mới

---

## Lộ trình phát triển (8 tuần)

### Phase 1: Foundation (Tuần 1-2)

✅ Auth Module
✅ User Module
✅ Role & Permission Module
✅ Category Module

### Phase 2: Core Features (Tuần 3-4)

✅ Form Management
✅ Indicator Management
✅ Submission Management

### Phase 3: Advanced Features (Tuần 5-6)

✅ Approval Management
✅ Statistics & Dashboard
✅ Department Module

### Phase 4: Optimization (Tuần 7-8)

✅ Performance optimization
✅ Caching
✅ Testing
✅ Documentation

---

## Technology Stack đề xuất

- **Backend Framework:** Node.js (NestJS) / Python (Django) / Java (Spring Boot)
- **Database:** PostgreSQL (recommended)
- **Authentication:** JWT
- **ORM:** TypeORM / Sequelize / Django ORM / Hibernate
- **Cache:** Redis
- **API Docs:** Swagger/OpenAPI

---

## Dependencies

```
Auth → User → Role & Permission
                ↓
Category → Department
                ↓
Reporting Module (Forms → Indicators → Submissions → Approvals → Statistics)
```

---

## Notes quan trọng

1. **Security:** Tất cả API cần authentication + permission check
2. **Validation:** Validate tất cả input data
3. **Error Handling:** Chuẩn hóa error response
4. **Logging:** Audit trail cho các thao tác quan trọng
5. **Soft Delete:** Không xóa cứng dữ liệu quan trọng
6. **Pagination:** Tất cả danh sách cần phân trang
7. **Caching:** Cache cho statistics và dashboard
8. **API Versioning:** Hỗ trợ v1, v2, ...

---

## Tài liệu chi tiết

Xem file `BACKEND_MODULES.md` để biết chi tiết về:

- API endpoints đầy đủ
- Database schema
- Request/Response examples
- Business logic
- Integration flows

# Luồng Nghiệp Vụ Hệ Thống KPI - 2 Cấp Phê Duyệt

> Tài liệu mô tả chi tiết luồng nghiệp vụ hệ thống quản lý KPI với cơ chế phê duyệt 2 cấp độ
> Cập nhật: 2026-05-11

---

## 1. Tổng Quan Luồng Nghiệp Vụ

Hệ thống hỗ trợ luồng phê duyệt báo cáo KPI 2 cấp độ:
- **Cấp 1**: Trưởng phòng ban (Manager) duyệt báo cáo từ nhân viên
- **Cấp 2**: Cấp xã (Admin) duyệt báo cáo sau khi đã được phòng ban duyệt
- **Mục tiêu**: Đảm bảo chất lượng dữ liệu và phân cấp quản lý rõ ràng

---

## 2. Các Vai Trò và Quyền Hạn

### 2.1 Staff (Nhân viên nhập liệu)
- **Quyền chính**: Nhập liệu và nộp báo cáo
- **Quy trình**: Nhập liệu → Lưu nháp → Nộp báo cáo
- **Hạn chế**: Không thể duyệt báo cáo, chỉ xem báo cáo của mình

### 2.2 Manager (Trưởng phòng ban)
- **Quyền chính**: Phê duyệt/từ chối báo cáo cấp phòng ban
- **Phạm vi**: Chỉ xem và duyệt các submission trong đơn vị của mình
- **Quy trình**: Xem báo cáo chờ duyệt → Phê duyệt/Từ chối → Chuyển lên cấp xã

### 2.3 Admin (Cấp xã)
- **Quyền chính**: Phê duyệt/từ chối báo cáo cấp xã, tổng hợp báo cáo
- **Phạm vi**: Xem tất cả các submission đã được phòng ban duyệt
- **Quy trình**: Xem báo cáo đã duyệt phòng ban → Phê duyệt/Từ chối → Tổng hợp

---

## 3. Trạng Thái Submission và Quy Trình

### 3.1 State Machine

```
DRAFT → PENDING_DEPARTMENT → DEPARTMENT_APPROVED → PENDING_DISTRICT → DISTRICT_APPROVED
               ↘ REJECTED_DEPARTMENT              ↘ REJECTED_DISTRICT
```

### 3.2 Chi Tiết Trạng Thái

| Trạng Thái | Ai Có Thể Thao Tác | Hành Động Cho Phép | Mô Tả Chi Tiết |
|-----------|-------------------|-------------------|----------------|
| **DRAFT** | Staff | - Nhập liệu<br>- Lưu nháp<br>- Nộp báo cáo | Báo cáo đang được soạn thảo, dữ liệu có thể sửa đổi |
| **PENDING_DEPARTMENT** | Manager | - Phê duyệt<br>- Từ chối | Đã nộp, chờ trưởng phòng ban duyệt |
| **DEPARTMENT_APPROVED** | Admin | - Xem chi tiết<br>- Phê duyệt cấp xã<br>- Từ chối cấp xã | Đã duyệt phòng ban, chờ cấp xã duyệt |
| **PENDING_DISTRICT** | Admin | - Phê duyệt<br>- Từ chối | Đã duyệt phòng ban, đang chờ cấp xã duyệt |
| **DISTRICT_APPROVED** | System | - Tổng hợp<br>- Xuất báo cáo | Đã duyệt 2 cấp, dữ liệu hợp lệ để tổng hợp |
| **REJECTED_DEPARTMENT** | Staff | - Sửa dữ liệu<br>- Nộp lại | Bị trưởng phòng từ chối, cần sửa lại |
| **REJECTED_DISTRICT** | Staff | - Sửa dữ liệu<br>- Nộp lại | Bị cấp xã từ chối, cần sửa lại từ đầu |

---

## 4. Quy Trình Chi Tiết Theo Vai Trò

### 4.1 Quy Trình Staff (Nhân viên)

#### Bước 1: Xem Danh Sách Assignment
```
GET /api/v1/submissions/my-assignments
```
- Hiển thị các assignments được giao cho phòng ban
- Trạng thái: Chưa bắt đầu, Đang soạn thảo, Đã nộp, Bị từ chối

#### Bước 2: Nhập Liệu
```
GET /api/v1/submissions/by-assignment/:assignmentId
PATCH /api/v1/submissions/:id/cells
```
- Mở assignment để nhập liệu
- Lưu nháp tự động
- Validate dữ liệu theo quy tắc template

#### Bước 3: Nộp Báo Cáo
```
POST /api/v1/submissions/:id/submit
```
- Kiểm tra dữ liệu bắt buộc
- Chuyển trạng thái thành PENDING_DEPARTMENT
- Gửi thông báo cho Manager

#### Bước 4: Xử Lý Phản Hồi
- Nếu bị từ chối: Sửa dữ liệu theo lý do và nộp lại
- Nếu được duyệt: Chờ tổng hợp cuối cấp

### 4.2 Quy Trình Manager (Trưởng phòng)

#### Bước 1: Xem Báo Cáo Chờ Duyệt
```
GET /api/v1/submissions/pending-department
```
- Lọc theo đơn vị của mình
- Sắp xếp theo thời gian nộp

#### Bước 2: Xem Chi Tiết Báo Cáo
```
GET /api/v1/submissions/:id
```
- Xem dữ liệu đã nhập
- So sánh với default values (nếu có)
- Kiểm tra tính hợp lệ

#### Bước 3: Phê Duyệt/Từ Chối
```
POST /api/v1/submissions/:id/approve-department
POST /api/v1/submissions/:id/reject-department
```
- Nếu duyệt: Chuyển DEPARTMENT_APPROVED, thông báo Admin
- Nếu từ chối: REJECTED_DEPARTMENT, yêu cầu Staff sửa lại

#### Bước 4: Quản Lý Tổng Thể
- Xem thống kê submissions trong phòng ban
- Nhắc nhốc các submission quá hạn
- Báo cáo tiến độ cho cấp trên

### 4.3 Quy Trình Admin (Cấp xã)

#### Bước 1: Xem Báo Cáo Đã Duyệt Phòng Ban
```
GET /api/v1/submissions/department-approved
```
- Xem tất cả các submission đã được phòng ban duyệt
- Lọc theo khoảng thời gian, đơn vị

#### Bước 2: Xem Chi Tiết và Duyệt Cấp Xã
```
GET /api/v1/submissions/:id
POST /api/v1/submissions/:id/approve-district
POST /api/v1/submissions/:id/reject-district
```
- Kiểm tra lại dữ liệu cuối cùng
- Nếu duyệt: DISTRICT_APPROVED, sẵn sàng tổng hợp
- Nếu từ chối: REJECTED_DISTRICT, quay về Staff

#### Bước 3: Tổng Hợp Báo Cáo
```
POST /api/v1/summaries/generate
GET /api/v1/summaries
```
- Chỉ tổng hợp các submission DISTRICT_APPROVED
- Tạo báo cáo tổng hợp cấp xã
- Xuất báo cáo theo định dạng yêu cầu

---

## 5. Quy Tắc Kinh Doanh (Business Rules)

### 5.1 Quy Tắc Phê Duyệt
1. **Tuần tự**: Phải duyệt phòng ban trước, mới duyệt cấp xã
2. **Phạm vi**: Manager chỉ duyệt được submission trong org của mình
3. **Không sửa sau duyệt**: Dữ liệu không thể sửa sau khi đã được duyệt ở bất kỳ cấp nào
4. **Audit trail**: Lưu lịch sử duyệt ở từng cấp (ai, khi nào, lý do)

### 5.2 Quy Tắc Dữ Liệu
1. **Validation**: Validate theo cell_config của template
2. **Required fields**: Kiểm tra các trường bắt buộc trước khi nộp
3. **Default values**: Ô có default value không thể sửa
4. **Formula**: Ô có công thức tính tự động không thể sửa

### 5.3 Quy Tắc Thông Báo
1. **Tự động**: Hệ thống tự động gửi thông báo khi có state transition
2. **Đúng người**: Gửi cho người có quyền và trong phạm vi phù hợp
3. **Nội dung rõ ràng**: Ghi rõ hành động và lý do (nếu có)

---

## 6. Các Tình Huống Đặc Biệt

### 6.1 Báo Cáo Quá Hạn
- Staff vẫn có thể nộp báo cáo quá hạn
- Manager/Admin có thể xem danh sách báo cáo trễ
- Hệ thống không tự động từ chối báo cáo trễ

### 6.2 Hủy Báo Cáo
```
POST /api/v1/submissions/:id/cancel-submit
```
- Chỉ được hủy khi đang ở trạng thái PENDING_*
- Quay về trạng thái DRAFT để tiếp tục sửa

### 6.3 Thay Đổi Assignment
- Nếu assignment bị hủy, các submission liên quan bị đánh dấu CANCELLED
- Staff không thể tiếp tục làm việc với assignment đã hủy

### 6.4 Duyệt Hàng Loạt
- Manager có thể duyệt nhiều báo cáo cùng lúc
- Admin có thể duyệt hàng loạt các báo cáo đã duyệt phòng ban
- Cần xác nhận trước khi duyệt hàng loạt

---

## 7. Kịch Bản Use Case

### 7.1 Kịch Bản 1: Luồng Bình Thường
1. Staff A nhận assignment "Báo cáo tháng 1"
2. Staff A nhập liệu, lưu nháp nhiều lần
3. Staff A nộp báo cáo → PENDING_DEPARTMENT
4. Manager B nhận thông báo, xem báo cáo
5. Manager B duyệt → DEPARTMENT_APPROVED
6. Admin C nhận thông báo, xem lại báo cáo
7. Admin C duyệt → DISTRICT_APPROVED
8. Hệ thống tự động đưa vào tổng hợp

### 7.2 Kịch Bản 2: Bị Từ Chối Cấp Phòng Ban
1. Staff A nộp báo cáo → PENDING_DEPARTMENT
2. Manager B từ chối với lý do "Sai số liệu cột X"
3. Báo cáo → REJECTED_DEPARTMENT
4. Staff A nhận thông báo, sửa lại số liệu
5. Staff A nộp lại → PENDING_DEPARTMENT
6. Manager B duyệt → DEPARTMENT_APPROVED
7. Tiếp tục luồng bình thường

### 7.3 Kịch Bản 3: Bị Từ Chối Cấp Xã
1. Staff A nộp → Manager B duyệt → DEPARTMENT_APPROVED
2. Admin C từ chối với lý do "Không phù hợp quy định"
3. Báo cáo → REJECTED_DISTRICT
4. Staff A nhận thông báo, sửa lại toàn bộ
5. Staff A nộp lại → PENDING_DEPARTMENT (bắt đầu lại từ đầu)

---

## 8. Metrics và KPIs

### 8.1 Metrics Hiệu Suất
- **Thời gian xử lý trung bình**: Từ khi nộp đến khi duyệt xong
- **Tỷ lệ từ chối**: Số lần từ chối / tổng số lần nộp
- **Thời gian phản hồi**: Thời gian Manager/Admin xử lý báo cáo

### 8.2 Metrics Chất Lượng
- **Số lần sửa lại**: Trung bình mỗi báo cáo phải sửa mấy lần
- **Lý do từ chối phổ biến**: Phân tích các lỗi thường gặp
- **Độ hoàn thiện**: Tỷ lệ các trường được điền đầy đủ

### 8.3 Metrics Tuân Thủ
- **Tỷ lệ nộp đúng hạn**: Số báo cáo nộp đúng hạn / tổng số
- **Thời gian trễ trung bình**: Nếu trễ hạn, trung bình trễ bao nhiêu ngày

---

## 9. Tích Hợp Hệ Thống

### 9.1 Tích Hợp Frontend
- **Dashboard**: Hiển thị số lượng báo cáo theo trạng thái
- **Notifications**: Real-time notifications khi có báo cáo mới
- **Reports**: Export ra Excel/PDF các báo cáo đã duyệt

### 9.2 Tích Hợp Email
- **Email reminders**: Tự động gửi email nhắc hạn
- **Email notifications**: Gửi email khi có báo cáo chờ duyệt
- **Email summaries**: Gửi báo cáo tổng hợp định kỳ

### 9.3 Tích Hợp Audit
- **Audit logs**: Ghi lại tất cả các hành động quan trọng
- **Change tracking**: Theo dõi thay đổi dữ liệu
- **Compliance reports**: Báo cáo tuân thủ cho kiểm toán

---

## 10. Lộ Trình Phát Triển

### Phase 1: Core Features (4 tuần)
- [ ] Database schema changes
- [ ] Update submission state machine
- [ ] Basic approval endpoints
- [ ] Unit tests

### Phase 2: Integration (3 tuần)
- [ ] Update notification system
- [ ] Role/permission updates
- [ ] Frontend integration
- [ ] Integration tests

### Phase 3: Advanced Features (3 tuần)
- [ ] Bulk approval operations
- [ ] Approval history tracking
- [ ] Analytics dashboard
- [ ] Performance optimization

### Phase 4: Deployment & Training (2 tuần)
- [ ] Production deployment
- [ ] User training materials
- [ ] Documentation finalization
- [ ] Go-live support

---

## 11. Rủi Ro và Giải Pháp

### 11.1 Rủi Ro Kỹ Thuật
- **Performance**: Tăng số lượng submissions có thể chậm hệ thống
  - *Giải pháp*: Optimize queries, add indexes, implement caching
- **Data consistency**: Race conditions khi nhiều người duyệt cùng lúc
  - *Giải pháp*: Database transactions, optimistic locking

### 11.2 Rủi Ro Nghiệp Vụ
- **User adoption**: Người dùng quen với luồng cũ
  - *Giải pháp*: Training, user guides, gradual rollout
- **Process bottlenecks**: Manager/Admin quá tải
  - *Giải pháp*: Bulk approval, notifications, workload balancing

### 11.3 Rủi Ro Bảo Mật
- **Unauthorized access**: Người dùng duyệt ngoài phạm vi
  - *Giải pháp*: Strict permission checks, audit logs
- **Data tampering**: Thay đổi dữ liệu sau khi duyệt
  - *Giải pháp*: Immutable records, audit trails

---

## 12. Kết Luận

Luồng nghiệp vụ 2 cấp phê duyệt mang lại:
- **Kiểm soát chất lượng tốt hơn**: 2 lớp kiểm tra dữ liệu
- **Phân cấp rõ ràng**: Trách nhiệm cụ thể cho từng vai trò
- **Audit trail hoàn chỉnh**: Theo dõi toàn bộ quy trình
- **Scalability**: Hỗ trợ tổ chức lớn phức tạp

Việc triển khai cần được thực hiện theo từng phase để đảm bảo:
- Gián đoạn hoạt động tối thiểu
- Người dùng có thời gian thích nghi
- Hệ thống ổn định và hiệu quả

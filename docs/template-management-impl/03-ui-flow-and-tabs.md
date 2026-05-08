# 03. Luồng UI và thiết kế theo tab

## 1. List page
### Mục tiêu
- Cho lọc, tìm kiếm, phân trang, tạo mới, vào detail, sửa metadata nhanh.

### Thành phần
- Search box
- Filter trạng thái
- Filter kỳ báo cáo
- Filter lĩnh vực
- Table danh sách
- Pagination
- Modal thông tin chung

### Cột table tối thiểu
- Mã biểu mẫu
- Tên biểu mẫu
- Loại template
- Trạng thái lifecycle
- Kỳ báo cáo
- Lĩnh vực
- Hoạt động
- Thao tác

### Hành vi
- Nút tạo mới mở modal.
- Menu thao tác phải được giới hạn theo status.
- Không cho chỉnh lifecycle trong modal.

## 2. Detail page
### Mục tiêu
- Là màn hình designer.
- Có action bar rõ ràng.
- Có metadata summary và tabs.

### Layout
- Cột trái:
  - metadata
  - status badge
  - action bar
- Cột phải:
  - tabs

### Tabs bắt buộc
- `Chỉ tiêu`
- `Thuộc tính`
- `Cấu hình ô`
- `Phạm vi mẫu`
- `Xem trước`

### Tab cần loại bỏ hoặc thay thế
- Tab `Phân quyền chỉ tiêu` hiện tại chỉ giữ nếu có API và requirement thật.
- Nếu chưa có use case rõ, không để tab trống hoặc tab treo.

## 3. Tab Chỉ tiêu
### Phạm vi
- CRUD indicator
- reorder
- import Excel
- validate formula

### Ràng buộc
- Chỉ cho sửa khi template ở `DRAFT` hoặc `READY`.
- Nếu template bị khóa, disable toàn bộ action.
- `code` phải unique trong phạm vi template.

## 4. Tab Thuộc tính
### Phạm vi
- CRUD attribute
- reorder
- import Excel

### Ràng buộc
- Chỉ cho sửa khi template ở `DRAFT` hoặc `READY`.
- Bảo vệ attribute hệ thống khỏi xóa.

## 5. Tab Cấu hình ô
### Phạm vi
- Hiển thị matrix indicator x attribute.
- Cho chỉnh override cell config.
- Xem effective cell config.

### Hành vi
- Có thể có 2 mode:
  - `preview`: chỉ xem
  - `cell-config`: cho chỉnh
- Nếu có `formula`, ô phải tự động readonly.
- Sau lưu phải refetch effective.

## 6. Tab Phạm vi mẫu
### Phạm vi
- Quản lý scope theo `orgId` và `indicatorId`.
- Upsert/delete batch.

### Hành vi
- Chỉ cho chỉnh khi template đang mở khóa.
- Có UI dễ chọn tổ chức và chỉ tiêu.

## 7. Tab Xem trước
### Mục tiêu
- Dùng lại ở nhiều màn hình.
- Không phải chỉ là bảng demo.

### API đề xuất của component
```ts
type TemplatePreviewMode = 'preview' | 'cell-config'
```

### Hành vi theo mode
- `preview`
  - chỉ đọc
  - render matrix từ `effective`
- `cell-config`
  - cho chỉnh cell
  - có thể mở form/sheet để edit

### Dữ liệu nên dùng
- `GET /forms/:formId/cell-configs/effective`
- nếu ở mode chỉnh sửa thì thêm dữ liệu override từ `GET /cell-configs`

## 8. Text hiển thị
- Tất cả tiêu đề, nhãn, nút, trạng thái, lỗi phải là tiếng Việt có dấu.
- Không dùng text tiếng Anh kiểu “Preview”, “Save”, “Delete” trong UI.
- Nếu cần tên kỹ thuật, chỉ để trong code hoặc comment nội bộ.


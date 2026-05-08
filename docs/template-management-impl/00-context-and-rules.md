# 00. Bối cảnh và quy tắc bắt buộc

## 1. Tên module
- FE hiện đang nằm trong `src/features/form-management`.
- Trong tài liệu này, khái niệm nghiệp vụ là `template-management`.
- Khi cập nhật code, ưu tiên giữ cấu trúc hiện tại, chỉ đổi tên file khi thật cần thiết và theo lộ trình.

## 2. Quy tắc ngôn ngữ
- Tất cả text hiển thị trong module phải là tiếng Việt có dấu.
- Bao gồm:
  - tiêu đề trang
  - nhãn nút
  - label form
  - thông báo lỗi
  - toast
  - placeholder
  - empty state
  - tooltip
  - tên tab
- Không dùng text tiếng Anh trong UI, trừ tên kỹ thuật bên trong code, type, endpoint, hoặc key config.

## 3. Quy tắc API
- Khi hoàn thành chuyển sang API thật, phải xóa toàn bộ mock data.
- Phải đổi tên file API để phản ánh vai trò thật.
  - Gợi ý: đổi từ `mock-form-management-api.ts` sang tên như `template-management-api.ts`.
  - Không giữ tên file có chữ `mock` sau khi hoàn tất migration.
- Component và hook không được import trực tiếp từ file mock sau khi migration xong.
- Nếu còn cần fallback tạm thời trong lúc triển khai, phải tách rõ một lớp adapter, không để mock lẫn với API thật.

## 4. Quy tắc trạng thái template
Template phải có lifecycle thật, không dùng `isActive` để thay thế lifecycle.

Lifecycle mục tiêu:
- `DRAFT`
- `READY`
- `IN_USE`
- `ARCHIVED`

Quy tắc chung:
- `DRAFT` và `READY` mới cho phép sửa cấu trúc.
- `IN_USE` và `ARCHIVED` chỉ cho xem hoặc clone.
- Chuyển trạng thái chỉ qua action button, không cho sửa trực tiếp trong form metadata.

## 5. Quy tắc đồng bộ dữ liệu
- Sau mọi mutation ghi dữ liệu, refetch detail hoặc refetch query liên quan.
- Nếu backend trả lỗi khóa trạng thái hoặc transition không hợp lệ:
  - không xóa local state đang nhập
  - chỉ hiển thị toast hoặc inline alert
  - giữ nguyên dữ liệu editor hiện tại

## 6. Quy tắc giao diện
- Giữ phong cách hiện tại:
  - `Card`
  - `Tabs`
  - `Badge`
  - layout bo tròn, sạch, thiên về quản trị nội bộ
- Không đổi sang style khác.
- Không thêm pattern UI quá lạ so với hệ hiện tại.


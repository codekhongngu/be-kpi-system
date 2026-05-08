# 04. Kế hoạch triển khai cho AI agent

## 1. Nguyên tắc thực hiện
- Làm theo từng phase nhỏ.
- Mỗi phase phải có điểm dừng rõ.
- Không refactor rộng trước khi có model và API chuẩn.
- Không đổi style UI hiện tại.

## 2. Phase 1: Chuẩn hóa model và API
### Việc cần làm
- Bổ sung `templateType`.
- Bổ sung lifecycle status thật.
- Thêm API method cho:
  - mark ready
  - archive
  - copy
  - activate
  - deactivate
  - list template scopes
- Đổi tên file API sau khi bỏ mock.

### Kết quả mong đợi
- FE đọc được dữ liệu đủ cho list và detail.
- Không còn phụ thuộc tên file mock.

## 3. Phase 2: Tách shared components
### Việc cần làm
- Tách status badge.
- Tách action bar.
- Tách metadata card.
- Cập nhật general info dialog để không sửa lifecycle trực tiếp.

### Kết quả mong đợi
- Page gọn hơn.
- Shared component tái sử dụng được.

## 4. Phase 3: Tách tab riêng
### Việc cần làm
- Tách indicators tab.
- Tách attributes tab.
- Tách cell configs tab.
- Tách template scopes tab.
- Refactor preview tab thành component dùng lại.

### Kết quả mong đợi
- Mỗi tab có file riêng.
- Không còn tab nào ôm quá nhiều logic.

## 5. Phase 4: Guard theo trạng thái
### Việc cần làm
- Disable action theo lifecycle.
- Hide action không hợp lệ.
- Chặn mutation khi status không cho phép.

### Kết quả mong đợi
- UI phản ánh đúng business matrix.

## 6. Phase 5: Error handling
### Việc cần làm
- Map business code sang message tiếng Việt có dấu.
- Hiển thị inline alert khi lock/transition fail.
- Giữ local state khi mutation bị từ chối.

### Kết quả mong đợi
- UX ổn định khi backend trả lỗi khóa.

## 7. Phase 6: Dọn mock
### Việc cần làm
- Xóa file mock.
- Xóa import mock ở toàn bộ module.
- Đổi tên file API thật.
- Đảm bảo không còn nhánh fallback chỉ để phục vụ mock.

### Kết quả mong đợi
- Module dùng API thật hoàn toàn.

## 8. Checklist hoàn tất
- List page hiển thị đúng status mới.
- Detail page có action bar theo status.
- Mỗi tab là một component riêng.
- Preview tab tái sử dụng được và có `mode`.
- UI text đều là tiếng Việt có dấu.
- Không còn import từ file mock.
- Không còn file API mang tên `mock`.


# Template Management FE Implementation Guide

Tài liệu này dùng cho AI agent để cập nhật FE module quản lý template theo tài liệu thiết kế và bộ API trong `postman.json`.

## Mục tiêu
- Giữ nguyên structure folder hiện tại của FE.
- Tách logic theo `pages`, `components dùng chung`, và `components theo tab`.
- Mỗi tab là một component riêng.
- `Preview` là component tái sử dụng, có `mode` để xử lý cả xem trước lẫn cấu hình cell.
- Sau khi chuyển sang API thật, xóa toàn bộ mock data và đổi tên file API cho đúng vai trò.
- Mọi text hiển thị trong module phải là tiếng Việt có dấu.

## Phạm vi tài liệu
- Bối cảnh nghiệp vụ và ràng buộc trạng thái template.
- Cấu trúc thư mục FE nên giữ và cách tách component.
- API contract cần dùng.
- Luồng UI cho list, detail, tabs, preview.
- Thứ tự triển khai để AI agent thực hiện an toàn.

## Tài liệu con
- `00-context-and-rules.md`
- `01-folder-structure.md`
- `02-api-contracts.md`
- `03-ui-flow-and-tabs.md`
- `04-implementation-plan.md`


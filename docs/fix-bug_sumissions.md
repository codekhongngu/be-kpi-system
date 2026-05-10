# Kế hoạch Khắc phục Lỗi Duplicate và Inconsistent Cells (Submission Flow)

Dựa trên phản hồi lỗi từ bạn, tôi đã phân tích lại toàn bộ kiến trúc và luồng dữ liệu (data flow) từ DB lên Frontend. Lỗi này bắt nguồn từ sự kết hợp giữa **thiếu ràng buộc Database** và **Race Condition** trong thiết kế Frontend.

## I. Phân tích Nguyên nhân Cốt lõi (Root Cause)

### 1. Tại sao có dữ liệu trùng lặp (Duplicate)?
- Bảng `report_submissions` hiện **không có ràng buộc `UNIQUE(assignment_id)`**. 
- Trong thiết kế cũ, khi FE load trang, nếu chưa thấy `submissionId`, nó lập tức gọi `POST /submissions` để tạo. Do React Strict Mode hoặc độ trễ mạng, 2 request POST có thể được gửi song song. Cả 2 cùng lọt qua bước kiểm tra "đã tồn tại chưa" ở BE và sinh ra 2 bản ghi cho cùng 1 `assignment_id`.

### 2. Tại sao Data Cells hiển thị khác nhau giữa các lần Load/Save?
Sự tồn tại của các bản ghi trùng lặp gây ra sự bất đồng bộ giữa các API:
- **Trang List (`myAssignments`)**: Đã được tôi fix để chỉ lấy ra bản nộp **Mới nhất (Latest)**.
- **Hàm Create (`POST /submissions`)**: Hàm này kiểm tra tồn tại bằng `findOne({ where: { assignmentId } })` nhưng **KHÔNG CÓ `ORDER BY`**. Nó thường trả về bản nộp **Cũ nhất (Oldest)** hoặc ngẫu nhiên.
- **Hook `useSubmission` ở FE**:
  - Khi bạn bấm từ List vào, trang load rất nhanh. List assignments chưa kịp load xong (trong Cache/Memory), `initialSubmissionId` bị `undefined`.
  - Hook tự kích hoạt `POST` tạo mới -> Nhận về ID của bản nộp **Cũ**. Trang load dữ liệu cũ.
  - Khi bạn *Lưu nháp* hoặc *Reload* (lúc này list đã load xong, có ID), FE cập nhật ID thành ID **Mới nhất**. Nó load lại một tập data khác.

## II. Phương án Sửa lỗi (Action Plan)

Để giải quyết triệt để, chúng ta cần thay đổi tư duy quản lý luồng dữ liệu, chuyển bớt trách nhiệm từ Frontend sang Backend để đảm bảo tính toàn vẹn (ACID).

### Giai đoạn 1: Sàng lọc và Ràng buộc Dữ liệu (Backend)
1. **Làm sạch DB (Cleanup)**: Viết script hoặc xử lý logic tại BE để tự động "xóa hoặc ẩn" các bản nộp trùng lặp (giữ lại bản có `created_at` mới nhất và có nhiều dữ liệu cells nhất).
2. **Ràng buộc hàm `create`**: Bắt buộc mọi truy vấn tìm bản nộp hiện có (`existing`) phải dùng `order: { createdAt: 'DESC' }` để luôn trả về đúng 1 ID thống nhất.

### Giai đoạn 2: Refactor Luồng Load Dữ liệu (API Flow)
Hiện tại FE đang làm 2 bước: 1. POST để lấy ID -> 2. GET bằng ID để lấy dữ liệu. Quá trình này dễ đứt gãy.
- **Đề xuất mới**: Thay đổi API `GET /api/v1/submissions/:id`. Nếu truyền vào một `assignmentId` thay vì `submissionId`, Backend sẽ tự động:
  - Kiểm tra xem assignment này đã có submission chưa.
  - Nếu có: Trả về submission mới nhất.
  - Nếu chưa: Tự động khởi tạo (Create) và trả về luôn.
- Việc gộp này (Get-or-Create) ở cấp độ Backend Query sẽ loại bỏ hoàn toàn Race Condition trên Frontend.

### Giai đoạn 3: Cập nhật Frontend (`useSubmission`)
1. **Xóa cờ `POST`**: Hủy bỏ hoàn toàn hàm `createMutation` và `useEffect` tự động gọi POST trong hook `useSubmission`.
2. **Đơn giản hóa hook**: Hook chỉ nhận vào đúng `assignmentId`. 
3. **Gọi API duy nhất**: Sử dụng `useQuery` gọi API Get-or-Create. Dữ liệu trả về sẽ luôn là duy nhất và ổn định.

## III. Các bước Triển khai Cụ thể

1. **Bước 1**: Cập nhật `SubmissionService.ts` -> Thêm cơ chế tìm `existing` an toàn và xây dựng logic Get-or-Create.
2. **Bước 2**: Cập nhật `submission-api.ts` -> Sửa API get detail để gọi theo `assignmentId`.
3. **Bước 3**: Cập nhật `use-submission.ts` -> Gỡ bỏ logic POST phức tạp, làm sạch luồng state quản lý ID.

---
*Vui lòng xem xét plan này. Nếu bạn đồng ý với hướng tiếp cận gộp luồng Get-or-Create, tôi sẽ bắt tay vào sửa code ngay lập tức.*

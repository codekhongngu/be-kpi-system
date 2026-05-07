# TEMPLATE MANAGEMENT FE FLOW & UI/UX GUIDE (AI-ASSISTED)

## 1. Mục tiêu
Tài liệu này mô tả flow nghiệp vụ, hành vi UI/UX và contract tích hợp API cho FE module `template-management`, đồng bộ với backend hiện tại.

## 2. Trạng thái Template
- `DRAFT`: được phép chỉnh sửa cấu trúc.
- `READY`: được phép chỉnh sửa cấu trúc, sẵn sàng tạo campaign.
- `IN_USE`: không cho sửa cấu trúc.
- `ARCHIVED`: không cho sửa cấu trúc, chỉ xem/clone.

Transition hợp lệ:
- `DRAFT -> READY`: `POST /forms/:id/mark-ready`
- `READY -> IN_USE`: backend tự động khi tạo campaign đầu tiên
- `READY -> ARCHIVED`: `POST /forms/:id/archive`
- `IN_USE -> ARCHIVED`: `POST /forms/:id/archive`

## 3. IA (Information Architecture)
### 3.1 Danh sách Template
- Route gợi ý: `/templates`
- Thành phần:
  - Search box (name/code)
  - Filter: trạng thái active/inactive, kỳ báo cáo, lĩnh vực
  - Table: code, name, templateType, templateStatus, periodType, fieldCategory, isActive, actions

### 3.2 Chi tiết Template (Designer)
- Route gợi ý: `/templates/:id`
- Layout 2 cột:
  - Left: metadata + action bar
  - Right: tabs
    - `Indicators`
    - `Attributes`
    - `Cell Configs`
    - `Template Scopes`

## 4. Action Matrix cho UI
- `DRAFT`:
  - Enable: edit metadata, CRUD indicator/attribute/cell/scope, `Mark Ready`, delete template
  - Disable: `Archive`
- `READY`:
  - Enable: edit metadata, CRUD indicator/attribute/cell/scope, `Archive`, create campaign
  - Disable: `Mark Ready`
- `IN_USE`:
  - Enable: view, clone, `Archive`
  - Disable: tất cả action sửa cấu trúc
- `ARCHIVED`:
  - Enable: view, clone
  - Disable: tất cả action sửa cấu trúc, `Mark Ready`, `Archive`

## 5. API mapping cho FE
### 5.1 Forms
- List: `GET /forms?page=1&limit=20`
- Create: `POST /forms`
- Detail: `GET /forms/:id`
- Patch metadata: `PATCH /forms/:id`
- Mark ready: `POST /forms/:id/mark-ready`
- Archive: `POST /forms/:id/archive`
- Activate/deactivate: `POST /forms/:id/activate`, `POST /forms/:id/deactivate`
- Copy: `POST /forms/:id/copy`
- Delete: `DELETE /forms/:id`

### 5.2 Designer tabs
- Indicators: `/forms/:formId/indicators`
- Attributes: `/forms/:formId/attributes`
- Cell configs: `/forms/:formId/cell-configs`, `/forms/:formId/cell-configs/effective`
- Template scopes: `/forms/:formId/template-scopes`

## 6. UI Error Handling (bắt buộc)
Map lỗi backend sang UX message rõ nghĩa:
- `FORM_TEMPLATE_LOCKED_STATUS`: "Biểu mẫu không cho phép chỉnh sửa ở trạng thái hiện tại."
- `FORM_TEMPLATE_LOCKED_HAS_REPORTS`: "Biểu mẫu đã phát sinh báo cáo/giao việc, không thể sửa cấu trúc."
- `FORM_INVALID_STATUS_TRANSITION`: "Không thể chuyển trạng thái theo thao tác hiện tại."
- `FORM_DEACTIVATE_BLOCKED_HAS_REPORTS`: "Biểu mẫu đã phát sinh dữ liệu, không thể ngừng kích hoạt."
- `INDICATOR_CODE_DUPLICATE`: "Mã chỉ tiêu đã tồn tại trong biểu mẫu."
- `ATTRIBUTE_SYSTEM_PROTECTED`: "Thuộc tính hệ thống không thể xóa."

## 7. UX rules quan trọng
- Không cho nhập/sửa `templateStatus` trực tiếp trong form metadata.
- Chuyển trạng thái chỉ bằng action button (`Mark Ready`, `Archive`).
- Khi API trả lỗi lock/transition, giữ nguyên local state và hiển thị toast + inline alert.
- Sau mọi thao tác ghi (create/patch/reorder/upsert), refetch detail để đồng bộ.
- Với tab cấu trúc (indicator/attribute/cell/scope), luôn disable controls nếu status không thuộc `DRAFT|READY`.

## 8. AI-assisted development blueprint
## 8.1 Prompt context FE nên cung cấp cho AI
- Current route + template id + template status.
- API endpoint đang gọi.
- Payload gửi đi.
- Error code backend nhận về.

## 8.2 Prompt mẫu
"Implement Template Detail action bar with status-aware buttons.
Inputs: templateStatus, isActive.
Rules: DRAFT show Mark Ready; READY show Archive; IN_USE show Archive+Clone; ARCHIVED show Clone only.
Use API endpoints from /forms/:id/* and handle FORM_INVALID_STATUS_TRANSITION by toast." 

## 8.3 Definition of Done cho FE
- Button enable/disable đúng action matrix.
- Không còn luồng sửa `templateStatus` qua form patch.
- Hiển thị lỗi theo business code.
- Refetch data sau mutation.
- Có test UI cho 4 trạng thái template.

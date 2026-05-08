# 01. Cấu trúc thư mục FE đề xuất

## 1. Mục tiêu cấu trúc
- Giữ module trong `src/features/form-management`.
- Tách rõ:
  - `pages`: điều phối trang
  - `api`: contract, query, mutation
  - `components/shared`: thành phần dùng lại
  - `components/tabs`: từng tab một file
  - `form-builder`: state nội bộ cho cây cấu trúc

## 2. Cấu trúc hiện tại cần giữ
- `pages/form-template-list-page.tsx`
- `pages/form-template-details-page.tsx`
- `api/types.ts`
- `api/catalog-queries.ts`
- `form-builder/store/*`

## 3. Cấu trúc nên chuyển sang
### 3.1 Pages
- `pages/form-template-list-page.tsx`
- `pages/form-template-details-page.tsx`

### 3.2 API
- `api/template-management-api.ts`
- `api/catalog-queries.ts`
- `api/types.ts`

### 3.3 Shared components
- `components/shared/template-action-bar.tsx`
- `components/shared/template-general-info-dialog.tsx`
- `components/shared/template-list-filter.tsx`
- `components/shared/template-list-table.tsx`
- `components/shared/template-status-badge.tsx`
- `components/shared/template-metadata-card.tsx`

### 3.4 Tab components
- `components/tabs/template-indicators-tab.tsx`
- `components/tabs/template-attributes-tab.tsx`
- `components/tabs/template-cell-configs-tab.tsx`
- `components/tabs/template-scopes-tab.tsx`
- `components/tabs/template-preview-tab.tsx`

### 3.5 Builder state
- `form-builder/store/form-builder-slice.ts`
- `form-builder/store/form-builder-hooks.ts`
- `form-builder/store/form-builder-store.ts`

## 4. Quy tắc phân trách nhiệm
### 4.1 `pages`
- Chỉ làm fetch, mutation orchestration, routing, và ghép component.
- Không chứa logic render chi tiết của từng tab.
- Không chứa code editor hoặc matrix lớn.

### 4.2 `components/shared`
- Dùng lại trên list, detail, và tab.
- Không phụ thuộc vào route.
- Không gọi API nếu không cần thiết.

### 4.3 `components/tabs`
- Mỗi tab tự quản lý phần UI của mình.
- Mỗi tab có thể có hook riêng nếu cần.
- Không để một file tab ôm quá nhiều responsibility.

### 4.4 `TemplatePreviewTab`
- Phải dùng lại được ở nhiều nơi.
- Có `mode` để đổi hành vi:
  - `preview`
  - `cell-config`
- Dùng chung một component để tránh trùng UI matrix.

## 5. Gợi ý chia nhỏ thêm nếu file quá lớn
Nếu một tab vượt quá khả năng bảo trì:
- tách thêm `components/tabs/<tab>/`
- tách subcomponent theo vùng UI

Ví dụ:
- `components/tabs/template-indicators-tab/indicator-form-dialog.tsx`
- `components/tabs/template-indicators-tab/indicator-tree.tsx`
- `components/tabs/template-cell-configs-tab/cell-config-grid.tsx`

## 6. Nguyên tắc import
- Page chỉ import từ shared/tabs.
- Tab chỉ import shared component và API layer cần thiết.
- Không import chéo lung tung giữa các tab.
- Nếu 2 tab cần chung một thành phần, đẩy thành shared component.


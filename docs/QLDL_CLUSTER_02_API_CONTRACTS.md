# QLDL — Cụm 2: Hợp đồng API (spec + DTO + validate/errors + flows + query)

> File này gộp các tài liệu trước đây tách riêng:
> - `QLDL_API_SPEC.md`
> - `QLDL_DTO.md`
> - `QLDL_VALIDATION_AND_ERRORS.md`
> - `QLDL_BACKEND_FLOWS.md`
> - `QLDL_QUERY_MODULE.md`

---

## Phần A — REST API Specification (`/api/v1`)

## QLDL — REST API Specification (`/api/v1`)

### Quy ước

- **Versioning**: prefix `/api/v1`
- **Auth**: `Authorization: Bearer <accessToken>` (trừ các endpoint public)
- **Response envelope**:

```json
{ "data": {}, "meta": {}, "error": null }
```

```json
{ "data": null, "error": { "code": "STRING", "message": "STRING", "details": {} } }
```

- **List**: dùng query `page`, `limit`, `sort`, `q`, filters; `meta` có `{ page, limit, total }`

---

### Auth

#### `POST /auth/login`

- **Body**: `{ "identifier": "string", "password": "string" }`
- **200**:
  - Không 2FA: `{ data: { accessToken, refreshToken, accessExpiresInSeconds, refreshExpiresInSeconds, user } }`
  - Cần 2FA: `{ data: { requires2fa: true, challengeId, channel } }`

#### `POST /auth/2fa/verify`

- **Body**: `{ "challengeId": "string", "otp": "string" }`
- **200**: tokens + `user`

#### `POST /auth/2fa/resend`

- **Body**: `{ "challengeId": "string" }`
- **200**: `{ sent: true, expiresInSeconds }`

#### `POST /auth/refresh`

- **Body**: `{ "refreshToken": "string" }`
- **200**: tokens

#### `POST /auth/logout`

- **Body**: `{ "refreshToken"?: "string", "revokeAll"?: boolean }`
- **200**: `{ ok: true }`

#### `POST /auth/password/forgot`

- **Body**: `{ "email": "string" }`
- **200**: `{ ok: true }`

#### `POST /auth/password/reset`

- **Body**: `{ "token": "string", "newPassword": "string" }`
- **200**: `{ ok: true }`

#### `POST /auth/password/change`

- **Body**: `{ "currentPassword": "string", "newPassword": "string" }`
- **200**: `{ ok: true }`

---

### Users / Profile

#### `GET /users`

- **Query**: `q?, orgId?, roleGroupId?, isActive?, page?, limit?, sort?`
- **200**: `{ items: UserListItem[], meta }`

#### `POST /users`

- **Body**: `CreateUserRequest` (theo **Phần B** trong cùng file này)
- **201**: `{ id }`

#### `GET /users/{id}`

- **200**: `UserDetail`

#### `PATCH /users/{id}`

- **Body**: `PatchUserRequest`
- **200**: `{ ok: true }`

#### `POST /users/{id}/reset-password`

- **200**: `{ ok: true }`

#### `DELETE /users/{id}`

- **200**: `{ ok: true }`

#### `POST /users/import` (multipart)

- **200**: `{ jobId }`

#### `GET /users/import/{jobId}`

- **200**: `ImportJobResult`

#### `GET /me`

- **200**: `MeResponse`

#### `PATCH /me`

- **Body**: `PatchMeRequest`
- **200**: `{ ok: true }`

---

### RBAC

#### `GET /role-groups`

- **200**: `{ items: RoleGroup[] }`

#### `POST /role-groups`

- **Body**: `CreateRoleGroupRequest`
- **201**: `{ id }`

#### `PATCH /role-groups/{id}`

- **Body**: `PatchRoleGroupRequest`
- **200**: `{ ok: true }`

#### `DELETE /role-groups/{id}`

- **200**: `{ ok: true }`

#### `GET /permissions`

- **200**: `{ items: PermissionDef[] }`

---

### Organizations

#### `GET /orgs`

- **Query**: `q?, isActive?, tree?`
- **200**: `{ items: Org[] }`

#### `POST /orgs`

- **Body**: `CreateOrgRequest`
- **201**: `{ id }`

#### `PATCH /orgs/{id}`

- **Body**: `PatchOrgRequest`
- **200**: `{ ok: true }`

#### `POST /orgs/{id}/lock` | `POST /orgs/{id}/unlock`

- **200**: `{ ok: true }`

#### `DELETE /orgs/{id}`

- **200**: `{ ok: true }`

---

### Kỳ báo cáo (period snapshot)

Trong mô hình mới, **không còn bảng `report_periods` và không còn API `/report-periods`**.

Kỳ báo cáo được lưu dạng **snapshot** trực tiếp trên:
- `form_assignments`: kỳ dùng để giao/nộp báo cáo
- `report_summaries`: kỳ dùng để tổng hợp

Các trường kỳ chuẩn:
- `periodType`: `TUAN|THANG|QUY|NAM`
- `periodFrom`, `periodTo`: `YYYY-MM-DD`
- `periodCode?`, `periodName?`: phục vụ hiển thị (tuỳ chọn)

---

### Field categories (lĩnh vực nghiệp vụ)

Danh mục **lĩnh vực** dùng khi thiết kế biểu mẫu: `forms` tham chiếu qua `fieldCategoryId` (UUID) tới bảng `field_categories`. Không còn cột chuỗi `field_category` trên `forms` trong triển khai hiện tại; API list/detail form vẫn có thể trả thêm `fieldCategory` là **mã `code`** (đọc từ join) để tương thích filter/query theo mã.

**Phân quyền (triển khai NestJS):** `GET` dùng `DESIGN_FORMS:READ`; `POST`/`PATCH` dùng `DESIGN_FORMS:WRITE` (cùng nhóm với thiết kế biểu mẫu). Có thể tách key riêng (vd. `ADMIN_FIELD_CATEGORIES`) nếu BA yêu cầu.

#### `GET /field-categories`

- **Query**: `q?, isActive?, page?, limit?`
- **200**: `{ items: FieldCategoryListItem[], meta }`

#### `POST /field-categories`

- **Body**: `CreateFieldCategoryRequest`
- **201**: `{ id }`

#### `PATCH /field-categories/{id}`

- **Body**: `PatchFieldCategoryRequest`
- **200**: `{ ok: true }`

---

### Forms / Attributes / Indicators

#### `GET /forms`

- **Query**: `q?, fieldCategory?, fieldCategoryId?, isActive?, page?, limit?`  
  - `fieldCategory`: lọc theo **`field_categories.code`** (join).  
  - `fieldCategoryId`: lọc theo UUID khóa ngoại `forms.field_category_id`.
- **200**: `{ items: FormListItem[], meta }`

#### `POST /forms`

- **Body**: `CreateFormRequest`
- **201**: `{ id }`

#### `GET /forms/{id}`

- **200**: `FormDetailResponse`

#### `PATCH /forms/{id}`

- **Body**: `PatchFormRequest`
- **200**: `{ ok: true }`

#### `DELETE /forms/{id}`

- **200**: `{ ok: true }`

#### `POST /forms/{id}/activate` | `POST /forms/{id}/deactivate`

- **200**: `{ ok: true }`

#### `POST /forms/{id}/copy`

- **Body**: `CopyFormRequest`
- **201**: `{ id: "newFormId" }`

#### `POST /forms/{id}/template` (multipart)

- **200**: `{ fileId, url }`

#### Attributes

- `GET /forms/{id}/attributes`
- `POST /forms/{id}/attributes` (**201** `{ id }`)
- `PATCH /forms/{id}/attributes/{attrId}` (**200** `{ ok:true }`)
- `DELETE /forms/{id}/attributes/{attrId}` (**200** `{ ok:true }`)
- `POST /forms/{id}/attributes/import` (**200** `{ jobId }`)

#### Indicators

- `GET /forms/{id}/indicators`
- `POST /forms/{id}/indicators` (**201** `{ id }`)
- `PATCH /forms/{id}/indicators/{indicatorId}` (**200** `{ ok:true }`)
- `DELETE /forms/{id}/indicators/{indicatorId}` (**200** `{ ok:true }`)
- `POST /forms/{id}/indicators/reorder` (**200** `{ ok:true }`)
- `POST /forms/{id}/indicators/import` (**200** `{ jobId }`)

#### (Tuỳ chọn) Indicator catalog

- `POST /indicator-catalog` (**201** `{ id }`)

---

### Assignments

#### `GET /assignments`

- **Query**: `formId?, orgId?, periodType?, from?, to?, isCancelled?, page?, limit?`
- **200**: `{ items: Assignment[], meta }`

#### `POST /assignments`

- **Body**: `CreateAssignmentsRequest`
- **200**: `{ created, skipped, duplicates[] }`

#### `POST /assignments/{id}/cancel`

- **Body**: `{ reason?: string }`
- **200**: `{ ok: true }`

#### `POST /assignments/next-period`

- **Body**:
  - preview: `{ formId, fromPeriodType, fromPeriodFrom, fromPeriodTo, toPeriodType, toPeriodFrom, toPeriodTo, confirm?: false }`
  - confirm: `{ formId, fromPeriodType, fromPeriodFrom, fromPeriodTo, toPeriodType, toPeriodFrom, toPeriodTo, confirm: true }`
- **200**:
  - preview: `NextPeriodPreviewResponse`
  - confirm: `NextPeriodConfirmResponse`

---

### My assignments / Submissions

#### `GET /my/assignments`

- **Query**: `status?, overdue?`
- **200**: `{ items: MyAssignmentRow[] }`

#### `POST /submissions`

- **Body**: `{ assignmentId }`
- **201**: `{ id, status: "DRAFT" }`

#### `GET /submissions/{id}`

- **200**: `SubmissionDetailResponse`

#### `PATCH /submissions/{id}/cells`

- **Body**: `PatchCellsRequest`
- **200**: `PatchCellsResponse`

#### `POST /submissions/{id}/autosave`

- Giống patch cells (tuỳ implement)

#### `POST /submissions/{id}/import-excel` (multipart)

- **200**: `{ jobId }`

#### `POST /submissions/{id}/copy-previous`

- **Body**: `CopyPreviousRequest`
- **200**: `CopyPreviousResponse`

#### `GET /submissions/{id}/history`

- **Query**: `indicatorId?, attributeId?, page?, limit?`
- **200**: `{ items: CellHistoryItem[], meta }`

#### `POST /submissions/{id}/submit`

- **Body**: `{ note?: string }`
- **200**: `{ status: "PENDING", submittedAt }`

#### `GET /submissions/{id}/export`

- **Query**: `format=excel|pdf`
- **200**: `{ downloadUrl, expiresInSeconds }`

---

### Approvals

#### `GET /approvals/pending`

- **Query**: `orgId?, formId?, periodType?, from?, to?, priority?, page?, limit?`
- **200**: `{ items: PendingApprovalRow[], meta }`

#### `POST /approvals/{submissionId}/approve`

- **Body**: `{ note?: string }`
- **200**: `{ status:"APPROVED", approvedAt }`

#### `POST /approvals/{submissionId}/reject`

- **Body**: `{ reason: string }`
- **200**: `{ status:"REJECTED" }`

#### `PATCH /approvals/{submissionId}/reject-note`

- **Body**: `{ reason: string }`
- **200**: `{ ok: true }`

---

### Summaries

#### `GET /summaries`

- **Query**: `formId?, orgId?, periodType?, from?, to?, page?, limit?`
- **200**: `{ items: SummaryListItem[], meta }`

#### `POST /summaries`

- **Body**: `{ formId, orgId, periodType, periodFrom, periodTo, periodCode?, periodName? }`
- **201**: `SummaryDetailResponse`

#### `GET /summaries/{id}`

- **200**: `SummaryDetailResponse`

#### `POST /summaries/{id}/recompute`

- **200**: `{ ok: true }`

---

### Monitoring / reminders

#### `GET /monitoring/reports`

- **Query**: `orgId?, formId?, periodType?, from?, to?, status?, page?, limit?`
- **200**: `{ items: MonitoringRow[], meta }`

#### `POST /monitoring/reminders`

- **Body**: `{ assignmentIds: string[], message?: string }`
- **200**: `{ sent: number }`

---

### Query / Tra cứu (QRY-01)

> Chi tiết nghiệp vụ/scope: xem **Phần E** trong cùng file này.

#### `GET /query/reports`

- **Query**: `q?, formId?, orgId?, periodType?, periodFrom?, periodTo?, status?, deadlineFrom?, deadlineTo?, page?, limit?, sort?`
- **200**: `{ items: QueryReportRow[], meta }`

#### `GET /query/reports/{submissionId}`

- **200**: `QueryReportDetail`

#### `GET /query/reports/{submissionId}/export`

- **Query**: `format=excel|pdf`
- **200**: `{ downloadUrl, expiresInSeconds }`

---

### Notifications

#### `GET /notifications`

- **Query**: `isRead?, page?, limit?`
- **200**: `{ items: NotificationItem[], meta }`

#### `POST /notifications/{id}/read`

- **200**: `{ ok: true }`

#### `GET /notifications/logs` (ops)

- **Query**: `status?, type?, from?, to?, page?, limit?`
- **200**: `{ items: NotificationItem[], meta }`

---

### Analytics

#### `GET /analytics/kpis`

- **Query**: `from, to, orgId?`
- **200**: `KpiResponse`

#### `GET /analytics/charts`

- **Query**: `ChartsQuery`
- **200**: `ChartsResponse`

#### `POST /analytics/pivot`

- **Body**: `PivotRequest`
- **200**: `PivotResponse`

#### `GET /analytics/export`

- **Query**: `format, templateId?, from, to, orgId?`
- **200**: `{ downloadUrl, expiresInSeconds }`

---

### DTO chi tiết

Xem **Phần B** trong cùng file này.

---

## Phần B — Request/Response DTO (TypeScript-style)

## QLDL — Request/Response DTO (TypeScript-style)

> Mục tiêu: đủ để codegen (OpenAPI/Zod/class-validator có thể derive từ đây).

### Envelope

```ts
export type ApiError = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

export type ApiResponse<T> =
  | { data: T; meta?: Record<string, unknown>; error: null }
  | { data: null; meta?: Record<string, unknown>; error: ApiError };

export type PageMeta = { page: number; limit: number; total: number };
```

### Auth

```ts
export type LoginRequest = { identifier: string; password: string };

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  accessExpiresInSeconds: number;
  refreshExpiresInSeconds: number;
};

export type UserBrief = {
  id: string;
  username: string;
  email: string;
  fullName: string;
  orgId: string | null;
  roleGroupIds: string[];
};

export type LoginSuccess = { user: UserBrief } & AuthTokens;

export type LoginNeed2fa = {
  requires2fa: true;
  challengeId: string;
  channel: "EMAIL" | "TOTP";
};

export type LoginResponse = LoginSuccess | LoginNeed2fa;

export type TwoFaVerifyRequest = { challengeId: string; otp: string };
export type TwoFaVerifyResponse = { user: UserBrief } & AuthTokens;

export type TwoFaResendRequest = { challengeId: string };
export type TwoFaResendResponse = { sent: true; expiresInSeconds: number };

export type RefreshRequest = { refreshToken: string };
export type RefreshResponse = AuthTokens;

export type LogoutRequest = { refreshToken?: string; revokeAll?: boolean };
export type OkResponse = { ok: true };

export type ForgotPasswordRequest = { email: string };
export type ResetPasswordRequest = { token: string; newPassword: string };
export type ChangePasswordRequest = { currentPassword: string; newPassword: string };
```

### Users / Me

```ts
export type UserListItem = {
  id: string;
  code: string;
  fullName: string;
  email: string;
  username: string;
  orgId: string | null;
  roleGroupIds: string[];
  isActive: boolean;
  lastLoginAt: string | null;
};

export type ListUsersResponse = { items: UserListItem[]; meta: PageMeta };

export type CreateUserRequest = {
  code: string;
  fullName: string;
  email: string;
  username: string;
  orgId: string;
  roleGroupIds: string[];
  isActive?: boolean;
};

export type CreateEntityResponse = { id: string };

export type UserDetail = UserListItem & {
  phone?: string | null;
  avatarUrl?: string | null;
  language: string;
  timezone: string;
  notifyChannel: "IN_APP" | "EMAIL" | "BOTH";
  createdAt: string;
  updatedAt: string | null;
  deletedAt: string | null;
};

export type PatchUserRequest = Partial<{
  fullName: string;
  email: string;
  username: string;
  orgId: string;
  roleGroupIds: string[];
  isActive: boolean;
}>;

export type ImportJobCreatedResponse = { jobId: string };

export type ImportJobStatus = "QUEUED" | "RUNNING" | "DONE" | "FAILED";
export type ImportErrorRow = { row: number; message: string; field?: string };
export type ImportJobResult = {
  jobId: string;
  status: ImportJobStatus;
  success: number;
  failed: number;
  errors: ImportErrorRow[];
  finishedAt?: string | null;
};

export type NotificationPrefs = Record<
  string,
  { inApp: boolean; email: boolean }
>;

export type MeResponse = {
  id: string;
  code: string;
  fullName: string;
  email: string;
  username: string;
  phone?: string | null;
  avatarUrl?: string | null;
  orgId: string | null;
  roleGroupIds: string[];
  language: string;
  timezone: string;
  notifyChannel: "IN_APP" | "EMAIL" | "BOTH";
  notificationPrefs?: NotificationPrefs;
};

export type PatchMeRequest = Partial<{
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  language: string;
  timezone: string;
  notifyChannel: "IN_APP" | "EMAIL" | "BOTH";
  notificationPrefs: NotificationPrefs;
}>;
```

### RBAC

```ts
export type RoleGroup = {
  id: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  permissions: Record<string, Array<"READ" | "WRITE" | "DELETE" | "EXPORT">>;
};

export type ListRoleGroupsResponse = { items: RoleGroup[] };

export type CreateRoleGroupRequest = {
  name: string;
  description?: string;
  permissions: RoleGroup["permissions"];
};

export type PatchRoleGroupRequest = Partial<{
  name: string;
  description: string | null;
  permissions: RoleGroup["permissions"];
}>;

export type PermissionDef = {
  key: string;
  name: string;
  actions: Array<"READ" | "WRITE" | "DELETE" | "EXPORT">;
};

export type ListPermissionsResponse = { items: PermissionDef[] };
```

### Organizations / Periods / Forms

```ts
export type Org = {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  headUserId: string | null;
  level: number;
  isActive: boolean;
  description?: string | null;
};

export type ListOrgsResponse = { items: Org[] };

export type CreateOrgRequest = {
  code: string;
  name: string;
  parentId?: string | null;
  headUserId?: string | null;
  level?: number;
  description?: string;
};

export type PatchOrgRequest = Partial<{
  name: string;
  parentId: string | null;
  headUserId: string | null;
  level: number;
  description: string | null;
}>;

export type PeriodType = "TUAN" | "THANG" | "QUY" | "NAM";

export type PeriodSnapshot = {
  type: PeriodType;
  dateFrom: string;
  dateTo: string;
  code?: string | null;
  name?: string | null;
};

export type FieldCategoryListItem = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type CreateFieldCategoryRequest = {
  code: string;
  name: string;
  description?: string | null;
  sortOrder?: number;
  isActive?: boolean;
};

export type PatchFieldCategoryRequest = Partial<{
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
}>;

export type FormListItem = {
  id: string;
  code: string;
  name: string;
  /** UUID → `field_categories.id` */
  fieldCategoryId?: string | null;
  /** Mã `code` từ `field_categories` (join / derived), không lưu trên cột `forms` */
  fieldCategory?: string | null;
  isActive: boolean;
  templateFileUrl?: string | null;
  parentFormId?: string | null;
};

export type ListFormsResponse = { items: FormListItem[]; meta: PageMeta };

export type CreateFormRequest = {
  name: string;
  /** Bắt buộc: UUID bản ghi `field_categories` đang `is_active` */
  fieldCategoryId: string;
  description?: string;
  parentFormId?: string | null;
};

export type FormAttribute = {
  id: string;
  parentId?: string | null;
  name: string;
  dataType?: string | null;
  isRequired: boolean;
  isVisible: boolean;
  isSystem: boolean;
  sortOrder: number;
  options?: unknown | null;
};

export type FormIndicator = {
  id: string;
  parentId?: string | null;
  displayIndex?: string | null;
  code: string;
  name: string;
  unit?: string | null;
  dataType: string;
  isRequired: boolean;
  isCalculated: boolean;
  formula?: string | null;
  groupName?: string | null;
  sortOrder: number;
  minValue?: string | null;
  maxValue?: string | null;
  isActive: boolean;
};

export type FormDetailResponse = FormListItem & {
  description?: string | null;
  attributes: FormAttribute[];
  indicators: FormIndicator[];
};

export type PatchFormRequest = Partial<{
  name: string;
  /** Đổi lĩnh vực theo UUID; `null` = gỡ FK khỏi form */
  fieldCategoryId: string | null;
  description: string | null;
  isActive: boolean;
  parentFormId: string | null;
}>;

export type CopyFormRequest = {
  name: string;
  /** Tuỳ chọn: đổi lĩnh vực so với bản gốc; mặc định giữ theo form nguồn */
  fieldCategoryId?: string;
  parentFormId?: string | null;
};

export type UploadTemplateResponse = { fileId: string; url: string };
```

### Assignments / submissions / approvals / summaries / monitoring / notifications / analytics

```ts
export type Assignment = {
  id: string;
  formId: string;
  orgId: string;
  periodType: PeriodType;
  periodFrom: string;
  periodTo: string;
  periodCode?: string | null;
  periodName?: string | null;
  deadlineFrom: string;
  deadlineTo: string;
  isCancelled: boolean;
  cancelReason?: string | null;
  assignedBy?: string | null;
  assignedAt: string;
};

export type ListAssignmentsResponse = { items: Assignment[]; meta: PageMeta };

export type CreateAssignmentsRequest = {
  formId: string;
  periodType: PeriodType;
  periodFrom: string;
  periodTo: string;
  periodCode?: string;
  periodName?: string;
  orgIds: string[];
  deadlineFrom: string;
  deadlineTo: string;
};

export type CreateAssignmentsResponse = {
  created: number;
  skipped: number;
  duplicates: Array<{ orgId: string; reason: string }>;
};

export type MyAssignmentRow = {
  assignmentId: string;
  form: Pick<FormListItem, "id" | "code" | "name">;
  period: PeriodSnapshot;
  deadlineTo: string;
  submission?: { id: string; status: string; completionPct?: number | null } | null;
};

export type MyAssignmentsResponse = { items: MyAssignmentRow[] };

export type CreateSubmissionRequest = { assignmentId: string };

export type CellKey = { indicatorId: string; attributeId: string };

export type CellValue = CellKey & {
  valueText?: string | null;
  valueNumeric?: string | null;
  updatedBy?: string | null;
  updatedAt: string;
};

export type SubmissionDetailResponse = {
  id: string;
  code: string;
  assignmentId: string;
  status: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED" | "OVERDUE";
  version: number;
  note?: string | null;
  rejectReason?: string | null;
  completionPct?: number | null;
  submittedAt?: string | null;
  approvedAt?: string | null;
  cells: CellValue[];
};

export type PatchCellsRequest = {
  clientVersion: number;
  changes: Array<CellKey & { valueText?: string | null; valueNumeric?: string | null }>;
};

export type PatchCellsResponse = {
  saved: number;
  version: number;
  validationErrors: Array<CellKey & { code: string; message: string }>;
};

export type CopyPreviousRequest = { overwrite: boolean; mode?: "ADJACENT" };
export type CopyPreviousResponse = { copiedCells: number };

export type CellHistoryItem = {
  at: string;
  by: { id: string; fullName?: string };
} & CellKey & { oldText?: string | null; newText?: string | null };

export type CellHistoryResponse = { items: CellHistoryItem[]; meta: PageMeta };

export type SubmitSubmissionRequest = { note?: string };
export type SubmitSubmissionResponse = { status: "PENDING"; submittedAt: string };

export type ExportDownloadResponse = { downloadUrl: string; expiresInSeconds: number };

export type PendingApprovalRow = {
  submissionId: string;
  org: Pick<Org, "id" | "code" | "name">;
  form: Pick<FormListItem, "id" | "code" | "name">;
  period: PeriodSnapshot;
  submittedAt: string;
  submittedBy?: UserBrief | null;
};

export type PendingApprovalsResponse = { items: PendingApprovalRow[]; meta: PageMeta };

export type ApproveRequest = { note?: string };
export type ApproveResponse = { status: "APPROVED"; approvedAt: string };

export type RejectRequest = { reason: string };
export type RejectResponse = { status: "REJECTED" };

export type SummaryListItem = {
  id: string;
  formId: string;
  orgId: string;
  period: PeriodSnapshot;
  status: string;
  summarizedAt?: string | null;
};

export type SummaryDetailResponse = SummaryListItem & {
  totalUnits?: number | null;
  submittedUnits?: number | null;
  approvedUnits?: number | null;
  summaryData: unknown;
};

export type MonitoringRow = {
  org: Pick<Org, "id" | "code" | "name">;
  form: Pick<FormListItem, "id" | "code" | "name">;
  period: PeriodSnapshot;
  assignmentId: string;
  submissionId?: string | null;
  status: string;
  completionPct?: number | null;
  deadlineTo: string;
};

export type MonitoringResponse = { items: MonitoringRow[]; meta: PageMeta };

export type SendRemindersRequest = { assignmentIds: string[]; message?: string };
export type SendRemindersResponse = { sent: number };

export type NotificationItem = {
  id: string;
  type: string;
  title?: string | null;
  body?: string | null;
  channel: "IN_APP" | "EMAIL" | "BOTH";
  isRead: boolean;
  refTable?: string | null;
  refId?: string | null;
  status: "PENDING" | "SENT" | "FAILED";
  createdAt: string;
  sentAt?: string | null;
};

export type ListNotificationsResponse = { items: NotificationItem[]; meta: PageMeta };

export type QueryReportRow = {
  submissionId: string;
  assignmentId: string;
  org: Pick<Org, "id" | "code" | "name">;
  form: Pick<FormListItem, "id" | "code" | "name">;
  period: PeriodSnapshot;
  status: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED" | "OVERDUE" | string;
  completionPct?: number | null;
  submittedAt?: string | null;
  approvedAt?: string | null;
  deadlineTo: string;
};

export type QueryReportsResponse = { items: QueryReportRow[]; meta: PageMeta };

export type QueryReportDetail = QueryReportRow & {
  note?: string | null;
  rejectReason?: string | null;
};

export type KpiResponse = {
  assigned: number;
  submitted: number;
  approved: number;
  overdue: number;
};

export type ChartsQuery = {
  type: "line" | "bar" | "pie" | "combo";
  metric: string;
  groupBy: "month" | "org" | "form" | "period";
  from: string;
  to: string;
  orgId?: string;
};

export type ChartPoint = { x: string; y: number };
export type ChartSeries = { name: string; points: ChartPoint[] };
export type ChartsResponse = { series: ChartSeries[] };

export type PivotAgg = "sum" | "avg" | "count" | "min" | "max";
export type PivotRequest = {
  rows: string[];
  cols: string[];
  values: Array<{ field: string; agg: PivotAgg }>;
  filters: Record<string, unknown>;
};
export type PivotResponse = { header: unknown; rows: unknown[] };
```

---

## Phần C — Validation fields & error catalog (ngắn gọn)

## QLDL — Validation fields & error catalog (ngắn gọn)

### Nguyên tắc validate

- **Luôn validate server-side** cho mọi write (đặc tả yêu cầu).
- **AuthZ trước Auth business rules** (tránh lộ tồn tại resource).
- **Concurrency**: dùng `version`/`updated_at` cho `PATCH /submissions/{id}/cells`.
- **Status machine**: chặn transition không hợp lệ ở service layer.

---

### Auth

#### `POST /auth/login`

- **Validate**: `identifier`, `password` required; normalize identifier.
- **Lỗi thường gặp**:
  - `AUTH_INVALID_CREDENTIALS`
  - `AUTH_ACCOUNT_DISABLED`
  - `AUTH_ACCOUNT_LOCKED`
  - `AUTH_ORG_DISABLED` (nếu có rule)
  - `RATE_LIMITED` (`429`)

#### `POST /auth/2fa/*`

- **Validate**: challenge TTL, otp format, retry/resend limits.
- **Lỗi**:
  - `TWOFA_INVALID_OTP`
  - `TWOFA_CHALLENGE_EXPIRED`
  - `TWOFA_CHALLENGE_CONSUMED`
  - `RATE_LIMITED`

#### `POST /auth/refresh|logout`

- **Validate**: refresh token exists/not revoked/not expired.
- **Lỗi**:
  - `AUTH_REFRESH_INVALID`
  - `AUTH_REFRESH_REVOKED`
  - `AUTH_REFRESH_EXPIRED`

#### Password forgot/reset/change

- **Validate**: email format; token TTL; password policy; current password (change).
- **Lỗi**:
  - `PASSWORD_POLICY_VIOLATION`
  - `RESET_TOKEN_INVALID`
  - `RESET_TOKEN_EXPIRED`
  - `RESET_TOKEN_USED`

---

### Users / Me

#### `POST/PATCH /users`

- **Validate**: unique `email/username/code`; FK `orgId`; `roleGroupIds` tồn tại; email domain policy (tuỳ).
- **Lỗi**:
  - `UNIQUE_VIOLATION` (map ra field)
  - `FK_NOT_FOUND`
  - `FORBIDDEN` (`403`)

#### `DELETE /users/{id}`

- **Validate**: không vi phạm rule “còn báo cáo chưa hoàn thành”.
- **Lỗi**:
  - `USER_DELETE_BLOCKED`

#### `PATCH /me`

- **Validate**: phone format; timezone/locale enums; prefs keys.
- **Lỗi**:
  - `VALIDATION_ERROR`

---

### Orgs / periods / RBAC

#### Orgs tree

- **Validate**: `code` unique; `parent_id` exists; không tạo cycle; lock rules.
- **Lỗi**:
  - `ORG_CYCLE_DETECTED`
  - `ORG_DELETE_BLOCKED`
  - `ORG_LOCKED`

#### Report periods

- **Validate**: `date_to > date_from`; uniqueness theo rule; delete chỉ khi chưa giao.
- **Lỗi**:
  - `PERIOD_INVALID_RANGE`
  - `PERIOD_DELETE_BLOCKED`

#### Role groups

- **Validate**: unique name; không xóa role đang được dùng; system role constraints.
- **Lỗi**:
  - `ROLE_GROUP_IN_USE`
  - `ROLE_GROUP_SYSTEM_PROTECTED`

---

### Forms / attributes / indicators

#### Forms

- **Validate**: `fieldCategoryId` tồn tại trong `field_categories` và đang active (create/patch/copy khi set); rule unique tên biểu mẫu theo policy dự án (ví dụ unique `name` global hoặc theo phạm vi); activate chỉ khi đủ cấu trúc (tuỳ rule).
- **Lỗi**:
  - `FORM_DUPLICATE_NAME`
  - `FORM_DELETE_HAS_DATA` → fallback deactivate
  - (triển khai) `400` khi `fieldCategoryId` không hợp lệ / inactive

#### Field categories

- **Validate**: `code` unique, format `^[a-z0-9_]+$`; `name` bắt buộc.
- **Lỗi**:
  - `FIELD_CATEGORY_CODE_DUPLICATE` (409)

#### Indicators/attributes

- **Validate**: `data_type` hợp lệ; SELECT requires `options`; `code` unique per form; formula parse + dependency exists; sort/reorder ids hợp lệ.
- **Lỗi**:
  - `INDICATOR_CODE_DUPLICATE`
  - `FORMULA_INVALID`
  - `ATTRIBUTE_SYSTEM_PROTECTED`
  - `INDICATOR_DELETE_HAS_DATA`

---

### Assignments

#### `POST /assignments`

- **Validate**: form active; org active; period active; deadline; unique `(form,org,period)`.
- **Lỗi**:
  - `ASSIGNMENT_DUPLICATE`
  - `ASSIGNMENT_FORM_INACTIVE`
  - `ASSIGNMENT_ORG_INACTIVE`

#### `POST /assignments/{id}/cancel`

- **Validate**: chỉ khi chưa nhập/chưa phát sinh submission theo rule.
- **Lỗi**:
  - `ASSIGNMENT_CANCEL_NOT_ALLOWED`

---

### Submissions / nhập liệu

#### `PATCH /submissions/{id}/cells`

- **Validate**: editable status; cell keys belong to form; type/min/max/required; concurrency version.
- **Lỗi**:
  - `SUBMISSION_NOT_EDITABLE`
  - `SUBMISSION_VERSION_MISMATCH` (`412/409` tuỳ chuẩn)
  - `CELL_VALIDATION_ERROR` (kèm danh sách theo cell)

#### `POST /submissions/{id}/submit`

- **Validate**: required completeness; within deadline policy.
- **Lỗi**:
  - `SUBMIT_INCOMPLETE`
  - `SUBMIT_DEADLINE_PASSED` (nếu không cho nộp trễ)

---

### Approvals

#### approve/reject

- **Validate**: `PENDING`; approver scope; reject requires `reason`.
- **Lỗi**:
  - `APPROVAL_NOT_PENDING`
  - `APPROVAL_FORBIDDEN`
  - `REJECT_REASON_REQUIRED`

---

### Query / Tra cứu

#### `GET /query/reports`

- **Validate**: pagination bounds; sort allow-list; filter combinations hợp lệ; scope org.
- **Lỗi**:
  - `QUERY_FORBIDDEN`
  - `VALIDATION_ERROR`

#### `GET /query/reports/{submissionId}/export`

- **Validate**: permission EXPORT; format; size/time limits.
- **Lỗi**:
  - `EXPORT_FORBIDDEN`
  - `EXPORT_TOO_LARGE` / `QUERY_TIMEOUT`

---

### Summaries / analytics / export

#### summaries recompute

- **Validate**: đủ điều kiện aggregate; lock để tránh song song.
- **Lỗi**:
  - `SUMMARY_RECOMPUTE_LOCKED`
  - `SUMMARY_INPUT_INCOMPLETE`

#### analytics export

- **Validate**: time range limits; permission EXPORT; size/time limits.
- **Lỗi**:
  - `EXPORT_FORBIDDEN`
  - `EXPORT_TOO_LARGE` / `QUERY_TIMEOUT`

---

### HTTP status mapping (khuyến nghị)

- `400`: malformed request
- `401`: unauthenticated
- `403`: authenticated nhưng không đủ quyền/scope
- `404`: không tồn tại (hoặc không visible theo scope)
- `409`: business conflict (duplicate, invalid transition)
- `412`: precondition failed (version mismatch)
- `422`: validation (body/query) — có thể gộp vào `400` nếu team muốn gọn
- `429`: rate limit / resend OTP / login brute force

---

## Phần D — Backend processing flows (theo API)

## QLDL — Backend processing flows (theo API)

Format theo yêu cầu triển khai:

`API:`

- bước 1
- bước 2
- bước 3

> Các bước “mặc định” không lặp lại ở mọi API: **AuthN/JWT**, **AuthZ/RBAC + data-scope**, **validate input**, **transaction** (khi có nhiều writes), **audit_logs**, **enqueue notification/email**.

---

### Auth

`API: POST /api/v1/auth/login`

- Validate body + resolve user theo username/email.
- Verify password + account state (active/locked/deleted/org locked nếu có rule).
- Nếu cần 2FA: tạo challenge + trả `requires2fa`; nếu không: phát hành access/refresh token + audit success.

`API: POST /api/v1/auth/2fa/verify`

- Validate challenge + OTP/TOTP + TTL + consume policy.
- Phát hành token + audit.

`API: POST /api/v1/auth/refresh`

- Validate refresh token → rotate/revoke theo policy → trả access token mới.

`API: POST /api/v1/auth/logout`

- Revoke refresh token(s) theo scope + audit logout.

`API: POST /api/v1/auth/password/*`

- Validate token/TTL/password policy.
- Update `users.password_hash` + revoke sessions/tokens + audit.

---

### Users / RBAC / Orgs (Admin)

`API: POST /api/v1/users`

- Validate unique + FK org/roles + policy password/temporary password.
- Transaction: insert user (+ user_role_groups) + enqueue welcome/reset email + audit.

`API: POST /api/v1/users/import`

- Validate file + create `import_jobs`.
- Worker: row validate → bulk upsert users (+ roles) + job summary + audit.

`API: PATCH /api/v1/orgs/{id}/lock`

- Validate org exists + authorization.
- Update `is_active` (optional cascade users) + audit.

---

### Form designer

`API: GET|POST|PATCH /api/v1/field-categories*`

- **GET**: list danh mục (filter `isActive`, search `q`).
- **POST/PATCH**: CRUD danh mục; validate `code` unique + format.
- **Tables**: `field_categories` (**R/C/U**), `audit_logs` (**C** tuỳ policy).

`API: POST /api/v1/forms`

- Validate `fieldCategoryId` → `field_categories` (tồn tại + `is_active`).
- Validate unique constraints + generate `code` theo rule hệ thống.
- Insert `forms` (`field_category_id` FK) + audit. Response list/detail có thể trả thêm `fieldCategory` = `code` từ join (không cột denormalized trên `forms`).

`API: POST /api/v1/forms/{id}/copy`

- Transaction: clone `forms` (giữ/đổi `field_category_id` theo body) + clone attributes/indicators (không clone dữ liệu nhập) + audit.

`API: POST /api/v1/forms/{id}/indicators/import`

- Create import job → worker validates all rows → bulk upsert indicators + audit summary.

---

### Assignments

`API: POST /api/v1/assignments`

- Validate form active + org active + kỳ hợp lệ (type/from/to) + deadline + anti-duplicate unique key.
- Transaction: bulk insert assignments + enqueue notifications theo user nhận + audit.

`API: POST /api/v1/assignments/{id}/cancel`

- Validate assignment not started theo rule (submission status/data existence).
- Update cancel flags + reason + notify + audit.

---

### Data entry / submissions

`API: PATCH /api/v1/submissions/{id}/cells`

- Authorize theo org + chỉ cho phép khi submission editable (`DRAFT/REJECTED`).
- Optimistic concurrency (`clientVersion`) + validate từng cell theo schema form.
- Transaction: upsert `report_data` + update completion/version + optional history rows + optional anomaly notify + audit (tuỳ mức độ chi tiết).

`API: POST /api/v1/submissions/{id}/submit`

- Validate required completeness + business rules.
- Transaction: `DRAFT→PENDING`, set submit metadata + lock edits + notify approvers + audit.

---

### Approvals

`API: POST /api/v1/approvals/{submissionId}/approve`

- Authorize approver + validate `PENDING`.
- Transaction: set `APPROVED` + timestamps + notify submitter + audit + (optional) trigger parent-child sync.

`API: POST /api/v1/approvals/{submissionId}/reject`

- Require reason + validate `PENDING`.
- Transaction: `REJECTED` + reason + notify + audit.

---

### Consolidation

`API: POST /api/v1/summaries`

- Authorize manager scope.
- Read approved unit submissions + apply aggregate rules (sum/formula) + counts.
- Upsert `report_summaries` + audit.

`API: POST /api/v1/summaries/{id}/recompute`

- Lock summary row + reload latest approved dataset + rewrite JSON summary + audit.

---

### Query / Tra cứu

`API: GET /api/v1/query/reports`

- Authorize theo data-scope; validate filters/pagination.
- Query joins `report_submissions` + `form_assignments` + master data; trả list “tra cứu”.

`API: GET /api/v1/query/reports/{submissionId}`

- Authorize + read metadata; (tuỳ chọn) redirect/link tới `GET /submissions/{id}` nếu user có quyền xem chi tiết.

`API: GET /api/v1/query/reports/{submissionId}/export`

- Authorize EXPORT scope + generate file + audit EXPORT.

### Monitoring / reminders

`API: POST /api/v1/monitoring/reminders`

- Validate targets + anti-spam policy.
- Bulk insert notifications + enqueue delivery + audit.

### Analytics / export

`API: GET /api/v1/analytics/*`

- Authorize scope + validate time range + execute aggregate queries (prefer read replica).

`API: GET /api/v1/analytics/export`

- Same as analytics read + generate file + signed URL + audit EXPORT.

---

## Phần E — Query / Tra cứu (QRY-01)

## QLDL — Query / Tra cứu (QRY-01)

Mục tiêu: bù endpoint “Tra cứu báo cáo” trong use case, tách khỏi `monitoring` (điều hành) và `submissions` (nhập liệu).

### Nguyên tắc phân quyền & phạm vi dữ liệu

- **System Admin / Data Manager**: tra cứu theo phạm vi được cấu hình (thường toàn xã).
- **Data Entry**: mặc định chỉ thấy dữ liệu thuộc `users.org_id` (và có thể org con nếu bật).
- **Approver**: thường read-only theo org phê duyệt; có thể mở rộng theo policy.

### API đề xuất

#### `GET /query/reports`

**Mục đích**: tra cứu danh sách “báo cáo theo đơn vị/kỳ/biểu mẫu/trạng thái”.

**Query params (khuyến nghị)**

- `q?`: từ khóa (tên biểu mẫu / mã biểu mẫu / mã submission)
- `formId?`, `orgId?`, `periodType?`, `periodFrom?`, `periodTo?`
- `status?`: `DRAFT|PENDING|APPROVED|REJECTED|OVERDUE` (OVERDUE có thể là derived)
- `deadlineFrom?`, `deadlineTo?`
- `page?, limit?, sort?`

**Response (khuyến nghị)**

- `items[]` gồm:
  - ids: `submissionId`, `assignmentId`
  - snapshot: `form`, `period`, `org`
  - `status`, `completionPct`, `submittedAt`, `approvedAt`
  - `deadlineTo` (từ assignment)

**DB reads**

- `report_submissions`
- `form_assignments` (deadline + org + form + period)
- joins: `forms`, `organizations` (period là snapshot trên `form_assignments`)

#### `GET /query/reports/{submissionId}`

**Mục đích**: xem nhanh metadata + trạng thái + link tới chi tiết đầy đủ.

**DB reads**

- `report_submissions` + joins như trên

#### `GET /query/reports/{submissionId}/export`

**Mục đích**: export tra cứu (nếu policy cho phép).

**DB reads + audit**

- giống export submission + `audit_logs(EXPORT)`

### Khác biệt so với các API hiện có

- `GET /monitoring/reports`: tập trung **vận hành** (đếm trễ, reminder, tiến độ)
- `GET /query/reports`: tập trung **tra cứu/lookup** (search/pagination/sort theo nhu cầu người dùng)

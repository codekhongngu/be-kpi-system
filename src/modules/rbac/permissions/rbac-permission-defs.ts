import { QldlAction } from '../../../common/guards/qldl-rbac.guard';

export type RbacPermissionDef = {
  key: string;
  name: string;
  actions: QldlAction[];
};

/** Catalog tĩnh — theo `docs/QLDL_CLUSTER_01_OVERVIEW_RBAC_TRACEABILITY.md` */
export const RBAC_PERMISSION_DEFS: RbacPermissionDef[] = [
  { key: 'AUTH', name: 'Xác thực', actions: ['READ', 'WRITE', 'DELETE', 'EXPORT'] },
  {
    key: 'ADMIN_USERS',
    name: 'Quản trị người dùng',
    actions: ['READ', 'WRITE', 'DELETE', 'EXPORT'],
  },
  {
    key: 'ADMIN_ORGS',
    name: 'Quản trị đơn vị',
    actions: ['READ', 'WRITE', 'DELETE', 'EXPORT'],
  },
  {
    key: 'ADMIN_PERIODS',
    name: 'Quản trị kỳ báo cáo',
    actions: ['READ', 'WRITE', 'DELETE', 'EXPORT'],
  },
  {
    key: 'ADMIN_RBAC',
    name: 'Quản trị RBAC (nhóm quyền)',
    actions: ['READ', 'WRITE', 'DELETE', 'EXPORT'],
  },
  {
    key: 'DESIGN_FORMS',
    name: 'Thiết kế biểu mẫu',
    actions: ['READ', 'WRITE', 'DELETE', 'EXPORT'],
  },
  {
    key: 'OPS_ASSIGNMENTS',
    name: 'Giao báo cáo',
    actions: ['READ', 'WRITE', 'DELETE', 'EXPORT'],
  },
  {
    key: 'OPS_MONITORING',
    name: 'Theo dõi / nhắc nhở',
    actions: ['READ', 'WRITE', 'DELETE', 'EXPORT'],
  },
  {
    key: 'QUERY_REPORTS',
    name: 'Tra cứu báo cáo (QRY-01)',
    actions: ['READ', 'EXPORT'],
  },
  {
    key: 'OPS_SUMMARIES',
    name: 'Tổng hợp báo cáo',
    actions: ['READ', 'WRITE', 'DELETE', 'EXPORT'],
  },
  {
    key: 'ENTRY_SUBMISSIONS',
    name: 'Nhập liệu / nộp báo cáo',
    actions: ['READ', 'WRITE', 'DELETE', 'EXPORT'],
  },
  {
    key: 'APPROVALS',
    name: 'Duyệt báo cáo',
    actions: ['READ', 'WRITE', 'DELETE', 'EXPORT'],
  },
  {
    key: 'ANALYTICS',
    name: 'Phân tích / thống kê',
    actions: ['READ', 'EXPORT'],
  },
  {
    key: 'NOTIFICATIONS',
    name: 'Thông báo',
    actions: ['READ', 'WRITE', 'DELETE', 'EXPORT'],
  },
  {
    key: 'AUDIT',
    name: 'Nhật ký kiểm toán',
    actions: ['READ', 'EXPORT'],
  },
];

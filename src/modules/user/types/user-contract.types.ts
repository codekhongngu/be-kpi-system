/** Shapes aligned with docs/QLDL_CLUSTER_02_API_CONTRACTS.md (Users / Me). */

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

export type UserDetail = UserListItem & {
  phone?: string | null;
  avatarUrl?: string | null;
  language: string;
  timezone: string;
  notifyChannel: 'IN_APP' | 'EMAIL' | 'BOTH';
  createdAt: string;
  updatedAt: string | null;
  deletedAt: string | null;
};

export type NotificationPrefs = Record<
  string,
  { inApp: boolean; email: boolean }
>;

/** `GET /me` — theo QLDL_CLUSTER_02 (MeResponse). */
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
  notifyChannel: 'IN_APP' | 'EMAIL' | 'BOTH';
  notificationPrefs?: NotificationPrefs;
};

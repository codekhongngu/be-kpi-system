import { SetMetadata } from '@nestjs/common';
import { QLDL_PERMISSION_KEY, QldlAction } from '../guards/qldl-rbac.guard';

export const QldlPermission = (key: string, action: QldlAction) =>
  SetMetadata(QLDL_PERMISSION_KEY, { key, action });

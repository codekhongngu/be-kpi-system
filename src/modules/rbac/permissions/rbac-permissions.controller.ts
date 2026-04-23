import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { QldlPermission, QldlRbacGuard } from '../../../common';
import { RBAC_PERMISSION_DEFS } from './rbac-permission-defs';

@Controller('permissions')
@UseGuards(JwtAuthGuard, QldlRbacGuard)
export class RbacPermissionsController {
  @Get()
  @QldlPermission('ADMIN_RBAC', 'READ')
  list(): { items: typeof RBAC_PERMISSION_DEFS } {
    return { items: RBAC_PERMISSION_DEFS };
  }
}

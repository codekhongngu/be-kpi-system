import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { Permissions, PermissionsGuard } from '../../common';
import { SubmissionService } from './submission.service';
import { MyAssignmentsQueryDto } from './dto/my-assignments-query.dto';

@Controller('my')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MyAssignmentsController {
  constructor(private readonly submissionService: SubmissionService) {}

  @Get('assignments')
  @Permissions('submissions.manage')
  async list(@CurrentUser() user: User, @Query() query: MyAssignmentsQueryDto) {
    return await this.submissionService.myAssignments(user, query);
  }
}



import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { QldlPermission, QldlRbacGuard } from '../../common';
import { SubmissionService } from './submission.service';
import { MyAssignmentsQueryDto } from './dto/my-assignments-query.dto';

@Controller('my')
@UseGuards(JwtAuthGuard, QldlRbacGuard)
export class MyAssignmentsController {
  constructor(private readonly submissionService: SubmissionService) {}

  @Get('assignments')
  @QldlPermission('ENTRY_SUBMISSIONS', 'READ')
  async list(
    @CurrentUser() user: User,
    @Query() query: MyAssignmentsQueryDto,
  ) {
    return await this.submissionService.myAssignments(user, query);
  }
}

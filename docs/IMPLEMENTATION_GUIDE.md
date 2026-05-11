# Hướng Dẫn Triển Khai Two-Level Approval Workflow

> Hướng dẫn chi tiết triển khai luồng phê duyệt 2 cấp độ cho hệ thống KPI
> Dự kiến: 12 tuần (4 phases)
> Cập nhật: 2026-05-11

---

## 1. Tổng Quan Triển Khai

### 1.1 Mục Tiêu
- Triển khai luồng phê duyệt 2 cấp: Phòng ban → Xã
- Cập nhật database schema, backend logic, và frontend
- Đảm bảo backward compatibility và data integrity
- Training và documentation cho người dùng

### 1.2 Phạm Vi
- **Backend**: Database schema, API endpoints, business logic
- **Frontend**: UI components, workflows, notifications
- **Infrastructure**: Database migrations, monitoring
- **Documentation**: Technical docs, user guides

### 1.3 Stakeholders
- **Development Team**: Backend, Frontend, DevOps engineers
- **Product Owner**: Requirements validation, UAT
- **System Admin**: Production deployment, monitoring
- **End Users**: Training, feedback collection

---

## 2. Phase 1: Core Implementation (4 Tuần)

### 2.1 Tuần 1: Database Schema Changes

#### 2.1.1 Migration Script
```sql
-- File: migrations/V2.0.0__two_level_approval.sql

-- Add new columns to report_submissions
ALTER TABLE report_submissions 
ADD COLUMN department_approved_by uuid NULL REFERENCES users(id),
ADD COLUMN department_approved_at timestamptz NULL,
ADD COLUMN district_approved_by uuid NULL REFERENCES users(id), 
ADD COLUMN district_approved_at timestamptz NULL;

-- Create indexes for performance
CREATE INDEX "IDX_submissions_department_status" 
ON report_submissions (status, department_approved_at) 
WHERE status IN ('DEPARTMENT_APPROVED', 'PENDING_DISTRICT');

CREATE INDEX "IDX_submissions_district_status"
ON report_submissions (status, district_approved_at)
WHERE status IN ('DISTRICT_APPROVED');

-- Update submission status enum
ALTER TYPE submission_status_enum 
ADD VALUE 'PENDING_DEPARTMENT' AFTER 'PENDING',
ADD VALUE 'DEPARTMENT_APPROVED' AFTER 'APPROVED',
ADD VALUE 'PENDING_DISTRICT' AFTER 'DEPARTMENT_APPROVED',
ADD VALUE 'DISTRICT_APPROVED' AFTER 'PENDING_DISTRICT',
ADD VALUE 'REJECTED_DEPARTMENT' AFTER 'REJECTED',
ADD VALUE 'REJECTED_DISTRICT' AFTER 'REJECTED_DEPARTMENT';

-- Create audit table for approval history
CREATE TABLE "approval_history" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "submission_id" uuid NOT NULL REFERENCES "report_submissions"("id") ON DELETE CASCADE,
    "approval_level" varchar(20) NOT NULL CHECK (approval_level IN ('DEPARTMENT', 'DISTRICT')),
    "action" varchar(20) NOT NULL CHECK (action IN ('APPROVE', 'REJECT')),
    "user_id" uuid NOT NULL REFERENCES "users"("id"),
    "reason" text NULL,
    "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "IDX_approval_history_submission" 
ON approval_history (submission_id, created_at DESC);
```

#### 2.1.2 Rollback Script
```sql
-- File: migrations/V2.0.0__rollback_two_level_approval.sql

-- Drop audit table
DROP TABLE IF EXISTS "approval_history";

-- Drop indexes
DROP INDEX IF EXISTS "IDX_submissions_department_status";
DROP INDEX IF EXISTS "IDX_submissions_district_status";

-- Drop columns (note: this will lose data)
ALTER TABLE report_submissions 
DROP COLUMN IF EXISTS department_approved_by,
DROP COLUMN IF EXISTS department_approved_at,
DROP COLUMN IF EXISTS district_approved_by,
DROP COLUMN IF EXISTS district_approved_at;

-- Note: Cannot remove enum values in PostgreSQL without recreating the type
```

#### 2.1.3 Entity Updates
```typescript
// File: src/modules/submission/entities/report-submission.entity.ts

@Entity('report_submissions')
export class ReportSubmission {
  // ... existing fields ...

  @Column({ name: 'department_approved_by', nullable: true })
  departmentApprovedBy: string | null;

  @CreateDateColumn({ name: 'department_approved_at', nullable: true })
  departmentApprovedAt: Date | null;

  @Column({ name: 'district_approved_by', nullable: true })
  districtApprovedBy: string | null;

  @CreateDateColumn({ name: 'district_approved_at', nullable: true })
  districtApprovedAt: Date | null;
}
```

### 2.2 Tuần 2: Update Business Logic

#### 2.2.1 Update Submission Service
```typescript
// File: src/modules/submission/submission.service.ts

// Update submit method
async submit(id: string, dto: SubmitSubmissionDto, user: User) {
  const s = await this.submissionRepo.findOne({ where: { id } });
  if (!s) throw new NotFoundException('Không tìm thấy bản nộp');
  
  // ... existing validation ...
  
  // Update to new workflow
  s.status = 'PENDING_DEPARTMENT';
  s.submittedBy = user.id;
  s.submittedAt = new Date();
  s.version += 1;
  await this.submissionRepo.save(s);

  // Notify department managers
  await this.notifyDepartmentApprovers(a.orgId, s.id);
  
  return {
    status: s.status as 'PENDING_DEPARTMENT',
    submittedAt: s.submittedAt.toISOString(),
  };
}

// New methods for department approval
async approveDepartment(submissionId: string, user: User) {
  const s = await this.submissionRepo.findOne({ where: { id: submissionId } });
  if (!s) throw new NotFoundException('Không tìm thấy bản nộp');
  
  if (s.status !== 'PENDING_DEPARTMENT') {
    throw new ConflictException('SUBMISSION_NOT_PENDING_DEPARTMENT');
  }

  // Check user permissions
  await this.validateDepartmentApprovalPermission(user, s);

  s.status = 'DEPARTMENT_APPROVED';
  s.departmentApprovedBy = user.id;
  s.departmentApprovedAt = new Date();
  await this.submissionRepo.save(s);

  // Record approval history
  await this.recordApprovalHistory(s.id, 'DEPARTMENT', 'APPROVE', user.id);

  // Notify district admins
  await this.notifyDistrictAdmins(s.id);

  return {
    status: 'DEPARTMENT_APPROVED' as const,
    approvedAt: s.departmentApprovedAt.toISOString(),
  };
}

// New methods for district approval
async approveDistrict(submissionId: string, user: User) {
  const s = await this.submissionRepo.findOne({ where: { id: submissionId } });
  if (!s) throw new NotFoundException('Không tìm thấy bản nộp');
  
  if (s.status !== 'DEPARTMENT_APPROVED') {
    throw new ConflictException('SUBMISSION_NOT_DEPARTMENT_APPROVED');
  }

  // Check user permissions
  await this.validateDistrictApprovalPermission(user, s);

  s.status = 'DISTRICT_APPROVED';
  s.districtApprovedBy = user.id;
  s.districtApprovedAt = new Date();
  await this.submissionRepo.save(s);

  // Record approval history
  await this.recordApprovalHistory(s.id, 'DISTRICT', 'APPROVE', user.id);

  // Trigger summary generation
  await this.triggerSummaryGeneration(s.id);

  return {
    status: 'DISTRICT_APPROVED' as const,
    approvedAt: s.districtApprovedAt.toISOString(),
  };
}
```

#### 2.2.2 Update Approval Controller
```typescript
// File: src/modules/approval/approval.controller.ts

// New department approval endpoints
@Post(':id/approve-department')
@Permissions('approvals.department.manage')
async approveDepartment(
  @Param('id', ParseUUIDPipe) id: string,
  @CurrentUser() user: User,
) {
  return await this.approvalService.approveDepartment(id, user);
}

@Post(':id/reject-department')
@Permissions('approvals.department.manage')
async rejectDepartment(
  @Param('id', ParseUUIDPipe) id: string,
  @Body() dto: { reason: string },
  @CurrentUser() user: User,
) {
  return await this.approvalService.rejectDepartment(id, dto.reason, user);
}

// New district approval endpoints
@Post(':id/approve-district')
@Permissions('approvals.district.manage')
async approveDistrict(
  @Param('id', ParseUUIDPipe) id: string,
  @CurrentUser() user: User,
) {
  return await this.approvalService.approveDistrict(id, user);
}

@Post(':id/reject-district')
@Permissions('approvals.district.manage')
async rejectDistrict(
  @Param('id', ParseUUIDPipe) id: string,
  @Body() dto: { reason: string },
  @CurrentUser() user: User,
) {
  return await this.approvalService.rejectDistrict(id, dto.reason, user);
}

// New query endpoints
@Get('pending-department')
@Permissions('approvals.department.manage')
async getPendingDepartment(
  @Query() query: PendingApprovalsQueryDto,
  @CurrentUser() user: User,
) {
  return await this.approvalService.getPendingDepartment(query, user);
}

@Get('department-approved')
@Permissions('approvals.district.manage')
async getDepartmentApproved(
  @Query() query: ApprovedApprovalsQueryDto,
  @CurrentUser() user: User,
) {
  return await this.approvalService.getDepartmentApproved(query, user);
}
```

### 2.3 Tuần 3: Permission Updates

#### 2.3.1 Update Role Seeder
```typescript
// File: src/modules/role/services/role-seeder.service.ts

private async createPermissions(): Promise<Permission[]> {
  const permissionData = [
    // ... existing permissions ...
    
    // New two-level approval permissions
    {
      code: 'approvals.department.manage',
      name: 'Duyệt báo cáo cấp phòng ban',
      description: 'Approve/Reject submissions at department level',
      category: 'QLDL',
    },
    {
      code: 'approvals.district.manage',
      name: 'Duyệt báo cáo cấp xã',
      description: 'Approve/Reject submissions at district level',
      category: 'QLDL',
    },
    {
      code: 'summaries.district.manage',
      name: 'Tổng hợp báo cáo cấp xã',
      description: 'Aggregate district-level reports',
      category: 'QLDL',
    },
  ];
  
  // ... rest of the method ...
}

private async createRoles(permissions: Permission[]) {
  const roleData = [
    // ... existing roles ...
    
    {
      code: 'DATA_MANAGER',
      name: 'Data Manager',
      description: 'Quản lý kỳ/biểu mẫu/giao việc/tổng hợp/giám sát',
      isSystem: false,
      permissionCodes: [
        // ... existing permissions ...
        'approvals.department.manage', // Add department approval
        // ... other permissions ...
      ],
    },
    {
      code: 'SYSTEM_ADMIN',
      name: 'System Admin',
      description: 'Toàn quyền cấu hình & vận hành',
      isSystem: true,
      permissionCodes: [
        // ... existing permissions ...
        'approvals.district.manage', // Add district approval
        'summaries.district.manage', // Add district summary
        // ... other permissions ...
      ],
    },
  ];
  
  // ... rest of the method ...
}
```

### 2.4 UX Design Approach: Role-Based Version Management

#### 2.4.1 Design Philosophy
Sau khi phân tích và thống nhất, chúng ta áp dụng **Role-Based Version Management**:

- **Staff (Data Entry)**: Focus on active submission only
- **Admin/Manager**: Full version visibility and management
- **Version Purpose**: Audit trail và compliance, không phải workflow complexity

#### 2.4.2 Staff View - Simple & Focused
```typescript
// File: src/modules/submission/submission.service.ts

// Query chỉ lấy active submission cho staff
async getActiveSubmission(assignmentId: string, user: User) {
  const submission = await this.submissionRepo.findOne({
    where: { 
      assignmentId,
      status: Not In(['REJECTED', 'REJECTED_DEPARTMENT', 'REJECTED_DISTRICT'])
    },
    order: { createdAt: 'DESC' }
  });
  
  if (!submission) {
    // Tạo mới active submission
    return await this.createNewSubmission(assignmentId, user);
  }
  
  return submission;
}

// Query lịch sử cho admin (staff chỉ xem read-only)
async getSubmissionHistory(assignmentId: string) {
  return await this.submissionRepo.find({
    where: { assignmentId },
    order: { createdAt: 'DESC' },
    relations: ['submittedBy', 'departmentApprovedBy', 'districtApprovedBy']
  });
}
```

#### 2.4.3 Admin View - Complete Version Management
```typescript
// File: src/modules/approval/approval.service.ts

// Admin thấy tất cả versions
async getAssignmentWithVersions(assignmentId: string, user: User) {
  const [assignment, allSubmissions] = await Promise.all([
    this.assignmentRepo.findOne({ where: { id: assignmentId } }),
    this.getSubmissionHistory(assignmentId)
  ]);
  
  const activeSubmission = allSubmissions.find(s => 
    !['REJECTED', 'REJECTED_DEPARTMENT', 'REJECTED_DISTRICT'].includes(s.status)
  );
  
  return {
    assignment,
    activeSubmission,
    allVersions: allSubmissions
  };
}
```

#### 2.4.4 Frontend Component Structure
```typescript
// File: src/components/submission/assignment-detail.component.ts

@Component({
  selector: 'app-assignment-detail',
  template: `
    <div class="assignment-detail">
      <assignment-header [assignment]="assignment"></assignment-header>
      
      <!-- Staff View: Simple -->
      <ng-container *ngIf="userRole === 'STAFF'">
        <submission-form 
          [submission]="activeSubmission"
          [assignment]="assignment"
          (saved)="onSaved($event)"
          (submitted)="onSubmitted($event)">
        </submission-form>
        
        <div class="actions">
          <button (click)="viewHistory()" class="btn-outline">
            Xem lịch sử
          </button>
        </div>
      </ng-container>
      
      <!-- Admin View: Advanced -->
      <ng-container *ngIf="userRole === 'ADMIN' || userRole === 'MANAGER'">
        <tab-group>
          <tab label="Bản đang làm việc">
            <submission-form 
              [submission]="activeSubmission"
              [readonly]="true"
              [showAuditInfo]="true">
            </submission-form>
          </tab>
          
          <tab label="Lịch sử versions">
            <version-history 
              [versions]="allVersions"
              [activeVersion]="activeSubmission"
              (compareVersions)="onCompareVersions($event)">
            </version-history>
          </tab>
        </tab-group>
      </ng-container>
    </div>
  `
})
export class AssignmentDetailComponent {
  @Input() assignmentId: string;
  userRole: 'STAFF' | 'MANAGER' | 'ADMIN';
  assignment: any;
  activeSubmission: any;
  allVersions: any[] = [];
}
```

#### 2.4.5 Version History Component
```typescript
// File: src/components/submission/version-history.component.ts

@Component({
  selector: 'app-version-history',
  template: `
    <div class="version-history">
      <div class="version-list">
        <div 
          *ngFor="let version of versions; let i = index"
          class="version-item"
          [class.active]="version.id === activeVersion?.id"
          [class.rejected]="isRejected(version.status)">
          
          <div class="version-header">
            <h4>Version {{version.version}}</h4>
            <status-badge [status]="version.status"></status-badge>
            <span class="date">{{version.createdAt | date:'short'}}</span>
          </div>
          
          <div class="version-meta">
            <div class="submitter">
              <img [src]="version.submittedBy?.avatar" class="avatar">
              <span>{{version.submittedBy?.fullName}}</span>
            </div>
            
            <div class="approvals" *ngIf="hasApprovals(version)">
              <div class="approval" *ngIf="version.departmentApprovedBy">
                <span>Phòng ban:</span>
                <user-info [user]="version.departmentApprovedBy"></user-info>
                <span>{{version.departmentApprovedAt | date:'short'}}</span>
              </div>
              
              <div class="approval" *ngIf="version.districtApprovedBy">
                <span>Cấp xã:</span>
                <user-info [user]="version.districtApprovedBy"></user-info>
                <span>{{version.districtApprovedAt | date:'short'}}</span>
              </div>
            </div>
          </div>
          
          <div class="version-actions">
            <button (click)="viewVersion(version)" class="btn-primary">
              Xem chi tiết
            </button>
            <button (click)="downloadVersion(version)" class="btn-outline">
              Tải xuống
            </button>
            <button 
              *ngIf="canCompare(version)" 
              (click)="compareWithActive(version)" 
              class="btn-outline">
              So sánh
            </button>
          </div>
          
          <div class="rejection-reason" *ngIf="isRejected(version.status)">
            <strong>Lý do từ chối:</strong> {{version.rejectReason}}
          </div>
        </div>
      </div>
      
      <version-compare-modal 
        *ngIf="showCompareModal"
        [version1]="compareVersion1"
        [version2]="compareVersion2"
        (close)="showCompareModal = false">
      </version-compare-modal>
    </div>
  `
})
export class VersionHistoryComponent {
  @Input() versions: any[];
  @Input() activeVersion: any;
  
  isRejected(status: string): boolean {
    return ['REJECTED', 'REJECTED_DEPARTMENT', 'REJECTED_DISTRICT'].includes(status);
  }
  
  hasApprovals(version: any): boolean {
    return version.departmentApprovedBy || version.districtApprovedBy;
  }
  
  canCompare(version: any): boolean {
    return version.id !== this.activeVersion?.id;
  }
}
```

### 2.4 Tuần 4: Testing and Validation

#### 2.4.1 Unit Tests
```typescript
// File: tests/submission.service.spec.ts

describe('SubmissionService - Two Level Approval', () => {
  describe('approveDepartment', () => {
    it('should approve submission at department level', async () => {
      // Test implementation
    });

    it('should throw error if submission not pending department', async () => {
      // Test implementation
    });

    it('should record approval history', async () => {
      // Test implementation
    });
  });

  describe('approveDistrict', () => {
    it('should approve submission at district level', async () => {
      // Test implementation
    });

    it('should throw error if submission not department approved', async () => {
      // Test implementation
    });
  });
});
```

#### 2.4.2 Integration Tests
```typescript
// File: tests/approval.integration.spec.ts

describe('Approval Workflow Integration', () => {
  let submissionService: SubmissionService;
  let approvalService: ApprovalService;
  let notificationService: NotificationService;
  let testUser: User;
  let testManager: User;
  let testAdmin: User;
  let testAssignment: FormAssignment;

  beforeEach(async () => {
    // Setup test data
    testUser = await createTestUser('STAFF');
    testManager = await createTestUser('MANAGER');
    testAdmin = await createTestUser('ADMIN');
    testAssignment = await createTestAssignment(testUser.orgId);
  });

  describe('Full Two-Level Approval Workflow', () => {
    it('should complete full approval workflow end-to-end', async () => {
      // 1. Staff creates and submits submission
      const submission = await submissionService.create({
        assignmentId: testAssignment.id
      }, testUser);

      await submissionService.submit(submission.id, {
        note: 'Báo cáo tháng 1/2026'
      }, testUser);

      expect(submission.status).toBe('PENDING_DEPARTMENT');

      // 2. Manager approves at department level
      const departmentApproval = await approvalService.approveDepartment(
        submission.id, 
        testManager
      );

      expect(departmentApproval.status).toBe('DEPARTMENT_APPROVED');
      expect(departmentApproval.approvedAt).toBeDefined();

      // 3. Admin approves at district level
      const districtApproval = await approvalService.approveDistrict(
        submission.id,
        testAdmin
      );

      expect(districtApproval.status).toBe('DISTRICT_APPROVED');
      expect(districtApproval.approvedAt).toBeDefined();

      // 4. Verify final state and audit trail
      const finalSubmission = await submissionService.findOne(submission.id, testAdmin);
      expect(finalSubmission.status).toBe('DISTRICT_APPROVED');
      expect(finalSubmission.departmentApprovedBy).toBe(testManager.id);
      expect(finalSubmission.districtApprovedBy).toBe(testAdmin.id);

      // 5. Verify notifications were sent
      const departmentNotifications = await notificationService.findByUserAndType(
        testManager.id,
        'SUBMISSION_PENDING_DEPARTMENT'
      );
      expect(departmentNotifications.length).toBeGreaterThan(0);

      const districtNotifications = await notificationService.findByUserAndType(
        testAdmin.id,
        'SUBMISSION_PENDING_DISTRICT'
      );
      expect(districtNotifications.length).toBeGreaterThan(0);
    });

    it('should handle rejection at department level', async () => {
      // 1. Staff submits
      const submission = await createAndSubmitSubmission(testAssignment, testUser);

      // 2. Manager rejects with reason
      const rejection = await approvalService.rejectDepartment(
        submission.id,
        'Sai số liệu cột doanh thu',
        testManager
      );

      expect(rejection.status).toBe('REJECTED_DEPARTMENT');

      // 3. Verify staff can resubmit
      const resubmission = await submissionService.findOrCreateByAssignment(
        testAssignment.id,
        testUser
      );

      expect(resubmission.status).toBe('DRAFT');
      expect(resubmission.version).toBe(2); // New version created
    });

    it('should handle rejection at district level', async () => {
      // 1. Complete department approval
      const submission = await createAndSubmitSubmission(testAssignment, testUser);
      await approvalService.approveDepartment(submission.id, testManager);

      // 2. Admin rejects at district level
      const rejection = await approvalService.rejectDistrict(
        submission.id,
        'Không phù hợp quy định tài chính',
        testAdmin
      );

      expect(rejection.status).toBe('REJECTED_DISTRICT');

      // 3. Verify staff must start over (new version)
      const resubmission = await submissionService.findOrCreateByAssignment(
        testAssignment.id,
        testUser
      );

      expect(resubmission.status).toBe('DRAFT');
      expect(resubmission.version).toBe(3); // New version after district rejection
    });
  });

  describe('Permission and Access Control', () => {
    it('should prevent staff from approving submissions', async () => {
      const submission = await createAndSubmitSubmission(testAssignment, testUser);

      await expect(
        approvalService.approveDepartment(submission.id, testUser)
      ).rejects.toThrow('FORBIDDEN');
    });

    it('should prevent manager from approving outside their organization', async () => {
      const otherOrgAssignment = await createTestAssignment('other-org-id');
      const submission = await createAndSubmitSubmission(otherOrgAssignment, testUser);

      await expect(
        approvalService.approveDepartment(submission.id, testManager)
      ).rejects.toThrow('FORBIDDEN');
    });

    it('should prevent district approval before department approval', async () => {
      const submission = await createAndSubmitSubmission(testAssignment, testUser);

      await expect(
        approvalService.approveDistrict(submission.id, testAdmin)
      ).rejects.toThrow('SUBMISSION_NOT_DEPARTMENT_APPROVED');
    });
  });

  describe('Notification Integration', () => {
    it('should send notifications to correct users at each step', async () => {
      // Clear existing notifications
      await notificationService.clearAll();

      // 1. Submit submission
      const submission = await createAndSubmitSubmission(testAssignment, testUser);

      // Check department manager notifications
      const deptNotifications = await notificationService.findByUserAndType(
        testManager.id,
        'SUBMISSION_PENDING_DEPARTMENT'
      );
      expect(deptNotifications.length).toBe(1);
      expect(deptNotifications[0].payload.refId).toBe(submission.id);

      // 2. Approve at department level
      await approvalService.approveDepartment(submission.id, testManager);

      // Check district admin notifications
      const distNotifications = await notificationService.findByUserAndType(
        testAdmin.id,
        'SUBMISSION_PENDING_DISTRICT'
      );
      expect(distNotifications.length).toBe(1);

      // 3. Approve at district level
      await approvalService.approveDistrict(submission.id, testAdmin);

      // Check staff notification for final approval
      const staffNotifications = await notificationService.findByUserAndType(
        testUser.id,
        'SUBMISSION_APPROVED_DISTRICT'
      );
      expect(staffNotifications.length).toBe(1);
    });
  });

  describe('Data Integrity and Audit Trail', () => {
    it('should maintain complete audit trail', async () => {
      const submission = await createAndSubmitSubmission(testAssignment, testUser);
      
      // Complete full workflow
      await approvalService.approveDepartment(submission.id, testManager);
      await approvalService.approveDistrict(submission.id, testAdmin);

      // Verify audit history
      const history = await approvalService.getApprovalHistory(submission.id);
      expect(history).toHaveLength(2); // Department + District approvals

      const [deptApproval, distApproval] = history;
      
      expect(deptApproval.approvalLevel).toBe('DEPARTMENT');
      expect(deptApproval.action).toBe('APPROVE');
      expect(deptApproval.userId).toBe(testManager.id);

      expect(distApproval.approvalLevel).toBe('DISTRICT');
      expect(distApproval.action).toBe('APPROVE');
      expect(distApproval.userId).toBe(testAdmin.id);
    });

    it('should preserve submission data across versions', async () => {
      // Create initial submission with data
      const submission = await submissionService.create({
        assignmentId: testAssignment.id
      }, testUser);

      await submissionService.patchCells(submission.id, {
        changes: [
          { indicatorId: 'indicator1', attributeId: 'attr1', valueText: '1000' },
          { indicatorId: 'indicator2', attributeId: 'attr1', valueNumeric: 500 }
        ],
        clientVersion: 1
      }, testUser);

      await submissionService.submit(submission.id, {}, testUser);

      // Reject and create new version
      await approvalService.rejectDepartment(submission.id, 'Need more data', testManager);
      
      const newSubmission = await submissionService.findOrCreateByAssignment(
        testAssignment.id,
        testUser
      );

      // Verify old data is preserved in history
      const oldSubmission = await submissionService.findOne(submission.id, testAdmin);
      expect(oldSubmission.cells).toHaveLength(2);

      // Verify new version starts with same data
      expect(newSubmission.cells).toHaveLength(2);
      expect(newSubmission.version).toBe(2);
    });
  });

  // Helper functions
  async function createAndSubmitSubmission(assignment: FormAssignment, user: User) {
    const submission = await submissionService.create({
      assignmentId: assignment.id
    }, user);

    await submissionService.submit(submission.id, {
      note: 'Test submission'
    }, user);

    return submission;
  }

  async function createTestUser(role: string): Promise<User> {
    // Implementation depends on your test setup
    return {
      id: 'test-user-id',
      orgId: role === 'ADMIN' ? null : 'test-org-id',
      fullName: `Test ${role}`,
      email: `test-${role.toLowerCase()}@test.com`,
      status: 'ACTIVE'
    } as User;
  }

  async function createTestAssignment(orgId: string): Promise<FormAssignment> {
    // Implementation depends on your test setup
    return {
      id: 'test-assignment-id',
      orgId,
      formId: 'test-form-id',
      periodType: 'MONTHLY',
      periodCode: '2026-01',
      periodName: 'Tháng 1/2026',
      deadlineFrom: '2026-01-01',
      deadlineTo: '2026-01-31',
      isCancelled: false
    } as FormAssignment;
  }
});
```

---

## 3. Phase 2: Integration (3 Tuần)

### 3.1 Tuần 5: Notification System Updates

#### 3.1.1 Update Notification Service
```typescript
// File: src/modules/notification/notification.service.ts

async notifyDepartmentApprovers(orgId: string, submissionId: string) {
  // Find users with department approval permission in the organization
  const approvers = await this.dataSource.query(`
    SELECT DISTINCT u.id, u.full_name, u.email
    FROM users u
    INNER JOIN user_roles ur ON ur.user_id = u.id
    INNER JOIN roles r ON r.id = ur.role_id
    INNER JOIN role_permissions rp ON rp.role_id = r.id
    INNER JOIN permissions p ON p.id = rp.permission_id
    WHERE u.org_id = $1 
      AND u.status = 'ACTIVE'
      AND p.code = 'approvals.department.manage'
  `, [orgId]);
  
  if (approvers.length === 0) {
    console.warn(`No department approvers found for org ${orgId}`);
    return;
  }

  // Get submission details for notification
  const submissionDetails = await this.getSubmissionDetails(submissionId);
  
  const notifications = approvers.map(approver => 
    this.notificationRepo.create({
      userId: approver.id,
      aggregateType: 'notification',
      type: 'SUBMISSION_PENDING_DEPARTMENT',
      payload: {
        title: 'Báo cáo chờ duyệt cấp phòng ban',
        body: `Báo cáo ${submissionDetails.code} từ ${submissionDetails.orgName} đang chờ bạn duyệt.`,
        channel: 'IN_APP',
        isRead: false,
        refTable: 'report_submissions',
        refId: submissionId,
        metadata: {
          submissionCode: submissionDetails.code,
          orgName: submissionDetails.orgName,
          periodName: submissionDetails.periodName,
          submittedAt: submissionDetails.submittedAt,
          approvalLink: `${process.env.FRONTEND_URL}/approvals/department/${submissionId}`
        }
      },
      status: 'PENDING',
      retryCount: 0,
      sentAt: null,
    })
  );

  await this.notificationRepo.save(notifications);
  
  // Send email notifications
  await this.sendEmailNotifications(approvers, 'PENDING_DEPARTMENT', submissionDetails);
}

async notifyDistrictAdmins(submissionId: string) {
  // Find users with district approval permission (cross-organization)
  const admins = await this.dataSource.query(`
    SELECT DISTINCT u.id, u.full_name, u.email
    FROM users u
    INNER JOIN user_roles ur ON ur.user_id = u.id
    INNER JOIN roles r ON r.id = ur.role_id
    INNER JOIN role_permissions rp ON rp.role_id = r.id
    INNER JOIN permissions p ON p.id = rp.permission_id
    WHERE u.status = 'ACTIVE'
      AND p.code = 'approvals.district.manage'
  `);
  
  if (admins.length === 0) {
    console.warn('No district admins found with approval permissions');
    return;
  }

  // Get submission details
  const submissionDetails = await this.getSubmissionDetails(submissionId);
  
  const notifications = admins.map(admin =>
    this.notificationRepo.create({
      userId: admin.id,
      aggregateType: 'notification',
      type: 'SUBMISSION_PENDING_DISTRICT',
      payload: {
        title: 'Báo cáo chờ duyệt cấp xã',
        body: `Báo cáo ${submissionDetails.code} từ ${submissionDetails.orgName} đã được duyệt phòng ban, chờ bạn duyệt.`,
        channel: 'IN_APP',
        isRead: false,
        refTable: 'report_submissions',
        refId: submissionId,
        metadata: {
          submissionCode: submissionDetails.code,
          orgName: submissionDetails.orgName,
          periodName: submissionDetails.periodName,
          departmentApprovedAt: submissionDetails.departmentApprovedAt,
          approvalLink: `${process.env.FRONTEND_URL}/approvals/district/${submissionId}`
        }
      },
      status: 'PENDING',
      retryCount: 0,
      sentAt: null,
    })
  );

  await this.notificationRepo.save(notifications);
  
  // Send email notifications
  await this.sendEmailNotifications(admins, 'PENDING_DISTRICT', submissionDetails);
}

async notifySubmissionStatusChange(submissionId: string, status: string, reason?: string) {
  const submissionDetails = await this.getSubmissionDetails(submissionId);
  
  // Notify the submitter
  if (submissionDetails.submittedBy) {
    const notificationType = this.getNotificationType(status);
    const title = this.getNotificationTitle(status);
    const body = this.getNotificationBody(status, submissionDetails, reason);
    
    await this.notificationRepo.save({
      userId: submissionDetails.submittedBy,
      aggregateType: 'notification',
      type: notificationType,
      payload: {
        title,
        body,
        channel: 'IN_APP',
        isRead: false,
        refTable: 'report_submissions',
        refId: submissionId,
        metadata: {
          submissionCode: submissionDetails.code,
          status,
          reason,
          approvalLink: `${process.env.FRONTEND_URL}/submissions/${submissionId}`
        }
      },
      status: 'PENDING',
      retryCount: 0,
      sentAt: null,
    });
  }
}

// Helper methods
private async getSubmissionDetails(submissionId: string) {
  const result = await this.dataSource.query(`
    SELECT 
      s.id,
      s.code,
      s.status,
      s.submitted_at,
      s.department_approved_at,
      s.district_approved_at,
      s.reject_reason,
      o.name as org_name,
      o.code as org_code,
      a.period_name,
      a.period_code,
      f.name as form_name,
      u.full_name as submitted_by_name,
      u.email as submitted_by_email
    FROM report_submissions s
    INNER JOIN report_assignments a ON a.id = s.assignment_id
    INNER JOIN organizations o ON o.id = a.org_id
    INNER JOIN form_templates f ON f.id = a.form_id
    LEFT JOIN users u ON u.id = s.submitted_by
    WHERE s.id = $1
  `, [submissionId]);
  
  if (result.length === 0) {
    throw new NotFoundException('Submission not found');
  }
  
  return result[0];
}

private async sendEmailNotifications(recipients: any[], type: string, submissionDetails: any) {
  const emailTemplate = this.getEmailTemplate(type);
  
  for (const recipient of recipients) {
    await this.emailService.send({
      to: recipient.email,
      subject: emailTemplate.subject,
      template: emailTemplate.template,
      data: {
        managerName: recipient.full_name,
        submissionCode: submissionDetails.code,
        orgName: submissionDetails.org_name,
        periodName: submissionDetails.period_name,
        submittedAt: submissionDetails.submitted_at,
        departmentApprovedAt: submissionDetails.department_approved_at,
        approvalLink: `${process.env.FRONTEND_URL}/approvals/${type.toLowerCase()}/${submissionDetails.id}`
      }
    });
  }
}

private getNotificationType(status: string): string {
  const typeMap = {
    'DEPARTMENT_APPROVED': 'SUBMISSION_APPROVED_DEPARTMENT',
    'DISTRICT_APPROVED': 'SUBMISSION_APPROVED_DISTRICT',
    'REJECTED_DEPARTMENT': 'SUBMISSION_REJECTED_DEPARTMENT',
    'REJECTED_DISTRICT': 'SUBMISSION_REJECTED_DISTRICT'
  };
  return typeMap[status] || 'SUBMISSION_STATUS_CHANGED';
}

private getNotificationTitle(status: string): string {
  const titleMap = {
    'DEPARTMENT_APPROVED': 'Báo cáo đã được duyệt phòng ban',
    'DISTRICT_APPROVED': 'Báo cáo đã được duyệt cấp xã',
    'REJECTED_DEPARTMENT': 'Báo cáo bị từ chối phòng ban',
    'REJECTED_DISTRICT': 'Báo cáo bị từ chối cấp xã'
  };
  return titleMap[status] || 'Trạng thái báo cáo thay đổi';
}

private getNotificationBody(status: string, details: any, reason?: string): string {
  const bodyMap = {
    'DEPARTMENT_APPROVED': `Báo cáo ${details.code} đã được trưởng phòng ban duyệt.`,
    'DISTRICT_APPROVED': `Báo cáo ${details.code} đã được cấp xã duyệt. Báo cáo của bạn đã hoàn tất quy trình phê duyệt.`,
    'REJECTED_DEPARTMENT': `Báo cáo ${details.code} bị trưởng phòng ban từ chối.${reason ? ` Lý do: ${reason}` : ''}`,
    'REJECTED_DISTRICT': `Báo cáo ${details.code} bị cấp xã từ chối.${reason ? ` Lý do: ${reason}` : ''}`
  };
  return bodyMap[status] || `Trạng thái báo cáo ${details.code} đã thay đổi thành ${status}.`;
}

private getEmailTemplate(type: string) {
  const templates = {
    'PENDING_DEPARTMENT': {
      subject: 'Báo cáo chờ duyệt cấp phòng ban',
      template: 'pending-department-approval'
    },
    'PENDING_DISTRICT': {
      subject: 'Báo cáo chờ duyệt cấp xã',
      template: 'pending-district-approval'
    }
  };
  return templates[type] || templates['PENDING_DEPARTMENT'];
}
```

#### 3.1.2 Email Templates
```html
<!-- File: templates/email/pending-department-approval.html -->
<div class="email-container">
  <h2>Báo cáo chờ duyệt cấp phòng ban</h2>
  <p>Kính gửi {{managerName}},</p>
  <p>Báo cáo <strong>{{submissionCode}}</strong> từ đơn vị {{orgName}} đang chờ bạn duyệt.</p>
  <p><strong>Thông tin báo cáo:</strong></p>
  <ul>
    <li>Mã báo cáo: {{submissionCode}}</li>
    <li>Đơn vị: {{orgName}}</li>
    <li>Kỳ báo cáo: {{periodName}}</li>
    <li>Thời gian nộp: {{submittedAt}}</li>
  </ul>
  <p>
    <a href="{{approvalLink}}" class="btn-primary">Xem và duyệt báo cáo</a>
  </p>
</div>
```

### 3.2 Tuần 6: Frontend Integration

#### 3.2.1 Update API Client
```typescript
// File: src/services/api/submission.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SubmissionApiService {
  private baseUrl = environment.apiUrl + '/submissions';

  constructor(private http: HttpClient) {}

  // ... existing methods ...

  // Two-level approval methods
  approveDepartment(submissionId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/${submissionId}/approve-department`, {});
  }

  rejectDepartment(submissionId: string, reason: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/${submissionId}/reject-department`, { reason });
  }

  approveDistrict(submissionId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/${submissionId}/approve-district`, {});
  }

  rejectDistrict(submissionId: string, reason: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/${submissionId}/reject-district`, { reason });
  }

  // Query methods for different approval levels
  getPendingDepartment(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get(`${this.baseUrl}/pending-department`, { params: httpParams });
  }

  getDepartmentApproved(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get(`${this.baseUrl}/department-approved`, { params: httpParams });
  }

  getPendingDistrict(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get(`${this.baseUrl}/pending-district`, { params: httpParams });
  }

  // Version management methods
  getSubmissionHistory(assignmentId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/history/${assignmentId}`);
  }

  compareVersions(version1Id: string, version2Id: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/compare`, { version1Id, version2Id });
  }

  downloadVersion(submissionId: string, format: 'pdf' | 'excel' = 'pdf'): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${submissionId}/download`, {
      params: { format },
      responseType: 'blob'
    });
  }
}
```

#### 3.2.2 Update Submission Store (NgRx)
```typescript
// File: src/store/submission/submission.actions.ts

import { createAction, props } from '@ngrx/store';

export const loadActiveSubmission = createAction(
  '[Submission] Load Active Submission',
  props<{ assignmentId: string }>()
);

export const loadActiveSubmissionSuccess = createAction(
  '[Submission] Load Active Submission Success',
  props<{ submission: any }>()
);

export const loadSubmissionHistory = createAction(
  '[Submission] Load History',
  props<{ assignmentId: string }>()
);

export const loadSubmissionHistorySuccess = createAction(
  '[Submission] Load History Success',
  props<{ history: any[] }>()
);

export const approveDepartment = createAction(
  '[Submission] Approve Department',
  props<{ submissionId: string; comment?: string }>()
);

export const approveDepartmentSuccess = createAction(
  '[Submission] Approve Department Success',
  props<{ submission: any }>()
);

export const rejectDepartment = createAction(
  '[Submission] Reject Department',
  props<{ submissionId: string; reason: string }>()
);

export const rejectDepartmentSuccess = createAction(
  '[Submission] Reject Department Success',
  props<{ submission: any }>()
);

export const approveDistrict = createAction(
  '[Submission] Approve District',
  props<{ submissionId: string; comment?: string }>()
);

export const approveDistrictSuccess = createAction(
  '[Submission] Approve District Success',
  props<{ submission: any }>()
);

export const rejectDistrict = createAction(
  '[Submission] Reject District',
  props<{ submissionId: string; reason: string }>()
);

export const rejectDistrictSuccess = createAction(
  '[Submission] Reject District Success',
  props<{ submission: any }>()
);
```

```typescript
// File: src/store/submission/submission.effects.ts

import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, mergeMap, tap } from 'rxjs/operators';
import { of } from 'rxjs';
import { SubmissionApiService } from '../../services/api/submission.service';
import * as SubmissionActions from './submission.actions';
import { NotificationService } from '../../services/notification.service';

@Injectable()
export class SubmissionEffects {
  constructor(
    private actions$: Actions,
    private submissionService: SubmissionApiService,
    private notificationService: NotificationService
  ) {}

  loadActiveSubmission$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SubmissionActions.loadActiveSubmission),
      mergeMap(({ assignmentId }) =>
        this.submissionService.getActiveSubmission(assignmentId).pipe(
          map(submission => SubmissionActions.loadActiveSubmissionSuccess({ submission })),
          catchError(error => of(SubmissionActions.loadActiveSubmissionFailure({ error })))
        )
      )
    )
  );

  approveDepartment$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SubmissionActions.approveDepartment),
      mergeMap(({ submissionId, comment }) =>
        this.submissionService.approveDepartment(submissionId).pipe(
          map(submission => SubmissionActions.approveDepartmentSuccess({ submission })),
          tap(() => {
            this.notificationService.showSuccess('Báo cáo đã được duyệt cấp phòng ban');
          }),
          catchError(error => {
            this.notificationService.showError('Không thể duyệt báo cáo');
            return of(SubmissionActions.approveDepartmentFailure({ error }));
          })
        )
      )
    )
  );

  rejectDepartment$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SubmissionActions.rejectDepartment),
      mergeMap(({ submissionId, reason }) =>
        this.submissionService.rejectDepartment(submissionId, reason).pipe(
          map(submission => SubmissionActions.rejectDepartmentSuccess({ submission })),
          tap(() => {
            this.notificationService.showSuccess('Báo cáo đã bị từ chối cấp phòng ban');
          }),
          catchError(error => {
            this.notificationService.showError('Không thể từ chối báo cáo');
            return of(SubmissionActions.rejectDepartmentFailure({ error }));
          })
        )
      )
    )
  );

  approveDistrict$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SubmissionActions.approveDistrict),
      mergeMap(({ submissionId, comment }) =>
        this.submissionService.approveDistrict(submissionId).pipe(
          map(submission => SubmissionActions.approveDistrictSuccess({ submission })),
          tap(() => {
            this.notificationService.showSuccess('Báo cáo đã được duyệt cấp xã');
          }),
          catchError(error => {
            this.notificationService.showError('Không thể duyệt báo cáo');
            return of(SubmissionActions.approveDistrictFailure({ error }));
          })
        )
      )
    )
  );

  rejectDistrict$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SubmissionActions.rejectDistrict),
      mergeMap(({ submissionId, reason }) =>
        this.submissionService.rejectDistrict(submissionId, reason).pipe(
          map(submission => SubmissionActions.rejectDistrictSuccess({ submission })),
          tap(() => {
            this.notificationService.showSuccess('Báo cáo đã bị từ chối cấp xã');
          }),
          catchError(error => {
            this.notificationService.showError('Không thể từ chối báo cáo');
            return of(SubmissionActions.rejectDistrictFailure({ error }));
          })
        )
      )
    )
  );
}
```

#### 3.2.3 Update Components
```typescript
// File: src/components/submission/submission-actions/submission-actions.component.ts

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Store } from '@ngrx/store';
import * as SubmissionActions from '../../../store/submission/submission.actions';

@Component({
  selector: 'app-submission-actions',
  template: `
    <div class="submission-actions">
      <ng-container *ngIf="canApproveDepartment">
        <button 
          (click)="approveDepartment()" 
          class="btn-success"
          [disabled]="loading">
          <i class="icon-check"></i>
          Duyệt phòng ban
        </button>
        
        <button 
          (click)="showRejectDialog('DEPARTMENT')" 
          class="btn-danger"
          [disabled]="loading">
          <i class="icon-close"></i>
          Từ chối phòng ban
        </button>
      </ng-container>

      <ng-container *ngIf="canApproveDistrict">
        <button 
          (click)="approveDistrict()" 
          class="btn-success"
          [disabled]="loading">
          <i class="icon-check"></i>
          Duyệt cấp xã
        </button>
        
        <button 
          (click)="showRejectDialog('DISTRICT')" 
          class="btn-danger"
          [disabled]="loading">
          <i class="icon-close"></i>
          Từ chối cấp xã
        </button>
      </ng-container>

      <button 
        *ngIf="canDownload"
        (click)="download()" 
        class="btn-outline">
        <i class="icon-download"></i>
        Tải xuống
      </button>
    </div>

    <!-- Reject Dialog -->
    <app-reject-dialog
      *ngIf="showRejectDialog"
      [level]="rejectLevel"
      (confirm)="onRejectConfirm($event)"
      (cancel)="showRejectDialog = false">
    </app-reject-dialog>
  `
})
export class SubmissionActionsComponent {
  @Input() submission: any;
  @Input() userRole: string;
  @Input() userPermissions: string[];
  @Output() actionComplete = new EventEmitter<any>();

  loading = false;
  showRejectDialog = false;
  rejectLevel: 'DEPARTMENT' | 'DISTRICT';

  constructor(private store: Store) {}

  get canApproveDepartment(): boolean {
    return this.userPermissions.includes('approvals.department.manage') &&
           this.submission.status === 'PENDING_DEPARTMENT';
  }

  get canApproveDistrict(): boolean {
    return this.userPermissions.includes('approvals.district.manage') &&
           this.submission.status === 'DEPARTMENT_APPROVED';
  }

  get canDownload(): boolean {
    return this.submission.status === 'DISTRICT_APPROVED';
  }

  approveDepartment() {
    this.loading = true;
    this.store.dispatch(SubmissionActions.approveDepartment({
      submissionId: this.submission.id
    }));
  }

  approveDistrict() {
    this.loading = true;
    this.store.dispatch(SubmissionActions.approveDistrict({
      submissionId: this.submission.id
    }));
  }

  showRejectDialog(level: 'DEPARTMENT' | 'DISTRICT') {
    this.rejectLevel = level;
    this.showRejectDialog = true;
  }

  onRejectConfirm(reason: string) {
    this.loading = true;
    this.showRejectDialog = false;

    if (this.rejectLevel === 'DEPARTMENT') {
      this.store.dispatch(SubmissionActions.rejectDepartment({
        submissionId: this.submission.id,
        reason
      }));
    } else {
      this.store.dispatch(SubmissionActions.rejectDistrict({
        submissionId: this.submission.id,
        reason
      }));
    }
  }

  download() {
    // Implementation for downloading submission
    window.open(`/api/submissions/${this.submission.id}/download`);
  }
}
```

#### 3.2.4 Real-time Notifications
```typescript
// File: src/services/notification/notification.service.ts

import { Injectable } from '@angular/core';
import { WebSocketSubject, webSocket } from 'rxjs/webSocket';
import { environment } from '../../../environments/environment';
import { Store } from '@ngrx/store';
import * as NotificationActions from '../store/notification/notification.actions';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private socket$?: WebSocketSubject<any>;

  constructor(private store: Store) {}

  connect(userId: string) {
    if (!this.socket$ || this.socket$.closed) {
      this.socket$ = webSocket(`${environment.wsUrl}/notifications/${userId}`);
      
      this.socket$.subscribe({
        next: (notification) => {
          this.handleNotification(notification);
        },
        error: (error) => {
          console.error('WebSocket error:', error);
          this.reconnect();
        }
      });
    }
  }

  private handleNotification(notification: any) {
    // Update notification store
    this.store.dispatch(NotificationActions.addNotification({ notification }));

    // Show toast notification for important events
    if (this.isImportantNotification(notification.type)) {
      this.showToast(notification);
    }

    // Handle real-time updates for submissions
    if (notification.type.startsWith('SUBMISSION_')) {
      this.handleSubmissionNotification(notification);
    }
  }

  private isImportantNotification(type: string): boolean {
    const importantTypes = [
      'SUBMISSION_PENDING_DEPARTMENT',
      'SUBMISSION_PENDING_DISTRICT',
      'SUBMISSION_APPROVED_DISTRICT',
      'SUBMISSION_REJECTED_DEPARTMENT',
      'SUBMISSION_REJECTED_DISTRICT'
    ];
    return importantTypes.includes(type);
  }

  private showToast(notification: any) {
    // Implementation depends on your toast library
    console.log('New notification:', notification.title);
  }

  private handleSubmissionNotification(notification: any) {
    // Refresh submission data if user is viewing it
    if (notification.payload.refId) {
      this.store.dispatch(SubmissionActions.refreshSubmission({
        submissionId: notification.payload.refId
      }));
    }
  }

  private reconnect() {
    setTimeout(() => {
      this.connect(this.getCurrentUserId());
    }, 5000);
  }

  private getCurrentUserId(): string {
    // Get current user ID from auth store
    return 'current-user-id';
  }

  disconnect() {
    if (this.socket$) {
      this.socket$.complete();
    }
  }
}
```

#### 3.2.5 Mobile Responsive Updates
```scss
// File: src/styles/components/submission-actions.scss
.submission-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    flex-direction: column;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: white;
    padding: 1rem;
    box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
    z-index: 1000;

    .btn {
      width: 100%;
      margin: 0.25rem 0;
    }
  }

  .btn {
    padding: 0.5rem 1rem;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s;

    &.btn-success {
      background-color: #28a745;
      color: white;

      &:hover:not(:disabled) {
        background-color: #218838;
      }
    }

    &.btn-danger {
      background-color: #dc3545;
      color: white;

      &:hover:not(:disabled) {
        background-color: #c82333;
      }
    }

    &.btn-outline {
      background-color: transparent;
      border: 1px solid #6c757d;
      color: #6c757d;

      &:hover:not(:disabled) {
        background-color: #6c757d;
        color: white;
      }
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    i {
      margin-right: 0.5rem;
    }
  }
}
```

#### 3.2.2 Update Components
```typescript
// File: src/components/submission/submission-status.component.ts

@Component({
  selector: 'app-submission-status',
  template: `
    <div class="submission-status" [ngClass]="statusClass">
      <span class="status-icon">{{statusIcon}}</span>
      <span class="status-text">{{statusText}}</span>
      <div class="status-details" *ngIf="showDetails">
        <div *ngIf="submission.departmentApprovedAt">
          <small>Duyệt phòng ban: {{submission.departmentApprovedAt | date}}</small>
        </div>
        <div *ngIf="submission.districtApprovedAt">
          <small>Duyệt cấp xã: {{submission.districtApprovedAt | date}}</small>
        </div>
      </div>
    </div>
  `
})
export class SubmissionStatusComponent {
  @Input() submission: any;
  @Input() showDetails = true;

  get statusClass() {
    return `status-${this.submission.status.toLowerCase()}`;
  }

  get statusText() {
    const statusMap = {
      'DRAFT': 'Nháp',
      'PENDING_DEPARTMENT': 'Chờ duyệt phòng ban',
      'DEPARTMENT_APPROVED': 'Đã duyệt phòng ban',
      'PENDING_DISTRICT': 'Chờ duyệt cấp xã',
      'DISTRICT_APPROVED': 'Đã duyệt cấp xã',
      'REJECTED_DEPARTMENT': 'Bị từ chối phòng ban',
      'REJECTED_DISTRICT': 'Bị từ chối cấp xã'
    };
    return statusMap[this.submission.status] || this.submission.status;
  }

  get statusIcon() {
    const iconMap = {
      'DRAFT': '📝',
      'PENDING_DEPARTMENT': '⏳',
      'DEPARTMENT_APPROVED': '✅',
      'PENDING_DISTRICT': '⏳',
      'DISTRICT_APPROVED': '🎉',
      'REJECTED_DEPARTMENT': '❌',
      'REJECTED_DISTRICT': '❌'
    };
    return iconMap[this.submission.status] || '📄';
  }
}
```

### 3.3 Tuần 7: Dashboard Updates

#### 3.3.1 Approval Dashboard
```typescript
// File: src/pages/approval/approval-dashboard.component.ts

@Component({
  selector: 'app-approval-dashboard',
  template: `
    <div class="approval-dashboard">
      <div class="dashboard-header">
        <h1>Dashboard Phê Duyệt</h1>
        <div class="stats-cards">
          <div class="stat-card">
            <h3>{{stats.pendingDepartment}}</h3>
            <p>Chờ duyệt phòng ban</p>
          </div>
          <div class="stat-card">
            <h3>{{stats.pendingDistrict}}</h3>
            <p>Chờ duyệt cấp xã</p>
          </div>
          <div class="stat-card">
            <h3>{{stats.approvedToday}}</h3>
            <p>Đã duyệt hôm nay</p>
          </div>
        </div>
      </div>

      <div class="dashboard-content">
        <div class="section">
          <h2>Chờ Duyệt Phòng Ban</h2>
          <app-submission-list 
            [submissions]="pendingDepartment"
            [showActions]="true"
            (approve)="approveDepartment($event)"
            (reject)="rejectDepartment($event)">
          </app-submission-list>
        </div>

        <div class="section" *ngIf="isDistrictAdmin">
          <h2>Chờ Duyệt Cấp Xã</h2>
          <app-submission-list
            [submissions]="pendingDistrict"
            [showActions]="true"
            (approve)="approveDistrict($event)"
            (reject)="rejectDistrict($event)">
          </app-submission-list>
        </div>
      </div>
    </div>
  `
})
export class ApprovalDashboardComponent implements OnInit {
  stats = {
    pendingDepartment: 0,
    pendingDistrict: 0,
    approvedToday: 0
  };

  pendingDepartment: any[] = [];
  pendingDistrict: any[] = [];
  isDistrictAdmin = false;

  constructor(
    private submissionService: SubmissionApiService,
    private userService: UserService
  ) {}

  async ngOnInit() {
    await this.loadDashboardData();
    this.isDistrictAdmin = await this.userService.hasPermission('approvals.district.manage');
  }

  async loadDashboardData() {
    // Load pending department submissions
    const deptResponse = await this.submissionService.getPendingDepartment().toPromise();
    this.pendingDepartment = deptResponse.items;
    this.stats.pendingDepartment = deptResponse.total;

    // Load pending district submissions if user has permission
    if (this.isDistrictAdmin) {
      const distResponse = await this.submissionService.getDepartmentApproved().toPromise();
      this.pendingDistrict = distResponse.items;
      this.stats.pendingDistrict = distResponse.total;
    }

    // Load today's approvals
    this.stats.approvedToday = await this.getTodayApprovals();
  }

  approveDepartment(submissionId: string) {
    this.submissionService.approveDepartment(submissionId).subscribe(() => {
      this.loadDashboardData();
    });
  }

  rejectDepartment(submissionId: string) {
    // Show reject dialog
    this.showRejectDialog(submissionId, 'department');
  }
}
```

---

## 4. Phase 3: Advanced Features (3 Tuần)

### 4.1 Tuần 8: Bulk Approval Operations

#### 4.1.1 Bulk Approval Service
```typescript
// File: src/modules/approval/bulk-approval.service.ts

@Injectable()
export class BulkApprovalService {
  async bulkApproveDepartment(submissionIds: string[], user: User) {
    const results = [];
    
    for (const submissionId of submissionIds) {
      try {
        const result = await this.approvalService.approveDepartment(submissionId, user);
        results.push({ submissionId, success: true, result });
      } catch (error) {
        results.push({ submissionId, success: false, error: error.message });
      }
    }

    return results;
  }

  async bulkApproveDistrict(submissionIds: string[], user: User) {
    const results = [];
    
    for (const submissionId of submissionIds) {
      try {
        const result = await this.approvalService.approveDistrict(submissionId, user);
        results.push({ submissionId, success: true, result });
      } catch (error) {
        results.push({ submissionId, success: false, error: error.message });
      }
    }

    return results;
  }
}
```

#### 4.1.2 Bulk Approval UI
```typescript
// File: src/components/approval/bulk-approval.component.ts

@Component({
  selector: 'app-bulk-approval',
  template: `
    <div class="bulk-approval">
      <div class="selection-bar">
        <checkbox [(ngModel)]="allSelected" (change)="toggleAll()"></checkbox>
        <span>Đã chọn {{selectedSubmissions.length}}/{{submissions.length}}</span>
        <button 
          [disabled]="selectedSubmissions.length === 0"
          class="btn-primary"
          (click)="showBulkApproveDialog()">
          Duyệt hàng loạt
        </button>
      </div>

      <div class="submissions-list">
        <div 
          *ngFor="let submission of submissions"
          class="submission-row"
          [class.selected]="isSelected(submission.id)">
          <checkbox [(ngModel)]="submission.selected" (change)="updateSelection()"></checkbox>
          <app-submission-card [submission]="submission"></app-submission-card>
        </div>
      </div>
    </div>
  `
})
export class BulkApprovalComponent {
  @Input() submissions: any[] = [];
  @Input() approvalLevel: 'department' | 'district';

  selectedSubmissions: any[] = [];
  allSelected = false;

  toggleAll() {
    this.submissions.forEach(s => s.selected = this.allSelected);
    this.updateSelection();
  }

  updateSelection() {
    this.selectedSubmissions = this.submissions.filter(s => s.selected);
    this.allSelected = this.selectedSubmissions.length === this.submissions.length;
  }

  isSelected(submissionId: string): boolean {
    return this.selectedSubmissions.some(s => s.id === submissionId);
  }

  showBulkApproveDialog() {
    // Show confirmation dialog
    this.confirmationService.confirm({
      message: `Bạn có chắc muốn duyệt ${this.selectedSubmissions.length} báo cáo?`,
      accept: () => this.performBulkApproval()
    });
  }

  async performBulkApproval() {
    const submissionIds = this.selectedSubmissions.map(s => s.id);
    
    try {
      if (this.approvalLevel === 'department') {
        await this.bulkApprovalService.bulkApproveDepartment(submissionIds);
      } else {
        await this.bulkApprovalService.bulkApproveDistrict(submissionIds);
      }
      
      // Refresh data
      this.dataRefreshed.emit();
    } catch (error) {
      // Handle error
    }
  }
}
```

### 4.2 Tuần 9: Approval History Tracking

#### 4.2.1 Approval History Service
```typescript
// File: src/modules/approval/approval-history.service.ts

@Injectable()
export class ApprovalHistoryService {
  constructor(
    @InjectRepository(ApprovalHistory)
    private readonly approvalHistoryRepo: Repository<ApprovalHistory>
  ) {}

  async getSubmissionHistory(submissionId: string): Promise<ApprovalHistory[]> {
    return await this.approvalHistoryRepo.find({
      where: { submissionId },
      order: { createdAt: 'ASC' },
      relations: ['user']
    });
  }

  async getUserApprovalHistory(userId: string, query: any): Promise<any> {
    const qb = this.approvalHistoryRepo
      .createQueryBuilder('ah')
      .innerJoin('ah.user', 'u')
      .innerJoin('ah.submission', 's')
      .innerJoin('s.assignment', 'a')
      .innerJoin('a.organization', 'o')
      .where('ah.userId = :userId', { userId });

    if (query.level) {
      qb.andWhere('ah.approvalLevel = :level', { level: query.level });
    }

    if (query.action) {
      qb.andWhere('ah.action = :action', { action: query.action });
    }

    if (query.dateFrom) {
      qb.andWhere('ah.createdAt >= :dateFrom', { dateFrom: query.dateFrom });
    }

    if (query.dateTo) {
      qb.andWhere('ah.createdAt <= :dateTo', { dateTo: query.dateTo });
    }

    qb.orderBy('ah.createdAt', 'DESC');

    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 200);
    const skip = (page - 1) * limit;

    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return { items, total, page, limit };
  }
}
```

#### 4.2.2 Approval History UI
```typescript
// File: src/components/approval/approval-history.component.ts

@Component({
  selector: 'app-approval-history',
  template: `
    <div class="approval-history">
      <h3>Lịch sử phê duyệt</h3>
      
      <div class="timeline">
        <div 
          *ngFor="let history of approvalHistory" 
          class="timeline-item"
          [class.approve]="history.action === 'APPROVE'"
          [class.reject]="history.action === 'REJECT'">
          <div class="timeline-marker">
            <span class="icon">{{history.action === 'APPROVE' ? '✅' : '❌'}}</span>
          </div>
          <div class="timeline-content">
            <div class="header">
              <strong>{{getActionText(history.action)}}</strong>
              <span class="level">{{getLevelText(history.approvalLevel)}}</span>
              <span class="time">{{history.createdAt | date:'short'}}</span>
            </div>
            <div class="user">
              <img [src]="history.user.avatar" class="avatar">
              <span>{{history.user.fullName}}</span>
            </div>
            <div class="reason" *ngIf="history.reason">
              <strong>Lý do:</strong> {{history.reason}}
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ApprovalHistoryComponent {
  @Input() submissionId: string;
  approvalHistory: any[] = [];

  constructor(private approvalHistoryService: ApprovalHistoryService) {}

  async ngOnInit() {
    if (this.submissionId) {
      this.approvalHistory = await this.approvalHistoryService.getSubmissionHistory(this.submissionId);
    }
  }

  getActionText(action: string): string {
    return action === 'APPROVE' ? 'Đã duyệt' : 'Đã từ chối';
  }

  getLevelText(level: string): string {
    return level === 'DEPARTMENT' ? 'Cấp phòng ban' : 'Cấp xã';
  }
}
```

### 4.3 Tuần 10: Analytics Dashboard Updates

#### 4.3.1 Approval Analytics Service
```typescript
// File: src/modules/analytics/approval-analytics.service.ts

@Injectable()
export class ApprovalAnalyticsService {
  async getApprovalMetrics(dateRange: { from: Date, to: Date }) {
    const metrics = await this.dataSource.query(`
      SELECT 
        COUNT(*) as total_submissions,
        COUNT(CASE WHEN status = 'DISTRICT_APPROVED' THEN 1 END) as approved,
        COUNT(CASE WHEN status IN ('REJECTED_DEPARTMENT', 'REJECTED_DISTRICT') THEN 1 END) as rejected,
        AVG(EXTRACT(EPOCH FROM (department_approved_at - submitted_at))/3600) as avg_department_hours,
        AVG(EXTRACT(EPOCH FROM (district_approved_at - department_approved_at))/3600) as avg_district_hours,
        AVG(EXTRACT(EPOCH FROM (district_approved_at - submitted_at))/3600) as avg_total_hours
      FROM report_submissions 
      WHERE submitted_at BETWEEN $1 AND $2
    `, [dateRange.from, dateRange.to]);

    return metrics[0];
  }

  async getApprovalTrends(dateRange: { from: Date, to: Date }) {
    const trends = await this.dataSource.query(`
      SELECT 
        DATE_TRUNC('day', submitted_at) as date,
        COUNT(*) as submitted,
        COUNT(CASE WHEN department_approved_at IS NOT NULL THEN 1 END) as department_approved,
        COUNT(CASE WHEN district_approved_at IS NOT NULL THEN 1 END) as district_approved
      FROM report_submissions 
      WHERE submitted_at BETWEEN $1 AND $2
      GROUP BY DATE_TRUNC('day', submitted_at)
      ORDER BY date ASC
    `, [dateRange.from, dateRange.to]);

    return trends;
  }

  async getRejectReasons(dateRange: { from: Date, to: Date }) {
    const reasons = await this.dataSource.query(`
      SELECT 
        ah.approval_level,
        COUNT(*) as count,
        ah.reason
      FROM approval_history ah
      INNER JOIN report_submissions rs ON rs.id = ah.submission_id
      WHERE ah.action = 'REJECT' 
        AND ah.created_at BETWEEN $1 AND $2
        AND ah.reason IS NOT NULL
      GROUP BY ah.approval_level, ah.reason
      ORDER BY count DESC
    `, [dateRange.from, dateRange.to]);

    return reasons;
  }
}
```

---

## 5. Phase 4: Deployment & Training (2 Tuần)

### 5.1 Tuần 11: Production Deployment

#### 5.1.1 Deployment Checklist
- [ ] Database backup completed
- [ ] Migration scripts tested in staging
- [ ] All tests passing (unit, integration, e2e)
- [ ] Performance benchmarks met
- [ ] Security scan completed
- [ ] Documentation updated
- [ ] Rollback plan prepared

#### 5.1.2 Deployment Script
```bash
#!/bin/bash
# File: scripts/deploy-two-level-approval.sh

set -e

echo "Starting deployment of Two-Level Approval Workflow..."

# Backup database
echo "Creating database backup..."
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Run migrations
echo "Running database migrations..."
npm run migration:run

# Deploy application
echo "Deploying application..."
docker-compose down
docker-compose pull
docker-compose up -d

# Health check
echo "Performing health check..."
curl -f http://localhost:5000/health || exit 1

# Run smoke tests
echo "Running smoke tests..."
npm run test:smoke

echo "Deployment completed successfully!"
```

#### 5.1.3 Monitoring Setup
```yaml
# File: monitoring/two-level-approval-dashboard.yml
dashboard:
  title: "Two-Level Approval Workflow"
  panels:
    - title: "Submission Status Distribution"
      type: "pie"
      query: "SELECT status, COUNT(*) FROM report_submissions GROUP BY status"
    
    - title: "Approval Processing Time"
      type: "line"
      query: "SELECT DATE(created_at), AVG(processing_time) FROM approval_history GROUP BY DATE(created_at)"
    
    - title: "Rejection Rate by Level"
      type: "bar"
      query: "SELECT approval_level, COUNT(*) FROM approval_history WHERE action='REJECT' GROUP BY approval_level"
```

### 5.2 Tuần 12: Training and Documentation

#### 5.2.1 User Training Materials
```markdown
# Training Guide: Two-Level Approval Workflow

## For Staff (Data Entry)
1. How to submit reports
2. Understanding rejection reasons
3. Resubmission process
4. Checking approval status

## For Managers (Department Approval)
1. Accessing approval dashboard
2. Reviewing submitted reports
3. Approving/rejecting submissions
4. Providing constructive feedback

## For Admins (District Approval)
1. Monitoring department approvals
2. Final approval process
3. Generating summary reports
4. Managing system settings
```

#### 5.2.2 Training Session Schedule
```
Week 12 - Training Schedule:
Monday: Staff training (2 sessions)
Tuesday: Manager training (2 sessions)  
Wednesday: Admin training (1 session)
Thursday: Q&A and hands-on practice
Friday: Go-live and support
```

#### 5.2.3 Support Documentation
```markdown
# FAQ and Troubleshooting

## Common Issues
1. Cannot see pending submissions
2. Approval button disabled
3. Permission errors
4. Email notifications not working

## Solutions
1. Check user permissions
2. Verify organization assignment
3. Clear browser cache
4. Contact system admin

## Contact Support
- Email: support@kpi-system.vn
- Phone: 1900-xxxx
- Documentation: /docs/user-guide
```

---

## 6. Risk Management

### 6.1 Technical Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Database migration failure | Medium | High | Pre-prod testing, backup, rollback plan |
| Performance degradation | Medium | Medium | Load testing, optimization, monitoring |
| Frontend compatibility issues | Low | Medium | Cross-browser testing, gradual rollout |
| Permission conflicts | Low | High | Comprehensive testing, permission audit |

### 6.2 Business Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| User adoption resistance | Medium | High | Training, communication, support |
| Workflow disruption | Medium | High | Phased rollout, parallel running |
| Data quality issues | Low | Medium | Validation, audit trails, monitoring |

### 6.3 Operational Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| System downtime during deployment | Low | High | Maintenance window, rollback plan |
| Support ticket surge | Medium | Medium | Training, documentation, support team |
| Regulatory compliance issues | Low | High | Legal review, audit trails |

---

## 7. Success Metrics

### 7.1 Technical Metrics
- **Deployment success**: 100% uptime during deployment
- **Performance**: <2s response time for approval actions
- **Availability**: >99.9% uptime
- **Bug rate**: <5 critical bugs in first month

### 7.2 Business Metrics
- **User adoption**: >90% of users complete training
- **Workflow efficiency**: 30% reduction in approval time
- **Data quality**: 95% first-time approval rate
- **User satisfaction**: >4.5/5 satisfaction score

### 7.3 Operational Metrics
- **Support tickets**: <20% increase in support volume
- **Training completion**: 100% of mandatory users trained
- **Documentation usage**: >80% of users access documentation

---

## 8. Post-Launch Activities

### 8.1 Week 1-2: Hypercare
- Daily monitoring of system performance
- Dedicated support team for user issues
- Daily standup meetings for problem resolution
- Quick fixes for critical issues

### 8.2 Week 3-4: Optimization
- Performance tuning based on usage patterns
- User feedback collection and analysis
- Minor enhancements and bug fixes
- Documentation updates

### 8.3 Month 2-3: Enhancement
- Advanced features rollout (bulk approval, analytics)
- Process optimization based on metrics
- Additional training sessions if needed
- Long-term support planning

---

## 9. Conclusion

Implementation of the two-level approval workflow will significantly improve:
- **Data quality control** through dual-level verification
- **Accountability** with clear approval responsibilities
- **Audit compliance** with complete approval trails
- **Process efficiency** through streamlined workflows

Success depends on:
- Thorough testing and validation
- Comprehensive user training
- Strong change management
- Ongoing support and optimization

The phased approach ensures minimal disruption while delivering maximum value to users and stakeholders.

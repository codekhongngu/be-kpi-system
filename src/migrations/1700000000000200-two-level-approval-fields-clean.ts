import { MigrationInterface, QueryRunner, Table, TableIndex, TableColumn } from 'typeorm';

export class AddTwoLevelApprovalFields1700000000000200 implements MigrationInterface {
  name = 'AddTwoLevelApprovalFields1700000000000200';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new columns for two-level approval
    await queryRunner.addColumn('report_submissions', new TableColumn({
      name: 'department_approved_by',
      type: 'uuid',
      isNullable: true,
    }));

    await queryRunner.addColumn('report_submissions', new TableColumn({
      name: 'department_approved_at',
      type: 'timestamptz',
      isNullable: true,
    }));

    await queryRunner.addColumn('report_submissions', new TableColumn({
      name: 'district_approved_by',
      type: 'uuid',
      isNullable: true,
    }));

    await queryRunner.addColumn('report_submissions', new TableColumn({
      name: 'district_approved_at',
      type: 'timestamptz',
      isNullable: true,
    }));

    // Create approval history table
    await queryRunner.createTable(new Table({
      name: 'approval_history',
      columns: [
        {
          name: 'id',
          type: 'uuid',
          isPrimary: true,
          generationStrategy: 'uuid',
          default: 'uuid_generate_v4()',
        },
        {
          name: 'submission_id',
          type: 'uuid',
          isNullable: false,
        },
        {
          name: 'approval_level',
          type: 'varchar',
          length: '20',
          isNullable: false,
        },
        {
          name: 'action',
          type: 'varchar',
          length: '20',
          isNullable: false,
        },
        {
          name: 'user_id',
          type: 'uuid',
          isNullable: false,
        },
        {
          name: 'created_at',
          type: 'timestamptz',
          default: 'NOW()',
        },
      ],
      foreignKeys: [
        {
          columnNames: ['submission_id'],
          referencedTableName: 'report_submissions',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        },
        {
          columnNames: ['user_id'],
          referencedTableName: 'users',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        },
      ],
    }));

    // Create indexes for performance
    await queryRunner.createIndex('report_submissions', new TableIndex({
      name: 'IDX_REPORT_SUBMISSIONS_DEPARTMENT_APPROVED_BY',
      columnNames: ['department_approved_by'],
    }));
    await queryRunner.createIndex('report_submissions', new TableIndex({
      name: 'IDX_REPORT_SUBMISSIONS_DEPARTMENT_APPROVED_AT',
      columnNames: ['department_approved_at'],
    }));
    await queryRunner.createIndex('report_submissions', new TableIndex({
      name: 'IDX_REPORT_SUBMISSIONS_DISTRICT_APPROVED_BY',
      columnNames: ['district_approved_by'],
    }));
    await queryRunner.createIndex('report_submissions', new TableIndex({
      name: 'IDX_REPORT_SUBMISSIONS_DISTRICT_APPROVED_AT',
      columnNames: ['district_approved_at'],
    }));

    await queryRunner.createIndex('approval_history', new TableIndex({
      name: 'IDX_APPROVAL_HISTORY_SUBMISSION_ID',
      columnNames: ['submission_id'],
    }));
    await queryRunner.createIndex('approval_history', new TableIndex({
      name: 'IDX_APPROVAL_HISTORY_APPROVAL_LEVEL',
      columnNames: ['approval_level'],
    }));
    await queryRunner.createIndex('approval_history', new TableIndex({
      name: 'IDX_APPROVAL_HISTORY_USER_ID',
      columnNames: ['user_id'],
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.dropIndex('report_submissions', 'IDX_REPORT_SUBMISSIONS_DISTRICT_APPROVED_AT');
    await queryRunner.dropIndex('report_submissions', 'IDX_REPORT_SUBMISSIONS_DISTRICT_APPROVED_BY');
    await queryRunner.dropIndex('report_submissions', 'IDX_REPORT_SUBMISSIONS_DEPARTMENT_APPROVED_AT');
    await queryRunner.dropIndex('report_submissions', 'IDX_REPORT_SUBMISSIONS_DEPARTMENT_APPROVED_BY');
    
    // Drop approval history indexes
    await queryRunner.dropIndex('approval_history', 'IDX_APPROVAL_HISTORY_USER_ID');
    await queryRunner.dropIndex('approval_history', 'IDX_APPROVAL_HISTORY_APPROVAL_LEVEL');
    await queryRunner.dropIndex('approval_history', 'IDX_APPROVAL_HISTORY_SUBMISSION_ID');
    
    // Drop table
    await queryRunner.dropTable('approval_history');
    
    // Drop columns
    await queryRunner.dropColumn('report_submissions', 'district_approved_at');
    await queryRunner.dropColumn('report_submissions', 'district_approved_by');
    await queryRunner.dropColumn('report_submissions', 'department_approved_at');
    await queryRunner.dropColumn('report_submissions', 'department_approved_by');
  }
}

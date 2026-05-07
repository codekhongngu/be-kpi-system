import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateReportManagementSchema1778116000000
  implements MigrationInterface
{
  name = 'UpdateReportManagementSchema1778116000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update assignment_batches
    await queryRunner.query(`
      ALTER TABLE "assignment_batches" 
        ADD COLUMN IF NOT EXISTS "template_version" int DEFAULT 1,
        ADD COLUMN IF NOT EXISTS "status" varchar(20) DEFAULT 'DRAFT',
        ADD COLUMN IF NOT EXISTS "published_at" timestamptz NULL,
        ADD COLUMN IF NOT EXISTS "total_assignments" int DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "assigned_count" int DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "in_progress_count" int DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "submitted_count" int DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "approved_count" int DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "rejected_count" int DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "updated_at" timestamptz NULL
    `);

    // Update form_assignments
    await queryRunner.query(`
      ALTER TABLE "form_assignments"
        ADD COLUMN IF NOT EXISTS "assignee_user_id" uuid NULL,
        ADD COLUMN IF NOT EXISTS "status" varchar(20) DEFAULT 'ASSIGNED',
        ADD COLUMN IF NOT EXISTS "submitted_at" timestamptz NULL,
        ADD COLUMN IF NOT EXISTS "approved_at" timestamptz NULL,
        ADD COLUMN IF NOT EXISTS "approved_by" uuid NULL,
        ADD COLUMN IF NOT EXISTS "reject_reason" text NULL,
        ADD COLUMN IF NOT EXISTS "updated_at" timestamptz NULL
    `);

    // Create history tables
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "report_status_histories" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "report_id" uuid NOT NULL REFERENCES "assignment_batches"("id") ON DELETE CASCADE,
        "from_status" varchar(20) NULL,
        "to_status" varchar(20) NOT NULL,
        "actor_id" uuid NOT NULL,
        "note" text NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "assignment_status_histories" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "assignment_id" uuid NOT NULL REFERENCES "form_assignments"("id") ON DELETE CASCADE,
        "from_status" varchar(20) NULL,
        "to_status" varchar(20) NOT NULL,
        "actor_id" uuid NOT NULL,
        "note" text NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    // Create comments table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "report_comments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "assignment_id" uuid NOT NULL REFERENCES "form_assignments"("id") ON DELETE CASCADE,
        "author_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "comment_type" varchar(50) DEFAULT 'GENERAL',
        "content" text NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "report_comments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "assignment_status_histories"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "report_status_histories"`);

    await queryRunner.query(`
      ALTER TABLE "form_assignments"
        DROP COLUMN IF EXISTS "assignee_user_id",
        DROP COLUMN IF EXISTS "status",
        DROP COLUMN IF EXISTS "submitted_at",
        DROP COLUMN IF EXISTS "approved_at",
        DROP COLUMN IF EXISTS "approved_by",
        DROP COLUMN IF EXISTS "reject_reason",
        DROP COLUMN IF EXISTS "updated_at"
    `);

    await queryRunner.query(`
      ALTER TABLE "assignment_batches"
        DROP COLUMN IF EXISTS "template_version",
        DROP COLUMN IF EXISTS "status",
        DROP COLUMN IF EXISTS "published_at",
        DROP COLUMN IF EXISTS "total_assignments",
        DROP COLUMN IF EXISTS "assigned_count",
        DROP COLUMN IF EXISTS "in_progress_count",
        DROP COLUMN IF EXISTS "submitted_count",
        DROP COLUMN IF EXISTS "approved_count",
        DROP COLUMN IF EXISTS "rejected_count",
        DROP COLUMN IF EXISTS "updated_at"
    `);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Schema QLDL theo `docs/QLDL_CLUSTER_03_DATA_MODEL.md`:
 * - Bảng core: organizations, role_groups, report_periods, forms, form_attributes,
 *   form_indicators, form_assignments, report_submissions, report_data, report_summaries,
 *   notifications, audit_logs
 * - Bảng đề xuất: user_role_groups, auth_refresh_tokens, auth_otp_challenges,
 *   auth_password_resets, import_jobs, report_data_history, user_notification_prefs,
 *   indicator_catalog
 *
 * Lưu ý: codebase hiện dùng `users.id` kiểu UUID — migration này dùng UUID cho PK/FK
 * của các bảng QLDL và các cột FK trỏ tới `users`, thay cho BIGSERIAL trong tài liệu gốc.
 */
export class QLDLSchemaFromDocumentation1745230800000 implements MigrationInterface {
  name = 'QLDLSchemaFromDocumentation1745230800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "role_groups" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(100) NOT NULL,
        "description" text NULL,
        "permissions" jsonb NULL,
        "is_system" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NULL,
        CONSTRAINT "UQ_role_groups_name" UNIQUE ("name")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "organizations" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "code" varchar(50) NOT NULL,
        "name" varchar(255) NOT NULL,
        "parent_id" uuid NULL REFERENCES "organizations"("id") ON DELETE SET NULL,
        "head_user_id" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "level" integer NOT NULL DEFAULT 1,
        "is_active" boolean NOT NULL DEFAULT true,
        "description" text NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NULL,
        "deleted_at" timestamptz NULL,
        CONSTRAINT "UQ_organizations_code" UNIQUE ("code")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "user_role_groups" (
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "role_group_id" uuid NOT NULL REFERENCES "role_groups"("id") ON DELETE CASCADE,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_role_groups" PRIMARY KEY ("user_id", "role_group_id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "code" varchar(20) NULL,
        ADD COLUMN IF NOT EXISTS "org_id" uuid NULL REFERENCES "organizations"("id") ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS "role_group_id" uuid NULL REFERENCES "role_groups"("id") ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS "avatar_url" text NULL,
        ADD COLUMN IF NOT EXISTS "failed_login_attempts" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "locked_until" timestamptz NULL,
        ADD COLUMN IF NOT EXISTS "totp_secret" varchar(100) NULL,
        ADD COLUMN IF NOT EXISTS "totp_enabled" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "notify_channel" varchar(20) NOT NULL DEFAULT 'both',
        ADD COLUMN IF NOT EXISTS "language" varchar(10) NOT NULL DEFAULT 'vi',
        ADD COLUMN IF NOT EXISTS "timezone" varchar(50) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh'
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_users_code"
      ON "users" ("code")
      WHERE "code" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE TABLE "report_periods" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "code" varchar(30) NOT NULL,
        "name" varchar(255) NOT NULL,
        "period_type" varchar(10) NOT NULL,
        "date_from" date NOT NULL,
        "date_to" date NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_by" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_report_periods_code" UNIQUE ("code")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "forms" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "code" varchar(20) NOT NULL,
        "name" varchar(255) NOT NULL,
        "field_category" varchar(100) NULL,
        "period_type" varchar(10) NULL,
        "description" text NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "template_file" varchar(500) NULL,
        "parent_form_id" uuid NULL REFERENCES "forms"("id") ON DELETE SET NULL,
        "created_by" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NULL,
        "deleted_at" timestamptz NULL,
        CONSTRAINT "UQ_forms_code" UNIQUE ("code")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "indicator_catalog" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "code" varchar(50) NOT NULL,
        "name" varchar(500) NOT NULL,
        "unit" varchar(100) NULL,
        "data_type" varchar(20) NOT NULL,
        "created_by" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_indicator_catalog_code" UNIQUE ("code")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "form_attributes" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "form_id" uuid NOT NULL REFERENCES "forms"("id") ON DELETE CASCADE,
        "name" varchar(255) NOT NULL,
        "data_type" varchar(20) NULL,
        "is_required" boolean NOT NULL DEFAULT false,
        "is_visible" boolean NOT NULL DEFAULT true,
        "is_system" boolean NOT NULL DEFAULT false,
        "sort_order" integer NOT NULL DEFAULT 0,
        "options" jsonb NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "form_indicators" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "form_id" uuid NOT NULL REFERENCES "forms"("id") ON DELETE CASCADE,
        "code" varchar(50) NOT NULL,
        "name" varchar(500) NOT NULL,
        "unit" varchar(100) NULL,
        "data_type" varchar(20) NOT NULL,
        "is_required" boolean NOT NULL DEFAULT true,
        "is_calculated" boolean NOT NULL DEFAULT false,
        "formula" text NULL,
        "group_name" varchar(255) NULL,
        "sort_order" integer NOT NULL DEFAULT 0,
        "min_value" numeric NULL,
        "max_value" numeric NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "catalog_indicator_id" uuid NULL REFERENCES "indicator_catalog"("id") ON DELETE SET NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_form_indicators_form_code" UNIQUE ("form_id", "code")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "form_assignments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "form_id" uuid NOT NULL REFERENCES "forms"("id") ON DELETE RESTRICT,
        "org_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE RESTRICT,
        "period_id" uuid NOT NULL REFERENCES "report_periods"("id") ON DELETE RESTRICT,
        "deadline_from" date NOT NULL,
        "deadline_to" date NOT NULL,
        "is_cancelled" boolean NOT NULL DEFAULT false,
        "cancel_reason" text NULL,
        "auto_assign" boolean NOT NULL DEFAULT false,
        "assigned_by" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "assigned_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_form_assignments_form_org_period" UNIQUE ("form_id", "org_id", "period_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "report_submissions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "code" varchar(25) NOT NULL,
        "assignment_id" uuid NOT NULL REFERENCES "form_assignments"("id") ON DELETE RESTRICT,
        "status" varchar(20) NOT NULL DEFAULT 'DRAFT',
        "version" integer NOT NULL DEFAULT 1,
        "note" text NULL,
        "reject_reason" text NULL,
        "completion_pct" numeric(5,2) NULL,
        "submitted_by" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "submitted_at" timestamptz NULL,
        "approved_by" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "approved_at" timestamptz NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NULL,
        CONSTRAINT "UQ_report_submissions_code" UNIQUE ("code")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "report_data" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "submission_id" uuid NOT NULL REFERENCES "report_submissions"("id") ON DELETE CASCADE,
        "indicator_id" uuid NOT NULL REFERENCES "form_indicators"("id") ON DELETE RESTRICT,
        "attribute_id" uuid NOT NULL REFERENCES "form_attributes"("id") ON DELETE RESTRICT,
        "value" text NULL,
        "value_numeric" numeric NULL,
        "updated_by" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_report_data_submission_indicator_attribute" UNIQUE ("submission_id", "indicator_id", "attribute_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "report_summaries" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "form_id" uuid NOT NULL REFERENCES "forms"("id") ON DELETE RESTRICT,
        "period_id" uuid NOT NULL REFERENCES "report_periods"("id") ON DELETE RESTRICT,
        "org_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE RESTRICT,
        "status" varchar(20) NOT NULL DEFAULT 'DRAFT',
        "total_units" integer NULL,
        "submitted_units" integer NULL,
        "approved_units" integer NULL,
        "summary_data" jsonb NULL,
        "summarized_by" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "summarized_at" timestamptz NULL,
        "approved_by" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "approved_at" timestamptz NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_report_summaries_form_period_org" UNIQUE ("form_id", "period_id", "org_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "type" varchar(50) NOT NULL,
        "title" varchar(500) NULL,
        "body" text NULL,
        "channel" varchar(20) NOT NULL,
        "is_read" boolean NOT NULL DEFAULT false,
        "ref_table" varchar(100) NULL,
        "ref_id" bigint NULL,
        "status" varchar(20) NOT NULL DEFAULT 'PENDING',
        "retry_count" integer NOT NULL DEFAULT 0,
        "sent_at" timestamptz NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "action" varchar(20) NOT NULL,
        "table_name" varchar(100) NOT NULL,
        "record_id" bigint NULL,
        "old_value" jsonb NULL,
        "new_value" jsonb NULL,
        "ip_address" varchar(45) NULL,
        "user_agent" text NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "auth_refresh_tokens" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token_hash" varchar(128) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "revoked_at" timestamptz NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "ip_address" varchar(45) NULL,
        "user_agent" text NULL,
        CONSTRAINT "UQ_auth_refresh_tokens_token_hash" UNIQUE ("token_hash")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "auth_otp_challenges" (
        "id" varchar(64) PRIMARY KEY,
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "channel" varchar(20) NOT NULL,
        "otp_hash" varchar(128) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "consumed_at" timestamptz NULL,
        "retry_count" integer NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "auth_password_resets" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token_hash" varchar(128) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "used_at" timestamptz NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_auth_password_resets_token_hash" UNIQUE ("token_hash")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "import_jobs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "type" varchar(30) NOT NULL,
        "status" varchar(20) NOT NULL,
        "created_by" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "finished_at" timestamptz NULL,
        "summary" jsonb NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "report_data_history" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "submission_id" uuid NOT NULL REFERENCES "report_submissions"("id") ON DELETE CASCADE,
        "indicator_id" uuid NOT NULL REFERENCES "form_indicators"("id") ON DELETE RESTRICT,
        "attribute_id" uuid NOT NULL REFERENCES "form_attributes"("id") ON DELETE RESTRICT,
        "old_value" text NULL,
        "new_value" text NULL,
        "changed_by" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "changed_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "user_notification_prefs" (
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "type" varchar(50) NOT NULL,
        "in_app_enabled" boolean NOT NULL DEFAULT true,
        "email_enabled" boolean NOT NULL DEFAULT true,
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_notification_prefs" PRIMARY KEY ("user_id", "type")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_report_data_submission_id" ON "report_data" ("submission_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_form_assignments_org_period" ON "form_assignments" ("org_id", "period_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_audit_logs_created_at" ON "audit_logs" ("created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_logs_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_form_assignments_org_period"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_report_data_submission_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_users_code"`);

    await queryRunner.query(`DROP TABLE IF EXISTS "user_notification_prefs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "report_data_history"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "import_jobs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "auth_password_resets"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "auth_otp_challenges"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "auth_refresh_tokens"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "report_summaries"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "report_data"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "report_submissions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "form_assignments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "form_indicators"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "form_attributes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "forms"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "indicator_catalog"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "report_periods"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_role_groups"`);

    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN IF EXISTS "code",
        DROP COLUMN IF EXISTS "org_id",
        DROP COLUMN IF EXISTS "role_group_id",
        DROP COLUMN IF EXISTS "avatar_url",
        DROP COLUMN IF EXISTS "failed_login_attempts",
        DROP COLUMN IF EXISTS "locked_until",
        DROP COLUMN IF EXISTS "totp_secret",
        DROP COLUMN IF EXISTS "totp_enabled",
        DROP COLUMN IF EXISTS "notify_channel",
        DROP COLUMN IF EXISTS "language",
        DROP COLUMN IF EXISTS "timezone"
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS "organizations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "role_groups"`);
  }
}

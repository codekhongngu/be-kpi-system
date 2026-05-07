import { MigrationInterface, QueryRunner } from 'typeorm';

export class V2InitDomain1862000001000 implements MigrationInterface {
  name = 'V2InitDomain1862000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "organizations" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "code" varchar(50) NOT NULL UNIQUE,
        "name" varchar(255) NOT NULL,
        "parent_id" uuid NULL REFERENCES "organizations"("id") ON DELETE SET NULL,
        "level" integer NOT NULL DEFAULT 1,
        "can_assign_reports" boolean NOT NULL DEFAULT true,
        "is_active" boolean NOT NULL DEFAULT true,
        "description" text NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_organizations_parent_id" ON "organizations" ("parent_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_organizations_level_active" ON "organizations" ("level", "is_active")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_organizations_assignable_active" ON "organizations" ("can_assign_reports", "is_active")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "organization_closure" (
        "ancestor_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "descendant_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "depth" integer NOT NULL,
        CONSTRAINT "pk_organization_closure" PRIMARY KEY ("ancestor_id", "descendant_id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_organization_closure_desc_ancestor" ON "organization_closure" ("descendant_id", "ancestor_id")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "org_id" uuid NULL REFERENCES "organizations"("id") ON DELETE SET NULL,
        "username" varchar(100) NOT NULL UNIQUE,
        "email" varchar(255) NOT NULL UNIQUE,
        "password_hash" varchar(255) NOT NULL,
        "code" varchar(50) NULL,
        "full_name" varchar(255) NULL,
        "phone" varchar(20) NULL,
        "failed_login_attempts" integer NOT NULL DEFAULT 0,
        "locked_until" timestamptz NULL,
        "status" varchar(20) NOT NULL DEFAULT 'active',
        "last_login" timestamptz NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "chk_users_status" CHECK ("status" IN ('active','inactive','suspended'))
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "uq_users_code_not_null" ON "users" ("code") WHERE "code" IS NOT NULL`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "roles" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "code" varchar(50) NOT NULL UNIQUE,
        "name" varchar(100) NOT NULL,
        "description" text NULL,
        "is_system" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "permissions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "code" varchar(100) NOT NULL UNIQUE,
        "name" varchar(200) NOT NULL,
        "category" varchar(50) NULL,
        "description" text NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "role_permissions" (
        "role_id" uuid NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE,
        "permission_id" uuid NOT NULL REFERENCES "permissions"("id") ON DELETE CASCADE,
        CONSTRAINT "pk_role_permissions" PRIMARY KEY ("role_id", "permission_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_roles" (
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "role_id" uuid NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE,
        CONSTRAINT "pk_user_roles" PRIMARY KEY ("user_id", "role_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "auth_refresh_tokens" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token_hash" varchar(128) NOT NULL UNIQUE,
        "expires_at" timestamptz NOT NULL,
        "revoked_at" timestamptz NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_auth_refresh_tokens_user_expires" ON "auth_refresh_tokens" ("user_id", "expires_at")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "auth_password_resets" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token_hash" varchar(128) NOT NULL UNIQUE,
        "expires_at" timestamptz NOT NULL,
        "used_at" timestamptz NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_auth_password_resets_user_expires" ON "auth_password_resets" ("user_id", "expires_at")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "field_categories" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "code" varchar(50) NOT NULL UNIQUE,
        "name" varchar(255) NOT NULL,
        "description" text NULL,
        "sort_order" integer NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "indicator_catalog" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "field_category_id" uuid NULL REFERENCES "field_categories"("id") ON DELETE SET NULL,
        "code" varchar(50) NOT NULL UNIQUE,
        "name" varchar(500) NOT NULL,
        "unit" varchar(100) NULL,
        "data_type" varchar(20) NOT NULL DEFAULT 'number',
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "form_templates" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "code" varchar(50) NOT NULL UNIQUE,
        "name" varchar(255) NOT NULL,
        "template_status" varchar(20) NOT NULL DEFAULT 'DRAFT',
        "template_type" varchar(20) NOT NULL DEFAULT 'AGGREGATE',
        "period_type" varchar(10) NOT NULL,
        "description" text NULL,
        "field_category_id" uuid NULL REFERENCES "field_categories"("id") ON DELETE SET NULL,
        "created_by" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NULL,
        "deleted_at" timestamptz NULL,
        CONSTRAINT "chk_form_templates_status" CHECK ("template_status" IN ('DRAFT','READY','IN_USE','ARCHIVED')),
        CONSTRAINT "chk_form_templates_type" CHECK ("template_type" IN ('AGGREGATE','UNIQUE'))
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_form_templates_status_type" ON "form_templates" ("template_status", "template_type")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "form_template_attributes" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "template_id" uuid NOT NULL REFERENCES "form_templates"("id") ON DELETE CASCADE,
        "parent_id" uuid NULL REFERENCES "form_template_attributes"("id") ON DELETE SET NULL,
        "code" varchar(50) NULL,
        "name" varchar(255) NOT NULL,
        "data_type" varchar(20) NOT NULL DEFAULT 'number',
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_template_attributes_template_sort" ON "form_template_attributes" ("template_id", "sort_order")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "form_template_indicators" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "template_id" uuid NOT NULL REFERENCES "form_templates"("id") ON DELETE CASCADE,
        "parent_id" uuid NULL REFERENCES "form_template_indicators"("id") ON DELETE SET NULL,
        "indicator_catalog_id" uuid NULL REFERENCES "indicator_catalog"("id") ON DELETE SET NULL,
        "display_index" varchar(50) NULL,
        "code" varchar(50) NOT NULL,
        "name" varchar(500) NOT NULL,
        "unit" varchar(100) NULL,
        "data_type" varchar(20) NOT NULL DEFAULT 'number',
        "sort_order" integer NOT NULL DEFAULT 0,
        "is_required" boolean NOT NULL DEFAULT true,
        "is_calculated" boolean NOT NULL DEFAULT false,
        "formula" text NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_form_template_indicators_template_code" UNIQUE ("template_id", "code")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_template_indicators_template_sort" ON "form_template_indicators" ("template_id", "sort_order")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "form_template_cell_configs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "template_id" uuid NOT NULL REFERENCES "form_templates"("id") ON DELETE CASCADE,
        "indicator_id" uuid NOT NULL REFERENCES "form_template_indicators"("id") ON DELETE CASCADE,
        "attribute_id" uuid NOT NULL REFERENCES "form_template_attributes"("id") ON DELETE CASCADE,
        "input_type" varchar(30) NULL,
        "is_editable" boolean NOT NULL DEFAULT true,
        "is_required" boolean NULL,
        "data_type" varchar(20) NULL,
        "default_value" text NULL,
        "formula" text NULL,
        "validation_rule" jsonb NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NULL,
        CONSTRAINT "uq_form_template_cell_configs" UNIQUE ("template_id", "indicator_id", "attribute_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "form_template_indicator_org_rules" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "template_id" uuid NOT NULL REFERENCES "form_templates"("id") ON DELETE CASCADE,
        "indicator_id" uuid NOT NULL REFERENCES "form_template_indicators"("id") ON DELETE CASCADE,
        "org_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "is_enabled" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NULL,
        CONSTRAINT "uq_template_indicator_org_rules" UNIQUE ("template_id", "org_id", "indicator_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "report_campaigns" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "template_id" uuid NOT NULL REFERENCES "form_templates"("id") ON DELETE RESTRICT,
        "period_type" varchar(10) NOT NULL,
        "period_code" varchar(30) NOT NULL,
        "period_name" varchar(255) NULL,
        "deadline_from" date NOT NULL,
        "deadline_to" date NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'DRAFT',
        "created_by" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "dispatched_by" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "dispatched_at" timestamptz NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NULL,
        CONSTRAINT "uq_report_campaign_template_period" UNIQUE ("template_id", "period_type", "period_code"),
        CONSTRAINT "chk_report_campaign_status" CHECK ("status" IN ('DRAFT','DISPATCHED','CLOSED','CANCELLED'))
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_report_campaigns_status_deadline" ON "report_campaigns" ("status", "deadline_to")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_report_campaigns_template_status" ON "report_campaigns" ("template_id", "status")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "report_campaign_indicator_org_scopes" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "campaign_id" uuid NOT NULL REFERENCES "report_campaigns"("id") ON DELETE CASCADE,
        "org_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE RESTRICT,
        "indicator_id" uuid NOT NULL REFERENCES "form_template_indicators"("id") ON DELETE RESTRICT,
        "source" varchar(30) NOT NULL DEFAULT 'MANUAL',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NULL,
        CONSTRAINT "uq_report_campaign_scope" UNIQUE ("campaign_id", "org_id", "indicator_id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_report_campaign_scope_campaign_org" ON "report_campaign_indicator_org_scopes" ("campaign_id", "org_id")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "report_assignments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "campaign_id" uuid NOT NULL REFERENCES "report_campaigns"("id") ON DELETE CASCADE,
        "template_id" uuid NOT NULL REFERENCES "form_templates"("id") ON DELETE RESTRICT,
        "org_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE RESTRICT,
        "period_type" varchar(10) NOT NULL,
        "period_code" varchar(30) NOT NULL,
        "period_name" varchar(255) NULL,
        "deadline_from" date NOT NULL,
        "deadline_to" date NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'ASSIGNED',
        "is_cancelled" boolean NOT NULL DEFAULT false,
        "cancel_reason" text NULL,
        "assigned_by" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "assigned_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NULL,
        CONSTRAINT "uq_report_assignments_campaign_org" UNIQUE ("campaign_id", "org_id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_report_assignments_org_status_deadline" ON "report_assignments" ("org_id", "status", "deadline_to")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "report_submissions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "code" varchar(25) NOT NULL UNIQUE,
        "assignment_id" uuid NOT NULL REFERENCES "report_assignments"("id") ON DELETE RESTRICT,
        "status" varchar(20) NOT NULL DEFAULT 'DRAFT',
        "version" integer NOT NULL DEFAULT 1,
        "note" text NULL,
        "reject_reason" text NULL,
        "completion_pct" numeric(5,2) NULL,
        "submitted_by" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "submitted_at" timestamptz NULL,
        "approved_by" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "approved_at" timestamptz NULL,
        "rejected_by" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "rejected_at" timestamptz NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NULL,
        CONSTRAINT "chk_report_submission_status" CHECK ("status" IN ('DRAFT','PENDING','APPROVED','REJECTED'))
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_report_submissions_assignment_status" ON "report_submissions" ("assignment_id", "status")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "report_submission_cells" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "submission_id" uuid NOT NULL REFERENCES "report_submissions"("id") ON DELETE CASCADE,
        "indicator_id" uuid NOT NULL REFERENCES "form_template_indicators"("id") ON DELETE RESTRICT,
        "attribute_id" uuid NOT NULL REFERENCES "form_template_attributes"("id") ON DELETE RESTRICT,
        "value_text" text NULL,
        "value_number" numeric NULL,
        "value_type" varchar(20) NULL,
        "updated_by" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_report_submission_cells" UNIQUE ("submission_id", "indicator_id", "attribute_id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_report_submission_cells_submission" ON "report_submission_cells" ("submission_id")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "report_summaries" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "campaign_id" uuid NOT NULL REFERENCES "report_campaigns"("id") ON DELETE CASCADE,
        "template_id" uuid NOT NULL REFERENCES "form_templates"("id") ON DELETE RESTRICT,
        "org_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE RESTRICT,
        "period_type" varchar(10) NOT NULL,
        "period_code" varchar(30) NULL,
        "period_name" varchar(255) NULL,
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
        "updated_at" timestamptz NULL,
        CONSTRAINT "uq_report_summaries_campaign_org" UNIQUE ("campaign_id", "org_id"),
        CONSTRAINT "chk_report_summary_status" CHECK ("status" IN ('DRAFT','FINAL','LOCKED'))
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_report_summaries_campaign_status" ON "report_summaries" ("campaign_id", "status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_report_summaries_summary_data_gin" ON "report_summaries" USING GIN ("summary_data")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "action" varchar(50) NOT NULL,
        "table_name" varchar(100) NOT NULL,
        "record_id" uuid NULL,
        "before_data" jsonb NULL,
        "after_data" jsonb NULL,
        "correlation_id" varchar(100) NULL,
        "ip_address" varchar(45) NULL,
        "user_agent" text NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_audit_table_record_created" ON "audit_logs" ("table_name", "record_id", "created_at" DESC)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_audit_user_created" ON "audit_logs" ("user_id", "created_at" DESC)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_audit_action_created" ON "audit_logs" ("action", "created_at" DESC)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_audit_action_created"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_audit_user_created"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_audit_table_record_created"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_report_summaries_summary_data_gin"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_report_summaries_campaign_status"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "report_summaries"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_report_submission_cells_submission"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "report_submission_cells"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_report_submissions_assignment_status"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "report_submissions"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_report_assignments_org_status_deadline"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "report_assignments"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_report_campaign_scope_campaign_org"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "report_campaign_indicator_org_scopes"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_report_campaigns_template_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_report_campaigns_status_deadline"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "report_campaigns"`);

    await queryRunner.query(`DROP TABLE IF EXISTS "form_template_indicator_org_rules"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "form_template_cell_configs"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_template_indicators_template_sort"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "form_template_indicators"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_template_attributes_template_sort"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "form_template_attributes"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_form_templates_status_type"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "form_templates"`);

    await queryRunner.query(`DROP TABLE IF EXISTS "indicator_catalog"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "field_categories"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_auth_password_resets_user_expires"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "auth_password_resets"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_auth_refresh_tokens_user_expires"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "auth_refresh_tokens"`);

    await queryRunner.query(`DROP TABLE IF EXISTS "user_roles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "role_permissions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "permissions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "roles"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "uq_users_code_not_null"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_organization_closure_desc_ancestor"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "organization_closure"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_organizations_assignable_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_organizations_level_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_organizations_parent_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "organizations"`);
  }
}

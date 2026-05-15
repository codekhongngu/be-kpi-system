import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNewTemplateReportModel1779100000000
  implements MigrationInterface
{
  name = 'CreateNewTemplateReportModel1779100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "form_templates" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "code" varchar(20) NOT NULL,
        "name" varchar(255) NOT NULL,
        "template_type" varchar(20) NOT NULL DEFAULT 'AGGREGATE',
        "template_status" varchar(20) NOT NULL DEFAULT 'DRAFT',
        "period_type" varchar(10) NOT NULL,
        "field_category_id" uuid NULL REFERENCES "field_categories"("id") ON DELETE SET NULL,
        "description" text NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "template_file" varchar(500) NULL,
        "parent_template_id" uuid NULL REFERENCES "form_templates"("id") ON DELETE SET NULL,
        "created_by" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NULL,
        "deleted_at" timestamptz NULL,
        CONSTRAINT "UQ_form_templates_code" UNIQUE ("code")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_form_templates_status"
      ON "form_templates" ("template_status")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_form_templates_type"
      ON "form_templates" ("template_type")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "form_template_attributes" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "template_id" uuid NOT NULL REFERENCES "form_templates"("id") ON DELETE CASCADE,
        "parent_id" uuid NULL REFERENCES "form_template_attributes"("id") ON DELETE SET NULL,
        "name" varchar(255) NOT NULL,
        "data_type" varchar(20) NULL,
        "is_required" boolean NOT NULL DEFAULT false,
        "is_visible" boolean NOT NULL DEFAULT true,
        "is_readonly" boolean NOT NULL DEFAULT false,
        "is_system" boolean NOT NULL DEFAULT false,
        "sort_order" integer NOT NULL DEFAULT 0,
        "options" jsonb NULL,
        "validation_rule" jsonb NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_form_template_attributes_template"
      ON "form_template_attributes" ("template_id")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "form_template_indicators" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "template_id" uuid NOT NULL REFERENCES "form_templates"("id") ON DELETE CASCADE,
        "parent_id" uuid NULL REFERENCES "form_template_indicators"("id") ON DELETE SET NULL,
        "display_index" varchar(50) NULL,
        "code" varchar(50) NOT NULL,
        "name" varchar(500) NOT NULL,
        "unit" varchar(100) NULL,
        "data_type" varchar(20) NOT NULL,
        "is_required" boolean NOT NULL DEFAULT true,
        "is_readonly" boolean NOT NULL DEFAULT false,
        "is_calculated" boolean NOT NULL DEFAULT false,
        "formula" text NULL,
        "group_name" varchar(255) NULL,
        "sort_order" integer NOT NULL DEFAULT 0,
        "min_value" numeric NULL,
        "max_value" numeric NULL,
        "validation_rule" jsonb NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "catalog_indicator_id" uuid NULL REFERENCES "indicator_catalog"("id") ON DELETE SET NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_form_template_indicators_template_code" UNIQUE ("template_id", "code")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_form_template_indicators_template"
      ON "form_template_indicators" ("template_id")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "form_template_cell_configs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "template_id" uuid NOT NULL REFERENCES "form_templates"("id") ON DELETE CASCADE,
        "indicator_id" uuid NOT NULL REFERENCES "form_template_indicators"("id") ON DELETE CASCADE,
        "attribute_id" uuid NOT NULL REFERENCES "form_template_attributes"("id") ON DELETE CASCADE,
        "is_editable" boolean NOT NULL DEFAULT true,
        "validation_rule" jsonb NULL,
        "default_value" text NULL,
        "data_type" varchar(20) NULL,
        "is_required" boolean NULL,
        "formula" text NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NULL,
        CONSTRAINT "UQ_form_template_cell_configs_key" UNIQUE ("template_id", "indicator_id", "attribute_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "form_template_indicator_org_rules" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "template_id" uuid NOT NULL REFERENCES "form_templates"("id") ON DELETE CASCADE,
        "org_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "indicator_id" uuid NOT NULL REFERENCES "form_template_indicators"("id") ON DELETE CASCADE,
        "is_enabled" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NULL,
        CONSTRAINT "UQ_form_template_indicator_org_rules_new" UNIQUE ("template_id", "org_id", "indicator_id")
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
        CONSTRAINT "UQ_report_campaigns_template_period" UNIQUE ("template_id", "period_type", "period_code")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "report_campaign_indicator_org_scopes" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "campaign_id" uuid NOT NULL REFERENCES "report_campaigns"("id") ON DELETE CASCADE,
        "org_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE RESTRICT,
        "indicator_id" uuid NOT NULL REFERENCES "form_template_indicators"("id") ON DELETE RESTRICT,
        "source" varchar(30) NOT NULL DEFAULT 'MANUAL',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NULL,
        CONSTRAINT "UQ_report_campaign_scope" UNIQUE ("campaign_id", "org_id", "indicator_id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_report_campaign_scopes_campaign_org"
      ON "report_campaign_indicator_org_scopes" ("campaign_id", "org_id")
    `);

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
        CONSTRAINT "UQ_report_assignments_campaign_org" UNIQUE ("campaign_id", "org_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "report_submission_cells" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "submission_id" uuid NOT NULL REFERENCES "report_submissions"("id") ON DELETE CASCADE,
        "indicator_id" uuid NOT NULL REFERENCES "form_template_indicators"("id") ON DELETE RESTRICT,
        "attribute_id" uuid NOT NULL REFERENCES "form_template_attributes"("id") ON DELETE RESTRICT,
        "value" text NULL,
        "value_number" numeric NULL,
        "updated_by" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_report_submission_cells" UNIQUE ("submission_id", "indicator_id", "attribute_id")
      )
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION enforce_unique_campaign_indicator_scope()
      RETURNS trigger AS $$
      DECLARE
        v_template_type varchar(20);
        v_exists boolean;
      BEGIN
        SELECT t.template_type INTO v_template_type
        FROM report_campaigns c
        INNER JOIN form_templates t ON t.id = c.template_id
        WHERE c.id = NEW.campaign_id;

        IF v_template_type = 'UNIQUE' THEN
          SELECT EXISTS (
            SELECT 1
            FROM report_campaign_indicator_org_scopes s
            WHERE s.campaign_id = NEW.campaign_id
              AND s.indicator_id = NEW.indicator_id
              AND s.org_id <> NEW.org_id
              AND (TG_OP = 'INSERT' OR s.id <> NEW.id)
          ) INTO v_exists;

          IF v_exists THEN
            RAISE EXCEPTION 'UNIQUE_TEMPLATE_INDICATOR_CONFLICT';
          END IF;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_enforce_unique_campaign_indicator_scope
      ON report_campaign_indicator_org_scopes
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_enforce_unique_campaign_indicator_scope
      BEFORE INSERT OR UPDATE ON report_campaign_indicator_org_scopes
      FOR EACH ROW EXECUTE FUNCTION enforce_unique_campaign_indicator_scope()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_enforce_unique_campaign_indicator_scope ON report_campaign_indicator_org_scopes
    `);
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS enforce_unique_campaign_indicator_scope()
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS "report_submission_cells"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "report_assignments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "report_campaign_indicator_org_scopes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "report_campaigns"`);

    await queryRunner.query(`DROP TABLE IF EXISTS "form_template_indicator_org_rules"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "form_template_cell_configs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "form_template_indicators"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "form_template_attributes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "form_templates"`);
  }
}

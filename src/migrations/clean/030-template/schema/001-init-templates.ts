import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitTemplates1863000003000 implements MigrationInterface {
  name = 'InitTemplates1863000003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "field_categories" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "code" varchar(50) NOT NULL,
        "name" varchar(255) NOT NULL,
        "description" text NULL,
        "sort_order" integer NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NULL,
        CONSTRAINT "UQ_field_categories_code" UNIQUE ("code")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "indicator_catalog" (
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
      CREATE TABLE IF NOT EXISTS "form_templates" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "code" varchar(20) NOT NULL,
        "name" varchar(255) NOT NULL,
        "template_type" varchar(20) NOT NULL DEFAULT 'AGGREGATE',
        "template_status" varchar(20) NOT NULL DEFAULT 'DRAFT',
        "period_type" varchar(10) NOT NULL,
        "field_category_id" uuid NULL REFERENCES "field_categories"("id") ON DELETE SET NULL,
        "description" text NULL,
        "created_by" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NULL,
        "deleted_at" timestamptz NULL,
        CONSTRAINT "UQ_form_templates_code" UNIQUE ("code")
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_form_templates_status" ON "form_templates" ("template_status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_form_templates_type" ON "form_templates" ("template_type")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "form_template_attributes" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "template_id" uuid NOT NULL REFERENCES "form_templates"("id") ON DELETE CASCADE,
        "parent_id" uuid NULL REFERENCES "form_template_attributes"("id") ON DELETE SET NULL,
        "name" varchar(255) NOT NULL,
        "is_system" boolean NOT NULL DEFAULT false,
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_form_template_attributes_template" ON "form_template_attributes" ("template_id")`);

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
        "type" varchar(10) NOT NULL DEFAULT 'INPUT',
        "sort_order" integer NOT NULL DEFAULT 0,
        "catalog_indicator_id" uuid NULL REFERENCES "indicator_catalog"("id") ON DELETE SET NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_form_template_indicators_template_code" UNIQUE ("template_id", "code")
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_form_template_indicators_template" ON "form_template_indicators" ("template_id")`);

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
        CONSTRAINT "UQ_form_template_indicator_org_rules" UNIQUE ("template_id", "org_id", "indicator_id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "form_template_indicator_org_rules"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "form_template_cell_configs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "form_template_indicators"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "form_template_attributes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "form_templates"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "indicator_catalog"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "field_categories"`);
  }
}

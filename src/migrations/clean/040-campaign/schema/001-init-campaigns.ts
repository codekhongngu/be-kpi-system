import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitCampaigns1863000004000 implements MigrationInterface {
  name = 'InitCampaigns1863000004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
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
        CONSTRAINT "UQ_report_campaigns_template_period" UNIQUE ("template_id", "period_type", "period_code")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "report_campaign_indicator_org_scopes" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "campaign_id" uuid NOT NULL REFERENCES "report_campaigns"("id") ON DELETE CASCADE,
        "org_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE RESTRICT,
        "indicator_id" uuid NOT NULL REFERENCES "form_template_indicators"("id") ON DELETE RESTRICT,
        "source" varchar(30) NOT NULL DEFAULT 'CAMPAIGN_OVERRIDE',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_report_campaign_scope" UNIQUE ("campaign_id", "org_id", "indicator_id")
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_report_campaign_scopes_campaign_org" ON "report_campaign_indicator_org_scopes" ("campaign_id", "org_id")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "report_campaign_default_values" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "campaign_id" uuid NOT NULL REFERENCES "report_campaigns"("id") ON DELETE CASCADE,
        "indicator_id" uuid NOT NULL REFERENCES "form_template_indicators"("id") ON DELETE RESTRICT,
        "attribute_id" uuid NOT NULL REFERENCES "form_template_attributes"("id") ON DELETE RESTRICT,
        "value_text" text NULL,
        "value_number" numeric NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NULL,
        CONSTRAINT "UQ_campaign_default_values" UNIQUE ("campaign_id", "indicator_id", "attribute_id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_campaign_default_values_campaign" ON "report_campaign_default_values" ("campaign_id")`);

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
        "is_cancelled" boolean NOT NULL DEFAULT false,
        "cancel_reason" text NULL,
        "assigned_by" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "assigned_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_report_assignments_campaign_org" UNIQUE ("campaign_id", "org_id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "report_assignments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "report_campaign_default_values"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "report_campaign_indicator_org_scopes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "report_campaigns"`);
  }
}

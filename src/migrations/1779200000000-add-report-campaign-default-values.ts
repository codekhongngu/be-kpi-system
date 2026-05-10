import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReportCampaignDefaultValues1779200000000
  implements MigrationInterface
{
  name = 'AddReportCampaignDefaultValues1779200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "report_campaign_default_values" (
        "id"            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "campaign_id"   uuid NOT NULL REFERENCES "report_campaigns"("id") ON DELETE CASCADE,
        "indicator_id"  uuid NOT NULL REFERENCES "form_template_indicators"("id") ON DELETE RESTRICT,
        "attribute_id"  uuid NOT NULL REFERENCES "form_template_attributes"("id") ON DELETE RESTRICT,
        "value_text"    text NULL,
        "value_number"  numeric NULL,
        "created_at"    timestamptz NOT NULL DEFAULT now(),
        "updated_at"    timestamptz NULL,
        CONSTRAINT "UQ_campaign_default_values" UNIQUE ("campaign_id", "indicator_id", "attribute_id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_campaign_default_values_campaign"
      ON "report_campaign_default_values" ("campaign_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_campaign_default_values_campaign"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "report_campaign_default_values"`,
    );
  }
}

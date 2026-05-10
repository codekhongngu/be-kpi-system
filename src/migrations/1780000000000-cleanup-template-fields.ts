import { MigrationInterface, QueryRunner } from 'typeorm';

export class CleanupTemplateFields1780000000000 implements MigrationInterface {
  name = 'CleanupTemplateFields1780000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "form_template_indicators" 
      DROP COLUMN IF EXISTS "type",
      DROP COLUMN IF EXISTS "is_calculated",
      DROP COLUMN IF EXISTS "formula",
      DROP COLUMN IF EXISTS "is_required"
    `);

    await queryRunner.query(`
      ALTER TABLE "form_template_attributes"
      DROP COLUMN IF EXISTS "is_visible",
      DROP COLUMN IF EXISTS "is_system"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note: Re-adding these columns would require knowing their exact original definitions 
    // and might not recover lost data. For simplicity in this cleanup, we provide basic re-add.
    
    await queryRunner.query(`
      ALTER TABLE "form_template_indicators" 
      ADD COLUMN "type" varchar(20) NOT NULL DEFAULT 'INPUT',
      ADD COLUMN "is_calculated" boolean NOT NULL DEFAULT false,
      ADD COLUMN "formula" text NULL,
      ADD COLUMN "is_required" boolean NOT NULL DEFAULT true
    `);

    await queryRunner.query(`
      ALTER TABLE "form_template_attributes"
      ADD COLUMN "is_visible" boolean NOT NULL DEFAULT true,
      ADD COLUMN "is_system" boolean NOT NULL DEFAULT false
    `);
  }
}

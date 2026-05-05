import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTemplateNodeMetadata1777361000000 implements MigrationInterface {
  name = 'AddTemplateNodeMetadata1777361000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "form_attributes"
      ADD COLUMN IF NOT EXISTS "is_readonly" boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "validation_rule" jsonb NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "form_indicators"
      ADD COLUMN IF NOT EXISTS "is_readonly" boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "validation_rule" jsonb NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "form_indicators"
      DROP COLUMN IF EXISTS "validation_rule",
      DROP COLUMN IF EXISTS "is_readonly"
    `);

    await queryRunner.query(`
      ALTER TABLE "form_attributes"
      DROP COLUMN IF EXISTS "validation_rule",
      DROP COLUMN IF EXISTS "is_readonly"
    `);
  }
}

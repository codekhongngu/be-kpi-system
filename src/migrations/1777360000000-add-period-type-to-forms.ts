import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPeriodTypeToForms1777360000000 implements MigrationInterface {
  name = 'AddPeriodTypeToForms1777360000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "forms"
      ADD COLUMN IF NOT EXISTS "period_type" varchar(10)
    `);

    await queryRunner.query(`
      UPDATE "forms"
      SET "period_type" = 'THANG'
      WHERE "period_type" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "forms"
      ALTER COLUMN "period_type" SET DEFAULT 'THANG'
    `);

    await queryRunner.query(`
      ALTER TABLE "forms"
      ALTER COLUMN "period_type" SET NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "forms"
      DROP COLUMN IF EXISTS "period_type"
    `);
  }
}

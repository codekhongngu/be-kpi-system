import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorIndicatorTypeAndAttributeIsSystem1780000000001 implements MigrationInterface {
  name = 'RefactorIndicatorTypeAndAttributeIsSystem1780000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add `is_system` to `form_template_attributes`
    // (Already exists from previous base schemas, so we skip adding it)
    /*
    await queryRunner.query(`
      ALTER TABLE "form_template_attributes" 
      ADD COLUMN "is_system" boolean NOT NULL DEFAULT false
    `);
    */

    // Update existing default attributes to be system protected
    await queryRunner.query(`
      UPDATE "form_template_attributes"
      SET "is_system" = true
      WHERE "name" IN ('Tên chỉ tiêu', 'Đơn vị tính')
    `);

    // 2. Add `type` to `form_template_indicators` and migrate data from `is_readonly`
    await queryRunner.query(`
      ALTER TABLE "form_template_indicators" 
      ADD COLUMN "type" varchar(10) NOT NULL DEFAULT 'INPUT'
    `);

    await queryRunner.query(`
      UPDATE "form_template_indicators"
      SET "type" = CASE WHEN "is_readonly" = true THEN 'TITLE' ELSE 'INPUT' END
    `);

    await queryRunner.query(`
      ALTER TABLE "form_template_indicators" 
      DROP COLUMN "is_readonly"
    `);
    
    // 3. Remove cell configs for TITLE indicators
    await queryRunner.query(`
      DELETE FROM "form_template_cell_configs"
      WHERE "indicator_id" IN (
        SELECT "id" FROM "form_template_indicators" WHERE "type" = 'TITLE'
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "form_template_indicators" 
      ADD COLUMN "is_readonly" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      UPDATE "form_template_indicators"
      SET "is_readonly" = CASE WHEN "type" = 'TITLE' THEN true ELSE false END
    `);

    await queryRunner.query(`
      ALTER TABLE "form_template_indicators" 
      DROP COLUMN "type"
    `);

    /*
    await queryRunner.query(`
      ALTER TABLE "form_template_attributes" 
      DROP COLUMN "is_system"
    `);
    */
  }
}

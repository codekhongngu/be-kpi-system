import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddParentIdToAttributesAndIndicators1777343595993 implements MigrationInterface {
  name = 'AddParentIdToAttributesAndIndicators1777343595993';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Thêm parent_id vào form_attributes
    await queryRunner.query(`
      ALTER TABLE "form_attributes" 
      ADD COLUMN IF NOT EXISTS "parent_id" uuid NULL 
      REFERENCES "form_attributes"("id") ON DELETE SET NULL
    `);

    // Thêm parent_id vào form_indicators
    await queryRunner.query(`
      ALTER TABLE "form_indicators" 
      ADD COLUMN IF NOT EXISTS "parent_id" uuid NULL 
      REFERENCES "form_indicators"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "form_indicators" DROP COLUMN IF EXISTS "parent_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "form_attributes" DROP COLUMN IF EXISTS "parent_id"`,
    );
  }
}

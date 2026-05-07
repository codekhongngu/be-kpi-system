import { MigrationInterface, QueryRunner } from 'typeorm';

export class V2FixPermissionsNameNotNull1862000003000
  implements MigrationInterface
{
  name = 'V2FixPermissionsNameNotNull1862000003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "permissions"
      SET "name" = INITCAP(REPLACE("code", '.', ' '))
      WHERE "name" IS NULL AND "code" IS NOT NULL
    `);

    await queryRunner.query(`
      UPDATE "permissions"
      SET "name" = 'Unnamed permission'
      WHERE "name" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "permissions"
      ALTER COLUMN "name" SET NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "permissions"
      ALTER COLUMN "name" DROP NOT NULL
    `);
  }
}


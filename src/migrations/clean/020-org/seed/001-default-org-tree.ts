import { MigrationInterface, QueryRunner } from 'typeorm';

const ORGS = [
  ['XA-ROOT', 'UBND XÃ', null, 1, 'Cây đơn vị gốc'],
  ['XA-VPH', 'Văn phòng HĐND & UBND', 'XA-ROOT', 2, null],
  ['XA-PKT', 'Phòng Kinh tế', 'XA-ROOT', 2, null],
  ['XA-PVHXH', 'Phòng Văn hóa - Xã hội', 'XA-ROOT', 2, null],
  ['XA-TTPVHCC', 'Trung tâm Hành chính công', 'XA-ROOT', 3, null],
  ['XA-CA', 'Công an xã', 'XA-ROOT', 4, null],
  ['XA-QS', 'Ban CHQS xã', 'XA-ROOT', 4, null],
] as const;

export class DefaultOrgTree1863000002001 implements MigrationInterface {
  name = 'DefaultOrgTree1863000002001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [code, name, parentCode, level, description] of ORGS) {
      if (!parentCode) {
        await queryRunner.query(
          `
          INSERT INTO "organizations" ("code", "name", "parent_id", "level", "is_active", "can_assign_reports", "description", "created_at", "updated_at")
          VALUES ($1, $2, NULL, $3, true, true, $4, now(), now())
          ON CONFLICT ("code") DO UPDATE SET
            "name" = EXCLUDED."name",
            "parent_id" = NULL,
            "level" = EXCLUDED."level",
            "description" = EXCLUDED."description",
            "updated_at" = now()
        `,
          [code, name, level, description],
        );
        continue;
      }

      await queryRunner.query(
        `
        INSERT INTO "organizations" ("code", "name", "parent_id", "level", "is_active", "can_assign_reports", "description", "created_at", "updated_at")
        SELECT $1, $2, p."id", $4, true, true, $5, now(), now()
        FROM "organizations" p
        WHERE p."code" = $3
        ON CONFLICT ("code") DO UPDATE SET
          "name" = EXCLUDED."name",
          "parent_id" = EXCLUDED."parent_id",
          "level" = EXCLUDED."level",
          "description" = EXCLUDED."description",
          "updated_at" = now()
      `,
        [code, name, parentCode, level, description],
      );
    }

    await queryRunner.query(`SELECT refresh_organization_closure()`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "organizations" WHERE "code" IN ('XA-QS','XA-CA','XA-TTPVHCC','XA-PVHXH','XA-PKT','XA-VPH','XA-ROOT')`);
  }
}

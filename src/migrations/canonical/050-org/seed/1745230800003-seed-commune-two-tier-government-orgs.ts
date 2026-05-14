import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Seed cây đơn vị chuẩn cho cấp xã dưới gốc `XA-ROOT`.
 *
 * - Idempotent: INSERT … ON CONFLICT ("code") DO UPDATE.
 * - Cần bảng `organizations` và bản ghi `XA-ROOT` (migration `1745230800001`).
 * - Giữ `XA-ROOT` làm mã gốc để tránh gãy FK/các seed phụ thuộc.
 */
export class SeedCommuneTwoTierGovernmentOrgs1745230800003 implements MigrationInterface {
  name = 'SeedCommuneTwoTierGovernmentOrgs1745230800003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasOrganizations = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'organizations'
      ) AS "exists"
    `);
    if (hasOrganizations[0]?.exists !== true) {
      return;
    }

    const root = await queryRunner.query(`
      SELECT "id" FROM "organizations" WHERE "code" = 'XA-ROOT' LIMIT 1
    `);
    if (!root?.length) {
      return;
    }

    await queryRunner.query(`
      UPDATE "organizations"
      SET
        "name" = 'UBND XÃ',
        "description" = 'Cây đơn vị chuẩn cho cấp xã theo dữ liệu seed hiện tại.',
        "level" = 1,
        "updated_at" = now()
      WHERE "code" = 'XA-ROOT'
    `);

    const rows: Array<{
      code: string;
      name: string;
      parentCode: string;
      level: number;
      description: string | null;
    }> = [
      {
        code: 'XA-VPH',
        name: 'Văn phòng HĐND & UBND',
        parentCode: 'XA-ROOT',
        level: 2,
        description: null,
      },
      {
        code: 'XA-PKT',
        name: 'Phòng Kinh tế',
        parentCode: 'XA-ROOT',
        level: 2,
        description: null,
      },
      {
        code: 'XA-PVHXH',
        name: 'Phòng Văn hóa - Xã hội',
        parentCode: 'XA-ROOT',
        level: 2,
        description: null,
      },
      {
        code: 'XA-TTPVHCC',
        name: 'Trung tâm Hành chính công',
        parentCode: 'XA-ROOT',
        level: 3,
        description: null,
      },
      {
        code: 'XA-CA',
        name: 'Công an xã',
        parentCode: 'XA-ROOT',
        level: 4,
        description: null,
      },
      {
        code: 'XA-QS',
        name: 'Ban CHQS xã',
        parentCode: 'XA-ROOT',
        level: 4,
        description: null,
      },
    ];

    for (const r of rows) {
      await queryRunner.query(
        `
        INSERT INTO "organizations" (
          "id", "code", "name", "parent_id", "head_user_id", "level",
          "is_active", "description", "created_at", "updated_at", "deleted_at"
        )
        SELECT
          gen_random_uuid(),
          $1,
          $2,
          p."id",
          NULL,
          $3,
          true,
          $4,
          now(),
          now(),
          NULL
        FROM "organizations" p
        WHERE p."code" = $5
        LIMIT 1
        ON CONFLICT ("code") DO UPDATE SET
          "name" = EXCLUDED."name",
          "parent_id" = EXCLUDED."parent_id",
          "level" = EXCLUDED."level",
          "description" = EXCLUDED."description",
          "updated_at" = now()
      `,
        [r.code, r.name, r.level, r.description, r.parentCode],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasOrganizations = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'organizations'
      ) AS "exists"
    `);
    if (hasOrganizations[0]?.exists !== true) {
      return;
    }

    // Xóa từ lá lên để không vi phạm FK self-reference `parent_id`.
    await queryRunner.query(`
      DELETE FROM "organizations" WHERE "code" = 'XA-PKT'
    `);
    await queryRunner.query(`
      DELETE FROM "organizations"
      WHERE "code" IN (
        'XA-QS',
        'XA-CA',
        'XA-TTPVHCC',
        'XA-PVHXH',
        'XA-VPH'
      )
    `);

    await queryRunner.query(`
      UPDATE "organizations"
      SET
        "name" = 'UBND Xã (mẫu)',
        "description" = 'Đơn vị gốc cho dữ liệu mẫu',
        "updated_at" = now()
      WHERE "code" = 'XA-ROOT'
    `);
  }
}

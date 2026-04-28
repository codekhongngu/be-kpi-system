import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Seed cây đơn vị chính quyền cấp xã (mô hình 2 cấp: HĐND / UBND) dưới gốc `XA-ROOT`.
 *
 * - Idempotent: INSERT … ON CONFLICT ("code") DO UPDATE.
 * - Cần bảng `organizations` và bản ghi `XA-ROOT` (migration `1745230800001`).
 * - Cập nhật tên/mô tả `XA-ROOT` cho khớp danh mục (giữ `code` để không gãy FK).
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
        "name" = 'Chính quyền cấp xã (mô hình 2 cấp)',
        "description" = 'Cây đơn vị: HĐND và UBND theo tổ chức 2 cấp.',
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
        code: 'XA-HDND',
        name: 'Hội đồng nhân dân (HĐND)',
        parentCode: 'XA-ROOT',
        level: 2,
        description: null,
      },
      {
        code: 'XA-HDND-BPC',
        name: 'Ban Pháp chế',
        parentCode: 'XA-HDND',
        level: 3,
        description: null,
      },
      {
        code: 'XA-HDND-BKTXH',
        name: 'Ban Kinh tế - Xã hội',
        parentCode: 'XA-HDND',
        level: 3,
        description: null,
      },
      {
        code: 'XA-UBND',
        name: 'Ủy ban nhân dân (UBND)',
        parentCode: 'XA-ROOT',
        level: 2,
        description: null,
      },
      {
        code: 'XA-VPH',
        name: 'Văn phòng HĐND và UBND',
        parentCode: 'XA-UBND',
        level: 3,
        description: null,
      },
      {
        code: 'XA-KHOI-KT-HT',
        name: 'Khối Kinh tế & Hạ tầng',
        parentCode: 'XA-UBND',
        level: 3,
        description:
          'Nhóm đơn vị; tùy loại hình xã/đặc khu chọn Phòng Kinh tế hoặc Phòng Kinh tế, Hạ tầng và Đô thị.',
      },
      {
        code: 'XA-PKT',
        name: 'Phòng Kinh tế',
        parentCode: 'XA-KHOI-KT-HT',
        level: 4,
        description: 'Áp dụng phổ biến cho xã, đặc khu (theo danh mục).',
      },
      {
        code: 'XA-PKT-HT-DT',
        name: 'Phòng Kinh tế, Hạ tầng và Đô thị',
        parentCode: 'XA-KHOI-KT-HT',
        level: 4,
        description: 'Biến thể tổ chức theo loại đơn vị.',
      },
      {
        code: 'XA-PVHXH',
        name: 'Phòng Văn hóa - Xã hội',
        parentCode: 'XA-UBND',
        level: 3,
        description: null,
      },
      {
        code: 'XA-TTPVHCC',
        name: 'Trung tâm phục vụ hành chính công',
        parentCode: 'XA-UBND',
        level: 3,
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
      DELETE FROM "organizations" WHERE "code" IN ('XA-PKT-HT-DT', 'XA-PKT')
    `);
    await queryRunner.query(`
      DELETE FROM "organizations"
      WHERE "code" IN (
        'XA-KHOI-KT-HT',
        'XA-TTPVHCC',
        'XA-PVHXH',
        'XA-VPH',
        'XA-HDND-BKTXH',
        'XA-HDND-BPC'
      )
    `);
    await queryRunner.query(`
      DELETE FROM "organizations" WHERE "code" IN ('XA-UBND', 'XA-HDND')
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

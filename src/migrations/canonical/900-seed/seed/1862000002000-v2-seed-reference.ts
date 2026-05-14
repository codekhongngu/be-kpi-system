import { MigrationInterface, QueryRunner } from 'typeorm';

const IDS = {
  template: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
} as const;

const ATTRS = [
  ['20000000-0000-0000-0000-000000000001', 'Năm trước', 0, null],
  ['20000000-0000-0000-0000-000000000002', 'KH năm nay', 1, null],
  ['20000000-0000-0000-0000-000000000003', 'Tháng 1', 2, null],
  ['20000000-0000-0000-0000-000000000004', 'Tháng 2', 3, null],
  ['20000000-0000-0000-0000-000000000005', 'Tháng 3', 4, null],
  ['20000000-0000-0000-0000-000000000006', 'Quý I', 5, null],
  ['20000000-0000-0000-0000-000000000007', 'Tổng GTSP', 0, '20000000-0000-0000-0000-000000000006'],
] as const;

const INDS = [
  ['10000000-0000-0000-0000-000000000001', 'A', null, 'KINH TE', 0, null],
  ['10000000-0000-0000-0000-000000000002', 'I', null, 'TONG GIA TRI SAN PHAM TREN DIA BAN', 0, '10000000-0000-0000-0000-000000000001'],
  ['10000000-0000-0000-0000-000000000003', '1', '1', 'Toc do tang tong gia tri san pham', 0, '10000000-0000-0000-0000-000000000002'],
  ['10000000-0000-0000-0000-000000000004', '1.1', '1.1', 'Nong lam thuy san', 0, '10000000-0000-0000-0000-000000000003'],
  ['10000000-0000-0000-0000-000000000005', '1.2', '1.2', 'Cong nghiep - Xay dung', 1, '10000000-0000-0000-0000-000000000003'],
] as const;

export class V2SeedReference1862000002000 implements MigrationInterface {
  name = 'V2SeedReference1862000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasFieldCategories = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'field_categories'
      ) AS "exists"
    `);
    const hasTemplates = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'form_templates'
      ) AS "exists"
    `);
    const hasTemplateAttrs = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'form_template_attributes'
      ) AS "exists"
    `);
    const hasTemplateIndicators = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'form_template_indicators'
      ) AS "exists"
    `);

    if (
      hasFieldCategories[0]?.exists !== true ||
      hasTemplates[0]?.exists !== true ||
      hasTemplateAttrs[0]?.exists !== true ||
      hasTemplateIndicators[0]?.exists !== true
    ) {
      return;
    }

    const category = await queryRunner.query(`
      SELECT "id"
      FROM "field_categories"
      WHERE "code" = 'kinh_te'
      LIMIT 1
    `);
    if (!category?.length) {
      return;
    }

    const adminUser = await queryRunner.query(`
      SELECT "id"
      FROM "users"
      WHERE "username" = 'admin'
      LIMIT 1
    `);
    const createdByExpr = adminUser?.length ? `'${adminUser[0].id}'::uuid` : 'NULL';

    await queryRunner.query(
      `
      INSERT INTO "form_templates" (
        "id", "code", "name", "template_status", "template_type", "period_type",
        "description", "field_category_id", "created_by", "created_at"
      )
      VALUES (
        $1::uuid,
        'MAU-01',
        'Biểu mẫu tổng hợp kinh tế - xã hội',
        'READY',
        'AGGREGATE',
        'THANG',
        'Mẫu tham khảo từ seed canonical',
        $2::uuid,
        ${createdByExpr},
        now()
      )
      ON CONFLICT ("code") DO UPDATE SET
        "name" = EXCLUDED."name",
        "template_status" = EXCLUDED."template_status",
        "template_type" = EXCLUDED."template_type",
        "period_type" = EXCLUDED."period_type",
        "description" = EXCLUDED."description",
        "field_category_id" = EXCLUDED."field_category_id",
        "created_by" = EXCLUDED."created_by",
        "updated_at" = now()
    `,
      [IDS.template, category[0].id],
    );

    for (const [id, name, sortOrder, parentId] of ATTRS) {
      await queryRunner.query(
        `
        INSERT INTO "form_template_attributes" (
          "id", "template_id", "parent_id", "name", "data_type", "sort_order", "created_at"
        )
        VALUES ($1::uuid, $2::uuid, $3::uuid, $4, 'number', $5, now())
        ON CONFLICT ("id") DO NOTHING
      `,
        [id, IDS.template, parentId, name, sortOrder],
      );
    }

    for (const [id, code, displayIndex, name, sortOrder, parentId] of INDS) {
      await queryRunner.query(
        `
        INSERT INTO "form_template_indicators" (
          "id", "template_id", "parent_id", "display_index", "code", "name",
          "data_type", "sort_order", "is_required", "is_calculated", "created_at"
        )
        VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, 'number', $7, true, false, now())
        ON CONFLICT ("id") DO NOTHING
      `,
        [id, IDS.template, parentId, displayIndex, code, name, sortOrder],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasTemplateIndicators = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'form_template_indicators'
      ) AS "exists"
    `);
    const hasTemplateAttrs = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'form_template_attributes'
      ) AS "exists"
    `);
    const hasTemplates = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'form_templates'
      ) AS "exists"
    `);

    if (
      hasTemplateIndicators[0]?.exists !== true ||
      hasTemplateAttrs[0]?.exists !== true ||
      hasTemplates[0]?.exists !== true
    ) {
      return;
    }

    await queryRunner.query(`DELETE FROM "form_template_indicators" WHERE "template_id" = $1`, [
      IDS.template,
    ]);
    await queryRunner.query(`DELETE FROM "form_template_attributes" WHERE "template_id" = $1`, [
      IDS.template,
    ]);
    await queryRunner.query(`DELETE FROM "form_templates" WHERE "id" = $1`, [IDS.template]);
  }
}

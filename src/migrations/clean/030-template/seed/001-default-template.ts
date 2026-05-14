import { MigrationInterface, QueryRunner } from 'typeorm';

const TEMPLATE_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

export class DefaultTemplate1863000003001 implements MigrationInterface {
  name = 'DefaultTemplate1863000003001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const categoryRows = [
      ['kinh_te', 'Kinh tế', 'Nhóm lĩnh vực kinh tế cấp xã', 10],
      ['van_hoa_xa_hoi', 'Văn hóa - Xã hội', 'Nhóm lĩnh vực văn hóa, giáo dục, y tế, an sinh', 20],
      ['hanh_chinh', 'Hành chính', 'Nhóm lĩnh vực hành chính, cải cách thủ tục', 30],
      ['tai_chinh', 'Tài chính', 'Nhóm lĩnh vực ngân sách, thu - chi, kế toán', 40],
      ['dat_dai_moi_truong', 'Đất đai - Môi trường', 'Nhóm lĩnh vực đất đai, tài nguyên, môi trường', 50],
      ['an_ninh_quoc_phong', 'An ninh - Quốc phòng', 'Nhóm lĩnh vực quốc phòng, an ninh, trật tự', 60],
      ['tu_phap', 'Tư pháp', 'Nhóm lĩnh vực hộ tịch, chứng thực, pháp chế', 70],
      ['khieu_nai_tiep_dan', 'Khiếu nại - Tiếp dân', 'Nhóm lĩnh vực tiếp công dân, khiếu nại, phản ánh', 80],
    ] as const;

    for (const [code, name, description, sortOrder] of categoryRows) {
      await queryRunner.query(
        `
        INSERT INTO "field_categories" ("code", "name", "description", "sort_order", "is_active", "created_at")
        VALUES ($1, $2, $3, $4, true, now())
        ON CONFLICT ("code") DO UPDATE SET
          "name" = EXCLUDED."name",
          "description" = EXCLUDED."description",
          "sort_order" = EXCLUDED."sort_order",
          "updated_at" = now()
      `,
        [code, name, description, sortOrder],
      );
    }

    const fieldCategoryIdRows = await queryRunner.query(
      `SELECT id FROM field_categories WHERE code = 'kinh_te' LIMIT 1`,
    );
    if (!fieldCategoryIdRows?.length) return;

    await queryRunner.query(
      `
      INSERT INTO "form_templates" ("id", "code", "name", "template_type", "template_status", "period_type", "field_category_id", "description", "created_by", "created_at")
      VALUES ($1, 'MAU-01', 'Biểu mẫu tổng hợp kinh tế - xã hội', 'AGGREGATE', 'READY', 'THANG', $2, 'Mẫu tham khảo canonical', NULL, now())
      ON CONFLICT ("code") DO UPDATE SET
        "name" = EXCLUDED."name",
        "template_type" = EXCLUDED."template_type",
        "template_status" = EXCLUDED."template_status",
        "period_type" = EXCLUDED."period_type",
        "field_category_id" = EXCLUDED."field_category_id",
        "description" = EXCLUDED."description",
        "created_by" = EXCLUDED."created_by",
        "updated_at" = now()
    `,
      [TEMPLATE_ID, fieldCategoryIdRows[0].id],
    );

    const attrs = [
      ['20000000-0000-0000-0000-000000000001', 'Năm trước', null, 0],
      ['20000000-0000-0000-0000-000000000002', 'KH năm nay', null, 1],
      ['20000000-0000-0000-0000-000000000003', 'Tháng 1', null, 2],
      ['20000000-0000-0000-0000-000000000004', 'Tháng 2', null, 3],
      ['20000000-0000-0000-0000-000000000005', 'Tháng 3', null, 4],
      ['20000000-0000-0000-0000-000000000006', 'Quý I', null, 5],
      ['20000000-0000-0000-0000-000000000007', 'Tổng GTSP', '20000000-0000-0000-0000-000000000006', 0],
    ] as const;

    for (const [id, name, parentId, sortOrder] of attrs) {
      await queryRunner.query(
        `
        INSERT INTO "form_template_attributes" ("id", "template_id", "parent_id", "name", "is_system", "sort_order", "created_at")
        VALUES ($1, $2, $3, $4, false, $5, now())
        ON CONFLICT ("id") DO NOTHING
      `,
        [id, TEMPLATE_ID, parentId, name, sortOrder],
      );
    }

    const indicators = [
      {
        id: '10000000-0000-0000-0000-000000000001',
        displayIndex: 'A',
        code: 'KINH_TE',
        name: 'KINH TẾ',
        parentId: null,
        sortOrder: 0,
      },
      {
        id: '10000000-0000-0000-0000-000000000002',
        displayIndex: 'I',
        code: 'TONG_GTSP',
        name: 'TỔNG GIÁ TRỊ SẢN PHẨM TRÊN ĐỊA BÀN',
        parentId: '10000000-0000-0000-0000-000000000001',
        sortOrder: 1,
      },
      {
        id: '10000000-0000-0000-0000-000000000003',
        displayIndex: '1',
        code: 'TANG_TRUONG_GTSP',
        name: 'Tốc độ tăng tổng giá trị sản phẩm',
        parentId: '10000000-0000-0000-0000-000000000002',
        sortOrder: 2,
      },
      {
        id: '10000000-0000-0000-0000-000000000004',
        displayIndex: '1.1',
        code: 'NONG_LAM_THUY_SAN',
        name: 'Nông lâm thủy sản',
        parentId: '10000000-0000-0000-0000-000000000003',
        sortOrder: 3,
      },
      {
        id: '10000000-0000-0000-0000-000000000005',
        displayIndex: '1.2',
        code: 'CONG_NGHIEP_XAY_DUNG',
        name: 'Công nghiệp - Xây dựng',
        parentId: '10000000-0000-0000-0000-000000000003',
        sortOrder: 4,
      },
    ] as const;

    for (const indicator of indicators) {
      await queryRunner.query(
        `
        INSERT INTO "form_template_indicators" ("id", "template_id", "parent_id", "display_index", "code", "name", "unit", "data_type", "type", "sort_order", "created_at")
        VALUES ($1, $2, $3, $4, $5, $6, NULL, 'number', 'INPUT', $7, now())
        ON CONFLICT ("id") DO NOTHING
      `,
        [
          indicator.id,
          TEMPLATE_ID,
          indicator.parentId,
          indicator.displayIndex,
          indicator.code,
          indicator.name,
          indicator.sortOrder,
        ],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM form_template_indicators WHERE template_id = $1`, [TEMPLATE_ID]);
    await queryRunner.query(`DELETE FROM form_template_attributes WHERE template_id = $1`, [TEMPLATE_ID]);
    await queryRunner.query(`DELETE FROM form_templates WHERE id = $1`, [TEMPLATE_ID]);
    await queryRunner.query(`DELETE FROM field_categories WHERE code IN ('kinh_te','van_hoa_xa_hoi','hanh_chinh','tai_chinh','dat_dai_moi_truong','an_ninh_quoc_phong','tu_phap','khieu_nai_tiep_dan')`);
  }
}

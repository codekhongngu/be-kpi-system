import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedFormFromExcelMau1777345331759 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Tạo Lĩnh vực (Field Category) nếu chưa có
    const fieldCategoryId = 'f1e2d3c4-b5a6-4d7e-8f9a-0b1c2d3e4f5a';
    await queryRunner.query(`
      INSERT INTO "field_categories" ("id", "code", "name", "description", "sort_order", "is_active")
      VALUES ('${fieldCategoryId}', 'KT-XH', 'Kinh tế - Xã hội', 'Lĩnh vực kinh tế xã hội cấp xã', 0, true)
      ON CONFLICT ("code") DO UPDATE SET "name" = EXCLUDED."name";
    `);

    // 2. Tạo Biểu mẫu (Form)
    const formId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
    await queryRunner.query(`
      INSERT INTO "forms" ("id", "code", "name", "field_category_id", "description", "is_active")
      VALUES ('${formId}', 'MAU-01', 'Biểu mẫu tổng hợp kinh tế xã hội', '${fieldCategoryId}', 'Dữ liệu khởi tạo từ file Mẫu.xlsx', true)
      ON CONFLICT ("code") DO UPDATE SET "name" = EXCLUDED."name";
    `);

    // 3. Tạo Thuộc tính (Attributes) - Các cột trong Excel (Hỗ trợ cha-con)
    const attributes = [
      {
        id: '20000000-0000-0000-0000-000000000001',
        name: 'Năm trước',
        parentId: null,
        sortOrder: 0,
      },
      {
        id: '20000000-0000-0000-0000-000000000002',
        name: 'Phương án KH năm nay',
        parentId: null,
        sortOrder: 1,
      },
      {
        id: '20000000-0000-0000-0000-000000000003',
        name: 'KH năm nay',
        parentId: '20000000-0000-0000-0000-000000000002',
        sortOrder: 0,
      },
      {
        id: '20000000-0000-0000-0000-000000000004',
        name: 'Năm nay tăng thêm',
        parentId: '20000000-0000-0000-0000-000000000002',
        sortOrder: 1,
      },
      {
        id: '20000000-0000-0000-0000-000000000005',
        name: 'Tháng 1',
        parentId: null,
        sortOrder: 2,
      },
      {
        id: '20000000-0000-0000-0000-000000000006',
        name: 'Tháng 2',
        parentId: null,
        sortOrder: 3,
      },
      {
        id: '20000000-0000-0000-0000-000000000007',
        name: 'Tháng 3',
        parentId: null,
        sortOrder: 4,
      },
      {
        id: '20000000-0000-0000-0000-000000000008',
        name: 'Quý I',
        parentId: null,
        sortOrder: 5,
      },
      {
        id: '20000000-0000-0000-0000-000000000009',
        name: 'Tổng GTSP',
        parentId: '20000000-0000-0000-0000-000000000008',
        sortOrder: 0,
      },
      {
        id: '20000000-0000-0000-0000-000000000010',
        name: 'Tháng 4',
        parentId: null,
        sortOrder: 6,
      },
      {
        id: '20000000-0000-0000-0000-000000000011',
        name: 'Tháng 5',
        parentId: null,
        sortOrder: 7,
      },
      {
        id: '20000000-0000-0000-0000-000000000012',
        name: 'Tháng 6',
        parentId: null,
        sortOrder: 8,
      },
      {
        id: '20000000-0000-0000-0000-000000000013',
        name: 'Quý II',
        parentId: null,
        sortOrder: 9,
      },
      {
        id: '20000000-0000-0000-0000-000000000014',
        name: 'Tổng GTSP',
        parentId: '20000000-0000-0000-0000-000000000013',
        sortOrder: 0,
      },
      {
        id: '20000000-0000-0000-0000-000000000015',
        name: '6 tháng đầu năm',
        parentId: null,
        sortOrder: 10,
      },
      {
        id: '20000000-0000-0000-0000-000000000016',
        name: 'Tổng GTSP',
        parentId: '20000000-0000-0000-0000-000000000015',
        sortOrder: 0,
      },
      {
        id: '20000000-0000-0000-0000-000000000017',
        name: 'Tháng 7',
        parentId: null,
        sortOrder: 11,
      },
      {
        id: '20000000-0000-0000-0000-000000000018',
        name: 'Tháng 8',
        parentId: null,
        sortOrder: 12,
      },
      {
        id: '20000000-0000-0000-0000-000000000019',
        name: 'Tháng 9',
        parentId: null,
        sortOrder: 13,
      },
      {
        id: '20000000-0000-0000-0000-000000000020',
        name: 'Quý III',
        parentId: null,
        sortOrder: 14,
      },
      {
        id: '20000000-0000-0000-0000-000000000021',
        name: 'Tổng GTSP',
        parentId: '20000000-0000-0000-0000-000000000020',
        sortOrder: 0,
      },
      {
        id: '20000000-0000-0000-0000-000000000022',
        name: '9 tháng đầu năm',
        parentId: null,
        sortOrder: 15,
      },
      {
        id: '20000000-0000-0000-0000-000000000023',
        name: 'Tổng GTSP',
        parentId: '20000000-0000-0000-0000-000000000022',
        sortOrder: 0,
      },
      {
        id: '20000000-0000-0000-0000-000000000024',
        name: 'Tháng 10',
        parentId: null,
        sortOrder: 16,
      },
      {
        id: '20000000-0000-0000-0000-000000000025',
        name: 'Tháng 11',
        parentId: null,
        sortOrder: 17,
      },
      {
        id: '20000000-0000-0000-0000-000000000026',
        name: 'Tháng 12',
        parentId: null,
        sortOrder: 18,
      },
      {
        id: '20000000-0000-0000-0000-000000000027',
        name: 'Quý IV',
        parentId: null,
        sortOrder: 19,
      },
      {
        id: '20000000-0000-0000-0000-000000000028',
        name: 'Tổng GTSP',
        parentId: '20000000-0000-0000-0000-000000000027',
        sortOrder: 0,
      },
      {
        id: '20000000-0000-0000-0000-000000000029',
        name: '6 tháng cuối năm',
        parentId: null,
        sortOrder: 20,
      },
      {
        id: '20000000-0000-0000-0000-000000000030',
        name: 'Tổng GTSP',
        parentId: '20000000-0000-0000-0000-000000000029',
        sortOrder: 0,
      },
      {
        id: '20000000-0000-0000-0000-000000000031',
        name: 'Ghi chú',
        parentId: null,
        sortOrder: 21,
      },
    ];

    for (const attr of attributes) {
      await queryRunner.query(`
        INSERT INTO "form_attributes" ("id", "form_id", "parent_id", "name", "data_type", "is_required", "is_visible", "is_system", "sort_order")
        VALUES ('${attr.id}', '${formId}', ${attr.parentId ? `'${attr.parentId}'` : 'NULL'}, '${attr.name}', 'number', false, true, false, ${attr.sortOrder})
      `);
    }

    // 4. Tạo Chỉ tiêu (Indicators) - Các hàng trong Excel (Hỗ trợ cha-con)
    const indicators = [
      {
        id: '10000000-0000-0000-0000-000000000001',
        code: 'A',
        displayIndex: null,
        name: 'KINH TẾ',
        parentId: null,
        sortOrder: 0,
      },
      {
        id: '10000000-0000-0000-0000-000000000002',
        code: 'I',
        displayIndex: null,
        name: 'TỔNG GIÁ TRỊ SẢN PHẨM TRÊN ĐỊA BÀN',
        parentId: '10000000-0000-0000-0000-000000000001',
        sortOrder: 0,
      },
      {
        id: '10000000-0000-0000-0000-000000000003',
        code: '1',
        displayIndex: '1',
        name: 'Tốc độ tăng Tổng giá trị sản phẩm trên địa bàn cấp xã',
        parentId: '10000000-0000-0000-0000-000000000002',
        sortOrder: 0,
      },
      {
        id: '10000000-0000-0000-0000-000000000004',
        code: '1.1',
        displayIndex: '1.1',
        name: 'Nông lâm thủy sản',
        parentId: '10000000-0000-0000-0000-000000000003',
        sortOrder: 0,
      },
      {
        id: '10000000-0000-0000-0000-000000000005',
        code: '1.2',
        displayIndex: '1.2',
        name: 'Công nghiệp - Xây dựng',
        parentId: '10000000-0000-0000-0000-000000000003',
        sortOrder: 1,
      },
      {
        id: '10000000-0000-0000-0000-000000000006',
        code: '2',
        displayIndex: '2',
        name: 'Quy mô Tổng giá trị sản phẩm trên địa bàn cấp xã theo giá so sánh',
        parentId: '10000000-0000-0000-0000-000000000002',
        sortOrder: 1,
      },
      {
        id: '10000000-0000-0000-0000-000000000007',
        code: '2.1',
        displayIndex: '2.1',
        name: 'Nông lâm thủy sản',
        parentId: '10000000-0000-0000-0000-000000000006',
        sortOrder: 0,
      },
    ];

    const displayIndexColumns = await queryRunner.query(
      `
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'form_indicators'
          AND column_name = 'display_index'
        LIMIT 1
      `,
    );
    const hasDisplayIndex = Array.isArray(displayIndexColumns) && displayIndexColumns.length > 0;

    for (const ind of indicators) {
      if (hasDisplayIndex) {
        await queryRunner.query(`
          INSERT INTO "form_indicators" ("id", "form_id", "parent_id", "display_index", "code", "name", "data_type", "is_required", "is_calculated", "is_active", "sort_order")
          VALUES ('${ind.id}', '${formId}', ${ind.parentId ? `'${ind.parentId}'` : 'NULL'}, ${ind.displayIndex ? `'${ind.displayIndex}'` : 'NULL'}, '${ind.code}', '${ind.name}', 'number', true, false, true, ${ind.sortOrder})
        `);
      } else {
        await queryRunner.query(`
          INSERT INTO "form_indicators" ("id", "form_id", "parent_id", "code", "name", "data_type", "is_required", "is_calculated", "is_active", "sort_order")
          VALUES ('${ind.id}', '${formId}', ${ind.parentId ? `'${ind.parentId}'` : 'NULL'}, '${ind.code}', '${ind.name}', 'number', true, false, true, ${ind.sortOrder})
        `);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const formId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
    await queryRunner.query(
      `DELETE FROM "form_indicators" WHERE "form_id" = '${formId}'`,
    );
    await queryRunner.query(
      `DELETE FROM "form_attributes" WHERE "form_id" = '${formId}'`,
    );
    await queryRunner.query(`DELETE FROM "forms" WHERE "id" = '${formId}'`);
  }
}

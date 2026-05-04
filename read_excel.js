const xlsx = require('node-xlsx');
const fs = require('fs');

const filePath = 'D:\\www\\Hệ thống Dữ liệu điều hành nội bộ cấp Xã\\Biêu mẫu được cung cấp\\Mẫu.xlsx';

try {
  const workSheetsFromFile = xlsx.parse(filePath);
  workSheetsFromFile.forEach((sheet) => {
    console.log('--- Sheet:', sheet.name, '---');
    sheet.data.slice(0, 20).forEach((row, index) => {
      console.log(`Row ${index}:`, JSON.stringify(row));
    });
  });
} catch (error) {
  console.error('Error reading Excel file:', error);
}

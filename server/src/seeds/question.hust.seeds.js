const mongoose = require('mongoose');
const { Question } = require('../models');

const HUST_SCHOOL_ID = null; // Will be fetched from DB

const hustQuestions = [
  // Toán học - Cơ bản
  {
    content: 'Tính đạo hàm của hàm số f(x) = x³ + 2x² - 5x + 1',
    type: 'single_choice',
    options: [
      { id: 'A', content: '3x² + 4x - 5', isCorrect: true, order: 0 },
      { id: 'B', content: '3x² + 2x - 5', isCorrect: false, order: 1 },
      { id: 'C', content: 'x² + 4x - 5', isCorrect: false, order: 2 },
      { id: 'D', content: '3x³ + 4x - 5', isCorrect: false, order: 3 },
    ],
    correctAnswer: 'A',
    difficulty: 'easy',
    source: 'manual',
    tags: ['Toán học', 'Giải tích', 'Đạo hàm'],
    isApproved: true,
    score: 1,
    usageCount: 0,
  },
  {
    content: 'Nghiệm của phương trình 2ˣ = 16 là:',
    type: 'single_choice',
    options: [
      { id: 'A', content: 'x = 3', isCorrect: false, order: 0 },
      { id: 'B', content: 'x = 4', isCorrect: true, order: 1 },
      { id: 'C', content: 'x = 5', isCorrect: false, order: 2 },
      { id: 'D', content: 'x = 8', isCorrect: false, order: 3 },
    ],
    correctAnswer: 'B',
    difficulty: 'easy',
    source: 'manual',
    tags: ['Toán học', 'Phương trình', 'Hàm mũ'],
    isApproved: true,
    score: 1,
    usageCount: 0,
  },
  {
    content: 'Tích phân ∫x²dx bằng:',
    type: 'single_choice',
    options: [
      { id: 'A', content: 'x³ + C', isCorrect: false, order: 0 },
      { id: 'B', content: 'x³/3 + C', isCorrect: true, order: 1 },
      { id: 'C', content: '2x + C', isCorrect: false, order: 2 },
      { id: 'D', content: 'x²/2 + C', isCorrect: false, order: 3 },
    ],
    correctAnswer: 'B',
    difficulty: 'easy',
    source: 'manual',
    tags: ['Toán học', 'Tích phân'],
    isApproved: true,
    score: 1,
    usageCount: 0,
  },
  // Vật lý - Cơ học
  {
    content: 'Một vật có khối lượng 2kg chuyển động với vận tốc 10m/s. Động năng của vật là:',
    type: 'single_choice',
    options: [
      { id: 'A', content: '50J', isCorrect: false, order: 0 },
      { id: 'B', content: '100J', isCorrect: true, order: 1 },
      { id: 'C', content: '200J', isCorrect: false, order: 2 },
      { id: 'D', content: '20J', isCorrect: false, order: 3 },
    ],
    correctAnswer: 'B',
    difficulty: 'medium',
    source: 'manual',
    tags: ['Vật lý', 'Cơ học', 'Động năng'],
    isApproved: true,
    score: 1,
    usageCount: 0,
  },
  {
    content: 'Lực hấp dẫn giữa hai vật phụ thuộc vào:',
    type: 'single_choice',
    options: [
      { id: 'A', content: 'Khối lượng của hai vật và khoảng cách', isCorrect: true, order: 0 },
      { id: 'B', content: 'Chỉ khối lượng của hai vật', isCorrect: false, order: 1 },
      { id: 'C', content: 'Chỉ khoảng cách giữa hai vật', isCorrect: false, order: 2 },
      { id: 'D', content: 'Thể tích của hai vật', isCorrect: false, order: 3 },
    ],
    correctAnswer: 'A',
    difficulty: 'medium',
    source: 'manual',
    tags: ['Vật lý', 'Hấp dẫn'],
    isApproved: true,
    score: 1,
    usageCount: 0,
  },
  {
    content: 'Chu kỳ dao động của con lắc đơn được tính bằng công thức nào?',
    type: 'single_choice',
    options: [
      { id: 'A', content: 'T = 2π√(l/g)', isCorrect: true, order: 0 },
      { id: 'B', content: 'T = √(l/g)', isCorrect: false, order: 1 },
      { id: 'C', content: 'T = 2π√(g/l)', isCorrect: false, order: 2 },
      { id: 'D', content: 'T = π√(l/g)', isCorrect: false, order: 3 },
    ],
    correctAnswer: 'A',
    difficulty: 'medium',
    source: 'manual',
    tags: ['Vật lý', 'Dao động', 'Con lắc'],
    isApproved: true,
    score: 1,
    usageCount: 0,
  },
  // Hóa học
  {
    content: 'Số hiệu nguyên tử của nguyên tố X có cấu hình electron là [Ar]4s²3d⁶ là:',
    type: 'single_choice',
    options: [
      { id: 'A', content: '24', isCorrect: false, order: 0 },
      { id: 'B', content: '26', isCorrect: true, order: 1 },
      { id: 'C', content: '28', isCorrect: false, order: 2 },
      { id: 'D', content: '30', isCorrect: false, order: 3 },
    ],
    correctAnswer: 'B',
    difficulty: 'hard',
    source: 'manual',
    tags: ['Hóa học', 'Nguyên tử', 'Cấu hình electron'],
    isApproved: true,
    score: 1,
    usageCount: 0,
  },
  {
    content: 'Phản ứng nào sau đây là phản ứng oxi hóa - khử?',
    type: 'single_choice',
    options: [
      { id: 'A', content: 'NaOH + HCl → NaCl + H₂O', isCorrect: false, order: 0 },
      { id: 'B', content: 'Fe + CuSO₄ → FeSO₄ + Cu', isCorrect: true, order: 1 },
      { id: 'C', content: 'CaO + H₂O → Ca(OH)₂', isCorrect: false, order: 2 },
      { id: 'D', content: 'NH₃ + HCl → NH₄Cl', isCorrect: false, order: 3 },
    ],
    correctAnswer: 'B',
    difficulty: 'medium',
    source: 'manual',
    tags: ['Hóa học', 'Phản ứng oxi hóa khử'],
    isApproved: true,
    score: 1,
    usageCount: 0,
  },
  {
    content: 'Để điều chế etilen trong phòng thí nghiệm, người ta có thể dùng phương pháp nào?',
    type: 'single_choice',
    options: [
      { id: 'A', content: 'Crackinh dầu mỏ', isCorrect: false, order: 0 },
      { id: 'B', content: 'Đề hiđrat hóa rượu etylic bằng H₂SO₄ đặc ở 170°C', isCorrect: true, order: 1 },
      { id: 'C', content: 'Tách hiđro từ etan', isCorrect: false, order: 2 },
      { id: 'D', content: 'Trùng hợp metylen', isCorrect: false, order: 3 },
    ],
    correctAnswer: 'B',
    difficulty: 'hard',
    source: 'manual',
    tags: ['Hóa học', 'Hữu cơ', 'Etilen'],
    isApproved: true,
    score: 1,
    usageCount: 0,
  },
  // Kỹ thuật điện
  {
    content: 'Công suất tiêu thụ trên điện trở R khi có dòng điện I chạy qua được tính bằng:',
    type: 'single_choice',
    options: [
      { id: 'A', content: 'P = I²R', isCorrect: true, order: 0 },
      { id: 'B', content: 'P = I/R²', isCorrect: false, order: 1 },
      { id: 'C', content: 'P = IR', isCorrect: false, order: 2 },
      { id: 'D', content: 'P = I²/R', isCorrect: false, order: 3 },
    ],
    correctAnswer: 'A',
    difficulty: 'easy',
    source: 'manual',
    tags: ['Kỹ thuật điện', 'Công suất'],
    isApproved: true,
    score: 1,
    usageCount: 0,
  },
  {
    content: 'Định luật Ohm cho đoạn mạch phát biểu: Hiệu điện thế giữa hai đầu vật dẫn:',
    type: 'single_choice',
    options: [
      { id: 'A', content: 'Tỉ lệ thuận với cường độ dòng điện', isCorrect: true, order: 0 },
      { id: 'B', content: 'Tỉ lệ nghịch với cường độ dòng điện', isCorrect: false, order: 1 },
      { id: 'C', content: 'Không phụ thuộc vào cường độ dòng điện', isCorrect: false, order: 2 },
      { id: 'D', content: 'Tỉ lệ thuận với bình phương cường độ dòng điện', isCorrect: false, order: 3 },
    ],
    correctAnswer: 'A',
    difficulty: 'easy',
    source: 'manual',
    tags: ['Kỹ thuật điện', 'Định luật Ohm'],
    isApproved: true,
    score: 1,
    usageCount: 0,
  },
  {
    content: 'Trong mạch điện xoay chiều RLC nối tiếp, cộng hưởng xảy ra khi:',
    type: 'single_choice',
    options: [
      { id: 'A', content: 'ZL = ZC', isCorrect: true, order: 0 },
      { id: 'B', content: 'ZL > ZC', isCorrect: false, order: 1 },
      { id: 'C', content: 'ZL < ZC', isCorrect: false, order: 2 },
      { id: 'D', content: 'ZL = R', isCorrect: false, order: 3 },
    ],
    correctAnswer: 'A',
    difficulty: 'medium',
    source: 'manual',
    tags: ['Kỹ thuật điện', 'Mạch xoay chiều', 'Cộng hưởng'],
    isApproved: true,
    score: 1,
    usageCount: 0,
  },
  // Lập trình C
  {
    content: 'Kết quả của câu lệnh printf("%d", 5 + 3 * 2) là:',
    type: 'single_choice',
    options: [
      { id: 'A', content: '16', isCorrect: false, order: 0 },
      { id: 'B', content: '11', isCorrect: true, order: 1 },
      { id: 'C', content: '13', isCorrect: false, order: 2 },
      { id: 'D', content: '10', isCorrect: false, order: 3 },
    ],
    correctAnswer: 'B',
    difficulty: 'easy',
    source: 'manual',
    tags: ['Lập trình', 'C/C++', 'Toán tử'],
    isApproved: true,
    score: 1,
    usageCount: 0,
  },
  {
    content: 'Trong ngôn ngữ C, con trỏ (pointer) là:',
    type: 'single_choice',
    options: [
      { id: 'A', content: 'Một biến lưu trữ địa chỉ của biến khác', isCorrect: true, order: 0 },
      { id: 'B', content: 'Một kiểu dữ liệu số nguyên', isCorrect: false, order: 1 },
      { id: 'C', content: 'Một hàm đặc biệt', isCorrect: false, order: 2 },
      { id: 'D', content: 'Một từ khóa để khai báo mảng', isCorrect: false, order: 3 },
    ],
    correctAnswer: 'A',
    difficulty: 'medium',
    source: 'manual',
    tags: ['Lập trình', 'C/C++', 'Con trỏ'],
    isApproved: true,
    score: 1,
    usageCount: 0,
  },
  {
    content: 'Để cấp phát động bộ nhớ cho 10 số nguyên trong C, ta dùng:',
    type: 'single_choice',
    options: [
      { id: 'A', content: 'malloc(10 * sizeof(int))', isCorrect: true, order: 0 },
      { id: 'B', content: 'malloc(10 * int)', isCorrect: false, order: 1 },
      { id: 'C', content: 'alloc(10 * sizeof(int))', isCorrect: false, order: 2 },
      { id: 'D', content: 'new int[10]', isCorrect: false, order: 3 },
    ],
    correctAnswer: 'A',
    difficulty: 'medium',
    source: 'manual',
    tags: ['Lập trình', 'C/C++', 'Cấp phát bộ nhớ'],
    isApproved: true,
    score: 1,
    usageCount: 0,
  },
  // Cơ sở dữ liệu
  {
    content: 'Khóa chính (Primary Key) trong cơ sở dữ liệu có đặc điểm:',
    type: 'single_choice',
    options: [
      { id: 'A', content: 'Giá trị duy nhất và không NULL', isCorrect: true, order: 0 },
      { id: 'B', content: 'Có thể trùng lặp', isCorrect: false, order: 1 },
      { id: 'C', content: 'Cho phép NULL', isCorrect: false, order: 2 },
      { id: 'D', content: 'Có thể có nhiều trong một bảng', isCorrect: false, order: 3 },
    ],
    correctAnswer: 'A',
    difficulty: 'easy',
    source: 'manual',
    tags: ['Cơ sở dữ liệu', 'SQL', 'Khóa chính'],
    isApproved: true,
    score: 1,
    usageCount: 0,
  },
  {
    content: 'Câu lệnh SQL nào dùng để trích xuất dữ liệu từ bảng?',
    type: 'single_choice',
    options: [
      { id: 'A', content: 'SELECT', isCorrect: true, order: 0 },
      { id: 'B', content: 'EXTRACT', isCorrect: false, order: 1 },
      { id: 'C', content: 'GET', isCorrect: false, order: 2 },
      { id: 'D', content: 'FETCH', isCorrect: false, order: 3 },
    ],
    correctAnswer: 'A',
    difficulty: 'easy',
    source: 'manual',
    tags: ['Cơ sở dữ liệu', 'SQL'],
    isApproved: true,
    score: 1,
    usageCount: 0,
  },
  {
    content: 'Trong SQL, để loại bỏ các bản ghi trùng lặp trong kết quả truy vấn, ta dùng:',
    type: 'single_choice',
    options: [
      { id: 'A', content: 'DISTINCT', isCorrect: true, order: 0 },
      { id: 'B', content: 'UNIQUE', isCorrect: false, order: 1 },
      { id: 'C', content: 'GROUP BY', isCorrect: false, order: 2 },
      { id: 'D', content: 'ORDER BY', isCorrect: false, order: 3 },
    ],
    correctAnswer: 'A',
    difficulty: 'medium',
    source: 'manual',
    tags: ['Cơ sở dữ liệu', 'SQL'],
    isApproved: true,
    score: 1,
    usageCount: 0,
  },
  // Mạng máy tính
  {
    content: 'Giao thức nào được sử dụng để truyền file trên mạng?',
    type: 'single_choice',
    options: [
      { id: 'A', content: 'FTP', isCorrect: true, order: 0 },
      { id: 'B', content: 'HTTP', isCorrect: false, order: 1 },
      { id: 'C', content: 'SMTP', isCorrect: false, order: 2 },
      { id: 'D', content: 'DNS', isCorrect: false, order: 3 },
    ],
    correctAnswer: 'A',
    difficulty: 'easy',
    source: 'manual',
    tags: ['Mạng máy tính', 'Giao thức', 'FTP'],
    isApproved: true,
    score: 1,
    usageCount: 0,
  },
  {
    content: 'Địa chỉ IP version 4 (IPv4) có độ dài bao nhiêu bit?',
    type: 'single_choice',
    options: [
      { id: 'A', content: '32 bit', isCorrect: true, order: 0 },
      { id: 'B', content: '64 bit', isCorrect: false, order: 1 },
      { id: 'C', content: '128 bit', isCorrect: false, order: 2 },
      { id: 'D', content: '16 bit', isCorrect: false, order: 3 },
    ],
    correctAnswer: 'A',
    difficulty: 'easy',
    source: 'manual',
    tags: ['Mạng máy tính', 'IP', 'IPv4'],
    isApproved: true,
    score: 1,
    usageCount: 0,
  },
  {
    content: 'Tầng nào trong mô hình OSI chịu trách nhiệm mã hóa dữ liệu?',
    type: 'single_choice',
    options: [
      { id: 'A', content: 'Tầng trình diễn (Presentation)', isCorrect: true, order: 0 },
      { id: 'B', content: 'Tầng ứng dụng (Application)', isCorrect: false, order: 1 },
      { id: 'C', content: 'Tầng phiên (Session)', isCorrect: false, order: 2 },
      { id: 'D', content: 'Tầng vận chuyển (Transport)', isCorrect: false, order: 3 },
    ],
    correctAnswer: 'A',
    difficulty: 'medium',
    source: 'manual',
    tags: ['Mạng máy tính', 'OSI'],
    isApproved: true,
    score: 1,
    usageCount: 0,
  },
];

async function seedHustQuestions() {
  console.log('Starting HUST (BKHN) questions seeding...');

  // Find HUST school
  const School = require('../models/school.model');
  const hustSchool = await School.findOne({ code: 'HUST' });

  if (!hustSchool) {
    console.log('  HUST school not found! Please run school seeds first.');
    return;
  }

  console.log(`  Found HUST school: ${hustSchool.name} (${hustSchool._id})`);

  let created = 0;
  let skipped = 0;

  for (const questionData of hustQuestions) {
    // Check if similar question exists
    const existing = await Question.findOne({
      schoolId: hustSchool._id,
      content: questionData.content,
    });

    if (existing) {
      console.log(`  Question already exists, skipping: "${questionData.content.substring(0, 50)}..."`);
      skipped++;
      continue;
    }

    // Add schoolId
    const question = new Question({
      ...questionData,
      schoolId: hustSchool._id,
    });

    await question.save();
    created++;
    console.log(`  Created question: "${questionData.content.substring(0, 50)}..."`);
  }

  console.log(`\nHUST questions seeding completed! Created: ${created}, Skipped: ${skipped}`);
}

module.exports = seedHustQuestions;

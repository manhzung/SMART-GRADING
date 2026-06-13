const { School } = require('../models');

const seedSchools = [
  {
    name: 'Trường Đại học Bách Khoa Hà Nội',
    code: 'HUST',
    address: {
      street: 'Số 1 Đại Cồ Việt',
      ward: 'Quận Hai Bà Trưng',
      district: 'Hai Bà Trưng',
      city: 'Hà Nội',
    },
    phone: '024 3869 2081',
    email: 'contact@hust.edu.vn',
    website: 'https://hust.edu.vn',
    principalName: 'TS. Trần Đình Đức',
    schoolType: 'university',
    gradeLevels: [],
    settings: {
      maxScore: 10,
      passingScore: 5,
      gradingScale: {
        excellent: 8.5,
        good: 7.0,
        average: 5.0,
        poor: 0,
      },
    },
    isActive: true,
  },
  {
    name: 'Trường Đại học Kinh tế Quốc dân',
    code: 'NEU',
    address: {
      street: 'Số 207 Đường Giải Phóng',
      ward: 'Phương Liệt',
      district: 'Thanh Xuân',
      city: 'Hà Nội',
    },
    phone: '024 3628 0232',
    email: 'contact@neu.edu.vn',
    website: 'https://neu.edu.vn',
    principalName: 'PGS.TS. Phạm Hùng Tiến',
    schoolType: 'university',
    gradeLevels: [],
    settings: {
      maxScore: 10,
      passingScore: 5,
      gradingScale: {
        excellent: 8.5,
        good: 7.0,
        average: 5.0,
        poor: 0,
      },
    },
    isActive: true,
  },
  {
    name: 'Trường Đại học Quốc gia Hà Nội',
    code: 'VNU',
    address: {
      street: 'Số 19 Lê Thánh Tông',
      ward: 'Phan Chu Trinh',
      district: 'Hoàn Kiếm',
      city: 'Hà Nội',
    },
    phone: '024 3855 0929',
    email: 'contact@vnu.edu.vn',
    website: 'https://vnu.edu.vn',
    principalName: 'GS.TS. Nguyễn Kim Sơn',
    schoolType: 'university',
    gradeLevels: [],
    settings: {
      maxScore: 10,
      passingScore: 5,
      gradingScale: {
        excellent: 8.5,
        good: 7.0,
        average: 5.0,
        poor: 0,
      },
    },
    isActive: true,
  },
  {
    name: 'Trường THPT Chu Văn An',
    code: 'CVA',
    address: {
      street: 'Số 12 Tôn Đản',
      ward: 'Trung Liệt',
      district: 'Đống Đa',
      city: 'Hà Nội',
    },
    phone: '024 3825 1234',
    email: 'contact@chuvanan.edu.vn',
    website: '',
    principalName: 'ThS. Nguyễn Văn Minh',
    schoolType: 'high',
    gradeLevels: [10, 11, 12],
    settings: {
      maxScore: 10,
      passingScore: 5,
      gradingScale: {
        excellent: 8.5,
        good: 7.0,
        average: 5.0,
        poor: 0,
      },
    },
    isActive: true,
  },
];

async function seedSchoolsData() {
  console.log('Starting schools seeding...');

  for (const schoolData of seedSchools) {
    const existing = await School.findOne({ code: schoolData.code });
    if (existing) {
      console.log(`  School "${schoolData.code}" already exists, skipping.`);
      continue;
    }
    const school = new School(schoolData);
    await school.save();
    console.log(`  Created school: ${schoolData.name} (${schoolData.code})`);
  }

  console.log('Schools seeding completed!');
}

module.exports = seedSchoolsData;

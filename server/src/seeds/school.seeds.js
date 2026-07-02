const { School } = require('../models');

// 12 trường tiêu biểu trên toàn quốc (3 ĐH Hà Nội, 5 ĐH TP.HCM, 1 THPT Hà Nội,
// 1 ĐH Đà Nẵng, 1 ĐH Huế, 1 ĐH Cần Thơ). Dùng thông tin thực tế để dễ nhận biết
// khi demo. Logic idempotent ở seedSchoolsData() — chạy nhiều lần không lỗi.
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
  {
    name: 'Trường Đại học Bách khoa — Đại học Quốc gia TP.HCM',
    code: 'HCMUT',
    address: {
      street: 'Số 268 Lý Thường Kiệt',
      ward: 'Phường 14',
      district: 'Quận 10',
      city: 'TP. Hồ Chí Minh',
    },
    phone: '028 3863 7256',
    email: 'contact@hcmut.edu.vn',
    website: 'https://hcmut.edu.vn',
    principalName: 'GS.TS. Mai Thanh Phong',
    schoolType: 'university',
    gradeLevels: [],
    settings: {
      maxScore: 10,
      passingScore: 5,
      gradingScale: { excellent: 8.5, good: 7.0, average: 5.0, poor: 0 },
    },
    isActive: true,
  },
  {
    name: 'Trường Đại học Quốc gia TP.HCM',
    code: 'VNUHCM',
    address: {
      street: 'Linh Trung',
      ward: 'Phường Linh Trung',
      district: 'TP. Thủ Đức',
      city: 'TP. Hồ Chí Minh',
    },
    phone: '028 3724 4270',
    email: 'contact@vnuhcm.edu.vn',
    website: 'https://vnuhcm.edu.vn',
    principalName: 'GS.TS. Nguyễn Thị Thanh Mai',
    schoolType: 'university',
    gradeLevels: [],
    settings: {
      maxScore: 10,
      passingScore: 5,
      gradingScale: { excellent: 8.5, good: 7.0, average: 5.0, poor: 0 },
    },
    isActive: true,
  },
  {
    name: 'Trường Đại học Sư phạm Hà Nội',
    code: 'HNUE',
    address: {
      street: 'Số 136 Xuân Thủy',
      ward: 'Dịch Vọng Hậu',
      district: 'Cầu Giấy',
      city: 'Hà Nội',
    },
    phone: '024 3754 7823',
    email: 'contact@hnue.edu.vn',
    website: 'https://hnue.edu.vn',
    principalName: 'PGS.TS. Nguyễn Đức Sơn',
    schoolType: 'university',
    gradeLevels: [],
    settings: {
      maxScore: 10,
      passingScore: 5,
      gradingScale: { excellent: 8.5, good: 7.0, average: 5.0, poor: 0 },
    },
    isActive: true,
  },
  {
    name: 'Trường Đại học Ngoại thương',
    code: 'FTU',
    address: {
      street: 'Số 91 Chùa Láng',
      ward: 'Láng Thượng',
      district: 'Đống Đa',
      city: 'Hà Nội',
    },
    phone: '024 3834 7331',
    email: 'contact@ftu.edu.vn',
    website: 'https://ftu.edu.vn',
    principalName: 'PGS.TS. Phạm Thu Hương',
    schoolType: 'university',
    gradeLevels: [],
    settings: {
      maxScore: 10,
      passingScore: 5,
      gradingScale: { excellent: 8.5, good: 7.0, average: 5.0, poor: 0 },
    },
    isActive: true,
  },
  {
    name: 'Trường Đại học Công nghệ Kỹ thuật TP.HCM',
    code: 'HCMUTE',
    address: {
      street: 'Số 1 Võ Văn Ngân',
      ward: 'Phường Thủ Đức',
      district: 'TP. Thủ Đức',
      city: 'TP. Hồ Chí Minh',
    },
    phone: '028 3896 1330',
    email: 'contact@hcmute.edu.vn',
    website: 'https://hcmute.edu.vn',
    principalName: 'PGS.TS. Lê Hiếu Giang',
    schoolType: 'university',
    gradeLevels: [],
    settings: {
      maxScore: 10,
      passingScore: 5,
      gradingScale: { excellent: 8.5, good: 7.0, average: 5.0, poor: 0 },
    },
    isActive: true,
  },
  {
    name: 'Trường Đại học Đà Nẵng',
    code: 'DND',
    address: {
      street: 'Số 41 Lê Duẩn',
      ward: 'Thạch Thang',
      district: 'Hải Châu',
      city: 'Đà Nẵng',
    },
    phone: '0236 3833 869',
    email: 'contact@udn.vn',
    website: 'https://udn.vn',
    principalName: 'PGS.TS. Nguyễn Ngọc Vũ',
    schoolType: 'university',
    gradeLevels: [],
    settings: {
      maxScore: 10,
      passingScore: 5,
      gradingScale: { excellent: 8.5, good: 7.0, average: 5.0, poor: 0 },
    },
    isActive: true,
  },
  {
    name: 'Trường Đại học Huế',
    code: 'HUE',
    address: {
      street: 'Số 3 Lê Lợi',
      ward: 'Vĩnh Ninh',
      district: 'TP. Huế',
      city: 'Thừa Thiên Huế',
    },
    phone: '0234 3822 490',
    email: 'contact@hueuni.edu.vn',
    website: 'https://hueuni.edu.vn',
    principalName: 'GS.TS. Nguyễn Vũ Quốc Huy',
    schoolType: 'university',
    gradeLevels: [],
    settings: {
      maxScore: 10,
      passingScore: 5,
      gradingScale: { excellent: 8.5, good: 7.0, average: 5.0, poor: 0 },
    },
    isActive: true,
  },
  {
    name: 'Trường Đại học Cần Thơ',
    code: 'CTU',
    address: {
      street: 'Khu II, đường 3/2',
      ward: 'Xuân Khánh',
      district: 'Quận Ninh Kiều',
      city: 'TP. Cần Thơ',
    },
    phone: '0292 3872 221',
    email: 'contact@ctu.edu.vn',
    website: 'https://ctu.edu.vn',
    principalName: 'PGS.TS. Trần Trung Tính',
    schoolType: 'university',
    gradeLevels: [],
    settings: {
      maxScore: 10,
      passingScore: 5,
      gradingScale: { excellent: 8.5, good: 7.0, average: 5.0, poor: 0 },
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

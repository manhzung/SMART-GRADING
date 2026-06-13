const mongoose = require('mongoose');
const { School } = require('../../src/models');

const schoolIdA = mongoose.Types.ObjectId();
const schoolIdB = mongoose.Types.ObjectId();

const schoolA = {
  _id: schoolIdA,
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
};

const schoolB = {
  _id: schoolIdB,
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
};

const insertSchools = async (schools) => {
  await School.insertMany(schools);
};

module.exports = {
  schoolA,
  schoolB,
  schoolIdA,
  schoolIdB,
  insertSchools,
};

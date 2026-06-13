const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config/config');
const { User, School, Subject, Class } = require('../models');

const seedSubjects = async () => {
  console.log('Starting subjects seeding...');
  const school = await School.findOne({ code: 'CVA' });
  if (!school) {
    console.log('  No school found, skipping subjects.');
    return [];
  }

  const subjects = [
    { name: 'Toán', code: 'MATH', color: '#3B82F6' },
    { name: 'Vật Lý', code: 'PHYS', color: '#10B981' },
    { name: 'Hóa Học', code: 'CHEM', color: '#8B5CF6' },
    { name: 'Ngữ Văn', code: 'LIT', color: '#EF4444' },
    { name: 'Tiếng Anh', code: 'ENG', color: '#F59E0B' },
    { name: 'Lịch Sử', code: 'HIST', color: '#6366F1' },
    { name: 'Địa Lý', code: 'GEO', color: '#14B8A6' },
    { name: 'Sinh Học', code: 'BIO', color: '#F97316' },
  ];

  const created = [];
  for (const s of subjects) {
    const existing = await Subject.findOne({ code: s.code, schoolId: school._id });
    if (existing) {
      console.log(`  Subject "${s.code}" already exists, skipping.`);
      created.push(existing);
    } else {
      const sub = await Subject.create({ ...s, schoolId: school._id });
      console.log(`  Created subject: ${s.name} (${s.code})`);
      created.push(sub);
    }
  }
  console.log('Subjects seeding completed!');
  return created;
};

const seedClasses = async (school, subjects) => {
  console.log('Starting classes seeding...');

  const teacherData = [
    { name: 'Nguyễn Thị Mai Hương', email: 'huong.nguyen@smartgrading.edu.vn', subject: 'MATH' },
    { name: 'Trần Văn Minh', email: 'minh.tran@smartgrading.edu.vn', subject: 'PHYS' },
    { name: 'Phạm Thị Lan', email: 'lan.pham@smartgrading.edu.vn', subject: 'CHEM' },
    { name: 'Lê Hoàng Nam', email: 'nam.le@smartgrading.edu.vn', subject: 'LIT' },
    { name: 'Đặng Minh Tuấn', email: 'tuan.dang@smartgrading.edu.vn', subject: 'ENG' },
  ];

  const teachers = [];
  for (const t of teacherData) {
    let user = await User.findOne({ email: t.email });
    if (!user) {
      const passwordHash = await bcrypt.hash('teacher123', 8);
      user = await User.create({
        name: t.name,
        email: t.email,
        password: passwordHash,
        role: 'teacher',
        isEmailVerified: true,
        schoolId: school._id,
      });
      console.log(`  Created teacher: ${t.name}`);
    } else {
      console.log(`  Teacher "${t.email}" already exists, skipping.`);
    }
    teachers.push(user);
  }

  const classData = [
    { name: '10A1', code: '10A1_2025', gradeLevel: 10, teacher: teachers[0] },
    { name: '10A2', code: '10A2_2025', gradeLevel: 10, teacher: teachers[0] },
    { name: '11A1', code: '11A1_2025', gradeLevel: 11, teacher: teachers[1] },
    { name: '11A2', code: '11A2_2025', gradeLevel: 11, teacher: teachers[2] },
    { name: '12A1', code: '12A1_2025', gradeLevel: 12, teacher: teachers[3] },
  ];

  const mathSubject = subjects.find((s) => s.code === 'MATH');

  const created = [];
  for (const c of classData) {
    const existing = await Class.findOne({ code: c.code, schoolId: school._id });
    if (existing) {
      console.log(`  Class "${c.code}" already exists, skipping.`);
      created.push(existing);
    } else {
      const cls = await Class.create({
        name: c.name,
        code: c.code,
        gradeLevel: c.gradeLevel,
        academicYear: '2025-2026',
        homeroomTeacherId: c.teacher._id,
        schoolId: school._id,
        studentIds: [],
        subjectTeachers: subjects.slice(0, 4).map((s) => ({
          subjectId: s._id,
          teacherId: teachers[Math.floor(Math.random() * teachers.length)]._id,
        })),
        isActive: true,
      });
      console.log(`  Created class: ${c.name} (${c.code}), grade ${c.gradeLevel}`);
      created.push(cls);
    }
  }
  console.log('Classes seeding completed!');
  return { classes: created, teachers };
};

const seedStudents = async (school, classes) => {
  console.log('Starting students seeding...');

  const vietnameseNames = [
    'Nguyễn Văn An', 'Trần Thị Bình', 'Lê Hoàng Nam', 'Phạm Minh Tuấn',
    'Đặng Thị Hương', 'Bùi Văn Đức', 'Hoàng Thị Mai', 'Vũ Văn Khoa',
    'Đỗ Thị Lan', 'Ngô Văn Hùng', 'Trịnh Thị Ngọc', 'Phan Văn Lâm',
    'Cao Thị Thu', 'Đinh Văn Hải', 'Bạch Thị Yến', 'Hà Văn Sơn',
    'Đinh Thị Linh', 'Lý Văn Phong', 'Tạ Thị Vân', 'Võ Văn Tân',
  ];

  const createdStudents = [];
  let studentNum = 1;
  for (const cls of classes) {
    const numStudents = Math.floor(Math.random() * 5) + 3;
    for (let i = 0; i < numStudents; i++) {
      const name = vietnameseNames[(studentNum - 1) % vietnameseNames.length];
      const email = `student${studentNum}@smartgrading.edu.vn`;
      const studentCode = `${cls.code}-${String(studentNum).padStart(3, '0')}`;

      let user = await User.findOne({ email });
      if (!user) {
        const passwordHash = await bcrypt.hash('student123', 8);
        user = await User.create({
          name: `${name} ${studentNum}`,
          email,
          password: passwordHash,
          role: 'student',
          isEmailVerified: true,
          schoolId: school._id,
          classIds: [cls._id],
          studentCode,
          gender: studentNum % 2 === 0 ? 'female' : 'male',
        });
        console.log(`  Created student: ${user.name} (${studentCode})`);
      } else {
        console.log(`  Student "${email}" already exists, skipping.`);
      }

      if (!cls.studentIds.map((id) => id.toString()).includes(user._id.toString())) {
        cls.studentIds.push(user._id);
      }
      createdStudents.push(user);
      studentNum++;
    }
    await cls.save();
  }
  console.log(`Students seeding completed! Total: ${createdStudents.length} students`);
  return createdStudents;
};

async function seedAcademicData() {
  console.log('='.repeat(50));
  console.log('Starting academic data seeding...');
  console.log('='.repeat(50));

  const school = await School.findOne({ code: 'CVA' });
  if (!school) {
    console.error('No school found! Run school seeds first.');
    return;
  }

  const subjects = await Subject.find({ schoolId: school._id });
  const { classes } = await seedClasses(school, subjects);
  await seedStudents(school, classes);

  console.log('\n' + '='.repeat(50));
  console.log('Academic data seeding completed!');
  console.log('='.repeat(50));
}

if (require.main === module) {
  mongoose
    .connect(config.mongoose.url)
    .then(() => {
      console.log('Connected to MongoDB');
      return seedAcademicData();
    })
    .then(() => {
      return mongoose.disconnect();
    })
    .then(() => {
      console.log('Disconnected from MongoDB');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

module.exports = seedAcademicData;

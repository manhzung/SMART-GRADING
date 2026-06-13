const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config/config');
const { User } = require('../models');
const { School } = require('../models');

const seedAdminUser = async () => {
  const email = 'mahndugn@gmail.com';
  const password = 'admin123';
  const name = 'Admin User';

  console.log('Starting admin user seeding...');

  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`  Admin user "${email}" already exists, skipping.`);
    return existing;
  }

  let school = await School.findOne({ code: 'CVA' });
  if (!school) {
    school = await School.findOne();
  }

  const adminData = {
    name,
    email,
    password,
    role: 'admin',
    isEmailVerified: true,
    phone: '0901234567',
    schoolId: school ? school._id : null,
    avatarUrl: null,
    gender: 'other',
    isActive: true,
  };

  const admin = new User(adminData);
  admin.password = await bcrypt.hash(password, 8);
  await admin.save();
  console.log(`  Created admin user: ${email} / ${password} (role: admin)`);

  console.log('Admin user seeding completed!');
  return admin;
};

if (require.main === module) {
  mongoose
    .connect(config.mongoose.url)
    .then(() => {
      console.log('Connected to MongoDB');
      return seedAdminUser();
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

module.exports = seedAdminUser;

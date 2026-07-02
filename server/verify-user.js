const mongoose = require('mongoose');
const config = require('./src/config/config');

mongoose
  .connect(config.mongoose.url)
  .then(async () => {
    const { User } = require('./src/models');
    const user = await User.findOne({ email: 'mahndugn@gmail.com' });
    if (user) {
      user.isEmailVerified = true;
      await user.save();
      console.log('Updated user:', user.email, 'isEmailVerified:', user.isEmailVerified);
    } else {
      console.log('User not found');
    }
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

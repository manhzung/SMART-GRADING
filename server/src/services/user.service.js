const httpStatus = require('http-status');
const { User } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Create a user
 * @param {Object} userBody
 * @returns {Promise<User>}
 */
const createUser = async (userBody) => {
  if (await User.isEmailTaken(userBody.email)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  return User.create(userBody);
};

/**
 * Query for users
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryUsers = async (filter, options) => {
  const users = await User.paginate(filter, options);
  return users;
};

/**
 * Get user by id
 * @param {ObjectId} id
 * @returns {Promise<User>}
 */
const getUserById = async (id) => {
  return User.findById(id);
};

/**
 * Get user by email
 * @param {string} email
 * @returns {Promise<User>}
 */
const getUserByEmail = async (email) => {
  return User.findOne({ email });
};

/**
 * Update user by id
 * @param {ObjectId} userId
 * @param {Object} updateBody
 * @returns {Promise<User>}
 */
const updateUserById = async (userId, updateBody) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  if (updateBody.email && (await User.isEmailTaken(updateBody.email, userId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  Object.assign(user, updateBody);
  await user.save();
  return user;
};

/**
 * Delete user by id
 * @param {ObjectId} userId
 * @returns {Promise<User>}
 */
const deleteUserById = async (userId) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  await user.remove();
  return user;
};

/**
 * Change user password
 * @param {ObjectId} userId
 * @param {string} currentPassword
 * @param {string} newPassword
 * @returns {Promise<void>}
 */
const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  const isPasswordValid = await user.isPasswordMatch(currentPassword);
  if (!isPasswordValid) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Current password is incorrect');
  }
  user.password = newPassword;
  await user.save();
};

// ── Teacher Approval Methods ────────────────────────────────────────────────────

/**
 * Get pending teachers for a school
 */
const getPendingTeachers = async (schoolId, options = {}) => {
  const filter = {
    role: 'teacher',
    registrationStatus: 'pending',
    registeredSchoolId: schoolId,
  };
  const users = await User.paginate(filter, options);
  return users;
};

/**
 * Approve a teacher (assign to school)
 */
const approveTeacher = async (userId, schoolId) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (user.registrationStatus !== 'pending') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Tài khoản không trong trạng thái chờ duyệt');
  }

  // Check if registeredSchoolId matches
  if (user.registeredSchoolId?.toString() !== schoolId.toString()) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Giáo viên không đăng ký vào trường này');
  }

  user.registrationStatus = 'approved';
  user.schoolId = schoolId;
  user.isActive = true;
  await user.save();
  return user;
};

/**
 * Reject a teacher
 */
const rejectTeacher = async (userId, schoolId, reason = null) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (user.registrationStatus !== 'pending') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Tài khoản không trong trạng thái chờ duyệt');
  }

  user.registrationStatus = 'rejected';
  user.rejectedReason = reason;
  await user.save();
  return user;
};

// ── School Admin Management Methods ────────────────────────────────────────────

/**
 * Get school admins for a school
 */
const getSchoolAdmins = async (schoolId, options = {}) => {
  const filter = {
    role: 'school-admin',
    schoolId: schoolId,
    isActive: true,
  };
  const users = await User.paginate(filter, options);
  return users;
};

/**
 * Add a school admin to a school
 */
const addSchoolAdmin = async (schoolId, userId) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (user.role !== 'school-admin') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Người dùng phải có role school-admin');
  }

  user.schoolId = schoolId;
  user.registrationStatus = 'approved';
  await user.save();
  return user;
};

/**
 * Remove a school admin from a school
 */
const removeSchoolAdmin = async (schoolId, userId) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  // Check if this is the last admin
  const adminCount = await User.countDocuments({ role: 'school-admin', schoolId: schoolId, isActive: true });
  if (adminCount <= 1) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Không thể xóa school-admin cuối cùng của trường');
  }

  user.schoolId = null;
  await user.save();
  return user;
};

module.exports = {
  createUser,
  queryUsers,
  getUserById,
  getUserByEmail,
  updateUserById,
  deleteUserById,
  changePassword,
  getPendingTeachers,
  approveTeacher,
  rejectTeacher,
  getSchoolAdmins,
  addSchoolAdmin,
  removeSchoolAdmin,
};

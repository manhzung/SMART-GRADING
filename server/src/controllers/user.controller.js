const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { userService } = require('../services');

const createUser = catchAsync(async (req, res) => {
  const user = await userService.createUser(req.body);
  res.status(httpStatus.CREATED).send(user);
});

const getUsers = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name', 'role', 'schoolId']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);

  if (req.query.classId) {
    filter.classIds = req.query.classId;
  }

  const result = await userService.queryUsers(filter, options);
  res.send(result);
});

const getUser = catchAsync(async (req, res) => {
  const user = await userService.getUserById(req.params.userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  res.send(user);
});

const updateUser = catchAsync(async (req, res) => {
  const user = await userService.updateUserById(req.params.userId, req.body);
  res.send(user);
});

const deleteUser = catchAsync(async (req, res) => {
  await userService.deleteUserById(req.params.userId);
  res.status(httpStatus.NO_CONTENT).send();
});

const changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userIdFromToken = req.user.id || req.user._id;
  if (req.params.userId !== userIdFromToken && req.params.userId !== String(userIdFromToken)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You can only change your own password');
  }
  await userService.changePassword(req.params.userId, currentPassword, newPassword);
  res.status(httpStatus.NO_CONTENT).send();
});

// ── Teacher Approval Controllers ───────────────────────────────────────────────

const getPendingTeachers = catchAsync(async (req, res) => {
  if (req.user.role !== 'school-admin' && req.user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Bạn không có quyền thực hiện thao tác này');
  }
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await userService.getPendingTeachers(req.user.schoolId, options);
  res.send(result);
});

const approveTeacher = catchAsync(async (req, res) => {
  if (req.user.role !== 'school-admin' && req.user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Bạn không có quyền thực hiện thao tác này');
  }
  const user = await userService.approveTeacher(req.params.userId, req.user.schoolId);
  res.send(user);
});

const rejectTeacher = catchAsync(async (req, res) => {
  if (req.user.role !== 'school-admin' && req.user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Bạn không có quyền thực hiện thao tác này');
  }
  const { reason } = req.body || {};
  const user = await userService.rejectTeacher(req.params.userId, req.user.schoolId, reason);
  res.send(user);
});

// ── School Admin Management Controllers ────────────────────────────────────────

const getSchoolAdmins = catchAsync(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Chỉ admin mới có quyền xem danh sách school-admin');
  }
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await userService.getSchoolAdmins(req.params.schoolId, options);
  res.send(result);
});

const addSchoolAdmin = catchAsync(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Chỉ admin mới có quyền thêm school-admin');
  }
  const { userId } = req.body;
  const user = await userService.addSchoolAdmin(req.params.schoolId, userId);
  res.send(user);
});

const removeSchoolAdmin = catchAsync(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Chỉ admin mới có quyền xóa school-admin');
  }
  await userService.removeSchoolAdmin(req.params.schoolId, req.params.userId);
  res.status(httpStatus.NO_CONTENT).send();
});

// ── Admin Teacher Approval Controllers ──────────────────────────────────────────

const adminGetPendingTeachers = catchAsync(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Chỉ admin mới có quyền truy cập');
  }
  const { schoolId } = req.query;
  if (!schoolId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'schoolId is required');
  }
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await userService.getPendingTeachersForSchool(schoolId, options);
  res.send(result);
});

const adminApproveTeacher = catchAsync(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Chỉ admin mới có quyền duyệt giáo viên');
  }
  const user = await userService.adminApproveTeacher(req.params.userId);
  res.send(user);
});

const adminRejectTeacher = catchAsync(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Chỉ admin mới có quyền từ chối giáo viên');
  }
  const { reason } = req.body || {};
  const user = await userService.adminRejectTeacher(req.params.userId, reason);
  res.send(user);
});

module.exports = {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  changePassword,
  getPendingTeachers,
  approveTeacher,
  rejectTeacher,
  getSchoolAdmins,
  addSchoolAdmin,
  removeSchoolAdmin,
  adminGetPendingTeachers,
  adminApproveTeacher,
  adminRejectTeacher,
};

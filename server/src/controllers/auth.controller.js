const httpStatus = require('http-status');
const mongoose = require('mongoose');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const { authService, userService, tokenService, emailService, schoolService } = require('../services');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;

const register = catchAsync(async (req, res) => {
  const { name, email, password, schoolId } = req.body;

  let resolvedSchoolId = null;
  if (schoolId && String(schoolId).trim() !== '') {
    if (!isValidObjectId(schoolId)) {
      // schoolId is a name → resolve to _id
      const school = await schoolService.getByName(schoolId);
      if (!school) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'School not found');
      }
      resolvedSchoolId = school._id.toString();
    } else {
      // schoolId is a valid ObjectId → verify school exists
      const school = await schoolService.getById(schoolId);
      if (!school) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'School not found');
      }
      resolvedSchoolId = schoolId;
    }
  }

  // Self-registration is for teachers only.
  // - With a schoolId: account stays pending until a Super Admin approves
  //   (a School Admin of that school can also act on it later).
  // - Without a schoolId: auto-approve immediately, since there is no
  //   school admin in scope to approve the request.
  const hasSchool = Boolean(resolvedSchoolId);
  const user = await userService.createUser({
    name,
    email,
    password,
    role: 'teacher',
    ...(hasSchool
      ? { registeredSchoolId: resolvedSchoolId, schoolId: resolvedSchoolId }
      : {}),
    registrationStatus: hasSchool ? 'pending' : 'approved',
    isActive: hasSchool ? false : true,
  });
  const userResponse = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isEmailVerified: user.isEmailVerified,
    schoolId: user.schoolId,
  };
  const tokens = await tokenService.generateAuthTokens(user);
  const verifyEmailToken = await tokenService.generateVerifyEmailToken(user);
  await emailService.sendVerificationEmail(user.email, verifyEmailToken);
  res.status(httpStatus.CREATED).send({ user: userResponse, tokens });
});

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const user = await authService.loginUserWithEmailAndPassword(email, password);
  const userResponse = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isEmailVerified: user.isEmailVerified,
    schoolId: user.schoolId,
    avatarUrl: user.avatarUrl,
  };
  const tokens = await tokenService.generateAuthTokens(user);
  res.send({ user: userResponse, tokens });
});

const logout = catchAsync(async (req, res) => {
  await authService.logout(req.body.refreshToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const refreshTokens = catchAsync(async (req, res) => {
  const tokens = await authService.refreshAuth(req.body.refreshToken);
  res.send({ ...tokens });
});

const forgotPassword = catchAsync(async (req, res) => {
  const resetPasswordToken = await tokenService.generateResetPasswordToken(req.body.email);
  await emailService.sendResetPasswordEmail(req.body.email, resetPasswordToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const resetPassword = catchAsync(async (req, res) => {
  await authService.resetPassword(req.query.token, req.body.password);
  res.status(httpStatus.NO_CONTENT).send();
});

const sendVerificationEmail = catchAsync(async (req, res) => {
  const verifyEmailToken = await tokenService.generateVerifyEmailToken(req.user);
  await emailService.sendVerificationEmail(req.user.email, verifyEmailToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const verifyEmail = catchAsync(async (req, res) => {
  await authService.verifyEmail(req.query.token);
  res.status(httpStatus.OK).json({ message: 'Email verified successfully' });
});

const resendVerificationEmail = catchAsync(async (req, res) => {
  const { email } = req.body;
  const user = await userService.getUserByEmail(email);
  if (!user) {
    // Don't reveal if user exists
    return res.status(httpStatus.NO_CONTENT).send();
  }
  if (user.isEmailVerified) {
    // Don't reveal if already verified
    return res.status(httpStatus.NO_CONTENT).send();
  }
  const verifyEmailToken = await tokenService.generateVerifyEmailToken(user);
  await emailService.sendVerificationEmail(user.email, verifyEmailToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const getMe = catchAsync(async (req, res) => {
  const userResponse = {
    id: req.user.id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    isEmailVerified: req.user.isEmailVerified,
    schoolId: req.user.schoolId,
    avatarUrl: req.user.avatarUrl,
    phone: req.user.phone,
    classIds: req.user.classIds,
    isActive: req.user.isActive,
  };
  res.send({ user: userResponse });
});

const checkVerification = catchAsync(async (req, res) => {
  const { email } = req.query;
  if (!email) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email is required');
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const user = await userService.getUserByEmail(normalizedEmail);
  if (!user) {
    return res.send({ isEmailVerified: false });
  }

  res.send({ isEmailVerified: user.isEmailVerified });
});

module.exports = {
  register,
  login,
  logout,
  refreshTokens,
  forgotPassword,
  resetPassword,
  sendVerificationEmail,
  verifyEmail,
  resendVerificationEmail,
  getMe,
  checkVerification,
};

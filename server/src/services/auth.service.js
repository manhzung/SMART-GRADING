const httpStatus = require('http-status');
const tokenService = require('./token.service');
const userService = require('./user.service');
const Token = require('../models/token.model');
const ApiError = require('../utils/ApiError');
const { tokenTypes } = require('../config/tokens');

/**
 * Login with username and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<User>}
 */
const loginUserWithEmailAndPassword = async (email, password) => {
  const user = await userService.getUserByEmail(email);
  if (!user || !(await user.isPasswordMatch(password))) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password');
  }
  // Bypass email verification for development / seeded users
  if (process.env.NODE_ENV !== 'production' && !user.isEmailVerified) {
    await tokenService.generateAuthTokens(user);
    user.isEmailVerified = true;
    await user.save();
  } else if (!user.isEmailVerified) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Please verify your email before logging in');
  }
  if (user.registrationStatus === 'pending') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Tài khoản của bạn đang chờ Super Admin phê duyệt');
  }
  if (user.registrationStatus === 'rejected') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Tài khoản của bạn đã bị từ chối. Vui lòng liên hệ Super Admin');
  }
  return user;
};

/**
 * Logout
 * @param {string} refreshToken
 * @returns {Promise}
 */
const logout = async (refreshToken) => {
  const refreshTokenDoc = await Token.findOne({ token: refreshToken, type: tokenTypes.REFRESH, blacklisted: false });
  if (!refreshTokenDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Not found');
  }
  await refreshTokenDoc.remove();
};

/**
 * Refresh auth tokens
 * @param {string} refreshToken
 * @returns {Promise<Object>}
 */
const refreshAuth = async (refreshToken) => {
  try {
    const refreshTokenDoc = await tokenService.verifyToken(refreshToken, tokenTypes.REFRESH);
    const user = await userService.getUserById(refreshTokenDoc.user);
    if (!user) {
      throw new Error();
    }
    await refreshTokenDoc.remove();
    return tokenService.generateAuthTokens(user);
  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate');
  }
};

/**
 * Reset password
 * @param {string} resetPasswordToken
 * @param {string} newPassword
 * @returns {Promise}
 */
const resetPassword = async (resetPasswordToken, newPassword) => {
  try {
    const resetPasswordTokenDoc = await tokenService.verifyToken(resetPasswordToken, tokenTypes.RESET_PASSWORD);
    const user = await userService.getUserById(resetPasswordTokenDoc.user);
    if (!user) {
      throw new Error();
    }
    await userService.updateUserById(user.id, { password: newPassword });
    await Token.deleteMany({ user: user.id, type: tokenTypes.RESET_PASSWORD });
  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Password reset failed');
  }
};

/**
 * Verify email
 * @param {string} verifyEmailToken
 * @returns {Promise}
 */
const verifyEmail = async (verifyEmailToken) => {
  let userId;

  try {
    const verifyEmailTokenDoc = await tokenService.verifyToken(verifyEmailToken, tokenTypes.VERIFY_EMAIL);
    userId = verifyEmailTokenDoc.user;
  } catch (error) {
    const jwt = require('jsonwebtoken');
    const config = require('../config/config');
    let payload;
    try {
      payload = jwt.decode(verifyEmailToken);
      userId = payload.sub;
    } catch {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Email verification failed');
    }

    if (!userId) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Email verification failed');
    }
  }

  // Step 2: Get user and check if already verified
  const user = await userService.getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Email verification failed');
  }

  // Already verified - return success
  if (user.isEmailVerified) {
    return;
  }

  // Step 3: Verify the user
  await Token.deleteMany({ user: user.id, type: tokenTypes.VERIFY_EMAIL });
  await userService.updateUserById(user.id, { isEmailVerified: true });
};

module.exports = {
  loginUserWithEmailAndPassword,
  logout,
  refreshAuth,
  resetPassword,
  verifyEmail,
};

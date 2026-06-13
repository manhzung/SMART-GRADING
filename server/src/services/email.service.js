const nodemailer = require('nodemailer');
const config = require('../config/config');
const logger = require('../config/logger');

const transport = nodemailer.createTransport({
  ...config.email.smtp,
  secure: false,
  tls: {
    rejectUnauthorized: false,
  },
});
/* istanbul ignore next */
if (config.env !== 'test') {
  transport
    .verify()
    .then(() => logger.info('Connected to email server'))
    .catch(() => logger.warn('Unable to connect to email server. Make sure you have configured the SMTP options in .env'));
}

/**
 * Send an email
 * @param {string} to
 * @param {string} subject
 * @param {string} content
 * @param {boolean} isHtml
 * @returns {Promise}
 */
const sendEmail = async (to, subject, content, isHtml = false) => {
  const msg = { from: config.email.from, to, subject, ...(isHtml ? { html: content } : { text: content }) };
  await transport.sendMail(msg);
};

/**
 * Send reset password email
 * @param {string} to
 * @param {string} token
 * @returns {Promise}
 */
const sendResetPasswordEmail = async (to, token) => {
  const subject = 'Dat lai mat khau - Smart Grading';
  const resetPasswordUrl = `${config.email.frontendUrl || 'http://localhost:5173'}/reset-password?token=${token}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">Smart Grading</h1>
      </div>
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">Dat lai mat khau</h2>
        <p style="color: #666; font-size: 16px;">Ban yeu cau dat lai mat khau. Click vao nut ben duoi de dat lai mat khau.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetPasswordUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Dat lai mat khau</a>
        </div>
        <p style="color: #999; font-size: 14px;">Neu ban khong yeu cau dat lai mat khau, vui long bo qua email nay.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">Smart Grading System</p>
      </div>
    </div>
  `;
  await sendEmail(to, subject, html, true);
};

/**
 * Send verification email
 * @param {string} to
 * @param {string} token
 * @returns {Promise}
 */
const sendVerificationEmail = async (to, token) => {
  const subject = 'Xac nhan email - Smart Grading';
  const verificationEmailUrl = `${config.email.frontendUrl || 'http://localhost:5173'}/verify-email?token=${token}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">Smart Grading</h1>
      </div>
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">Xac nhan dia chi email</h2>
        <p style="color: #666; font-size: 16px;">Cam on ban da dang ky tai khoan. Vui long xac nhan email de kich hoat tai khoan.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationEmailUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Xac nhan Email</a>
        </div>
        <p style="color: #999; font-size: 14px;">Neu ban khong thuc hien dang ky, vui long bo qua email nay.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">Smart Grading System</p>
      </div>
    </div>
  `;
  await sendEmail(to, subject, html, true);
};

module.exports = {
  transport,
  sendEmail,
  sendResetPasswordEmail,
  sendVerificationEmail,
};

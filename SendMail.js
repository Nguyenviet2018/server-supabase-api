const nodemailer = require('nodemailer');

// 1. CẤU HÌNH TRANG THIẾT BỊ GỬI MAIL (Dùng Gmail của bạn)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'nguyenquocviet2020ca@gmail.com', // ⚠️ Thay bằng Gmail thật của bạn
    pass: 'llcu chko aiyq xzqe'     // ⚠️ Thay bằng 16 ký tự "Mật khẩu ứng dụng" của Google
  }
});

/**
 * Hàm gửi mail đa năng
 * @param {string} toEmail - Email người nhận
 * @param {string} subject - Tiêu đề thư
 * @param {string} htmlContent - Nội dung thư dạng HTML
 */
const sendMailReal = (toEmail, subject, htmlContent) => {
  const mailOptions = {
    from: '"Hệ Thống Xác Thực" <GMAIL_CỦA_BẠN@gmail.com>',
    to: toEmail,
    subject: subject,
    html: htmlContent
  };

  // Trả về một Promise để bên server.js có thể dùng async/await nhằm bắt lỗi dễ hơn
  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        reject(error);
      } else {
        resolve(info);
      }
    });
  });
};

// Xuất hàm này ra để file khác import vào dùng
module.exports = sendMailReal;
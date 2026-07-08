require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
// 🛠️ IMPORT THƯ VIỆN MỚI
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const app = express();
app.use(express.json());
app.use(cors());
// 🔥 1. IMPORT FILE RIÊNG VÀO ĐÂY
const couponController = require('./couponController');

// ==========================================================
// ⚙️ CẤU HÌNH GHI LOG XUỐNG FILE TỰ ĐỘNG
// ==========================================================

// Tạo đường dẫn đến file lưu log (Tên file: access.log nằm ngay tại thư mục gốc Backend)
const logFilePath = path.join(__dirname, 'access.log');

// Tạo một luồng ghi file (Write Stream) ở chế độ 'a' (Append - tức là ghi nối tiếp vào cuối file, không xóa code cũ)
const accessLogStream = fs.createWriteStream(logFilePath, { flags: 'a' });

// 🔥 1. IMPORT FILE XỬ LÝ UPLOAD RIÊNG
const uploadController = require('./uploadController');
const sendMailReal = require('./SendMail');
// ==========================================================
// 1. CẤU HÌNH LOG TRUY CẬP (Morgan Access Logging)
// ==========================================================
// Mỗi khi có ai truy cập, Node.js sẽ in ra console theo định dạng chuẩn:
// [Thời gian] - IP - Phương thức (GET/POST) - URL - Trạng thái (200/404) - Thời gian phản hồi
//app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));

// Khởi tạo morgan ghi xuống file
app.use(morgan(':remote-addr - [:date[clf]] ":method :url" :status :response-time ms', { stream: accessLogStream }));
// Khởi tạo morgan in ra màn hình console như cũ
app.use(morgan(':method :url :status - :response-time ms'));

// ==========================================================
// 2. CẤU HÌNH CHẶN IP (IP Blacklist Middleware)
// ==========================================================
// Danh sách các IP bị cấm (Bạn có thể thêm IP xấu phát hiện được vào đây)
const blacklistedIPs = ['123.45.67.89', '98.76.54.32', '::ffff:192.168.1.50']; 
////////////////sendmail
let otpStorage = {}; 

// ================= API 1: NHẬN EMAIL VÀ GỬI OTP THẬT =================
app.post('/api/forget-password', async (req, res) => { // Thêm chữ async ở đây
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Vui lòng cung cấp Email!' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStorage[email] = otp;

  // Chuẩn bị nội dung thư
  const subject = 'Mã OTP khôi phục mật khẩu của bạn';
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; max-width: 500px;">
      <h2>Yêu cầu đặt lại mật khẩu</h2>
      <p>Mã số OTP xác thực của bạn là:</p>
      <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; color: #dc3545; letter-spacing: 5px;">
        ${otp}
      </div>
    </div>
  `;

  try {
    // ➔ GỌI HÀM TỪ FILE TÁCH RIÊNG (Dùng await cực kỳ gọn gàng)
    await sendMailReal(email, subject, htmlContent);
    
    console.log('Đã gửi thư OTP thành công tới:', email);
    res.json({ success: true, message: 'Đã gửi mã OTP thành công về Gmail của bạn!' });
  } catch (error) {
    console.error('Lỗi gửi mail hệ thống:', error);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống: Không thể gửi email!' });
  }
});

// ================= API 2: XÁC THỰC MÃ OTP =================
app.post('/api/verify-otp', (req, res) => {
  const { email, otpInput } = req.body;

  if (otpStorage[email] && otpStorage[email] === otpInput.trim()) {
    delete otpStorage[email]; 
    return res.json({ success: true, message: 'Mã OTP chính xác!' });
  } else {
    return res.status(400).json({ success: false, message: 'Mã OTP không đúng hoặc đã hết hạn!' });
  }
});
////////////end SendMail ////////////////


app.use((req, res, next) => {
    // Lấy IP của người truy cập (xử lý cả trường hợp qua proxy)
    const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    // Tự động in thêm thông tin IP ra console log phục vụ giám sát
    console.log(`[LOG] -> IP: ${clientIP}`);
  

    if (blacklistedIPs.includes(clientIP)) {
        console.log(`🚨 [⚠️ CẢNH BÁO] Đã chặn truy cập độc hại từ IP: ${clientIP}`);
       const blockLog = `[🚨 BLOCKED IP] ${new Date().toISOString()} - IP: ${clientIP} cố gắng truy cập ${req.url}\n`;
        
        // Tự tay ghi đè log chặn IP xấu vào file bằng hàm đồng bộ
        fs.appendFileSync(logFilePath, blockLog);
        return res.status(403).json({ 
            message: 'Truy cập bị từ chối! IP của bạn đã bị đưa vào danh sách đen do nghi ngờ vi phạm.' 
        });
    }
    next(); // IP sạch, cho phép đi tiếp vào hệ thống
});


// ==========================================================
// 3. CẤU HÌNH GIỚI HẠN REQUEST (Rate Limiting)
// ==========================================================
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // Khung thời gian: 15 phút
    max: 100, // Tối đa 100 request/15 phút trên cùng 1 IP
    standardHeaders: true, // Trả về thông tin giới hạn trong headers (RateLimit-Limit, RateLimit-Remaining)
    legacyHeaders: false, // Tắt các headers cũ (X-RateLimit-*)
    message: {
        status: 429,
        message: 'Bạn đã gửi quá nhiều yêu cầu trong thời gian ngắn. Vui lòng thử lại sau 15 phút!'
    }
});

// Áp dụng bộ lọc giới hạn request này cho toàn bộ ứng dụng:
app.use(apiLimiter);



// 2. Kết nối MySQL thông qua các biến cấu hình từ file .env
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect(err => {
    if (err) {
        console.error('❌ Lỗi kết nối MySQL:', err);
    } else {
        console.log(`✅ DB MySQL [${process.env.DB_NAME}] đã kết nối thành công!`);
    }
});


// 3. API ĐĂNG KÝ (Register)
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, 'user')";
        
        db.query(sql, [username, email, hashedPassword], (err, result) => {
            if (err) return res.status(400).json({ message: 'Username hoặc Email đã tồn tại!' });
            res.json({ message: 'Đăng ký thành công!' });
        });
    } catch {
        res.status(500).json({ message: 'Lỗi hệ thống trong quá trình đăng ký' });
    }
});

// 4. API ĐĂNG NHẬP (Login)
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const sql = "SELECT * FROM users WHERE email = ?";
    
    db.query(sql, [email], async (err, results) => {
        if (err || results.length === 0) return res.status(400).json({ message: 'Email không tồn tại!' });
        
        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Mật khẩu không chính xác!' });

        // Lấy mã bí mật và thời gian hết hạn từ file .env
        const token = jwt.sign(
            { id: user.id, role: user.role }, 
            process.env.JWT_SECRET, 
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );
        
        res.json({
            message: 'Đăng nhập thành công!',
            token: token,
            role: user.role,
            username: user.username
        });
    });
});

// Middleware xác thực JWT Token (Để biết ai đang gửi yêu cầu)
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.status(401).json({ message: 'Bạn chưa đăng nhập!' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Token không hợp lệ hoặc đã hết hạn!' });
        req.user = user; // Lưu thông tin mã hóa (id, role) vào req.user
        next();
    });
};

// 🔥 1. GỌI FILE RIÊNG THỰC THI KHI FRONTEND GỬI YÊU CẦU UPLOAD
app.post('/api/upload-multile', uploadController.handleMultipleUpload);

// 🔥 2. SERVER GỌI THỰC THI FILE RIÊNG KHI FRONTEND REQ VÀO URL NÀY
app.get('/api/coupons', couponController.getAvailableCoupons);

// API 1: Lấy thông tin hồ sơ và lịch sử mua hàng (Giả lập lịch sử mua hàng từ DB)
app.get('/api/profile', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const sqlUser = "SELECT id, username, email, role FROM users WHERE id = ?";
    
    db.query(sqlUser, [userId], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ message: 'Không tìm thấy cơ sở dữ liệu user!' });
        
        const user = results[0];
        
        // Giả lập lịch sử mua hàng trả về (Thực tế bạn sẽ lấy từ bảng `orders` trong MySQL)
        const mockOrderHistory = [
          { id: 'DH1002', date: '2026-06-15', total: '1,250,000đ', status: 'Đã giao hàng' },
          { id: 'DH1059', date: '2026-07-02', total: '350,000đ', status: 'Đang xử lý' }
        ];

        res.json({
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}` // Tạo avatar tự động theo tên
            },
            orders: mockOrderHistory
        });
    });
});

// API 2: Cập nhật thông tin (Đổi mật khẩu / Đổi tên hiển thị)
app.put('/api/update-profile', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { newUsername, newPassword } = req.body;

    try {
        if (newPassword) {
            // Nếu người dùng muốn đổi mật khẩu
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            const sql = "UPDATE users SET username = ?, password = ? WHERE id = ?";
            db.query(sql, [newUsername, hashedPassword, userId], (err) => {
                if (err) return res.status(400).json({ message: 'Tên tài khoản đã tồn tại!' });
                res.json({ message: 'Cập nhật tài khoản và mật khẩu thành công!' });
            });
        } else {
            // Nếu chỉ muốn đổi tên hiển thị
            const sql = "UPDATE users SET username = ? WHERE id = ?";
            db.query(sql, [newUsername, userId], (err) => {
                if (err) return res.status(400).json({ message: 'Tên tài khoản đã tồn tại!' });
                res.json({ message: 'Cập nhật tên tài khoản thành công!' });
            });
        }
    } catch {
        res.status(500).json({ message: 'Lỗi hệ thống' });
    }
});


// 5. Khởi chạy Server dựa trên cổng PORT được định nghĩa trong file .env
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Backend đang chạy ổn định tại port ${PORT}`));
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = 'KHOA_BAO_MAT_SIE_U_CAP_2026'; // Chìa khóa bí mật để ký token

// Kết nối MySQL
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456', // Điền mật khẩu MySQL của bạn
    database: 'hoc_vien_db'
});

// 1. API ĐĂNG KÝ (REGISTER)
app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Vui lòng điền đủ thông tin!' });
    }

    try {
        // Mã hóa mật khẩu trước khi lưu để hacker không đọc được
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const queryStr = "INSERT INTO users (name, email, password) VALUES (?, ?, ?)";
        db.query(queryStr, [name, email, hashedPassword], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ message: 'Email này đã tồn tại!' });
                }
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ success: true, message: 'Đăng ký tài khoản thành công!' });
        });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ!' });
    }
});

// 2. API ĐĂNG NHẬP (LOGIN) - TRẢ VỀ TOKEN JWT
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;

    const queryStr = "SELECT * FROM users WHERE email = ? LIMIT 1";
    db.query(queryStr, [email], async (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) {
            return res.status(400).json({ message: 'Tài khoản hoặc mật khẩu không chính xác!' });
        }

        const user = results[0];
        // So sánh mật khẩu người dùng gõ với mật khẩu mã hóa trong DB
        const hopLe = await bcrypt.compare(password, user.password);
        if (!hopLe) {
            return res.status(400).json({ message: 'Tài khoản hoặc mật khẩu không chính xác!' });
        }

        // Tạo chuỗi mã hóa JWT Token (Hết hạn sau 1 ngày)
        const token = jwt.sign(
            { id: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '1d' }
        );

        // Trả Token và thông tin cơ bản về cho App Mobile
        res.json({
            success: true,
            token: token,
            user: { name: user.name, role: user.role, email: user.email }
        });
    });
});

// 3. MIDDLEWARE KIỂM TRA TOKEN (BẢO VỆ API)
const xacThucToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Lấy chuỗi sau chữ 'Bearer '

    if (!token) return res.status(401).json({ message: 'Bạn chưa đăng nhập hoặc thiếu Token!' });

    jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
        if (err) return res.status(403).json({ message: 'Token đã hết hạn hoặc không hợp lệ!' });
        req.user = decodedUser; // Đính kèm user đã giải mã vào request
        next();
    });
};

// 4. API BẢO MẬT: LẤY DỮ LIỆU HỒ SƠ (Phải gửi kèm Token mới gọi được)
app.get('/api/user/profile', xacThucToken, (req, res) => {
    const queryStr = "SELECT name, role, email FROM users WHERE id = ? LIMIT 1";
    db.query(queryStr, [req.user.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results[0]);
    });
});

app.listen(3000, '0.0.0.0',() => console.log('🚀 Server Auth JWT chạy tại: http://localhost:3000'));
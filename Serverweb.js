require('dotenv').config(); // Load biến môi trường
const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Kết nối DB
const db = mysql.createConnection({ 
    host: 'localhost', 
    user: 'root', 
    password: '123456', 
    database: 'hoc_vien_db' 
});

// Lấy secret key từ file .env
const SECRET_KEY = process.env.SECRET_KEY || '1234567abcdfet_default_fallback_key';

// --- API ---

app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    db.query('SELECT id FROM users WHERE email = ?', [email], async (err, results) => {
        if (err) return res.status(500).send("Lỗi server");
        if (results && results.length > 0) return res.status(409).send("Email đã tồn tại!");

        const hashedPassword = await bcrypt.hash(password, 10);
        const query = 'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)';
        
        db.query(query, [username, email, hashedPassword, 'user'], (err, result) => {
            if (err) return res.status(500).send("Lỗi đăng ký");
            
            const token = jwt.sign({ id: result.insertId, role: 'user' }, SECRET_KEY, { expiresIn: '1h' });
            res.status(201).send({ message: "Đăng ký thành công!", token });
        });
    });
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).send("Thiếu thông tin");

    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (err || results.length === 0) return res.status(401).send("Email hoặc mật khẩu không chính xác");
        
        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).send("Email hoặc mật khẩu không chính xác");

        // Sử dụng biến SECRET_KEY đã khai báo ở trên
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, SECRET_KEY, { expiresIn: '1h' });
        res.status(200).send({ token, role: user.role, message: "Đăng nhập thành công" });
    });
});

// API Admin - Cần bổ sung middleware xác thực
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(403).send("Chưa đăng nhập");
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) return res.status(401).send("Token hết hạn");
        req.user = decoded;
        next();
    });
};

app.get('/users', authenticate, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).send("Bạn không phải Admin");
    db.query('SELECT id, username, email, role FROM users', (err, results) => {
        if (err) return res.status(500).send("Lỗi CSDL");
        res.json(results);
    });
});
// Thêm API xóa user
app.delete('/users/:id', authenticate, (req, res) => {
    // Kiểm tra quyền Admin
    if (req.user.role !== 'admin') {
        return res.status(403).send("Bạn không có quyền thực hiện hành động này");
    }

    const userId = req.params.id;
    db.query('DELETE FROM users WHERE id = ?', [userId], (err, result) => {
        if (err) return res.status(500).send("Lỗi xóa dữ liệu");
        if (result.affectedRows === 0) return res.status(404).send("User không tồn tại");
        
        res.send("Xóa người dùng thành công");
    });
});
// Thêm vào server.js
app.post('/admin/add-user', authenticate, async (req, res) => {
    // Kiểm tra xem người thực hiện có phải là admin không
    if (req.user.role !== 'admin') return res.status(403).send("Quyền hạn bị từ chối");

    const { username, email, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    db.query('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)', 
    [username, email, hashedPassword, role], (err, result) => {
        if (err) return res.status(500).send("Lỗi thêm user");
        res.status(201).send("Thêm user thành công");
    });
});
app.listen(process.env.PORT || 3001, () => console.log('Server chạy cổng 3001'));
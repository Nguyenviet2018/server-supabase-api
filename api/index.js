require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Khởi tạo Supabase Client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const SECRET_KEY = process.env.SECRET_KEY;

// --- API ---

app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    
    // Kiểm tra email đã tồn tại
    const { data: existingUser } = await supabase.from('users').select('id').eq('email', email).single();
    if (existingUser) return res.status(409).send("Email đã tồn tại!");

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Thêm user mới
    const { data, error } = await supabase.from('users').insert([{ 
        username, email, password: hashedPassword, role: 'user' 
    }]).select();

    if (error) return res.status(500).send("Lỗi đăng ký: " + error.message);
    
    const token = jwt.sign({ id: data[0].id, role: 'user' }, SECRET_KEY, { expiresIn: '1h' });
    res.status(201).send({ message: "Đăng ký thành công!", token });
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    const { data: users, error } = await supabase.from('users').select('*').eq('email', email);
    if (error || users.length === 0) return res.status(401).send("Email hoặc mật khẩu không chính xác");
    
    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).send("Email hoặc mật khẩu không chính xác");

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, SECRET_KEY, { expiresIn: '1h' });
    res.status(200).send({ token, role: user.role, message: "Đăng nhập thành công" });
});

// Middleware xác thực
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(403).send("Chưa đăng nhập");
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) return res.status(401).send("Token hết hạn");
        req.user = decoded;
        next();
    });
};

app.get('/users', authenticate, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).send("Bạn không phải Admin");
    
    const { data, error } = await supabase.from('users').select('id, username, email, role');
    if (error) return res.status(500).send("Lỗi CSDL");
    res.json(data);
});

app.delete('/users/:id', authenticate, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).send("Quyền hạn bị từ chối");

    const { error } = await supabase.from('users').delete().eq('id', req.params.id);
    if (error) return res.status(500).send("Lỗi xóa dữ liệu");
    
    res.send("Xóa người dùng thành công");
});

app.post('/admin/add-user', authenticate, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).send("Quyền hạn bị từ chối");

    const { username, email, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const { error } = await supabase.from('users').insert([{ 
        username, email, password: hashedPassword, role 
    }]);

    if (error) return res.status(500).send("Lỗi thêm user: " + error.message);
    res.status(201).send("Thêm user thành công");
});

//app.listen(process.env.PORT || 3001, () => console.log('Server Supabase chạy cổng 3001'));
// Thay vì app.listen(3001, ...)
// Hãy xuất app ra để Vercel sử dụng:
module.exports = app;
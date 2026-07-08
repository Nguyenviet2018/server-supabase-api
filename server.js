require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());


// Đảm bảo tên biến môi trường khớp hoàn toàn với file .env
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
// API điểm danh
app.post('/attendance', async (req, res) => {
    const { userId, status } = req.body;
    
    // Gửi dữ liệu vào Supabase
    const { data, error } = await supabase
        .from('attendance')
        .insert([{ user_id: userId, status: status }])
        .select(); // Thêm .select() để Supabase trả về dữ liệu vừa insert

    if (error) {
        console.log("CHI TIẾT LỖI TỪ SUPABASE:", error);
        return res.status(400).json(error);
    }
    
    res.status(200).json({ success: true, data });
});
// API lấy toàn bộ dữ liệu điểm danh
app.get('/attendance', async (req, res) => {
    const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});
app.listen(3000,'0.0.0.0', () => console.log('Server đang chạy tại http://localhost:3000'));
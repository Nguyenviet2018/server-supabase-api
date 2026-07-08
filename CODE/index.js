// server.js
const express = require('express');
const mysql = require('mysql2');
const app = express();
app.use(express.json());

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '123456',
  database: 'my_store'
});

// Lấy lịch sử chấm công của một nhân viên cụ thể
app.get('/get-attendance-by-user/:user_name', (req, res) => {
  const userName = req.params.user_name;
  connection.query(
    'SELECT * FROM attendance WHERE user_name = ? ORDER BY check_in_time DESC', 
    [userName], 
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

// Route lấy dữ liệu
app.get('/get-attendance', (req, res) => {
  connection.query('SELECT * FROM attendance', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Route thêm dữ liệu (Đã sửa db thành connection)
app.post('/post-attendance', (req, res) => {
  const { user_name, location, note } = req.body;
  const sql = "INSERT INTO attendance (user_name, location, note) VALUES (?, ?, ?)";
  
  // Đổi db thành connection ở đây
  connection.query(sql, [user_name, location, note], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Thêm thành công!", id: result.insertId });
  });
});

// Thay vì chỉ: app.listen(3000, ...)
app.listen(3000, '0.0.0.0', () => {
  console.log('Server đang chạy trên tất cả các interface tại port 3000');
});
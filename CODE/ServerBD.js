const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// API lấy danh sách người dùng
app.get("/api/users", (req, res) => {
  const sql = "SELECT * FROM users";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Lỗi truy vấn:", err);
      return res.status(500).json({ error: "Lỗi khi truy vấn dữ liệu" });
    }
    res.json(results);
  });
});

//  API lấy người dùng theo ID
app.get("/api/users/:id", (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM users WHERE id = ?";
  db.query(sql, [id], (err, results) => {
    if (err) return res.status(500).json({ error: "Lỗi khi truy vấn" });
    if (results.length === 0) return res.status(404).json({ error: "Không tìm thấy" });
    res.json(results[0]);
  });
});

//  API thêm người dùng
app.post("/api/users", (req, res) => {
  const { name, username, email, phone, city } = req.body;
  const sql = "INSERT INTO users (name, username, email, phone, city) VALUES (?, ?, ?, ?, ?)";
  db.query(sql, [name, username, email, phone, city], (err, result) => {
    if (err) return res.status(500).json({ error: "Lỗi khi thêm người dùng" });
    res.json({ message: "Thêm thành công!", id: result.insertId });
  });
});

//  API xóa người dùng
app.delete("/api/users/:id", (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM users WHERE id = ?";
  db.query(sql, [id], (err) => {
    if (err) return res.status(500).json({ error: "Lỗi khi xóa người dùng" });
    res.json({ message: "Đã xóa thành công!" });
  });
});

//  API cập nhật người dùng
app.put("/api/users/:id", (req, res) => {
  const { id } = req.params;
  const { name, username, email, phone, city } = req.body;
  const sql = "UPDATE users SET name=?, username=?, email=?, phone=?, city=? WHERE id=?";
  db.query(sql, [name, username, email, phone, city, id], (err) => {
    if (err) return res.status(500).json({ error: "Lỗi khi cập nhật" });
    res.json({ message: "Cập nhật thành công!" });
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});

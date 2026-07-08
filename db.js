const mysql = require("mysql2");

// Tạo kết nối tới MySQL
const connection = mysql.createConnection({
  host: "localhost",     // địa chỉ server MySQL
  user: "root",          // tài khoản MySQL (thường là root)
  password: "123456",          // mật khẩu (điền nếu có)
  database: "mydatabase" // tên database của bạn
});

//  Kiểm tra kết nối
connection.connect((err) => {
  if (err) {
    console.error("❌ Lỗi kết nối MySQL:", err);
  } else {
    console.log("✅ Kết nối MySQL thành công!");
  }
});

module.exports = connection;

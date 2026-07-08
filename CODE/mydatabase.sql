CREATE DATABASE mydatabase;
USE mydatabase;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  username VARCHAR(50),
  email VARCHAR(100),
  phone VARCHAR(20),
  city VARCHAR(50)
);

INSERT INTO users (name, username, email, phone, city)
VALUES 
('Nguyễn Văn A', 'vana', 'vana@gmail.com', '0123456789', 'Hà Nội'),
('Trần Thị B', 'thib', 'thib@gmail.com', '0987654321', 'TP.HCM'),
('Lê Văn C', 'vanc', 'vanc@gmail.com', '0912345678', 'Đà Nẵng');

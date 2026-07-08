//my-ap-v/SERVER/uploadController.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Cấu hình lưu trữ (Giữ nguyên phần storage của bạn)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let uploadPath = path.join(__dirname, 'uploads');
        if (req.body.paths) {
            try {
                // Nhớ parse chuỗi JSON do paths gửi lên dạng string
                const paths = typeof req.body.paths === 'string' ? JSON.parse(req.body.paths) : req.body.paths;
                if (paths[file.originalname]) {
                    const relativePath = paths[file.originalname];
                    const folderStructure = path.dirname(relativePath);
                    uploadPath = path.join(uploadPath, folderStructure);
                }
            } catch (e) {
                console.log("Đang tải file lẻ hoặc lỗi parse JSON paths");
            }
        }
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

// 🔥 ĐỊNH NGHĨA MIDDLEWARE CHUẨN: Tên trường bắt buộc là 'files'
const uploadMiddleware = multer({ storage: storage }).array('files', 100);

// Hàm Controller chính
const handleMultipleUpload = (req, res) => {
    // Chạy middleware để quét các file từ trường 'files' trước
    uploadMiddleware(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            // Lỗi do Multer (ví dụ: sai trường, quá số lượng file)
            console.error('❌ Lỗi định dạng Multer:', err);
            return res.status(400).json({ success: false, message: `Lỗi upload: ${err.message}` });
        } else if (err) {
            // Lỗi hệ thống khác
            console.error('❌ Lỗi hệ thống:', err);
            return res.status(500).json({ success: false, message: 'Lỗi không xác định khi upload!' });
        }

        // Nếu không lỗi, req.files sẽ được khởi tạo thành công
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: 'Không có file nào được tải lên!' });
        }

        console.log(`[EXECUTE] uploadController.js xử lý thành công ${req.files.length} files.`);
        
        res.json({
            success: true,
            message: `Đã upload thành công ${req.files.length} tập tin/thư mục!`,
            files: req.files.map(f => f.originalname)
        });
    });
};

module.exports = {
    handleMultipleUpload
};
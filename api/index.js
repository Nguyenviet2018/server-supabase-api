//server.js
require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const multer = require('multer');
const fs = require('fs');
const path = require('path');

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

// app.post('/login', async (req, res) => {
//     const { email, password } = req.body;
    
//     const { data: users, error } = await supabase.from('users').select('*').eq('email', email);
//     if (error || users.length === 0) return res.status(401).send("Email hoặc mật khẩu không chính xác");
    
//     const user = users[0];
//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) return res.status(401).send("Email hoặc mật khẩu không chính xác");

//     const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, SECRET_KEY, { expiresIn: '1h' });
//     res.status(200).send({ token, role: user.role, message: "Đăng nhập thành công" });
// });
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    const { data: users, error } = await supabase.from('users').select('*').eq('email', email);
    if (error || users.length === 0) {
        return res.status(401).json({ error: "Email hoặc mật khẩu không chính xác" });
    }
    
    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return res.status(401).json({ error: "Email hoặc mật khẩu không chính xác" });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, SECRET_KEY, { expiresIn: '1h' });
    
    // Dùng .json thay vì .send để trả về cấu trúc chuẩn JSON cho React Native
    return res.status(200).json({ 
        token, 
        role: user.role, 
        message: "Đăng nhập thành công" 
    });
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
//=======NHANVIEN========
// 1. CREATE: Thêm nhân viên mới

app.post('/nhanvien', async (req, res) => {
    const { manv, hoten, ngaysinh, gioitinh, sodt, email, diachi, ngayvaolam, trangthai, phongban_id, chucvu_id } = req.body;
    
    // Ép kiểu ID về số, nếu rỗng thì để là null
    //const pbId = phongban_id ? parseInt(phongban_id) : null;
    //const cvId = chucvu_id ? parseInt(chucvu_id) : null;

    const { data, error } = await supabase
        .from('nhanvien')
        .insert([{ 
            manv, hoten, ngaysinh, gioitinh, sodt, email, diachi, ngayvaolam, trangthai, 
            phongban_id, 
            chucvu_id
        }]);

    if (error) {
        console.error("Lỗi Supabase:", error); // Xem lỗi cụ thể trong Terminal
        return res.status(500).json({ error: error.message });
    }
    res.status(201).json({ message: "Thêm nhân viên thành công", data });
});
// 2. READ: Lấy danh sách (Đã xóa route trùng lặp)
app.get('/nhanvien', async (req, res) => {
    const { data, error } = await supabase
        .from('nhanvien')
        .select(`
            *,
            phongban (tenphongban),
			chucvu (tenchucvu)
        `); 

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// 3. UPDATE: Sửa thông tin nhân viên
app.put('/nhanvien/:id', async (req, res) => {
    const { id } = req.params;
    const updates = req.body; 

    // QUAN TRỌNG: Loại bỏ nhanvien_id khỏi object update để tránh lỗi PRIMARY KEY
    delete updates.nhanvien_id; 

    const { data, error } = await supabase
        .from('nhanvien')
        .update(updates)
        .eq('nhanvien_id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Cập nhật thành công", data });
});

// 4. DELETE: Xóa nhân viên
app.delete('/nhanvien/:id', async (req, res) => {
    const { id } = req.params;

    const { error } = await supabase
        .from('nhanvien')
        .delete()
        .eq('nhanvien_id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Xóa nhân viên thành công" });
});
//thêm phòng ban
app.get('/phongban', async (req, res) => {
    const { data, error } = await supabase.from('phongban').select('*');
    res.json(data);
});
//get chức vụ
app.get('/chucvu', async (req, res) => {
    const { data, error } = await supabase.from('chucvu').select('*');
    res.json(data);
});
//===cho mobile
// Thống kê Dashboard
app.get('/dashboard/stats', authenticate, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).send("Quyền hạn bị từ chối");

    try {
		// Lấy danh sách tên phòng ban
		const { data: listPhongBan, error: listErr } = await supabase
		    .from('phongban')
			.select('tenphongban');
        // 1. Đếm tổng số nhân viên
        const { count: totalEmp } = await supabase
            .from('nhanvien')
            .select('*', { count: 'exact', head: true });

        // 2. Đếm theo trạng thái (Đảm bảo giá trị string khớp với DB)
        const { count: dangLam } = await supabase
            .from('nhanvien')
            .select('*', { count: 'exact', head: true })
            .eq('trangthai', 'đang làm');

        const { count: nghiViec } = await supabase
            .from('nhanvien')
            .select('*', { count: 'exact', head: true })
            .eq('trangthai', 'nghỉ việc');

        const { count: tamNghi } = await supabase
            .from('nhanvien')
            .select('*', { count: 'exact', head: true })
            .eq('trangthai', 'tạm nghỉ');

        // 3. Đếm phòng ban
        const { count: deptCount } = await supabase
            .from('phongban')
            .select('*', { count: 'exact', head: true });

        res.json({ 
            employeeCount: totalEmp, 
            deptCount, 
			listPhongBan: listPhongBan, // <--- PHẢI CÓ DÒNG NÀY
            stats: { dangLam, nghiViec, tamNghi } 
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Lỗi server");
    }
});
//====chi tiết nhân viên
// Lấy danh sách lương của tất cả nhân viên hoặc theo nhân viên cụ thể
app.get('/luong', async (req, res) => {
    const { nhanvien_id } = req.query;
    let query = supabase.from('luong').select('*, nhanvien (hoten, manv)');
    
    if (nhanvien_id) {
        query = query.eq('nhanvien_id', nhanvien_id);
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Thêm bảng lương mới
app.post('/luong', async (req, res) => {
    const { nhanvien_id, thang, nam, songaycong, luongcoban, phucap, thuong, phat } = req.body;

    const { data, error } = await supabase
        .from('luong')
        .insert([{ nhanvien_id, thang, nam, songaycong, luongcoban, phucap, thuong, phat }])
        .select();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ message: "Thêm bảng lương thành công", data });
});

// Cập nhật lương
app.put('/luong/:id', async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    delete updates.luong_id;

    const { data, error } = await supabase
        .from('luong')
        .update(updates)
        .eq('luong_id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Cập nhật lương thành công", data });
});

// Xóa bảng lương
app.delete('/luong/:id', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('luong').delete().eq('luong_id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Xóa bảng lương thành công" });
});
//---------------------
// Lấy danh sách khen thưởng
app.get('/khenthuong', async (req, res) => {
    const { nhanvien_id } = req.query;
    let query = supabase.from('khenthuong').select('*, nhanvien (hoten, manv)');

    if (nhanvien_id) {
        query = query.eq('nhanvien_id', nhanvien_id);
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Thêm khen thưởng
app.post('/khenthuong', async (req, res) => {
    const { nhanvien_id, ngay, lydo, sotien } = req.body;

    const { data, error } = await supabase
        .from('khenthuong')
        .insert([{ nhanvien_id, ngay, lydo, sotien }])
        .select();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ message: "Thêm khen thưởng thành công", data });
});

// Xóa khen thưởng
app.delete('/khenthuong/:id', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('khenthuong').delete().eq('khenthuong_id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Xóa khen thưởng thành công" });
});
//------------
// Lấy danh sách kỷ luật
app.get('/kyluat', async (req, res) => {
    const { nhanvien_id } = req.query;
    let query = supabase.from('kyluat').select('*, nhanvien (hoten, manv)');

    if (nhanvien_id) {
        query = query.eq('nhanvien_id', nhanvien_id);
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Thêm kỷ luật
app.post('/kyluat', async (req, res) => {
    const { nhanvien_id, ngay, lydo, mucphat } = req.body;

    const { data, error } = await supabase
        .from('kyluat')
        .insert([{ nhanvien_id, ngay, lydo, mucphat }])
        .select();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ message: "Thêm kỷ luật thành công", data });
});

// Xóa kỷ luật
app.delete('/kyluat/:id', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('kyluat').delete().eq('kyluat_id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Xóa kỷ luật thành công" });
});
//----------
// Lấy danh sách chấm công (có thể lọc theo nhân viên hoặc theo ngày)
app.get('/chamcong', async (req, res) => {
    const { nhanvien_id, ngay } = req.query;
    let query = supabase.from('chamcong').select('*, nhanvien (hoten, manv)');

    if (nhanvien_id) {
        query = query.eq('nhanvien_id', nhanvien_id);
    }
    if (ngay) {
        query = query.eq('ngay', ngay);
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Thêm/Điểm danh chấm công mới
app.post('/chamcong', async (req, res) => {
    const { nhanvien_id, ngay, trangthai } = req.body;

    const { data, error } = await supabase
        .from('chamcong')
        .insert([{ nhanvien_id, ngay, trangthai }])
        .select();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ message: "Chấm công thành công", data });
});

// Cập nhật trạng thái chấm công
app.put('/chamcong/:id', async (req, res) => {
    const { id } = req.params;
    const { trangthai } = req.body;

    const { data, error } = await supabase
        .from('chamcong')
        .update({ trangthai })
        .eq('chamcong_id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Cập nhật chấm công thành công", data });
});

// Xóa bản ghi chấm công
app.delete('/chamcong/:id', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('chamcong').delete().eq('chamcong_id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Xóa chấm công thành công" });
});
//----chức năng chấm công cho app mobile 
// Thêm API chấm công nhanh
// 1. Cấu hình Multer để lưu file ảnh tạm thời vào thư mục "uploads" trên Server
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'chamcong_' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

const OFFICE_LAT = 10.7494445; 
const OFFICE_LNG = 106.6922274;
const ALLOWED_DISTANCE = 100;
//10.7494445 106.6922274
// Hàm tính khoảng cách giữa 2 tọa độ GPS (Công thức Haversine)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const toRad = (angle) => (angle * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// 2. API Endpoint nhận dữ liệu chấm công từ App
// 2. API Endpoint nhận dữ liệu chấm công từ App
app.post('/api/chamcong/tudong', upload.single('hinhanh'), async (req, res) => {
    try {
        const { email, latitude, longitude } = req.body;
        const imageFile = req.file; // File ảnh được gửi lên từ App

        console.log("----------------------------------------");
        console.log("📥 Nhận yêu cầu chấm công từ email:", email);
        console.log("📍 Tọa độ GPS:", latitude, longitude);
        console.log("📸 File ảnh đính kèm:", imageFile ? imageFile.filename : "Không có");

        // Kiểm tra dữ liệu đầu vào
        if (!email || !latitude || !longitude) {
            return res.status(400).json({ error: "Thiếu thông tin định danh hoặc vị trí!" });
        }

        // Kiểm tra xem có file ảnh gửi lên không
        if (!imageFile) {
            return res.status(400).json({ error: "Thiếu ảnh xác thực khuôn mặt từ camera!" });
        }

        // Kiểm tra khoảng cách GPS tại Server (Chống gian lận tọa độ giả mạo từ Client)
        const distance = calculateDistance(parseFloat(latitude), parseFloat(longitude), OFFICE_LAT, OFFICE_LNG);
        console.log("📏 Khoảng cách tính ở Server:", Math.round(distance), "mét");

        if (distance > 100) {
            // Xóa file ảnh tạm nếu vị trí không hợp lệ để rác không đầy ổ cứng
            if (fs.existsSync(imageFile.path)) fs.unlinkSync(imageFile.path);
            return res.status(400).json({ 
                error: `Khoảng cách không hợp lệ! Bạn đang cách công ty ${Math.round(distance)}m (Giới hạn <= 100m).` 
            });
        }

        // --- 1. UPLOAD ẢNH LÊN SUPABASE STORAGE ---
        const fileBuffer = fs.readFileSync(imageFile.path);
        const fileName = `chamcong_${Date.now()}_${Math.round(Math.random() * 1000)}.jpg`;

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('cham-cong-images') // ⚠️ Đảm bảo tên bucket trên Supabase khớp hoàn toàn với tên này
            .upload(fileName, fileBuffer, {
                contentType: 'image/jpeg',
                upsert: false
            });

        // Xóa file tạm trên server ngay sau khi upload xong để giải phóng dung lượng ổ cứng
        if (fs.existsSync(imageFile.path)) fs.unlinkSync(imageFile.path);

        if (uploadError) {
            console.error("❌ Lỗi upload ảnh lên Supabase Storage:", uploadError.message);
            return res.status(500).json({ error: "Không thể tải ảnh lên hệ thống lưu trữ: " + uploadError.message });
        }

        // --- 2. LẤY PUBLIC URL CỦA ẢNH ---
        const { data: publicUrlData } = supabase.storage
            .from('cham-cong-images')
            .getPublicUrl(fileName);

        const imageUrl = publicUrlData.publicUrl;
        console.log("🔗 Đường dẫn Public URL của ảnh:", imageUrl);

        // --- 3. LƯU THÔNG TIN CHẤM CÔNG VÀO DATABASE ---
        // (Đảm bảo bạn đã có bảng 'lich_su_cham_cong' trong Supabase với các cột tương ứng)
        const { error: dbError } = await supabase
            .from('lich_su_cham_cong')
            .insert([
                { 
                    email: email, 
                    latitude: parseFloat(latitude), 
                    longitude: parseFloat(longitude), 
                    hinh_anh_url: imageUrl, 
                    thoi_gian: new Date() 
                }
            ]);

        if (dbError) {
            console.error("❌ Lỗi lưu Database:", dbError.message);
            return res.status(500).json({ error: "Lỗi lưu dữ liệu vào cơ sở dữ liệu: " + dbError.message });
        }

        // --- 4. PHẢN HỒI THÀNH CÔNG VỀ CHO APP ---
        return res.status(200).json({
            success: true,
            message: `Chấm công thành công! Khoảng cách tới công ty: ${Math.round(distance)}m.`,
            data: {
                email: email,
                time: new Date(),
                distance: Math.round(distance),
                imageUrl: imageUrl
            }
        });

    } catch (err) {
        console.error("❌ Lỗi xử lý Server:", err);
        return res.status(500).json({ error: "Lỗi hệ thống nội bộ từ Server." });
    }
});
//app.listen(process.env.PORT || 3001, () => console.log('Server Supabase chạy cổng 3001'));
// Thay vì app.listen(3001, ...)
// Hãy xuất app ra để Vercel sử dụng:
// --- KHỞI ĐỘNG SERVER (Hỗ trợ cả Localhost và Vercel Serverless) ---
if (process.env.NODE_ENV !== 'production') {
    const IP = '192.168.0.134'; 
    const PORT = process.env.PORT || 3002;
    app.listen(PORT, IP, () => {
        console.log(`🚀 Server đang chạy tại http://${IP}:${PORT}`);
    });
}
module.exports = app;
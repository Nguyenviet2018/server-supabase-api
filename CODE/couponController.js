// Giả lập dữ liệu hoặc logic tính toán phức tạp
const getAvailableCoupons = (req, res) => {
    // Logic: Giả sử lấy từ database ra danh sách coupon
    const coupons = [
        { code: 'GIAM20', description: 'Giảm 20% cho mọi đơn hàng', discount: '20%' },
        { code: 'FREESHIP', description: 'Miễn phí vận chuyển toàn quốc', discount: '100%' },
        { code: 'WELCOME2026', description: 'Mã chào mừng năm mới 2026', discount: '50k' }
    ];

    console.log(`[EXECUTE] File couponController.js đang thực thi logic để đáp ứng Frontend...`);
    
    // Trả kết quả về cho Frontend
    res.json({
        success: true,
        data: coupons
    });
};

// Xuất hàm này ra để các file khác (như server.js) có thể gọi thực thi
module.exports = {
    getAvailableCoupons
};
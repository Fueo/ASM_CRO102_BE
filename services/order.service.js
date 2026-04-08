const Order = require('../models/order.model');
const OrderDetail = require('../models/orderDetail.model');
const CartItem = require('../models/cartItem.model');
const Product = require('../models/product.model');
const mongoose = require('mongoose');

// ==========================================
// 1. TẠO ĐƠN HÀNG TỪ GIỎ HÀNG
// ==========================================
const createOrderFromCart = async (userId, orderData) => {
    // Dùng Session (Transaction) để đảm bảo an toàn dữ liệu: Nếu 1 bước lỗi, toàn bộ sẽ bị hủy
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { name, email, address, phone, shippingMethod, paymentMethod } = orderData;

        // 1. Lấy tất cả CartItem ĐANG ĐƯỢC CHỌN của User này
        const selectedCartItems = await CartItem.find({ userId, isSelected: true })
            .populate('productId')
            .session(session);

        if (!selectedCartItems || selectedCartItems.length === 0) {
            throw new Error('Không có sản phẩm nào được chọn để thanh toán');
        }

        // 2. Tính toán tiền và kiểm tra tồn kho
        let subTotal = 0;
        const orderDetailsData = [];

        for (const item of selectedCartItems) {
            const product = item.productId;

            // Check tồn kho
            if (product.stockQuantity < item.quantity) {
                throw new Error(`Sản phẩm "${product.name}" không đủ số lượng trong kho`);
            }

            // Cộng dồn tiền hàng
            subTotal += product.unitPrice * item.quantity;

            // Chuẩn bị data cho OrderDetail
            orderDetailsData.push({
                productId: product._id,
                quantity: item.quantity,
                unitPrice: product.unitPrice,
                total: product.unitPrice * item.quantity
            });

            // (Tùy chọn) Trừ số lượng tồn kho của Product ngay lúc tạo đơn
            // await Product.findByIdAndUpdate(product._id, { $inc: { stockQuantity: -item.quantity } }, { session });
        }

        // 3. Tính phí vận chuyển và tổng hóa đơn
        const shippingFee = shippingMethod === 'fast' ? 15000 : 20000;
        const finalTotal = subTotal + shippingFee;

        // 4. Tạo Order (Bảng cha)
        const newOrder = await Order.create([{
            name,
            email,
            address,
            phone,
            shippingMethod,
            paymentMethod,
            shippingFee,
            total: finalTotal,
            userId,
            status: 'pending',
            paymentStatus: 'unpaid' // Nếu là Visa có thể đổi logic sau khi thanh toán cổng
        }], { session });

        const createdOrder = newOrder[0];

        // 5. Gắn OrderID vào các OrderDetail và lưu (Bảng con)
        const detailsToInsert = orderDetailsData.map(detail => ({
            ...detail,
            orderId: createdOrder._id
        }));
        await OrderDetail.insertMany(detailsToInsert, { session });

        // 6. XÓA CÁC SẢN PHẨM KHỎI GIỎ HÀNG (vì đã mua xong)
        await CartItem.deleteMany({ userId, isSelected: true }, { session });

        // Hoàn tất Transaction
        await session.commitTransaction();
        session.endSession();

        return createdOrder;

    } catch (error) {
        // Nếu có bất kỳ lỗi gì xảy ra, Rollback toàn bộ
        await session.abortTransaction();
        session.endSession();
        error.statusCode = error.statusCode || 400;
        throw error;
    }
};

// ==========================================
// 2. LẤY LỊCH SỬ ĐƠN HÀNG CỦA USER
// ==========================================
const getUserOrders = async (userId) => {
    // Tìm các order của user, sắp xếp mới nhất lên đầu
    const orders = await Order.find({ userId })
        .sort({ createdAt: -1 })
        .lean();

    return orders;
};

// ==========================================
// 3. LẤY CHI TIẾT 1 ĐƠN HÀNG
// ==========================================
const getOrderDetails = async (userId, orderId) => {
    // Kiểm tra Order có tồn tại và thuộc về User này không
    const order = await Order.findOne({ _id: orderId, userId }).lean();

    if (!order) {
        const error = new Error('Không tìm thấy đơn hàng');
        error.statusCode = 404;
        throw error;
    }

    // Lấy danh sách sản phẩm trong đơn hàng đó
    const details = await OrderDetail.find({ orderId })
        .populate('productId', 'name imageURL size origin') // Lấy thêm ảnh và tên từ bảng Product
        .lean();

    return {
        ...order,
        items: details
    };
};

module.exports = {
    createOrderFromCart,
    getUserOrders,
    getOrderDetails
};
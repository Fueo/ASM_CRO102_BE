const Order = require('../models/order.model');
const OrderDetail = require('../models/orderDetail.model');
const CartItem = require('../models/cartItem.model');
const Product = require('../models/product.model');
const ProductImage = require('../models/productImage.model'); // 1. IMPORT THÊM BẢNG ẢNH
const mongoose = require('mongoose');

// ==========================================
// HÀM HỖ TRỢ: LẤY ẢNH TỪ BẢNG PRODUCT IMAGE
// ==========================================
const attachImagesToOrderDetails = async (orderDetails) => {
    return await Promise.all(orderDetails.map(async (detail) => {
        if (detail.productId && detail.productId._id) {
            // 1. Tìm ảnh mặc định
            let imageDoc = await ProductImage.findOne({
                productId: detail.productId._id,
                isDefault: true
            });

            // 2. Nếu không có ảnh mặc định, lấy đại tấm đầu tiên
            if (!imageDoc) {
                imageDoc = await ProductImage.findOne({ productId: detail.productId._id });
            }

            // 3. Gắn link ảnh vào object productId
            detail.productId.imageURL = imageDoc
                ? imageDoc.imageURL
                : 'https://via.placeholder.com/300x300?text=No+Image';
        }
        return detail;
    }));
};

// ==========================================
// 1. TẠO ĐƠN HÀNG TỪ GIỎ HÀNG
// ==========================================
const createOrderFromCart = async (userId, orderData) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { name, email, address, phone, shippingMethod, paymentMethod } = orderData;

        const selectedCartItems = await CartItem.find({ userId, isSelected: true })
            .populate('productId')
            .session(session);

        if (!selectedCartItems || selectedCartItems.length === 0) {
            throw new Error('Không có sản phẩm nào được chọn để thanh toán');
        }

        let subTotal = 0;
        const orderDetailsData = [];

        for (const item of selectedCartItems) {
            const product = item.productId;

            if (product.stockQuantity < item.quantity) {
                throw new Error(`Sản phẩm "${product.name}" không đủ số lượng trong kho`);
            }

            subTotal += product.unitPrice * item.quantity;

            orderDetailsData.push({
                productId: product._id,
                quantity: item.quantity,
                unitPrice: product.unitPrice,
                total: product.unitPrice * item.quantity
            });
        }

        const shippingFee = shippingMethod === 'fast' ? 15000 : 20000;
        const finalTotal = subTotal + shippingFee;

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
            paymentStatus: 'unpaid'
        }], { session });

        const createdOrder = newOrder[0];

        const detailsToInsert = orderDetailsData.map(detail => ({
            ...detail,
            orderId: createdOrder._id
        }));
        await OrderDetail.insertMany(detailsToInsert, { session });

        await CartItem.deleteMany({ userId, isSelected: true }, { session });

        await session.commitTransaction();
        session.endSession();

        return createdOrder;

    } catch (error) {
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
    const orders = await Order.find({ userId })
        .sort({ createdAt: -1 })
        .lean();

    const ordersWithDetails = await Promise.all(orders.map(async (order) => {
        let items = await OrderDetail.find({ orderId: order._id })
            .populate('productId')
            .lean();

        // 2. GỌI HÀM GẮN ẢNH VÀO ĐÂY
        items = await attachImagesToOrderDetails(items);

        return { ...order, items };
    }));

    return ordersWithDetails;
};

// ==========================================
// 3. LẤY CHI TIẾT 1 ĐƠN HÀNG
// ==========================================
const getOrderDetails = async (userId, orderId) => {
    const order = await Order.findOne({ _id: orderId, userId }).lean();

    if (!order) {
        const error = new Error('Không tìm thấy đơn hàng');
        error.statusCode = 404;
        throw error;
    }

    let details = await OrderDetail.find({ orderId })
        .populate('productId', 'name size origin stockQuantity unitPrice') // Xóa chữ imageURL ở đây đi vì nó ko có trong Product
        .lean();

    // 3. GỌI HÀM GẮN ẢNH VÀO ĐÂY
    details = await attachImagesToOrderDetails(details);

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
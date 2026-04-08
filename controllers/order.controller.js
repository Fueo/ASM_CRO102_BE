const orderService = require('../services/order.service');

// Hàm Helper để lấy userId (tương tự bên cart)
const getUserIdFromRequest = (req) => {
    return req.user?.id || req.user?.userId || req.user?._id;
};

const createOrder = async (req, res) => {
    try {
        const userId = getUserIdFromRequest(req);
        if (!userId) {
            return res.status(401).json({ message: 'Không xác định được người dùng' });
        }

        const orderData = req.body;
        // Kiểm tra validate cơ bản
        if (!orderData.name || !orderData.phone || !orderData.address) {
            return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin giao hàng' });
        }

        const newOrder = await orderService.createOrderFromCart(userId, orderData);

        return res.status(201).json({
            message: 'Tạo đơn hàng thành công',
            data: newOrder
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            message: error.message || 'Lỗi server khi tạo đơn hàng'
        });
    }
};

const getMyOrders = async (req, res) => {
    try {
        const userId = getUserIdFromRequest(req);
        if (!userId) {
            return res.status(401).json({ message: 'Không xác định được người dùng' });
        }

        const orders = await orderService.getUserOrders(userId);

        return res.status(200).json({
            message: 'Lấy lịch sử đơn hàng thành công',
            data: orders
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            message: error.message || 'Lỗi server'
        });
    }
};

const getOrderById = async (req, res) => {
    try {
        const userId = getUserIdFromRequest(req);
        if (!userId) {
            return res.status(401).json({ message: 'Không xác định được người dùng' });
        }

        const { orderId } = req.params;
        const orderDetails = await orderService.getOrderDetails(userId, orderId);

        return res.status(200).json({
            message: 'Lấy chi tiết đơn hàng thành công',
            data: orderDetails
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            message: error.message || 'Lỗi server'
        });
    }
};

module.exports = {
    createOrder,
    getMyOrders,
    getOrderById
};
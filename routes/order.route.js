const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');

// Import middleware xác thực giống như bên user.route
const authMiddleware = require('../middlewares/auth.middleware');

// 1. Tạo đơn hàng mới từ giỏ hàng
// POST: /api/orders
router.post('/', authMiddleware, orderController.createOrder);

// 2. Xem danh sách lịch sử đơn hàng của bản thân
// GET: /api/orders
router.get('/', authMiddleware, orderController.getMyOrders);

// 3. Xem chi tiết 1 đơn hàng cụ thể
// GET: /api/orders/:orderId
router.get('/:orderId', authMiddleware, orderController.getOrderById);

module.exports = router;
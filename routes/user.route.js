const express = require('express');
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

// Routes xác thực
router.post('/register', userController.register);
router.post('/login', userController.login);
router.post('/google-login', userController.loginWithGoogle);
router.post('/refresh', userController.refreshToken);
router.post('/logout', authMiddleware, userController.logout);

// Routes quản lý Profile (Yêu cầu đăng nhập - authMiddleware)
router.get('/me', authMiddleware, userController.getMe);
router.put('/me', authMiddleware, userController.updateProfile); // API Chỉnh sửa thông tin

module.exports = router;
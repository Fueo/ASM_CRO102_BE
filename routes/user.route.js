const express = require('express');
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/register', userController.register);
router.post('/login', userController.login);
router.post('/google-login', userController.loginWithGoogle);
router.post('/refresh', userController.refreshToken);
router.post('/logout', authMiddleware, userController.logout);
router.get('/me', authMiddleware, userController.getMe);

module.exports = router;
const userService = require('../services/user.service');

const register = async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'name, email và password là bắt buộc' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Mật khẩu quá ngắn, vui lòng nhập ít nhất 6 ký tự' });
        }

        const result = await userService.register({ name, email, password, phone });

        return res.status(201).json({
            message: 'Đăng ký thành công',
            data: result,
        });
    } catch (error) {
        return res.status(400).json({ message: error.message || 'Đăng ký thất bại' });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'email và password là bắt buộc' });
        }

        const result = await userService.login({ email, password });

        return res.status(200).json({
            message: 'Đăng nhập thành công',
            data: result,
        });
    } catch (error) {
        return res.status(400).json({ message: error.message || 'Đăng nhập thất bại' });
    }
};

const loginWithGoogle = async (req, res) => {
    try {
        const { idToken } = req.body;

        if (!idToken) {
            return res.status(400).json({ message: 'idToken là bắt buộc' });
        }

        const result = await userService.loginWithGoogle({ idToken });

        return res.status(200).json({
            message: 'Đăng nhập Google thành công',
            data: result,
        });
    } catch (error) {
        return res.status(400).json({ message: error.message || 'Đăng nhập Google thất bại' });
    }
};

const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ message: 'refreshToken là bắt buộc' });
        }

        const result = await userService.refreshUserToken({ refreshToken });

        return res.status(200).json({
            message: 'Làm mới token thành công',
            data: result,
        });
    } catch (error) {
        return res.status(401).json({ message: error.message || 'Làm mới token thất bại' });
    }
};

const logout = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        let accessToken = null;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            accessToken = authHeader.split(' ')[1];
        }

        if (!accessToken && req.body && req.body.accessToken) {
            accessToken = req.body.accessToken;
        }

        if (!accessToken) {
            return res.status(400).json({ message: 'accessToken là bắt buộc' });
        }

        const result = await userService.logout({ accessToken });

        return res.status(200).json({
            message: result.message,
        });
    } catch (error) {
        return res.status(400).json({ message: error.message || 'Đăng xuất thất bại' });
    }
};

const getMe = async (req, res) => {
    try {
        const user = await userService.getProfile(req.user.userId);

        return res.status(200).json({
            message: 'Lấy thông tin user thành công',
            data: user,
        });
    } catch (error) {
        return res.status(404).json({ message: error.message || 'Không lấy được thông tin user' });
    }
};

// ==========================================
// CẬP NHẬT THÔNG TIN NGƯỜI DÙNG (MỚI)
// ==========================================
const updateProfile = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { name, email, address, phone } = req.body;

        const updatedUser = await userService.updateProfile(userId, {
            name, email, address, phone
        });

        return res.status(200).json({
            message: 'Cập nhật thông tin thành công',
            data: updatedUser,
        });
    } catch (error) {
        return res.status(400).json({ message: error.message || 'Cập nhật thông tin thất bại' });
    }
};

module.exports = {
    register,
    login,
    loginWithGoogle,
    refreshToken,
    logout,
    getMe,
    updateProfile, // Export controller mới
};
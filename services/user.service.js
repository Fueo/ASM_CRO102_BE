const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { generateAccessToken, generateRefreshToken } = require('../utils/jwt');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Đã bổ sung address vào object trả về
const sanitizeUser = (user) => {
    return {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        avatarURL: user.avatarURL,
        authProvider: user.authProvider,
        createdAt: user.createdAt,
    };
};

const register = async ({ name, email, password, phone }) => {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw new Error('Email đã tồn tại');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
        name,
        email,
        hashedPassword,
        phone: phone || null,
        authProvider: 'local',
    });

    return {
        user: sanitizeUser(user),
    };
};

const login = async ({ email, password }) => {
    const user = await User.findOne({ email });
    if (!user) {
        throw new Error('Email hoặc mật khẩu không đúng');
    }

    if (!user.hashedPassword) {
        throw new Error('Tài khoản này chưa đặt mật khẩu, hãy đăng nhập bằng Google');
    }

    const isMatch = await bcrypt.compare(password, user.hashedPassword);
    if (!isMatch) {
        throw new Error('Email hoặc mật khẩu không đúng');
    }

    const payload = {
        userId: user._id,
        email: user.email,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    user.hashedRefreshToken = hashedRefreshToken;
    await user.save();

    return {
        user: sanitizeUser(user),
        accessToken,
        refreshToken,
    };
};

const loginWithGoogle = async ({ idToken }) => {
    const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payloadGoogle = ticket.getPayload();

    if (!payloadGoogle || !payloadGoogle.email) {
        throw new Error('Google token không hợp lệ');
    }

    const {
        sub: googleId,
        email,
        name,
        picture,
        email_verified,
    } = payloadGoogle;

    if (!email_verified) {
        throw new Error('Email Google chưa được xác minh');
    }

    let user = await User.findOne({ email });

    if (!user) {
        user = await User.create({
            name: name || email.split('@')[0],
            email,
            googleId,
            avatarURL: picture || null,
            authProvider: 'google',
            hashedPassword: null,
        });
    } else {
        if (!user.googleId) user.googleId = googleId;
        if (!user.avatarURL && picture) user.avatarURL = picture;
        if (!user.name && name) user.name = name;
        if (user.authProvider !== 'google' && !user.hashedPassword) {
            user.authProvider = 'google';
        }
        await user.save();
    }

    const jwtPayload = {
        userId: user._id,
        email: user.email,
    };

    const accessToken = generateAccessToken(jwtPayload);
    const refreshToken = generateRefreshToken(jwtPayload);
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    user.hashedRefreshToken = hashedRefreshToken;
    await user.save();

    return {
        user: sanitizeUser(user),
        accessToken,
        refreshToken,
    };
};

const refreshUserToken = async ({ refreshToken }) => {
    if (!refreshToken) {
        throw new Error('Refresh token là bắt buộc');
    }

    let decoded;
    try {
        decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
        throw new Error('Refresh token không hợp lệ hoặc đã hết hạn');
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
        throw new Error('Không tìm thấy user');
    }

    if (!user.hashedRefreshToken) {
        throw new Error('Refresh token không tồn tại');
    }

    const isMatch = await bcrypt.compare(refreshToken, user.hashedRefreshToken);
    if (!isMatch) {
        throw new Error('Refresh token không hợp lệ');
    }

    const payload = {
        userId: user._id,
        email: user.email,
    };

    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);
    const newHashedRefreshToken = await bcrypt.hash(newRefreshToken, 10);

    user.hashedRefreshToken = newHashedRefreshToken;
    await user.save();

    return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
    };
};

const logout = async ({ accessToken }) => {
    if (!accessToken) {
        throw new Error('Access token là bắt buộc');
    }

    let decoded;
    try {
        decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET, { ignoreExpiration: true });
    } catch (error) {
        throw new Error('Access token không hợp lệ');
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
        throw new Error('Không tìm thấy user');
    }

    user.hashedRefreshToken = null;
    await user.save();

    return {
        message: 'Đăng xuất thành công',
    };
};

const getProfile = async (userId) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('Không tìm thấy user');
    }

    return sanitizeUser(user);
};

// ==========================================
// HÀM CẬP NHẬT THÔNG TIN NGƯỜI DÙNG (MỚI)
// ==========================================
const updateProfile = async (userId, updateData) => {
    const { name, email, address, phone } = updateData;

    const user = await User.findById(userId);
    if (!user) {
        throw new Error('Không tìm thấy user');
    }

    // Nếu đổi email, kiểm tra trùng lặp
    if (email && email !== user.email) {
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            throw new Error('Email này đã được sử dụng bởi tài khoản khác');
        }
        user.email = email;
    }

    // Cập nhật các trường còn lại
    if (name) user.name = name;
    if (address !== undefined) user.address = address;
    if (phone !== undefined) user.phone = phone;

    await user.save();

    return sanitizeUser(user);
};

module.exports = {
    register,
    login,
    loginWithGoogle,
    refreshUserToken,
    logout,
    getProfile,
    updateProfile, // Export hàm mới
};
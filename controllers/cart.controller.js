const cartService = require('../services/cart.service');

const getMyCart = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;

        const cart = await cartService.getCartByUserId(userId);

        return res.status(200).json({
            message: 'Lấy giỏ hàng thành công',
            data: cart,
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            message: error.message || 'Lỗi server',
        });
    }
};

const addProductToCart = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const { productId, quantity } = req.body;

        const cartItem = await cartService.addToCart(userId, productId, quantity);

        return res.status(201).json({
            message: 'Thêm sản phẩm vào giỏ hàng thành công',
            data: cartItem,
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            message: error.message || 'Lỗi server',
        });
    }
};

const updateCartItemQuantity = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const { cartItemId } = req.params;
        const { quantity } = req.body;

        const updatedCartItem = await cartService.updateCartItemQuantity(
            userId,
            cartItemId,
            quantity
        );

        return res.status(200).json({
            message: 'Cập nhật số lượng sản phẩm thành công',
            data: updatedCartItem,
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            message: error.message || 'Lỗi server',
        });
    }
};

const toggleCartItemSelection = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const { cartItemId } = req.params;
        const { isSelected } = req.body;

        const updatedCartItem = await cartService.toggleCartItemSelection(
            userId,
            cartItemId,
            isSelected
        );

        return res.status(200).json({
            message: 'Cập nhật trạng thái chọn sản phẩm thành công',
            data: updatedCartItem,
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            message: error.message || 'Lỗi server',
        });
    }
};

const toggleAllCartItemsSelection = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const { isSelected } = req.body;

        const cart = await cartService.toggleAllCartItemsSelection(userId, isSelected);

        return res.status(200).json({
            message: 'Cập nhật trạng thái chọn tất cả sản phẩm thành công',
            data: cart,
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            message: error.message || 'Lỗi server',
        });
    }
};

const removeCartItem = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const { cartItemId } = req.params;

        await cartService.removeCartItem(userId, cartItemId);

        return res.status(200).json({
            message: 'Xóa sản phẩm khỏi giỏ hàng thành công',
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            message: error.message || 'Lỗi server',
        });
    }
};

const clearSelectedCartItems = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;

        const result = await cartService.clearSelectedCartItems(userId);

        return res.status(200).json({
            message: 'Xóa các sản phẩm đã chọn thành công',
            data: result,
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            message: error.message || 'Lỗi server',
        });
    }
};

module.exports = {
    getMyCart,
    addProductToCart,
    updateCartItemQuantity,
    toggleCartItemSelection,
    toggleAllCartItemsSelection,
    removeCartItem,
    clearSelectedCartItems,
};
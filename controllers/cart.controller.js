const cartService = require('../services/cart.service');

// =====================================================================
// HELPER FUNCTIONS (Xử lý dữ liệu trước khi trả về Frontend)
// =====================================================================

// Cấu hình link ảnh mặc định (Bạn có thể đổi link này thành logo của shop bạn)
const DEFAULT_IMAGE_URL = 'https://via.placeholder.com/300x300?text=No+Image';

// Helper 1: Chèn ảnh mặc định cho 1 Item lẻ
const formatCartItem = (item) => {
    if (!item || !item.productId) return item;

    // Convert sang object thuần (Plain Object) nếu dữ liệu đang là Mongoose Document
    const plainItem = item.toObject ? item.toObject() : item;

    // Kiểm tra xem sản phẩm đã có thuộc tính ảnh chưa (imageURL hoặc image)
    if (!plainItem.productId.imageURL && !plainItem.productId.image) {
        plainItem.productId.imageURL = DEFAULT_IMAGE_URL;
    }

    return plainItem;
};

// Helper 2: Chèn ảnh mặc định cho toàn bộ Giỏ hàng (dùng khi fetch full cart)
const formatCart = (cart) => {
    if (!cart || !cart.items) return cart;

    // Tạo một bản sao để thao tác, tránh lỗi biến đổi dữ liệu tham chiếu
    const formattedCart = { ...cart };
    formattedCart.items = cart.items.map(formatCartItem);

    return formattedCart;
};

const getUserIdFromRequest = (req) => {
    return req.user?.id || req.user?.userId || req.user?._id;
};

// =====================================================================
// CONTROLLERS
// =====================================================================

const getMyCart = async (req, res) => {
    try {
        const userId = getUserIdFromRequest(req);

        if (!userId) {
            return res.status(401).json({
                message: 'Không xác định được người dùng',
            });
        }

        const cart = await cartService.getCartByUserId(userId);

        return res.status(200).json({
            message: 'Lấy giỏ hàng thành công',
            data: formatCart(cart), // SỬ DỤNG HELPER Ở ĐÂY
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            message: error.message || 'Lỗi server',
        });
    }
};

const addProductToCart = async (req, res) => {
    try {
        const userId = getUserIdFromRequest(req);

        if (!userId) {
            return res.status(401).json({
                message: 'Không xác định được người dùng',
            });
        }

        const { productId, quantity } = req.body;

        const cartItem = await cartService.addToCart(userId, productId, quantity);

        return res.status(201).json({
            message: 'Thêm sản phẩm vào giỏ hàng thành công',
            data: formatCartItem(cartItem), // SỬ DỤNG HELPER Ở ĐÂY
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            message: error.message || 'Lỗi server',
        });
    }
};

const updateCartItemQuantity = async (req, res) => {
    try {
        const userId = getUserIdFromRequest(req);

        if (!userId) {
            return res.status(401).json({
                message: 'Không xác định được người dùng',
            });
        }

        const { cartItemId } = req.params;
        const { quantity } = req.body;

        const updatedCartItem = await cartService.updateCartItemQuantity(
            userId,
            cartItemId,
            quantity
        );

        return res.status(200).json({
            message: 'Cập nhật số lượng sản phẩm thành công',
            data: formatCartItem(updatedCartItem), // SỬ DỤNG HELPER Ở ĐÂY
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            message: error.message || 'Lỗi server',
        });
    }
};

const toggleCartItemSelection = async (req, res) => {
    try {
        const userId = getUserIdFromRequest(req);

        if (!userId) {
            return res.status(401).json({
                message: 'Không xác định được người dùng',
            });
        }

        const { cartItemId } = req.params;
        const { isSelected } = req.body;

        const updatedCartItem = await cartService.toggleCartItemSelection(
            userId,
            cartItemId,
            isSelected
        );

        return res.status(200).json({
            message: 'Cập nhật trạng thái chọn sản phẩm thành công',
            data: formatCartItem(updatedCartItem), // SỬ DỤNG HELPER Ở ĐÂY
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            message: error.message || 'Lỗi server',
        });
    }
};

const toggleAllCartItemsSelection = async (req, res) => {
    try {
        const userId = getUserIdFromRequest(req);

        if (!userId) {
            return res.status(401).json({
                message: 'Không xác định được người dùng',
            });
        }

        const { isSelected } = req.body;

        const cart = await cartService.toggleAllCartItemsSelection(userId, isSelected);

        return res.status(200).json({
            message: 'Cập nhật trạng thái chọn tất cả sản phẩm thành công',
            data: formatCart(cart), // SỬ DỤNG HELPER Ở ĐÂY
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            message: error.message || 'Lỗi server',
        });
    }
};

const removeCartItem = async (req, res) => {
    try {
        const userId = getUserIdFromRequest(req);

        if (!userId) {
            return res.status(401).json({
                message: 'Không xác định được người dùng',
            });
        }

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
        const userId = getUserIdFromRequest(req);

        if (!userId) {
            return res.status(401).json({
                message: 'Không xác định được người dùng',
            });
        }

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
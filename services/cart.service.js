const mongoose = require('mongoose');
const CartItem = require('../models/cartItem.model');
const Product = require('../models/product.model');
const ProductImage = require('../models/productImage.model'); // Đã thêm Model ProductImage

// ============================================================================
// HÀM HỖ TRỢ (HELPERS)
// ============================================================================

const calculateItemTotal = (unitPrice, quantity) => {
    return unitPrice * quantity;
};

// Hàm móc ảnh từ Collection ProductImage và nhét vào Product
const attachImagesToCartItems = async (cartItems) => {
    return await Promise.all(cartItems.map(async (item) => {
        if (item.productId && item.productId._id) {
            // 1. Tìm ảnh mặc định
            let imageDoc = await ProductImage.findOne({
                productId: item.productId._id,
                isDefault: true
            });

            // 2. Nếu không có ảnh mặc định, lấy đại tấm đầu tiên
            if (!imageDoc) {
                imageDoc = await ProductImage.findOne({ productId: item.productId._id });
            }

            // 3. Gắn link ảnh vào object, nếu không có ảnh nào trong DB thì dùng ảnh No Image
            item.productId.imageURL = imageDoc
                ? imageDoc.imageURL
                : 'https://via.placeholder.com/300x300?text=No+Image';
        }
        return item;
    }));
};

// ============================================================================
// LOGIC XỬ LÝ CHÍNH CỦA GIỎ HÀNG (SERVICES)
// ============================================================================

const getCartByUserId = async (userId) => {
    // Thêm .lean() để biến đổi thành Object thuần giúp dễ gắn thêm trường ảnh
    let cartItems = await CartItem.find({ userId })
        .populate('productId')
        .lean();

    // Gắn ảnh cho toàn bộ danh sách
    cartItems = await attachImagesToCartItems(cartItems);

    const totalCartAmount = cartItems.reduce((sum, item) => {
        if (!item.isSelected) return sum;
        return sum + item.total;
    }, 0);

    const totalSelectedItems = cartItems.reduce((sum, item) => {
        if (!item.isSelected) return sum;
        return sum + item.quantity;
    }, 0);

    return {
        items: cartItems,
        summary: {
            totalItems: cartItems.length,
            totalSelectedItems,
            totalCartAmount,
        },
    };
};

const addToCart = async (userId, productId, quantity = 1) => {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
        const error = new Error('Product ID không hợp lệ');
        error.statusCode = 400;
        throw error;
    }

    const product = await Product.findById(productId);

    if (!product) {
        const error = new Error('Sản phẩm không tồn tại');
        error.statusCode = 404;
        throw error;
    }

    if (quantity < 1) {
        const error = new Error('Số lượng phải lớn hơn hoặc bằng 1');
        error.statusCode = 400;
        throw error;
    }

    const existingCartItem = await CartItem.findOne({ userId, productId });
    let savedItemId;

    if (existingCartItem) {
        const newQuantity = existingCartItem.quantity + quantity;

        if (newQuantity > product.stockQuantity) {
            const error = new Error('Số lượng vượt quá tồn kho');
            error.statusCode = 400;
            throw error;
        }

        existingCartItem.quantity = newQuantity;
        existingCartItem.total = calculateItemTotal(product.unitPrice, newQuantity);

        await existingCartItem.save();
        savedItemId = existingCartItem._id;
    } else {
        if (quantity > product.stockQuantity) {
            const error = new Error('Số lượng vượt quá tồn kho');
            error.statusCode = 400;
            throw error;
        }

        const cartItem = await CartItem.create({
            userId,
            productId,
            quantity,
            total: calculateItemTotal(product.unitPrice, quantity),
            isSelected: true,
        });
        savedItemId = cartItem._id;
    }

    // Lấy item vừa lưu, populate và gắn ảnh trước khi trả về
    const populatedItem = await CartItem.findById(savedItemId).populate('productId').lean();
    const resultWithImage = await attachImagesToCartItems([populatedItem]);
    return resultWithImage[0];
};

const updateCartItemQuantity = async (userId, cartItemId, quantity) => {
    if (!mongoose.Types.ObjectId.isValid(cartItemId)) {
        const error = new Error('Cart item ID không hợp lệ');
        error.statusCode = 400;
        throw error;
    }

    if (quantity < 1) {
        const error = new Error('Số lượng phải lớn hơn hoặc bằng 1');
        error.statusCode = 400;
        throw error;
    }

    const cartItem = await CartItem.findOne({ _id: cartItemId, userId });

    if (!cartItem) {
        const error = new Error('Cart item không tồn tại');
        error.statusCode = 404;
        throw error;
    }

    const product = await Product.findById(cartItem.productId);

    if (!product) {
        const error = new Error('Sản phẩm không tồn tại');
        error.statusCode = 404;
        throw error;
    }

    if (quantity > product.stockQuantity) {
        const error = new Error('Số lượng vượt quá tồn kho');
        error.statusCode = 400;
        throw error;
    }

    cartItem.quantity = quantity;
    cartItem.total = calculateItemTotal(product.unitPrice, quantity);

    await cartItem.save();

    // Trả về item đã update kèm ảnh
    const populatedItem = await CartItem.findById(cartItem._id).populate('productId').lean();
    const resultWithImage = await attachImagesToCartItems([populatedItem]);
    return resultWithImage[0];
};

const toggleCartItemSelection = async (userId, cartItemId, isSelected) => {
    if (!mongoose.Types.ObjectId.isValid(cartItemId)) {
        const error = new Error('Cart item ID không hợp lệ');
        error.statusCode = 400;
        throw error;
    }

    const cartItem = await CartItem.findOneAndUpdate(
        { _id: cartItemId, userId },
        { isSelected },
        { new: true }
    ).populate('productId').lean(); // Dùng lean để dễ gắn ảnh

    if (!cartItem) {
        const error = new Error('Cart item không tồn tại');
        error.statusCode = 404;
        throw error;
    }

    // Trả về item kèm ảnh
    const resultWithImage = await attachImagesToCartItems([cartItem]);
    return resultWithImage[0];
};

const toggleAllCartItemsSelection = async (userId, isSelected) => {
    await CartItem.updateMany({ userId }, { isSelected });

    // Tái sử dụng hàm getCartByUserId (hàm này đã có sẵn logic móc ảnh)
    return await getCartByUserId(userId);
};

const removeCartItem = async (userId, cartItemId) => {
    if (!mongoose.Types.ObjectId.isValid(cartItemId)) {
        const error = new Error('Cart item ID không hợp lệ');
        error.statusCode = 400;
        throw error;
    }

    const deletedItem = await CartItem.findOneAndDelete({
        _id: cartItemId,
        userId,
    });

    if (!deletedItem) {
        const error = new Error('Cart item không tồn tại');
        error.statusCode = 404;
        throw error;
    }

    return deletedItem;
};

const clearSelectedCartItems = async (userId) => {
    const result = await CartItem.deleteMany({
        userId,
        isSelected: true,
    });

    return {
        deletedCount: result.deletedCount,
    };
};

module.exports = {
    getCartByUserId,
    addToCart,
    updateCartItemQuantity,
    toggleCartItemSelection,
    removeCartItem,
    clearSelectedCartItems,
    toggleAllCartItemsSelection,
};
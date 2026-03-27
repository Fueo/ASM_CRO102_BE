const mongoose = require('mongoose');
const CartItem = require('../models/cartItem.model');
const Product = require('../models/product.model');

const calculateItemTotal = (unitPrice, quantity) => {
    return unitPrice * quantity;
};

const getCartByUserId = async (userId) => {
    const cartItems = await CartItem.find({ userId })
        .populate('productId')
        .lean();

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

        return await CartItem.findById(existingCartItem._id).populate('productId');
    }

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

    return await CartItem.findById(cartItem._id).populate('productId');
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

    return await CartItem.findById(cartItem._id).populate('productId');
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
    ).populate('productId');

    if (!cartItem) {
        const error = new Error('Cart item không tồn tại');
        error.statusCode = 404;
        throw error;
    }

    return cartItem;
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

const toggleAllCartItemsSelection = async (userId, isSelected) => {
    await CartItem.updateMany({ userId }, { isSelected });

    return await getCartByUserId(userId);
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
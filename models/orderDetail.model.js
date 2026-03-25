const mongoose = require('mongoose');

const orderDetailSchema = new mongoose.Schema(
    {
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
        },
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order',
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
        },
        total: {
            type: Number,
            required: true,
            min: 0,
        },
        unitPrice: {
            type: Number,
            required: true,
            min: 0,
        },
    },
    {
        versionKey: false,
    }
);

module.exports = mongoose.model('OrderDetail', orderDetailSchema);
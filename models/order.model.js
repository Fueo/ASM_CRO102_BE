const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
        address: {
            type: String,
            required: true,
            trim: true,
        },
        phone: {
            type: String,
            required: true,
            trim: true,
        },
        shippingMethod: {
            type: String,
            required: true,
            trim: true,
        },
        shippingFee: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        paymentMethod: {
            type: String,
            required: true,
            trim: true,
        },
        total: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        status: {
            type: String,
            enum: ['pending', 'confirmed', 'shipping', 'completed', 'cancelled'],
            default: 'pending',
        },
        paymentStatus: {
            type: String,
            enum: ['unpaid', 'paid', 'failed', 'refunded'],
            default: 'unpaid',
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

module.exports = mongoose.model('Order', orderSchema);
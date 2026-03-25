const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        stockQuantity: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        unitPrice: {
            type: Number,
            required: true,
            min: 0,
        },
        size: {
            type: String,
            trim: true,
            default: null,
        },
        origin: {
            type: String,
            trim: true,
            default: null,
        },
    },
    {
        versionKey: false,
    }
);

module.exports = mongoose.model('Product', productSchema);
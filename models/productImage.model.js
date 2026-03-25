const mongoose = require('mongoose');

const productImageSchema = new mongoose.Schema(
    {
        imageURL: {
            type: String,
            required: true,
            trim: true,
        },
        context: {
            type: String,
            trim: true,
            default: null,
        },
        isDefault: {
            type: Boolean,
            default: false,
        },
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
        },
    },
    {
        versionKey: false,
    }
);

module.exports = mongoose.model('ProductImage', productImageSchema);
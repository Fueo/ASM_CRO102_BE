const mongoose = require('mongoose');

const cateProductSchema = new mongoose.Schema(
    {
        categoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            required: true,
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

cateProductSchema.index({ categoryId: 1, productId: 1 }, { unique: true });

module.exports = mongoose.model('CateProduct', cateProductSchema);
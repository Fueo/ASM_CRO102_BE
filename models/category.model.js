const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
    {
        categoryName: {
            type: String,
            required: true,
            trim: true,
        },
        categoryImage: {
            type: String,
            default: null,
            trim: true,
        },
        categoryParentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            default: null,
        },
    },
    {
        timestamps: false,
        versionKey: false,
    }
);

module.exports = mongoose.model('Category', categorySchema);
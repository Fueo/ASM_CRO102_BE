const Category = require('../models/category.model');

const getAllCategories = async () => {
    return await Category.find().lean();
};

// 1. Lấy danh sách các danh mục gốc (Không có cha)
const getParentCategories = async () => {
    return await Category.find({ categoryParentId: null }).lean();
};

// 2. Lấy danh sách các danh mục con dựa vào ID của cha
const getChildCategories = async (parentId) => {
    return await Category.find({ categoryParentId: parentId }).lean();
};

module.exports = {
    getAllCategories,
    getParentCategories,
    getChildCategories,
};
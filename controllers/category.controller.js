const categoryService = require('../services/category.service');

const getAllCategories = async (req, res) => {
    try {
        const categories = await categoryService.getAllCategories();
        return res.status(200).json({
            message: 'Lấy toàn bộ danh mục thành công',
            data: categories,
        });
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
};

// Lấy danh mục gốc (Ví dụ: Cây trồng, Chậu cây, Phụ kiện)
const getParentCategories = async (req, res) => {
    try {
        const categories = await categoryService.getParentCategories();
        return res.status(200).json({
            message: 'Lấy danh mục cha thành công',
            data: categories,
        });
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
};

// Lấy danh mục con (Ví dụ: click vào Cây trồng -> ra Ưa sáng, Ưa bóng)
const getChildCategories = async (req, res) => {
    try {
        const { id } = req.params; // Lấy ID của danh mục cha từ URL

        if (!id) {
            return res.status(400).json({ message: 'Thiếu ID danh mục cha' });
        }

        const categories = await categoryService.getChildCategories(id);
        return res.status(200).json({
            message: 'Lấy danh mục con thành công',
            data: categories,
        });
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
};

module.exports = {
    getAllCategories,
    getParentCategories,
    getChildCategories,
};
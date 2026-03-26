const productService = require('../services/product.service');

const getCategories = async (req, res) => {
    try {
        const categories = await productService.getCategories();

        return res.status(200).json({
            message: 'Lấy danh sách danh mục thành công',
            data: categories,
        });
    } catch (error) {
        return res.status(400).json({
            message: error.message || 'Lỗi khi lấy danh mục',
        });
    }
};

const getProducts = async (req, res) => {
    try {
        const { keyword, categoryId, limit, page } = req.query;

        const result = await productService.getProducts({
            keyword,
            categoryId,
            limit,
            page
        });

        return res.status(200).json({
            message: 'Lấy danh sách sản phẩm thành công',
            data: result,
        });
    } catch (error) {
        return res.status(400).json({
            message: error.message || 'Lỗi khi lấy danh sách sản phẩm',
        });
    }
};

const getProductById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                message: 'Thiếu ID sản phẩm',
            });
        }

        const product = await productService.getProductById(id);

        return res.status(200).json({
            message: 'Lấy chi tiết sản phẩm thành công',
            data: product,
        });
    } catch (error) {
        return res.status(404).json({
            message: error.message || 'Không tìm thấy sản phẩm',
        });
    }
};

const getHomeData = async (req, res) => {
    try {
        const homeData = await productService.getHomeData();

        return res.status(200).json({
            message: 'Lấy dữ liệu trang home thành công',
            data: homeData,
        });
    } catch (error) {
        return res.status(400).json({
            message: error.message || 'Lỗi khi lấy dữ liệu trang home',
        });
    }
};

module.exports = {
    getCategories,
    getProducts,
    getProductById,
    getHomeData,
};
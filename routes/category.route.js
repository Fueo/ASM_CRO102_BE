const express = require('express');
const categoryController = require('../controllers/category.controller');

const router = express.Router();

// Route: GET /api/categories/parents -> Lấy danh mục gốc
router.get('/parents', categoryController.getParentCategories);

// Route: GET /api/categories/:id/children -> Lấy danh mục con của 1 category cụ thể
router.get('/:id/children', categoryController.getChildCategories);

// Route: GET /api/categories -> Lấy tất cả (để dưới cùng tránh đụng độ parameter)
router.get('/', categoryController.getAllCategories);

module.exports = router;
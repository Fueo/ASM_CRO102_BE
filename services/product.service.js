const Product = require('../models/product.model');
const Category = require('../models/category.model');
const ProductImage = require('../models/productImage.model');
const CateProduct = require('../models/cateProduct.model');

// --- QUẢN LÝ DANH MỤC ---

const getCategories = async () => {
    return await Category.find().lean();
};

// helper: map default image theo productId
const getDefaultImageMap = async (productIds) => {
    const images = await ProductImage.find({
        productId: { $in: productIds },
        isDefault: true,
    }).lean();

    const imageMap = new Map();

    for (const image of images) {
        const key = image.productId.toString();

        // chỉ lấy 1 ảnh default đầu tiên nếu lỡ có dữ liệu trùng
        if (!imageMap.has(key)) {
            imageMap.set(key, image.imageURL);
        }
    }

    return imageMap;
};

// helper: map product theo id
const getProductMap = async (productIds) => {
    const products = await Product.find({
        _id: { $in: productIds },
    }).lean();

    const productMap = new Map();

    for (const product of products) {
        productMap.set(product._id.toString(), product);
    }

    return productMap;
};

// helper: build output product
const formatProduct = (product, imageMap) => {
    if (!product) return null;

    return {
        id: product._id,
        name: product.name,
        unitPrice: product.unitPrice,
        stockQuantity: product.stockQuantity,
        imageURL: imageMap.get(product._id.toString()) || null,
        size: product.size,
        origin: product.origin,
    };
};

// helper: build section category
const formatCategorySection = ({
    category,
    productIds,
    productMap,
    imageMap,
}) => {
    const products = productIds
        .map((productId) => productMap.get(productId.toString()))
        .filter(Boolean)
        .map((product) => formatProduct(product, imageMap));

    return {
        id: category._id,
        name: category.categoryName,
        image: category.categoryImage,
        products,
    };
};

// --- QUẢN LÝ SẢN PHẨM ---

const getProducts = async ({ keyword, categoryId, limit = 10, page = 1 }) => {
    limit = Number(limit) || 10;
    page = Number(page) || 1;

    const skip = (page - 1) * limit;
    const query = {};

    if (keyword) {
        query.name = { $regex: keyword, $options: 'i' };
    }

    if (categoryId) {
        const cateProducts = await CateProduct.find({ categoryId }).lean();
        const productIds = cateProducts.map((cp) => cp.productId);
        query._id = { $in: productIds };
    }

    const products = await Product.find(query)
        .skip(skip)
        .limit(limit)
        .lean();

    const productIds = products.map((p) => p._id);
    const imageMap = await getDefaultImageMap(productIds);

    const result = products.map((product) => ({
        id: product._id,
        name: product.name,
        unitPrice: product.unitPrice,
        stockQuantity: product.stockQuantity,
        imageURL: imageMap.get(product._id.toString()) || null,
    }));

    const totalItems = await Product.countDocuments(query);

    return {
        products: result,
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
        totalItems,
    };
};

const getProductById = async (productId) => {
    const product = await Product.findById(productId).lean();

    if (!product) {
        throw new Error('Không tìm thấy sản phẩm');
    }

    const images = await ProductImage.find({ productId }).lean();

    const cateProducts = await CateProduct.find({ productId }).lean();
    const categoryIds = cateProducts.map((cp) => cp.categoryId);

    const categories = await Category.find({
        _id: { $in: categoryIds },
    }).lean();

    return {
        ...product,
        images: images.map((img) => ({
            id: img._id,
            url: img.imageURL,
            isDefault: img.isDefault,
        })),
        categories: categories.map((cate) => ({
            id: cate._id,
            name: cate.categoryName,
        })),
    };
};

// --- HOME ---

const getHomeData = async () => {
    const FIXED_CATEGORY_NAMES = ['Hàng mới về', 'Combo chăm sóc'];
    const PRODUCT_LIMIT_PER_CATEGORY = 4;

    // 1. Lấy 2 category cố định
    const fixedCategories = await Category.find({
        categoryName: { $in: FIXED_CATEGORY_NAMES },
    }).lean();

    const fixedCategoryMapByName = new Map();
    for (const category of fixedCategories) {
        fixedCategoryMapByName.set(category.categoryName, category);
    }

    const fixedCategoryIds = fixedCategories.map((c) => c._id.toString());

    // 2. Lấy toàn bộ mapping category-product
    // sort _id desc để ưu tiên bản ghi mới hơn nếu muốn coi là "mới"
    const cateProducts = await CateProduct.find()
        .sort({ _id: -1 })
        .lean();

    // 3. Group productId theo categoryId, mỗi category chỉ lấy tối đa 4 product
    const categoryProductIdsMap = new Map();

    for (const item of cateProducts) {
        const categoryId = item.categoryId.toString();
        const productId = item.productId.toString();

        if (!categoryProductIdsMap.has(categoryId)) {
            categoryProductIdsMap.set(categoryId, []);
        }

        const currentProductIds = categoryProductIdsMap.get(categoryId);

        // tránh trùng product trong cùng category
        if (
            !currentProductIds.includes(productId) &&
            currentProductIds.length < PRODUCT_LIMIT_PER_CATEGORY
        ) {
            currentProductIds.push(productId);
        }
    }

    // 4. Lấy các category khác có product, loại trừ 2 category cố định
    const otherCategoryIds = [...categoryProductIdsMap.keys()].filter(
        (categoryId) => !fixedCategoryIds.includes(categoryId)
    );

    const otherCategories = await Category.find({
        _id: { $in: otherCategoryIds },
    }).lean();

    // 5. Gom toàn bộ productId cần dùng cho home
    const allNeededProductIds = new Set();

    for (const productIds of categoryProductIdsMap.values()) {
        for (const productId of productIds) {
            allNeededProductIds.add(productId);
        }
    }

    const uniqueProductIds = [...allNeededProductIds];

    // 6. Query product + image theo batch
    const productMap = await getProductMap(uniqueProductIds);
    const imageMap = await getDefaultImageMap(uniqueProductIds);

    // 7. Build featuredCategories theo đúng thứ tự cố định
    const featuredCategories = FIXED_CATEGORY_NAMES.map((categoryName) => {
        const category = fixedCategoryMapByName.get(categoryName);
        if (!category) return null;

        const productIds = categoryProductIdsMap.get(category._id.toString()) || [];

        return formatCategorySection({
            category,
            productIds,
            productMap,
            imageMap,
        });
    }).filter(Boolean);

    // 8. Build categories còn lại, chỉ lấy category có product thật
    const categories = otherCategories
        .map((category) => {
            const productIds = categoryProductIdsMap.get(category._id.toString()) || [];

            if (productIds.length === 0) return null;

            const section = formatCategorySection({
                category,
                productIds,
                productMap,
                imageMap,
            });

            if (!section.products.length) return null;

            return section;
        })
        .filter(Boolean);

    return {
        featuredCategories,
        categories,
    };
};

module.exports = {
    getCategories,
    getProducts,
    getProductById,
    getHomeData,
};
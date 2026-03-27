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
// THÊM THAM SỐ subCategoryName ĐỂ TRẢ VỀ CHO HOME
const formatProduct = (product, imageMap, subCategoryName) => {
    if (!product) return null;

    return {
        id: product._id,
        name: product.name,
        unitPrice: product.unitPrice,
        imageURL: imageMap.get(product._id.toString()) || null,
        // Nếu có danh mục con (Ưa bóng, Ưa sáng...) thì trả về, không thì null
        subCategoryName: subCategoryName || null,
    };
};

// helper: build section category
const formatCategorySection = ({
    category,
    productIds,
    productMap,
    imageMap,
    productSubcategoryMap // Map chứa tên danh mục con của từng sản phẩm
}) => {
    const products = productIds
        .map((productId) => productMap.get(productId.toString()))
        .filter(Boolean)
        .map((product) =>
            formatProduct(
                product,
                imageMap,
                productSubcategoryMap.get(product._id.toString()) // Lấy tên danh mục con
            )
        );

    return {
        id: category._id,
        name: category.categoryName,
        image: category.categoryImage,
        products,
    };
};

// --- QUẢN LÝ SẢN PHẨM ---

// --- QUẢN LÝ SẢN PHẨM ---

const getProducts = async ({ keyword, categoryId, limit = 10, page = 1 }) => {
    limit = Number(limit) || 10;
    page = Number(page) || 1;

    const skip = (page - 1) * limit;
    const query = {};
    let subCategories = [];

    // --- 1. Lọc sản phẩm theo keyword hoặc categoryId ---
    if (keyword) {
        query.name = { $regex: keyword, $options: 'i' };
    }

    if (categoryId) {
        const cateProducts = await CateProduct.find({ categoryId }).lean();
        const productIds = cateProducts.map((cp) => cp.productId);
        query._id = { $in: productIds };

        const childCates = await Category.find({ categoryParentId: categoryId }).lean();
        subCategories = childCates.map(c => ({
            id: c._id,
            name: c.categoryName
        }));
    }

    // --- 2. Lấy danh sách sản phẩm theo query ---
    const products = await Product.find(query)
        .skip(skip)
        .limit(limit)
        .lean();

    const productIds = products.map((p) => p._id);
    const imageMap = await getDefaultImageMap(productIds);

    // --- 3. LOGIC LẤY TÊN DANH MỤC CON (Giống hệt Home) ---
    // Lấy tất cả category hiện có để build map
    const allCategories = await Category.find().lean();
    const childCategoryMap = new Map();
    for (const cat of allCategories) {
        if (cat.categoryParentId) {
            childCategoryMap.set(cat._id.toString(), cat.categoryName);
        }
    }

    // Lấy mapping của các sản phẩm đang hiển thị
    const cateProductsForSub = await CateProduct.find({ productId: { $in: productIds } }).lean();
    const productSubcategoryMap = new Map();

    for (const item of cateProductsForSub) {
        const catId = item.categoryId.toString();
        const pId = item.productId.toString();

        // Nếu category này là danh mục con, lưu tên lại cho productId tương ứng
        if (childCategoryMap.has(catId)) {
            productSubcategoryMap.set(pId, childCategoryMap.get(catId));
        }
    }

    // --- 4. Trả về kết quả với cấu trúc chuẩn ---
    const result = products.map((product) => ({
        id: product._id,
        name: product.name,
        unitPrice: product.unitPrice,
        // Dùng imageMap giống Home
        imageURL: imageMap.get(product._id.toString()) || null,
        // Lấy tên danh mục con từ Map, nếu không có thì trả về null
        subCategoryName: productSubcategoryMap.get(product._id.toString()) || null,
        // Vẫn giữ lại stockQuantity để Frontend tùy cơ ứng biến (hiển thị khi không có subCategoryName)
        stockQuantity: product.stockQuantity,
    }));

    const totalItems = await Product.countDocuments(query);

    return {
        products: result,
        subCategories,
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

    // 1. Lấy TẤT CẢ categories để phân loại cha/con
    const allCategories = await Category.find().lean();

    // Tách riêng các category cố định
    const fixedCategories = allCategories.filter(c => FIXED_CATEGORY_NAMES.includes(c.categoryName));
    const fixedCategoryMapByName = new Map();
    for (const category of fixedCategories) {
        fixedCategoryMapByName.set(category.categoryName, category);
    }
    const fixedCategoryIds = fixedCategories.map((c) => c._id.toString());

    // 2. Tạo Map để nhận diện danh mục con (Child Category)
    const childCategoryMap = new Map();
    for (const cat of allCategories) {
        // Nếu danh mục CÓ categoryParentId => Đây là danh mục con (VD: Ưa sáng, Ưa bóng)
        if (cat.categoryParentId) {
            childCategoryMap.set(cat._id.toString(), cat.categoryName);
        }
    }

    // 3. Lấy toàn bộ mapping category-product
    const cateProducts = await CateProduct.find().sort({ _id: -1 }).lean();

    const categoryProductIdsMap = new Map();
    const productSubcategoryMap = new Map(); // Lưu tên danh mục con cho từng sản phẩm

    for (const item of cateProducts) {
        const categoryId = item.categoryId.toString();
        const productId = item.productId.toString();

        // Nhóm productId theo categoryId
        if (!categoryProductIdsMap.has(categoryId)) {
            categoryProductIdsMap.set(categoryId, []);
        }

        const currentProductIds = categoryProductIdsMap.get(categoryId);
        if (!currentProductIds.includes(productId) && currentProductIds.length < PRODUCT_LIMIT_PER_CATEGORY) {
            currentProductIds.push(productId);
        }

        // Nếu category này là danh mục con, lưu tên của nó lại cho productId
        if (childCategoryMap.has(categoryId)) {
            productSubcategoryMap.set(productId, childCategoryMap.get(categoryId));
        }
    }

    // 4. Lấy các Category Cha (Để hiện thị thành từng khu vực trên Home)
    const otherCategories = allCategories.filter((c) =>
        !c.categoryParentId && // ĐIỀU KIỆN QUAN TRỌNG: Không có cha (Lớn nhất)
        !fixedCategoryIds.includes(c._id.toString()) && // Bỏ 2 cái cố định
        categoryProductIdsMap.has(c._id.toString()) // Phải có sản phẩm bên trong
    );

    // 5. Gom toàn bộ productId cần dùng (Chỉ lấy SP từ Parent Categories)
    const allNeededProductIds = new Set();

    // Gom từ Hàng mới về + Combo
    for (const category of fixedCategories) {
        const productIds = categoryProductIdsMap.get(category._id.toString()) || [];
        productIds.forEach(id => allNeededProductIds.add(id));
    }

    // Gom từ các Parent Categories khác (Cây trồng, Phụ kiện...)
    for (const category of otherCategories) {
        const productIds = categoryProductIdsMap.get(category._id.toString()) || [];
        productIds.forEach(id => allNeededProductIds.add(id));
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
            productSubcategoryMap, // Truyền map danh mục con vào
        });
    }).filter(Boolean);

    // 8. Build các Parent Categories còn lại
    const categories = otherCategories
        .map((category) => {
            const productIds = categoryProductIdsMap.get(category._id.toString()) || [];

            if (productIds.length === 0) return null;

            const section = formatCategorySection({
                category,
                productIds,
                productMap,
                imageMap,
                productSubcategoryMap, // Truyền map danh mục con vào
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
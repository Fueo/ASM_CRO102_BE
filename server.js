require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const app = express();

// 1. IMPORT CÁC ROUTES
const userRoutes = require('./routes/user.route');
const productRoutes = require('./routes/product.route');
const categoryRoutes = require('./routes/category.route');
const cartRoutes = require('./routes/cart.route');
const orderRoutes = require('./routes/order.route');
const notificationRoutes = require('./routes/notificationRoute'); // Thêm route thông báo

app.use(cors());
app.use(express.json()); // express.json() đã bao gồm sẵn body-parser rồi, bạn không cần cài thêm body-parser nữa

// 2. KHAI BÁO ENDPOINTS
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/notifications', notificationRoutes); // Thêm endpoint thông báo

app.get("/", (req, res) => res.json({ message: "API running" }));

const PORT = process.env.PORT || 5000;

// 3. KẾT NỐI DB VÀ CHẠY SERVER
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB Atlas");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.error("Connection error:", err));
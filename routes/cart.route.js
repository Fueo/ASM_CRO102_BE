const express = require('express');
const router = express.Router();

const cartController = require('../controllers/cart.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/', cartController.getMyCart);
router.post('/', cartController.addProductToCart);
router.patch('/select-all', cartController.toggleAllCartItemsSelection);
router.patch('/:cartItemId/quantity', cartController.updateCartItemQuantity);
router.patch('/:cartItemId/select', cartController.toggleCartItemSelection);
router.delete('/selected', cartController.clearSelectedCartItems);
router.delete('/:cartItemId', cartController.removeCartItem);

module.exports = router;
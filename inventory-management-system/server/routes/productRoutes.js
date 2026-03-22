// backend/routes/productRoutes.js
import express from 'express';
import { protect } from '../middleware/auth.js';
import { checkPermission } from '../middleware/permissions.js';
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImages,
  getLowStockProducts
} from '../controllers/productController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Public routes (viewable by all authenticated users)
router.get('/', getProducts);
router.get('/low-stock/all', getLowStockProducts);

// Protected routes (require inventory management permission)
router.post('/', checkPermission('canManageInventory'), createProduct);
router.put('/:id', checkPermission('canManageInventory'), updateProduct);
router.delete('/:id', checkPermission('canManageInventory'), deleteProduct);
router.post('/upload', checkPermission('canManageInventory'), uploadProductImages);

export default router;
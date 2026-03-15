import express from 'express';
import {
  getSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getCategories
} from '../controllers/supplierController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getSuppliers)
  .post(protect, createSupplier);

router.get('/categories', protect, getCategories);

router.route('/:id')
  .get(protect, getSupplier)
  .put(protect, updateSupplier)
  .delete(protect, deleteSupplier);

export default router;
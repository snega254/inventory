import express from 'express';
import { createSale, getSales, getDashboardStats } from '../controllers/saleController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getSales)
  .post(protect, createSale);

router.get('/dashboard/stats', protect, getDashboardStats);

export default router;
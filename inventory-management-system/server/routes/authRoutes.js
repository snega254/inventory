import express from 'express';
import { register, login } from '../controllers/authController.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Test route to verify router is working
router.get('/test', (req, res) => {
  res.json({ message: 'Auth routes are working' });
});

export default router;
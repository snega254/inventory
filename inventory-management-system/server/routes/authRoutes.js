import express from 'express';
import { register, login } from '../controllers/authController.js';

const router = express.Router();

// Debug: Log all auth requests
router.use((req, res, next) => {
  console.log(`📡 Auth route: ${req.method} ${req.url}`);
  next();
});

// Routes
router.post('/register', register);
router.post('/login', login);
router.get('/test', (req, res) => {
  res.json({ message: 'Auth routes working', timestamp: new Date().toISOString() });
});

export default router;
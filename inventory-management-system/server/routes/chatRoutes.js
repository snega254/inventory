import express from 'express';
import { aiRoleBasedChat } from '../controllers/aiRoleBasedChatController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/', protect, aiRoleBasedChat);

export default router;
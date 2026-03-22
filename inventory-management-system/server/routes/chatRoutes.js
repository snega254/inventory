import express from 'express';
import { protect } from '../middleware/auth.js';
import { aiRoleBasedChat } from '../controllers/aiRoleBasedChatController.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Initialize Gemini if API key exists
let genAI = null;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  console.log('🤖 Gemini AI initialized');
}

// Inventory context for better responses
const inventoryContext = `
You are an AI assistant for an inventory management system called "Attire Menswear". You help with:
- Adding and managing products (with colors, sizes, variants)
- Checking stock levels and low stock alerts
- Managing suppliers and their categories
- Generating sales reports and analytics
- Handling billing and sales transactions
- Employee management with different roles (admin, manager, cashier, inventory_clerk)
- Dashboard analytics and insights

Key Features:
- Products can have multiple color variants
- Each color variant can have multiple sizes (S, M, L, XL, etc.)
- Each size has quantity and minimum stock threshold
- Suppliers provide specific categories of products
- Different user roles have different permissions
`;

// Main chat endpoint with AI fallback
router.post('/', protect, async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ 
        success: false,
        error: 'Message is required' 
      });
    }

    console.log(`💬 User message: ${message}`);
    console.log(`👤 User role: ${req.user?.role}`);

    // Try role-based AI chat first (if implemented)
    if (typeof aiRoleBasedChat === 'function') {
      try {
        const response = await aiRoleBasedChat(req, res);
        if (response) return;
      } catch (error) {
        console.log('Role-based chat failed, falling back to Gemini');
      }
    }

    // Try Gemini AI
    if (genAI) {
      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        
        const prompt = `${inventoryContext}\n\nUser Role: ${req.user?.role || 'user'}\nUser Question: ${message}\n\nProvide a helpful, concise, and actionable response about inventory management. Include specific steps if applicable.`;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        console.log('🤖 Gemini response sent');
        return res.json({ 
          success: true,
          reply: text,
          source: 'gemini'
        });
      } catch (error) {
        console.error('Gemini error:', error);
      }
    }

    // Fallback responses based on keywords
    const fallbackResponses = {
      'add product': '📦 To add a product:\n1. Go to Inventory → Add New Product\n2. Enter product name, category, and supplier\n3. Add color variants (click "Add Color")\n4. For each color, add sizes and quantities\n5. Set purchase price, selling price, and GST\n6. Click "Add Product" to save',
      
      'low stock': '⚠️ To check low stock:\n1. Go to Dashboard\n2. Look for "Low Stock Alerts" section\n3. Or go to Inventory and filter by low stock\nProducts with quantity below minimum threshold will be highlighted in red',
      
      'supplier': '🏭 To manage suppliers:\n1. Go to Suppliers section\n2. Click "Add Supplier" to add new supplier\n3. Fill company details, GST, categories they provide\n4. You can view, edit, or deactivate suppliers',
      
      'report': '📊 To generate reports:\n1. Go to Reports section\n2. Choose report type (Sales, Inventory, Supplier)\n3. Select date range\n4. Click "Generate" to view or download PDF',
      
      'billing': '💵 For billing:\n1. Go to Billing section\n2. Search/add products to cart\n3. Apply discounts if applicable\n4. Select payment method\n5. Click "Complete Sale" to process',
      
      'employee': '👥 To manage employees:\n1. Go to Employees section (Admin only)\n2. Click "Add Employee"\n3. Enter details and select role\n4. Set permissions based on role\n5. Click "Create Employee" to save',
      
      'inventory clerk': '📋 As Inventory Clerk, you can:\n- Add and edit products\n- Manage stock levels\n- View suppliers\n- Check low stock alerts\n- Update product prices\n- Cannot manage employees or view sensitive reports',
      
      'default': '👋 I can help you with:\n• Adding/managing products\n• Checking stock levels\n• Managing suppliers\n• Generating reports\n• Billing and sales\n• Employee management\n\nWhat would you like to know?'
    };
    
    let reply = fallbackResponses.default;
    for (const [key, value] of Object.entries(fallbackResponses)) {
      if (message.toLowerCase().includes(key)) {
        reply = value;
        break;
      }
    }
    
    console.log('💡 Using fallback response');
    return res.json({ 
      success: true,
      reply: reply,
      source: 'fallback'
    });
    
  } catch (error) {
    console.error('❌ Chatbot error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Chatbot service error',
      reply: 'Sorry, I\'m having trouble processing your request. Please try again later or contact support.'
    });
  }
});

// Quick suggestions endpoint
router.get('/suggestions', protect, (req, res) => {
  const suggestions = [
    { text: 'How to add a product?', category: 'products' },
    { text: 'Check low stock items', category: 'inventory' },
    { text: 'Add new supplier', category: 'suppliers' },
    { text: 'Generate sales report', category: 'reports' },
    { text: 'Create a bill', category: 'billing' },
    { text: 'What can inventory clerk do?', category: 'roles' },
    { text: 'Add color variant to product', category: 'products' },
    { text: 'Check today\'s sales', category: 'sales' }
  ];
  
  // Filter suggestions based on user role
  const userRole = req.user?.role;
  let filteredSuggestions = suggestions;
  
  if (userRole === 'cashier') {
    filteredSuggestions = suggestions.filter(s => 
      s.category !== 'reports' && s.category !== 'employees'
    );
  } else if (userRole === 'inventory_clerk') {
    filteredSuggestions = suggestions.filter(s => 
      s.category !== 'billing' && s.category !== 'reports'
    );
  }
  
  res.json({ suggestions: filteredSuggestions });
});

export default router;
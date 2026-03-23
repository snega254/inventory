import express from 'express';
import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Initialize Groq with API key
let groq = null;
if (process.env.GROQ_API_KEY) {
  try {
    groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
    console.log('🤖 Groq AI initialized');
  } catch (error) {
    console.log('⚠️ Groq initialization failed:', error.message);
  }
}

// Inventory context for better responses
const inventoryContext = `You are an AI assistant for an inventory management system called "Attire Menswear". You help with:
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

Keep responses concise, helpful, and focused on inventory management tasks.`;

// Main chat endpoint
router.post('/', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ 
        success: false,
        error: 'Message is required' 
      });
    }

    console.log(`💬 User message: ${message}`);

    // Try Groq AI
    if (groq) {
      try {
        const completion = await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: inventoryContext
            },
            {
              role: "user",
              content: message
            }
          ],
          model: "mixtral-8x7b-32768",
          temperature: 0.7,
          max_tokens: 500,
        });

        const reply = completion.choices[0]?.message?.content || "I'm here to help!";
        
        console.log('🤖 Groq response sent');
        return res.json({ 
          success: true,
          reply: reply,
          source: 'groq'
        });
      } catch (error) {
        console.error('Groq error:', error);
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
router.get('/suggestions', (req, res) => {
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
  
  res.json({ suggestions: suggestions });
});

export default router;
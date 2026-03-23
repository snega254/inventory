import express from 'express';
import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Initialize Groq
let groq = null;
let groqError = null;

try {
  if (process.env.GROQ_API_KEY) {
    groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
    console.log('🤖 Groq AI initialized successfully');
  } else {
    console.log('⚠️ GROQ_API_KEY not found in environment variables');
    groqError = 'API key missing';
  }
} catch (error) {
  console.error('❌ Groq initialization failed:', error.message);
  groqError = error.message;
}

// System prompt for inventory management
const systemPrompt = `You are an AI assistant for "Attire Menswear" inventory management system.
You help with:
- Products and inventory management
- Stock levels and low stock alerts
- Supplier management
- Sales reports and analytics
- Billing and sales transactions
- Employee management

Answer questions accurately, concisely, and helpfully. When asked about counts like "how many products", provide helpful guidance.`;

router.post('/', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ 
        success: false,
        reply: 'Please enter a message.'
      });
    }

    console.log('💬 User message:', message);

    // Try Groq AI with updated model
    if (groq) {
      try {
        console.log('Attempting Groq API call with llama-3.3-70b-versatile...');
        
        const completion = await groq.chat.completions.create({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message }
          ],
          model: "llama-3.3-70b-versatile",  // Updated model
          temperature: 0.7,
          max_tokens: 500,
        });

        const reply = completion.choices[0]?.message?.content;
        
        if (reply) {
          console.log('🤖 Groq response received');
          return res.json({ 
            success: true,
            reply: reply,
            source: 'groq'
          });
        }
      } catch (groqError) {
        console.error('Groq API error:', groqError.message);
      }
    }

    // Smart fallback responses
    const lowerMsg = message.toLowerCase();
    let reply = '';
    
    if (lowerMsg.includes('product') && (lowerMsg.includes('count') || lowerMsg.includes('many') || lowerMsg.includes('total'))) {
      reply = "You can view total products in the Inventory section. Go to Inventory to see the complete list and count.";
    } 
    else if (lowerMsg.includes('stock') || lowerMsg.includes('low stock')) {
      reply = "Check low stock items on the Dashboard. Products below minimum threshold are highlighted in red. You can also filter by low stock in Inventory.";
    }
    else if (lowerMsg.includes('supplier')) {
      reply = "Manage suppliers in the Suppliers section. You can add, edit, view details, and deactivate suppliers there.";
    }
    else if (lowerMsg.includes('report')) {
      reply = "Generate reports in the Reports section. Filter by date range, payment method, and export as PDF or CSV.";
    }
    else if (lowerMsg.includes('bill') || lowerMsg.includes('billing')) {
      reply = "For billing:\n1. Go to Billing section\n2. Search products\n3. Add to cart with color/size\n4. Enter customer details\n5. Select payment method\n6. Generate bill & download PDF";
    }
    else if (lowerMsg.includes('employee')) {
      reply = "Manage employees in Employees section (Admin only). Add, edit, reset passwords, or deactivate employees.";
    }
    else if (lowerMsg.includes('help')) {
      reply = "I can help you with:\n• Products & Inventory\n• Stock levels & alerts\n• Suppliers\n• Sales Reports\n• Billing\n• Employees\n\nWhat would you like to know?";
    }
    else {
      reply = "I'm your inventory assistant. I can help with products, stock, suppliers, reports, billing, and employees. What would you like to know?";
    }
    
    console.log('💡 Using fallback response');
    res.json({ 
      success: true,
      reply: reply,
      source: 'fallback'
    });
    
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      success: false,
      reply: 'Sorry, having trouble. Please try again.'
    });
  }
});

export default router;
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
You have access to real-time data about products, stock, suppliers, sales, and employees.
Answer questions accurately and concisely based on the user's query.

Important: When asked about counts like "how many products", you should provide the actual number if available.
If you don't have the exact number, say you don't know but offer to help with other questions.

Be helpful, friendly, and focused on inventory management.`;

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
    console.log('Groq status:', groq ? 'Initialized' : 'Not initialized', groqError || '');

    // Try Groq AI first
    if (groq) {
      try {
        console.log('Attempting Groq API call...');
        
        const completion = await groq.chat.completions.create({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message }
          ],
          model: "mixtral-8x7b-32768",
          temperature: 0.7,
          max_tokens: 500,
        });

        const reply = completion.choices[0]?.message?.content;
        
        if (reply) {
          console.log('🤖 Groq response received, length:', reply.length);
          return res.json({ 
            success: true,
            reply: reply,
            source: 'groq'
          });
        } else {
          console.log('Groq returned empty response');
        }
      } catch (groqError) {
        console.error('Groq API error details:', groqError.message);
        if (groqError.response) {
          console.error('Status:', groqError.response.status);
          console.error('Data:', JSON.stringify(groqError.response.data));
        }
      }
    } else {
      console.log('Groq not available, using fallback');
    }

    // Smart fallback with more helpful responses
    const lowerMsg = message.toLowerCase();
    let reply = '';
    
    if (lowerMsg.includes('product') && (lowerMsg.includes('count') || lowerMsg.includes('many') || lowerMsg.includes('total'))) {
      reply = "I don't have access to the current product count at this moment. Please check the Inventory page for the exact number.";
    } 
    else if (lowerMsg.includes('stock') || lowerMsg.includes('low stock')) {
      reply = "You can check low stock items on the Dashboard. Products below minimum threshold are highlighted in red.";
    }
    else if (lowerMsg.includes('supplier')) {
      reply = "Manage suppliers in the Suppliers section. You can add, edit, or deactivate suppliers there.";
    }
    else if (lowerMsg.includes('report')) {
      reply = "Generate reports in the Reports section. You can filter by date and export as PDF or CSV.";
    }
    else if (lowerMsg.includes('bill') || lowerMsg.includes('billing')) {
      reply = "For billing, go to Billing section. Search products, add to cart, enter customer details, and generate bill.";
    }
    else if (lowerMsg.includes('employee')) {
      reply = "Manage employees in Employees section. Admin only. You can add, edit, or deactivate employees.";
    }
    else if (lowerMsg.includes('help')) {
      reply = "I can help you with:\n• Products and inventory\n• Stock levels\n• Suppliers\n• Reports\n• Billing\n• Employees\n\nWhat would you like to know?";
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
      reply: 'Sorry, I\'m having trouble processing your request. Please try again.'
    });
  }
});

export default router;
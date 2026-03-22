import { GoogleGenerativeAI } from '@google/generative-ai';
import Product from '../models/Product.js';
import Sale from '../models/Sale.js';
import Supplier from '../models/Supplier.js';

export const realAIChat = async (req, res) => {
  try {
    const { message } = req.body;
    console.log('🤖 User asked:', message);

    // Check API key
    if (!process.env.GEMINI_API_KEY) {
      return res.json({ 
        response: "Please add your Gemini API key to enable AI features." 
      });
    }

    // Fetch data
    const products = await Product.find();
    const suppliers = await Supplier.find();
    const sales = await Sale.find().sort('-createdAt').limit(100);

    // Calculate today's sales
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaySales = sales.filter(s => new Date(s.createdAt) >= today);
    const todayRevenue = todaySales.reduce((sum, s) => sum + (s.total || 0), 0);

    // Calculate low stock
    const lowStockItems = [];
    products.forEach(product => {
      product.colorVariants?.forEach(variant => {
        variant.sizes?.forEach(size => {
          if (size.quantity <= size.minStock) {
            lowStockItems.push({
              name: product.name,
              color: variant.colorName,
              size: size.size,
              quantity: size.quantity
            });
          }
        });
      });
    });

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Try different models
    let model;
    try {
      model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      await model.generateContent('test');
    } catch (e) {
      try {
        model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
        await model.generateContent('test');
      } catch (e2) {
        model = genAI.getGenerativeModel({ model: 'gemini-pro' });
      }
    }

    // Build context
    const context = {
      products: {
        total: products.length,
        list: products.map(p => p.name),
        lowStock: lowStockItems
      },
      suppliers: {
        total: suppliers.length,
        list: suppliers.map(s => s.name)
      },
      sales: {
        today: {
          count: todaySales.length,
          revenue: todayRevenue
        }
      }
    };

    // Create prompt
    const prompt = `You are an AI assistant for Attire Menswear clothing store.

Current business data:
${JSON.stringify(context, null, 2)}

User question: "${message}"

Answer naturally and helpfully using only the data above.
Be friendly and conversational.
Format currency as ₹.

Answer:`;

    // Get AI response
    const result = await model.generateContent(prompt);
    const response = await result.response.text();
    
    res.json({ response });

  } catch (error) {
    console.error('AI Error:', error);
    res.json({ 
      response: "I'm having trouble connecting. Please try again." 
    });
  }
};
import { GoogleGenerativeAI } from '@google/generative-ai';
import Product from '../models/Product.js';
import Sale from '../models/Sale.js';
import Supplier from '../models/Supplier.js';

// Rule-based chatbot fallback
const ruleBasedResponse = async (question) => {
  const q = question.toLowerCase();

  if (q.includes('low stock') || q.includes('low inventory')) {
    const lowStock = await Product.find({
      'colorVariants.sizes': {
        $elemMatch: {
          $expr: { $lte: ['$quantity', '$minStock'] }
        }
      }
    }).limit(5);
    
    if (lowStock.length === 0) {
      return "No items are currently low in stock.";
    }
    
    return `Low stock items:\n${lowStock.map(p => 
      `- ${p.name}: ${p.totalQuantity} units remaining`
    ).join('\n')}`;
  }

  if (q.includes('revenue') || q.includes('sales')) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todaySales = await Sale.aggregate([
      { $match: { createdAt: { $gte: today } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    const totalRevenue = await Sale.aggregate([
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    return `Today's revenue: ₹${todaySales[0]?.total || 0}\nTotal revenue: ₹${totalRevenue[0]?.total || 0}`;
  }

  if (q.includes('best selling') || q.includes('top product')) {
    const topProducts = await Sale.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productName',
          totalSold: { $sum: '$items.quantity' }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 3 }
    ]);

    if (topProducts.length === 0) {
      return "No sales data available yet.";
    }

    return `Top selling products:\n${topProducts.map((p, i) => 
      `${i + 1}. ${p._id}: ${p.totalSold} units`
    ).join('\n')}`;
  }

  return "I can help you with information about low stock items, revenue, and top-selling products. Please ask a specific question.";
};

export const chatWithAI = async (req, res) => {
  try {
    const { message } = req.body;

    // If Gemini API key is not configured, use rule-based
    if (!process.env.GEMINI_API_KEY) {
      const response = await ruleBasedResponse(message);
      return res.json({ response });
    }

    // Fetch context data for AI
    const [products, recentSales, suppliers] = await Promise.all([
      Product.find().limit(10),
      Sale.find().sort('-createdAt').limit(10),
      Supplier.find().limit(10)
    ]);

    const context = {
      inventory: products.map(p => ({
        name: p.name,
        totalQuantity: p.totalQuantity,
        sellingPrice: p.sellingPrice,
        status: p.status
      })),
      recentSales: recentSales.map(s => ({
        invoiceId: s.invoiceId,
        total: s.total,
        items: s.items.length,
        date: s.createdAt
      })),
      totalSuppliers: suppliers.length,
      timestamp: new Date().toISOString()
    };

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `You are an AI assistant for an inventory management system. Use the following context data to answer the user's question accurately.

Context Data:
${JSON.stringify(context, null, 2)}

User Question: ${message}

Provide a helpful, concise response based on the available data. If the question cannot be answered with the given context, politely suggest what information you can provide.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({ response: text });
  } catch (error) {
    console.error('AI Chat Error:', error);
    // Fallback to rule-based on error
    const response = await ruleBasedResponse(req.body.message);
    res.json({ response });
  }
};
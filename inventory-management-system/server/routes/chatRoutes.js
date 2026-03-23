import express from 'express';
import Groq from 'groq-sdk';
import dotenv from 'dotenv';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Sale from '../models/Sale.js';
import Supplier from '../models/Supplier.js';

dotenv.config();

const router = express.Router();

// Initialize Groq
let groq = null;
try {
  if (process.env.GROQ_API_KEY) {
    groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
    console.log('🤖 Groq AI initialized');
  }
} catch (error) {
  console.error('Groq init error:', error.message);
}

// Function to get real-time stats from database
const getRealTimeStats = async () => {
  try {
    const productCount = await Product.countDocuments();
    const employeeCount = await User.countDocuments({ role: { $ne: 'admin' } });
    const adminCount = await User.countDocuments({ role: 'admin' });
    const supplierCount = await Supplier.countDocuments();
    const userCount = await User.countDocuments(); // Total users/customers
    const totalSales = await Sale.aggregate([{ $group: { _id: null, total: { $sum: '$total' } } }]);
    
    // Calculate profit
    const sales = await Sale.find().populate('items.product');
    let totalProfit = 0;
    sales.forEach(sale => {
      sale.items?.forEach(item => {
        if (item.product && item.product.purchasePrice) {
          totalProfit += (item.price - item.product.purchasePrice) * item.quantity;
        }
      });
    });
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaySales = await Sale.countDocuments({ createdAt: { $gte: today } });
    const todayRevenue = await Sale.aggregate([
      { $match: { createdAt: { $gte: today } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    
    return {
      totalProducts: productCount,
      totalEmployees: employeeCount,
      totalAdmins: adminCount,
      totalSuppliers: supplierCount,
      totalUsers: userCount,
      totalRevenue: totalSales[0]?.total || 0,
      totalProfit: totalProfit,
      todaySales: todaySales,
      todayRevenue: todayRevenue[0]?.total || 0
    };
  } catch (error) {
    console.error('Error fetching stats:', error);
    return null;
  }
};

router.post('/', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, reply: 'Please enter a message.' });
    }

    console.log('💬 User message:', message);

    // Get real-time stats from database
    const stats = await getRealTimeStats();
    
    console.log('📊 Real stats from DB:', {
      products: stats?.totalProducts,
      employees: stats?.totalEmployees,
      users: stats?.totalUsers,
      suppliers: stats?.totalSuppliers,
      revenue: stats?.totalRevenue,
      profit: stats?.totalProfit
    });

    // Create context with real data
    const systemPrompt = `You are an AI assistant for "Attire Menswear" inventory system.

CURRENT REAL DATA FROM DATABASE:
- Total Products: ${stats?.totalProducts || 0}
- Total Employees: ${stats?.totalEmployees || 0}
- Total Admins: ${stats?.totalAdmins || 0}
- Total Suppliers: ${stats?.totalSuppliers || 0}
- Total Users/Customers: ${stats?.totalUsers || 0}
- Total Revenue: ₹${(stats?.totalRevenue || 0).toLocaleString()}
- Total Profit: ₹${(stats?.totalProfit || 0).toLocaleString()}
- Sales Today: ${stats?.todaySales || 0}
- Revenue Today: ₹${(stats?.todayRevenue || 0).toLocaleString()}

IMPORTANT: Use ONLY these numbers when answering questions about counts, products, employees, suppliers, etc. Do not make up numbers.`;

    // Try Groq AI with real data
    if (groq) {
      try {
        const completion = await groq.chat.completions.create({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message }
          ],
          model: "llama-3.3-70b-versatile",
          temperature: 0.7,
          max_tokens: 500,
        });

        const reply = completion.choices[0]?.message?.content;
        if (reply) {
          console.log('🤖 Groq response sent with real data');
          return res.json({ success: true, reply: reply, source: 'groq' });
        }
      } catch (error) {
        console.error('Groq error:', error.message);
      }
    }

    // Fallback with real data
    let reply = '';
    const lowerMsg = message.toLowerCase();
    
    if (lowerMsg.includes('product') && (lowerMsg.includes('count') || lowerMsg.includes('many') || lowerMsg.includes('total'))) {
      reply = `We have ${stats?.totalProducts || 0} products in the inventory.`;
    } 
    else if (lowerMsg.includes('employee') && (lowerMsg.includes('count') || lowerMsg.includes('many') || lowerMsg.includes('total'))) {
      reply = `We have ${stats?.totalEmployees || 0} employees and ${stats?.totalAdmins || 0} admins.`;
    }
    else if (lowerMsg.includes('customer') || (lowerMsg.includes('user') && lowerMsg.includes('count'))) {
      reply = `We have ${stats?.totalUsers || 0} registered users in the system.`;
    }
    else if (lowerMsg.includes('supplier')) {
      reply = `We have ${stats?.totalSuppliers || 0} suppliers in the system.`;
    }
    else if (lowerMsg.includes('revenue')) {
      reply = `Total revenue is ₹${(stats?.totalRevenue || 0).toLocaleString()}. Today's revenue is ₹${(stats?.todayRevenue || 0).toLocaleString()}.`;
    }
    else if (lowerMsg.includes('profit')) {
      reply = `Total profit is ₹${(stats?.totalProfit || 0).toLocaleString()}.`;
    }
    else if (lowerMsg.includes('today') && lowerMsg.includes('sale')) {
      reply = `Today we had ${stats?.todaySales || 0} sales, totaling ₹${(stats?.todayRevenue || 0).toLocaleString()}.`;
    }
    else if (lowerMsg.includes('stock') || lowerMsg.includes('low stock')) {
      reply = "Check low stock items on the Dashboard. Products below minimum threshold are highlighted in red.";
    }
    else {
      reply = `I can help you with inventory management. Current stats: ${stats?.totalProducts || 0} products, ${stats?.totalEmployees || 0} employees, ${stats?.totalSuppliers || 0} suppliers, and ₹${(stats?.totalRevenue || 0).toLocaleString()} total revenue. What would you like to know?`;
    }
    
    console.log('💡 Using fallback with real data');
    res.json({ success: true, reply: reply, source: 'fallback' });
    
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ success: false, reply: 'Sorry, having trouble. Please try again.' });
  }
});

export default router;
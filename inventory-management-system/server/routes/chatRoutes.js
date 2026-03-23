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
    const products = await Product.find().select('name category sku');
    
    const employeeCount = await User.countDocuments({ role: { $ne: 'admin' } });
    const adminCount = await User.countDocuments({ role: 'admin' });
    const employees = await User.find().select('name email role isActive');
    
    const supplierCount = await Supplier.countDocuments();
    const suppliers = await Supplier.find().select('name email phone');
    
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
    
    // Get low stock items
    const lowStockItems = [];
    const allProducts = await Product.find();
    allProducts.forEach(p => {
      p.colorVariants?.forEach(v => {
        v.sizes?.forEach(s => {
          if (s.quantity <= (s.minStock || 5)) {
            lowStockItems.push({
              product: p.name,
              color: v.colorName,
              size: s.size,
              quantity: s.quantity,
              minStock: s.minStock || 5
            });
          }
        });
      });
    });
    
    return {
      totalProducts: productCount,
      products: products.map(p => ({ name: p.name, category: p.category, sku: p.sku })),
      totalEmployees: employeeCount,
      totalAdmins: adminCount,
      employees: employees.map(e => ({ name: e.name, email: e.email, role: e.role, isActive: e.isActive })),
      totalSuppliers: supplierCount,
      suppliers: suppliers.map(s => ({ name: s.name, email: s.email, phone: s.phone })),
      totalRevenue: totalSales[0]?.total || 0,
      totalProfit: totalProfit,
      todaySales: todaySales,
      todayRevenue: todayRevenue[0]?.total || 0,
      lowStockItems: lowStockItems
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
      suppliers: stats?.totalSuppliers
    });

    // Create detailed context with real data
    const productList = stats?.products?.map(p => p.name).join(', ') || 'No products';
    const employeeList = stats?.employees?.map(e => `${e.name} (${e.role}${e.isActive ? '' : ' - Inactive'})`).join(', ') || 'No employees';
    const supplierList = stats?.suppliers?.map(s => s.name).join(', ') || 'No suppliers';
    const lowStockList = stats?.lowStockItems?.map(i => `${i.product} - ${i.color} ${i.size}: ${i.quantity} left`).join('; ') || 'No low stock items';

    const systemPrompt = `You are an AI assistant for "Attire Menswear" inventory system.

CURRENT REAL DATA FROM DATABASE:
- Total Products: ${stats?.totalProducts || 0}
- Product Names: ${productList}
- Total Employees: ${stats?.totalEmployees || 0}
- Total Admins: ${stats?.totalAdmins || 0}
- Employee Details: ${employeeList}
- Total Suppliers: ${stats?.totalSuppliers || 0}
- Supplier Names: ${supplierList}
- Total Revenue: ₹${(stats?.totalRevenue || 0).toLocaleString()}
- Total Profit: ₹${(stats?.totalProfit || 0).toLocaleString()}
- Sales Today: ${stats?.todaySales || 0}
- Low Stock Items: ${lowStockList}

IMPORTANT: Use ONLY these numbers and details when answering questions. If asked about specific products, employees, or suppliers, use the names from the data above. Be helpful and accurate.`;

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

    // Fallback with detailed real data
    let reply = '';
    const lowerMsg = message.toLowerCase();
    
    if (lowerMsg.includes('product') && (lowerMsg.includes('name') || lowerMsg.includes('list'))) {
      reply = `Products in inventory: ${productList}`;
    } 
    else if (lowerMsg.includes('employee') && (lowerMsg.includes('name') || lowerMsg.includes('list') || lowerMsg.includes('who'))) {
      reply = `Employees: ${employeeList}`;
    }
    else if (lowerMsg.includes('supplier') && (lowerMsg.includes('name') || lowerMsg.includes('list'))) {
      reply = `Suppliers: ${supplierList}`;
    }
    else if (lowerMsg.includes('stock') || lowerMsg.includes('low stock')) {
      reply = lowStockList ? `Low stock items: ${lowStockList}` : 'No low stock items found.';
    }
    else if (lowerMsg.includes('product') && (lowerMsg.includes('count') || lowerMsg.includes('many') || lowerMsg.includes('total'))) {
      reply = `We have ${stats?.totalProducts || 0} products: ${productList}`;
    } 
    else if (lowerMsg.includes('employee') && (lowerMsg.includes('count') || lowerMsg.includes('many') || lowerMsg.includes('total'))) {
      reply = `We have ${stats?.totalEmployees || 0} employees and ${stats?.totalAdmins || 0} admins. ${employeeList}`;
    }
    else if (lowerMsg.includes('supplier')) {
      reply = `We have ${stats?.totalSuppliers || 0} suppliers: ${supplierList}`;
    }
    else {
      reply = `I can help you with inventory management. Current stats: ${stats?.totalProducts || 0} products, ${stats?.totalEmployees || 0} employees, ${stats?.totalSuppliers || 0} suppliers. Available products: ${productList}. Employees: ${employeeList}. What would you like to know?`;
    }
    
    console.log('💡 Using fallback with real data');
    res.json({ success: true, reply: reply, source: 'fallback' });
    
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ success: false, reply: 'Sorry, having trouble. Please try again.' });
  }
});

export default router;
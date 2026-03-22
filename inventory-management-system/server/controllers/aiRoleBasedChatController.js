// backend/controllers/aiRoleBasedChatController.js
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import Groq from 'groq-sdk';
import Product from '../models/Product.js';
import Sale from '../models/Sale.js';
import Supplier from '../models/Supplier.js';
import User from '../models/User.js';

// Initialize Groq client
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const userRequests = {};
const MODEL = 'llama-3.3-70b-versatile';

export const aiRoleBasedChat = async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user?._id || 'anonymous';
    const userRole = req.user?.role || 'user';
    
    console.log(`🤖 ${req.user?.name || 'User'} (${userRole}) asked: "${message}"`);
    
    // Rate limit (5 requests per minute)
    const now = Date.now();
    const recent = (userRequests[userId] || []).filter(t => now - t < 60000);
    if (recent.length >= 5) {
      return res.json({ 
        response: "Please wait a moment before asking another question." 
      });
    }
    userRequests[userId] = [...recent, now];
    
    // Fetch real-time data from database
    const [products, sales, suppliers, users] = await Promise.all([
      Product.find().limit(100),
      Sale.find().sort('-createdAt').limit(50),
      Supplier.find(),
      userRole === 'admin' ? User.find().select('-password') : []
    ]);
    
    // Calculate today's sales
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaySales = sales.filter(s => new Date(s.createdAt) >= today);
    const todayRevenue = todaySales.reduce((sum, s) => sum + (s.total || 0), 0);
    
    // Prepare comprehensive context with FULL size and color information
    const context = {
      business: "Attire Menswear",
      user: { 
        role: userRole,
        name: req.user?.name
      },
      products: products.map(p => ({
        id: p._id,
        name: p.name,
        sku: p.sku,
        price: p.sellingPrice,
        cost: p.purchasePrice,
        profit: p.profit,
        gst: p.gst,
        category: p.category,
        subCategory: p.subCategory,
        totalStock: p.totalQuantity,
        colorVariants: p.colorVariants?.map(v => ({
          color: v.colorName,
          images: v.images?.length || 0,
          sizes: v.sizes?.map(s => ({
            size: s.size,
            quantity: s.quantity,
            minStock: s.minStock,
            status: s.quantity <= s.minStock ? 'LOW STOCK ⚠️' : 'In Stock ✓',
            needsRestock: s.quantity <= s.minStock
          }))
        }))
      })),
      suppliers: suppliers.map(s => ({
        name: s.name,
        email: s.email,
        phone: s.phone,
        categories: s.categories?.map(c => c.mainCategory) || [],
        status: s.status
      })),
      sales: {
        today: {
          count: todaySales.length,
          revenue: todayRevenue,
          items: todaySales.map(s => ({
            invoice: s.invoiceId,
            total: s.total,
            items: s.items?.length || 0
          }))
        },
        recent: sales.slice(0, 10).map(s => ({
          invoice: s.invoiceId,
          total: s.total,
          date: new Date(s.createdAt).toLocaleDateString()
        })),
        totalRevenue: sales.reduce((sum, s) => sum + (s.total || 0), 0),
        totalTransactions: sales.length
      },
      stats: {
        totalProducts: products.length,
        totalStock: products.reduce((sum, p) => sum + (p.totalQuantity || 0), 0),
        totalSuppliers: suppliers.length,
        totalSales: sales.length,
        lowStockItems: products.filter(p => 
          p.colorVariants?.some(v => 
            v.sizes?.some(s => s.quantity <= s.minStock)
          )
        ).length
      }
    };
    
    // Add employees only for admin
    if (userRole === 'admin' && users.length > 0) {
      context.employees = users.map(u => ({ 
        name: u.name, 
        role: u.role,
        email: u.email,
        isActive: u.isActive
      }));
    }
    
    // Check restricted access for non-admin users
    const lowerMsg = message.toLowerCase();
    const restrictedTopics = ['employee', 'salary', 'profit margin', 'cost', 'purchase'];
    const isRestricted = restrictedTopics.some(topic => lowerMsg.includes(topic));
    
    if (isRestricted && userRole !== 'admin') {
      return res.json({ 
        response: `🔒 I'm your ${userRole} assistant. For ${restrictedTopics.find(t => lowerMsg.includes(t))} information, please contact the administrator. How else can I help you with inventory management?` 
      });
    }
    
    // Create detailed prompt with real data
    const prompt = `You are a friendly AI assistant for Attire Menswear inventory system.

REAL BUSINESS DATA (Current as of ${new Date().toLocaleDateTimeString()}):
${JSON.stringify(context, null, 2)}

USER (${userRole}): "${message}"

INSTRUCTIONS:
1. Answer using ONLY the data above - DO NOT make up information
2. Be conversational and helpful
3. Format currency as ₹ (e.g., ₹1,299)
4. If asked about specific sizes or colors, check the data and give exact quantities
5. If stock is low for a specific size/color, highlight it with ⚠️
6. For product availability, mention the exact sizes and colors in stock
7. Keep responses concise but informative (2-3 sentences max unless asked for details)

EXAMPLE RESPONSES:
- "We have Red checked shirts in size M: 5 units, L: 3 units. Black is currently out of stock."
- "Today's sales: ₹12,450 from 8 transactions. Low stock alert: Navy Blue S - only 2 left!"
- "Total products: 156 items with ₹2,45,000 worth of inventory. 12 items need restocking."

ANSWER:`;

    // Call Groq API
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 500
    });
    
    const response = completion.choices[0].message.content;
    console.log('✅ AI response sent successfully');
    
    res.json({ 
      response: response,
      metadata: {
        role: userRole,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ AI Chat Error:', error);
    
    // Fallback response with actual data
    try {
      const products = await Product.find().limit(5);
      const lowerMsg = req.body.message?.toLowerCase() || '';
      
      // Check for specific product queries
      if (lowerMsg.includes('product') || lowerMsg.includes('shirt') || lowerMsg.includes('stock')) {
        const productName = lowerMsg.replace(/product|shirt|stock/g, '').trim();
        
        if (productName) {
          const product = products.find(p => 
            p.name.toLowerCase().includes(productName) || 
            productName.includes(p.name.toLowerCase())
          );
          
          if (product) {
            let sizeInfo = '';
            product.colorVariants?.forEach(v => {
              v.sizes?.forEach(s => {
                if (s.quantity > 0) {
                  sizeInfo += `${v.colorName} ${s.size}: ${s.quantity} units, `;
                }
              });
            });
            
            return res.json({
              response: `📦 ${product.name} - ₹${product.sellingPrice}\nStock: ${sizeInfo.slice(0, -2) || 'Out of stock'}\nCategory: ${product.category || 'N/A'}`
            });
          }
        }
        
        // General product info
        const totalStock = products.reduce((sum, p) => sum + (p.totalQuantity || 0), 0);
        return res.json({ 
          response: `📊 Inventory Status: ${products.length} products in catalog, ${totalStock} total units. Need specific product details?` 
        });
      }
      
      if (lowerMsg.includes('supplier')) {
        const suppliers = await Supplier.find().limit(5);
        return res.json({
          response: `🏭 We have ${suppliers.length} active suppliers. Need details about a specific supplier?`
        });
      }
      
      if (lowerMsg.includes('sale') || lowerMsg.includes('revenue')) {
        const sales = await Sale.find().sort('-createdAt').limit(10);
        const total = sales.reduce((sum, s) => sum + (s.total || 0), 0);
        return res.json({
          response: `💰 Total revenue from recent ${sales.length} sales: ₹${total.toLocaleString()}. Would you like a detailed report?`
        });
      }
      
      res.json({ 
        response: "I'm having a bit of trouble connecting. Please try again in a moment. In the meantime, you can check the Dashboard for live inventory stats!" 
      });
      
    } catch (fallbackError) {
      console.error('Fallback error:', fallbackError);
      res.json({ 
        response: "I can help you with inventory questions! Try asking about products, stock levels, suppliers, or sales." 
      });
    }
  }
};
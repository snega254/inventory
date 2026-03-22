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

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const userRequests = {};
const MODEL = 'llama-3.3-70b-versatile';

export const aiRoleBasedChat = async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user?._id || 'anonymous';
    const userRole = req.user?.role || 'user';
    
    console.log(`🤖 ${req.user?.name || 'User'} (${userRole}) asked: "${message}"`);
    
    // Rate limit
    const now = Date.now();
    const recent = (userRequests[userId] || []).filter(t => now - t < 60000);
    if (recent.length >= 5) {
      return res.json({ 
        response: "Please wait a moment before asking another question." 
      });
    }
    userRequests[userId] = [...recent, now];
    
    // Fetch data
    const [products, sales, suppliers, users] = await Promise.all([
      Product.find(),
      Sale.find().sort('-createdAt').limit(50),
      Supplier.find(),
      userRole === 'admin' ? User.find().select('-password') : []
    ]);
    
    // Calculate stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaySales = sales.filter(s => new Date(s.createdAt) >= today);
    const todayRevenue = todaySales.reduce((sum, s) => sum + (s.total || 0), 0);
    
    // ===========================================
    // 🔥 FIX: Include FULL size information
    // ===========================================
    const context = {
      business: "Attire Menswear",
      user: { role: userRole },
      products: products.map(p => ({
        name: p.name,
        price: p.sellingPrice,
        cost: p.purchasePrice,
        totalStock: p.totalQuantity,
        colorVariants: p.colorVariants?.map(v => ({
          color: v.colorName,
          sizes: v.sizes?.map(s => ({
            size: s.size,
            quantity: s.quantity,
            minStock: s.minStock,
            status: s.quantity <= s.minStock ? 'LOW STOCK' : 'OK'
          }))
        }))
      })),
      suppliers: suppliers.map(s => ({
        name: s.name,
        categories: s.categories?.map(c => c.mainCategory)
      })),
      sales: {
        today: {
          count: todaySales.length,
          revenue: todayRevenue
        },
        recent: sales.slice(0, 10).map(s => ({
          invoice: s.invoiceId,
          total: s.total,
          date: s.createdAt
        }))
      },
      stats: {
        totalProducts: products.length,
        totalStock: products.reduce((sum, p) => sum + (p.totalQuantity || 0), 0),
        totalSuppliers: suppliers.length,
        totalSales: sales.length
      }
    };
    
    if (userRole === 'admin') {
      context.employees = users.map(u => ({ name: u.name, role: u.role }));
    }
    
    // Check restricted access
    const lowerMsg = message.toLowerCase();
    if ((lowerMsg.includes('employee') || lowerMsg.includes('profit')) && userRole !== 'admin') {
      return res.json({ 
        response: `I'm your ${userRole} assistant. For employee or profit information, please contact the administrator.` 
      });
    }
    
    // Create prompt with full data
    const prompt = `You are an AI assistant for Attire Menswear.

REAL BUSINESS DATA:
${JSON.stringify(context, null, 2)}

USER (${userRole}): "${message}"

INSTRUCTIONS:
1. Answer using ONLY the data above
2. Be friendly and conversational
3. Format currency as ₹
4. Include size and color details when relevant
5. If stock is low for a specific size, mention it

ANSWER:`;

    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 500
    });
    
    const response = completion.choices[0].message.content;
    console.log('✅ AI response sent');
    res.json({ response });
    
  } catch (error) {
    console.error('AI Error:', error);
    
    // Fallback
    const products = await Product.find();
    const lowerMsg = req.body.message?.toLowerCase() || '';
    
    if (lowerMsg.includes('product') || lowerMsg.includes('shirt')) {
      if (lowerMsg.includes('checked')) {
        const checked = products.find(p => p.name.toLowerCase().includes('checked'));
        if (checked) {
          let sizeInfo = '';
          checked.colorVariants?.forEach(v => {
            v.sizes?.forEach(s => {
              sizeInfo += `${v.colorName} ${s.size}: ${s.quantity} units, `;
            });
          });
          return res.json({
            response: `${checked.name} - ₹${checked.sellingPrice}. Stock: ${sizeInfo.slice(0, -2)}.`
          });
        }
      }
      return res.json({ 
        response: `We have ${products.length} products.` 
      });
    }
    
    res.json({ response: "Please try again." });
  }
};
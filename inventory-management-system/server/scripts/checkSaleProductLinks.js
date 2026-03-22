import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Sale from '../models/Sale.js';
import Product from '../models/Product.js';

dotenv.config();

const checkSaleProductLinks = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const sales = await Sale.find({}).sort({ createdAt: -1 }).limit(5);
    
    console.log('='.repeat(60));
    console.log('📊 CHECKING SALE-PRODUCT LINKS');
    console.log('='.repeat(60));

    for (const sale of sales) {
      console.log(`\n📄 Sale: ${sale.invoiceId} (${new Date(sale.createdAt).toLocaleDateString()})`);
      console.log(`Total: ₹${sale.total}`);
      
      for (const [index, item] of sale.items.entries()) {
        console.log(`\n  Item ${index + 1}: ${item.productName}`);
        console.log(`    - product ID in sale: ${item.product}`);
        
        // Check if product exists in database
        const product = await Product.findById(item.product);
        console.log(`    - product exists in DB: ${!!product}`);
        
        if (product) {
          console.log(`    - product name in DB: ${product.name}`);
          console.log(`    - purchasePrice in DB: ₹${product.purchasePrice}`);
          console.log(`    - sellingPrice in sale: ₹${item.price}`);
          console.log(`    - quantity: ${item.quantity}`);
          
          // Calculate profit manually
          const profit = (item.price - product.purchasePrice) * item.quantity;
          console.log(`    - calculated profit: ₹${profit}`);
        } else {
          console.log(`    ❌ PRODUCT NOT FOUND! This will cause profit = 0`);
        }
      }
      console.log('-'.repeat(40));
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
};

checkSaleProductLinks();
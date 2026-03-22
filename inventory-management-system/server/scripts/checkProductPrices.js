import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/Product.js';

dotenv.config();

const checkProductPrices = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const products = await Product.find({});
    
    console.log('='.repeat(50));
    console.log('📦 PRODUCT PURCHASE PRICES');
    console.log('='.repeat(50));
    
    products.forEach((product, index) => {
      console.log(`\n${index + 1}. ${product.name}`);
      console.log(`   - purchasePrice: ${product.purchasePrice}`);
      console.log(`   - sellingPrice: ${product.sellingPrice}`);
      console.log(`   - profit margin: ${product.sellingPrice - product.purchasePrice}`);
    });

    const withoutPrice = products.filter(p => !p.purchasePrice || p.purchasePrice === 0);
    
    console.log('\n📊 SUMMARY:');
    console.log(`Total products: ${products.length}`);
    console.log(`Products WITHOUT purchasePrice: ${withoutPrice.length}`);
    
    if (withoutPrice.length > 0) {
      console.log('\n⚠️ Products needing purchasePrice:');
      withoutPrice.forEach(p => console.log(`   - ${p.name}`));
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
};

checkProductPrices();
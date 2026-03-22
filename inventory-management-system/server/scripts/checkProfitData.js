import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Sale from '../models/Sale.js';

dotenv.config();

const checkProfitData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check today's sales
    const todaySales = await Sale.find({
      createdAt: { $gte: today, $lt: tomorrow }
    });

    console.log('='.repeat(60));
    console.log('📊 TODAY\'S SALES CHECK');
    console.log('='.repeat(60));
    
    console.log(`\nFound ${todaySales.length} sales today\n`);

    todaySales.forEach((sale, index) => {
      console.log(`Sale ${index + 1}: ${sale.invoiceId}`);
      console.log(`  total field: ${sale.total}`);
      console.log(`  totalProfit field: ${sale.totalProfit}`);
      console.log(`  totalProfit type: ${typeof sale.totalProfit}`);
      console.log(`  Items:`);
      
      sale.items.forEach((item, i) => {
        console.log(`    ${i+1}. ${item.productName}`);
        console.log(`       - price: ${item.price}`);
        console.log(`       - quantity: ${item.quantity}`);
        console.log(`       - profit: ${item.profit}`);
        console.log(`       - purchasePrice: ${item.purchasePrice}`);
      });
      console.log('---');
    });

    // Check all sales with profit
    const allSales = await Sale.find({});
    const withProfit = allSales.filter(s => s.totalProfit && s.totalProfit > 0);
    const withoutProfit = allSales.filter(s => !s.totalProfit || s.totalProfit === 0);

    console.log('\n📊 OVERALL STATS:');
    console.log('='.repeat(60));
    console.log(`Total Sales: ${allSales.length}`);
    console.log(`Sales WITH profit: ${withProfit.length}`);
    console.log(`Sales WITHOUT profit: ${withoutProfit.length}`);

    if (withoutProfit.length > 0) {
      console.log('\n⚠️ Sales WITHOUT profit:');
      withoutProfit.forEach(s => {
        console.log(`  - ${s.invoiceId} (${new Date(s.createdAt).toLocaleDateString()})`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected');
  }
};

checkProfitData();
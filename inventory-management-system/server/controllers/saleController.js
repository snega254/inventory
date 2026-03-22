import Sale from '../models/Sale.js';
import Product from '../models/Product.js';
import Supplier from '../models/Supplier.js';

export const createSale = async (req, res) => {
  try {
    const { items, customerName, phoneNumber, paymentMethod, discount = 0 } = req.body;

    // Calculate totals
    let subtotal = 0;
    let totalGst = 0;
    let totalProfit = 0;

    // Validate and update stock
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ message: `Product not found: ${item.product}` });
      }

      // Find and update specific variant stock
      const variant = product.colorVariants.find(v => v.colorName === item.color);
      if (!variant) {
        return res.status(404).json({ message: `Color variant not found: ${item.color}` });
      }

      const sizeObj = variant.sizes.find(s => s.size === item.size);
      if (!sizeObj || sizeObj.quantity < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${product.name} - ${item.color} - ${item.size}` });
      }

      // Update stock
      sizeObj.quantity -= item.quantity;
      await product.save();

      // Calculate totals
      const itemTotal = item.price * item.quantity;
      subtotal += itemTotal;
      totalGst += (itemTotal * (product.gst || 5)) / 100;
      
      // Calculate profit for this item
      const purchasePrice = product.purchasePrice || 0;
      const sellingPrice = item.price;
      const itemProfit = (sellingPrice - purchasePrice) * item.quantity;
      totalProfit += itemProfit;
      
      // Add profit to the item object
      item.profit = itemProfit;
      item.purchasePrice = purchasePrice;
    }

    const gst = totalGst;
    const cgst = gst / 2;
    const sgst = gst / 2;
    const total = subtotal + gst - discount;

    // Generate invoice ID
    const invoiceId = `INV-${Date.now().toString().slice(-8)}`;

    const sale = await Sale.create({
      invoiceId,
      customerName,
      phoneNumber,
      items,
      subtotal,
      gst,
      cgst,
      sgst,
      discount,
      total,
      totalProfit,
      paymentMethod,
      createdBy: req.user._id
    });

    res.status(201).json(sale);
  } catch (error) {
    console.error('Create sale error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getSales = async (req, res) => {
  try {
    const { startDate, endDate, search } = req.query;
    let query = {};

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (search) {
      query.$or = [
        { invoiceId: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } }
      ];
    }

    const sales = await Sale.find(query)
      .populate('createdBy', 'name')
      .sort('-createdAt');
    
    res.json(sales);
  } catch (error) {
    console.error('Get sales error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    console.log('Fetching dashboard stats...');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get total products
    const totalProducts = await Product.countDocuments();
    console.log('Total products:', totalProducts);
    
    // Get total suppliers
    const totalSuppliers = await Supplier.countDocuments();
    console.log('Total suppliers:', totalSuppliers);
    
    // Get today's revenue and profit
    const todaySales = await Sale.find({
      createdAt: { $gte: today }
    });
    const todayRevenue = todaySales.reduce((sum, sale) => sum + (sale.total || 0), 0);
    const todayProfit = todaySales.reduce((sum, sale) => sum + (sale.totalProfit || 0), 0);
    console.log('Today revenue:', todayRevenue);
    console.log('Today profit:', todayProfit);

    // Get monthly sales (last 30 days)
    const monthlySalesData = await Sale.find({
      createdAt: { $gte: thirtyDaysAgo }
    }).sort({ createdAt: 1 });

    // Group by date
    const monthlySalesMap = new Map();
    monthlySalesData.forEach(sale => {
      const date = sale.createdAt.toISOString().split('T')[0];
      const current = monthlySalesMap.get(date) || { revenue: 0, profit: 0 };
      monthlySalesMap.set(date, {
        revenue: current.revenue + (sale.total || 0),
        profit: current.profit + (sale.totalProfit || 0)
      });
    });

    const monthlySales = Array.from(monthlySalesMap.entries()).map(([date, values]) => ({
      date,
      revenue: values.revenue,
      profit: values.profit
    }));
    console.log('Monthly sales entries:', monthlySales.length);

    // Get top products by profit
    const allSales = await Sale.find();
    const productStats = new Map();

    allSales.forEach(sale => {
      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach(item => {
          const productName = item.productName || 'Unknown';
          const current = productStats.get(productName) || { 
            totalSold: 0, 
            revenue: 0,
            profit: 0 
          };
          current.totalSold += item.quantity || 0;
          current.revenue += (item.price || 0) * (item.quantity || 0);
          current.profit += item.profit || 0;
          productStats.set(productName, current);
        });
      }
    });

    const topProducts = Array.from(productStats.entries())
      .map(([name, data]) => ({
        name,
        totalSold: data.totalSold,
        revenue: data.revenue,
        profit: data.profit
      }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5);
    console.log('Top products by profit:', topProducts.length);

    // Get low stock items
    const products = await Product.find();
    let lowStockCount = 0;
    
    products.forEach(product => {
      if (product.colorVariants && Array.isArray(product.colorVariants)) {
        product.colorVariants.forEach(variant => {
          if (variant.sizes && Array.isArray(variant.sizes)) {
            variant.sizes.forEach(size => {
              if (size.quantity <= (size.minStock || 5)) {
                lowStockCount++;
              }
            });
          }
        });
      }
    });
    console.log('Low stock items:', lowStockCount);

    const stats = {
      totalProducts,
      totalSuppliers,
      lowStockItems: lowStockCount,
      todayRevenue,
      todayProfit,  // Now includes profit!
      monthlySales, // Now includes profit per day!
      topProducts   // Now includes profit per product!
    };

    console.log('Sending stats:', stats);
    res.json(stats);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
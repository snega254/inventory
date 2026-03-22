import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  Package,
  IndianRupee,
  ShoppingBag,
  Users,
  Calendar,
  DollarSign,
  Activity
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import axios from 'axios';
import toast from 'react-hot-toast';
import API from '../services/api';
const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalProfit: 0,
    totalProducts: 0,
    totalSales: 0,
    avgOrderValue: 0,
    profitMargin: 0
  });

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch sales data
     
const salesRes = await API.get('/sales');

      // Fetch products data
      const productsRes = await axios.get('http://localhost:5000/api/products', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const sales = salesRes.data;
      const products = productsRes.data;

      // Process data for analytics
      processAnalyticsData(sales, products);
    } catch (error) {
      console.error('Analytics error:', error);
      toast.error('Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  const processAnalyticsData = (sales, products) => {
    // Create product lookup map for profit calculation
    const productMap = new Map();
    products.forEach(product => {
      productMap.set(product._id.toString(), product);
    });

    // Calculate summary with profit
    let totalRevenue = 0;
    let totalProfit = 0;
    let totalItems = 0;

    sales.forEach(sale => {
      totalRevenue += sale.total || 0;
      
      // Calculate profit for this sale
      sale.items?.forEach(item => {
        const product = productMap.get(item.product?.toString());
        if (product) {
          const purchasePrice = product.purchasePrice || 0;
          const sellingPrice = item.price || 0;
          const quantity = item.quantity || 0;
          totalProfit += (sellingPrice - purchasePrice) * quantity;
          totalItems += quantity;
        }
      });
    });

    const totalSales = sales.length;
    const avgOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    setSummary({
      totalRevenue,
      totalProfit,
      totalProducts: products.length,
      totalSales,
      avgOrderValue,
      profitMargin
    });

    // Process category distribution
    const categoryMap = new Map();
    products.forEach(product => {
      const category = product.category || 'Uncategorized';
      const count = categoryMap.get(category) || 0;
      categoryMap.set(category, count + 1);
    });
    
    const categoryData = Array.from(categoryMap.entries()).map(([name, value]) => ({
      name,
      value
    }));
    setCategoryData(categoryData);

    // Process top products by profit
    const productProfitMap = new Map();
    sales.forEach(sale => {
      sale.items?.forEach(item => {
        const product = productMap.get(item.product?.toString());
        if (product) {
          const productName = item.productName || 'Unknown';
          const purchasePrice = product.purchasePrice || 0;
          const sellingPrice = item.price || 0;
          const quantity = item.quantity || 0;
          const profit = (sellingPrice - purchasePrice) * quantity;
          const revenue = sellingPrice * quantity;
          
          const existing = productProfitMap.get(productName) || { profit: 0, revenue: 0 };
          productProfitMap.set(productName, {
            profit: existing.profit + profit,
            revenue: existing.revenue + revenue
          });
        }
      });
    });

    const topProductsData = Array.from(productProfitMap.entries())
      .map(([name, data]) => ({ 
        name, 
        profit: data.profit,
        revenue: data.revenue 
      }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5);
    setTopProducts(topProductsData);

    // Process monthly revenue with profit
    const monthlyMap = new Map();
    sales.forEach(sale => {
      const date = new Date(sale.createdAt);
      const monthYear = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
      
      let saleProfit = 0;
      sale.items?.forEach(item => {
        const product = productMap.get(item.product?.toString());
        if (product) {
          const purchasePrice = product.purchasePrice || 0;
          const sellingPrice = item.price || 0;
          const quantity = item.quantity || 0;
          saleProfit += (sellingPrice - purchasePrice) * quantity;
        }
      });

      const existing = monthlyMap.get(monthYear) || { revenue: 0, profit: 0 };
      monthlyMap.set(monthYear, {
        revenue: existing.revenue + (sale.total || 0),
        profit: existing.profit + saleProfit
      });
    });

    const monthlyData = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({ 
        month, 
        revenue: data.revenue,
        profit: data.profit
      }))
      .sort((a, b) => {
        const dateA = new Date(a.month);
        const dateB = new Date(b.month);
        return dateA - dateB;
      });
    setMonthlyRevenue(monthlyData);

    // Process sales performance by day (last 30 days)
    const last30Days = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      last30Days.push(date.toISOString().split('T')[0]);
    }

    const dailySales = last30Days.map(date => {
      const daySales = sales.filter(sale => 
        sale.createdAt?.split('T')[0] === date
      );
      
      let dayRevenue = 0;
      let dayProfit = 0;
      
      daySales.forEach(sale => {
        dayRevenue += sale.total || 0;
        sale.items?.forEach(item => {
          const product = productMap.get(item.product?.toString());
          if (product) {
            const purchasePrice = product.purchasePrice || 0;
            const sellingPrice = item.price || 0;
            const quantity = item.quantity || 0;
            dayProfit += (sellingPrice - purchasePrice) * quantity;
          }
        });
      });
      
      return {
        date,
        displayDate: new Date(date).toLocaleDateString('en-IN', { 
          day: '2-digit', 
          month: 'short'
        }),
        revenue: dayRevenue,
        profit: dayProfit
      };
    });
    setSalesData(dailySales);
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Analytics Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Last 30 days performance</p>
        </div>
        <div className="flex items-center space-x-2 text-sm bg-blue-50 px-3 py-1 rounded-full">
          <Calendar size={16} className="text-blue-600" />
          <span className="text-blue-600 font-medium">Last 30 Days</span>
        </div>
      </div>

      {/* Sales Performance Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-xl shadow-lg p-6"
      >
        <h2 className="text-lg font-semibold mb-4">Revenue & Profit Trend</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="displayDate" 
                tick={{ fontSize: 12 }}
                interval={Math.floor(salesData.length / 8)}
              />
              <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" />
              <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
              <Tooltip 
                formatter={(value, name) => [
                  formatCurrency(value), 
                  name === 'revenue' ? 'Revenue' : 'Profit'
                ]}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Legend />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="revenue" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={false}
                name="Revenue"
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="profit" 
                stroke="#10b981" 
                strokeWidth={2}
                dot={false}
                name="Profit"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <h2 className="text-lg font-semibold mb-4">Monthly Revenue</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Category Distribution */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <h2 className="text-lg font-semibold mb-4">Category Distribution</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Top Products by Profit */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <h2 className="text-lg font-semibold mb-4">Top Products by Profit</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topProducts}
                layout="vertical"
                margin={{ left: 80, right: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={80}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  formatter={(value) => formatCurrency(value)}
                  cursor={{ fill: '#f0f0f0' }}
                />
                <Bar dataKey="profit" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Key Metrics */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.9 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <h2 className="text-lg font-semibold mb-4">Key Metrics</h2>
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Activity className="text-blue-600" size={20} />
                  <span className="text-gray-600">Average Daily Sales</span>
                </div>
                <span className="font-semibold">{formatCurrency(summary.totalRevenue / 30)}</span>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <TrendingUp className="text-green-600" size={20} />
                  <span className="text-gray-600">Profit Margin</span>
                </div>
                <span className="font-semibold text-green-600">{summary.profitMargin.toFixed(1)}%</span>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <ShoppingBag className="text-purple-600" size={20} />
                  <span className="text-gray-600">Peak Sales Day</span>
                </div>
                <span className="font-semibold">
                  {formatCurrency(Math.max(...salesData.map(d => d.revenue)))}
                </span>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Package className="text-orange-600" size={20} />
                  <span className="text-gray-600">Categories</span>
                </div>
                <span className="font-semibold">{categoryData.length}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Analytics;
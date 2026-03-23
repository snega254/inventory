import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  Package,
  IndianRupee,
  ShoppingBag,
  Calendar,
  Activity,
  Users,
  CreditCard,
  DollarSign
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  Legend,
  RadialBarChart,
  RadialBar
} from 'recharts';
import API from '../services/api';
import toast from 'react-hot-toast';

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);
  const [dailySales, setDailySales] = useState([]);
  const [paymentDistribution, setPaymentDistribution] = useState([]);
  const [profitMarginData, setProfitMarginData] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [activeChart, setActiveChart] = useState('revenue');
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalProfit: 0,
    totalProducts: 0,
    totalSales: 0,
    avgOrderValue: 0,
    profitMargin: 0,
    totalCustomers: 0,
    lowStockItems: 0
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      const salesRes = await API.get('/sales');
      const productsRes = await API.get('/products');
      const suppliersRes = await API.get('/suppliers');
      const usersRes = await API.get('/users');

      const sales = salesRes.data;
      const products = productsRes.data;
      const suppliers = Array.isArray(suppliersRes.data) ? suppliersRes.data : suppliersRes.data.suppliers || [];
      const users = usersRes.data;

      processAnalyticsData(sales, products, suppliers, users);
    } catch (error) {
      console.error('Analytics error:', error);
      toast.error('Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  const processAnalyticsData = (sales, products, suppliers, users) => {
    const productMap = new Map();
    products.forEach(p => productMap.set(p._id.toString(), p));

    // Calculate totals
    let totalRevenue = 0, totalProfit = 0;
    sales.forEach(sale => {
      totalRevenue += sale.total || 0;
      sale.items?.forEach(item => {
        const product = productMap.get(item.product?.toString());
        if (product) {
          const profit = (item.price - (product.purchasePrice || 0)) * item.quantity;
          totalProfit += profit;
        }
      });
    });

    const totalSales = sales.length;
    const avgOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // Count low stock items
    let lowStock = 0;
    products.forEach(p => {
      p.colorVariants?.forEach(v => {
        v.sizes?.forEach(s => {
          if (s.quantity <= (s.minStock || 5)) lowStock++;
        });
      });
    });

    setSummary({
      totalRevenue,
      totalProfit,
      totalProducts: products.length,
      totalSales,
      avgOrderValue,
      profitMargin,
      totalCustomers: users.length,
      lowStockItems: lowStock
    });

    // Category distribution
    const categoryMap = new Map();
    products.forEach(p => {
      const cat = p.category || 'Uncategorized';
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
    });
    setCategoryData(Array.from(categoryMap.entries()).map(([name, value]) => ({ 
      name: name.length > 12 ? name.substring(0, 10) + '..' : name, 
      value 
    })));

    // Top products by profit
    const productProfitMap = new Map();
    sales.forEach(sale => {
      sale.items?.forEach(item => {
        const product = productMap.get(item.product?.toString());
        if (product) {
          const name = item.productName || 'Unknown';
          const profit = (item.price - (product.purchasePrice || 0)) * item.quantity;
          const existing = productProfitMap.get(name) || { profit: 0, revenue: 0 };
          existing.profit += profit;
          existing.revenue += item.price * item.quantity;
          productProfitMap.set(name, existing);
        }
      });
    });
    setTopProducts(Array.from(productProfitMap.entries())
      .map(([name, data]) => ({ 
        name: name.length > 18 ? name.substring(0, 15) + '...' : name, 
        profit: data.profit,
        revenue: data.revenue
      }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5));

    // Monthly revenue
    const monthlyMap = new Map();
    sales.forEach(sale => {
      const date = new Date(sale.createdAt);
      const month = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
      const existing = monthlyMap.get(month) || { revenue: 0, profit: 0 };
      existing.revenue += sale.total || 0;
      
      let profit = 0;
      sale.items?.forEach(item => {
        const product = productMap.get(item.product?.toString());
        if (product) profit += (item.price - (product.purchasePrice || 0)) * item.quantity;
      });
      existing.profit += profit;
      monthlyMap.set(month, existing);
    });
    setMonthlyRevenue(Array.from(monthlyMap.entries())
      .map(([month, data]) => ({ month, revenue: data.revenue, profit: data.profit }))
      .sort((a, b) => new Date(a.month) - new Date(b.month)));

    // Daily sales (last 30 days)
    const dailyMap = new Map();
    const last30Days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      last30Days.push(d.toISOString().split('T')[0]);
    }
    
    last30Days.forEach(date => {
      const daySales = sales.filter(s => s.createdAt?.split('T')[0] === date);
      let revenue = 0, profit = 0;
      daySales.forEach(s => {
        revenue += s.total || 0;
        s.items?.forEach(item => {
          const product = productMap.get(item.product?.toString());
          if (product) profit += (item.price - (product.purchasePrice || 0)) * item.quantity;
        });
      });
      dailyMap.set(date, {
        date: new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        revenue,
        profit
      });
    });
    setDailySales(Array.from(dailyMap.values()));

    // Payment distribution
    const paymentMap = new Map();
    sales.forEach(sale => {
      const method = sale.paymentMethod || 'Other';
      paymentMap.set(method, (paymentMap.get(method) || 0) + (sale.total || 0));
    });
    setPaymentDistribution(Array.from(paymentMap.entries()).map(([name, value]) => ({ name, value })));

    // Profit margin trend
    const marginMap = new Map();
    sales.forEach(sale => {
      const date = new Date(sale.createdAt);
      const month = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
      const existing = marginMap.get(month) || { revenue: 0, profit: 0 };
      existing.revenue += sale.total || 0;
      sale.items?.forEach(item => {
        const product = productMap.get(item.product?.toString());
        if (product) existing.profit += (item.price - (product.purchasePrice || 0)) * item.quantity;
      });
      marginMap.set(month, existing);
    });
    setProfitMarginData(Array.from(marginMap.entries())
      .map(([month, data]) => ({ 
        month: month.length > 8 ? month.substring(0, 6) : month,
        margin: data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0 
      }))
      .sort((a, b) => new Date(a.month) - new Date(b.month)));
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];
  const formatCurrency = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(v);

  const chartOptions = [
    { id: 'revenue', name: 'Revenue', icon: DollarSign },
    { id: 'profit', name: 'Profit', icon: TrendingUp },
    { id: 'margin', name: 'Margin %', icon: Activity },
    { id: 'payment', name: 'Payments', icon: CreditCard }
  ];

  if (loading) return <div className="flex justify-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Analytics Dashboard</h1>
          <p className="text-xs sm:text-sm text-gray-500">Complete business performance overview</p>
        </div>
        <div className="flex items-center gap-2 text-xs sm:text-sm bg-blue-50 px-2 sm:px-3 py-1 rounded-full">
          <Calendar size={14} className="text-blue-600" />
          <span className="text-blue-600 font-medium">Last 30 Days</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-3 text-white">
          <p className="text-xs opacity-80">Total Revenue</p>
          <p className="text-lg sm:text-xl font-bold">{formatCurrency(summary.totalRevenue)}</p>
          <p className="text-xs mt-1">{summary.totalSales} transactions</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-3 text-white">
          <p className="text-xs opacity-80">Total Profit</p>
          <p className="text-lg sm:text-xl font-bold">{formatCurrency(summary.totalProfit)}</p>
          <p className="text-xs mt-1">Margin: {summary.profitMargin.toFixed(1)}%</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-3 text-white">
          <p className="text-xs opacity-80">Avg Order Value</p>
          <p className="text-lg sm:text-xl font-bold">{formatCurrency(summary.avgOrderValue)}</p>
          <p className="text-xs mt-1">Per transaction</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-3 text-white">
          <p className="text-xs opacity-80">Low Stock Alert</p>
          <p className="text-lg sm:text-xl font-bold">{summary.lowStockItems}</p>
          <p className="text-xs mt-1">Products below threshold</p>
        </div>
      </div>

      {/* Chart Selector */}
      <div className="flex flex-wrap gap-2">
        {chartOptions.map(opt => (
          <button
            key={opt.id}
            onClick={() => setActiveChart(opt.id)}
            className={`px-3 sm:px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition ${
              activeChart === opt.id 
                ? 'bg-primary-600 text-white' 
                : 'bg-white text-gray-600 border hover:bg-gray-50'
            }`}
          >
            <opt.icon size={16} />
            <span>{opt.name}</span>
          </button>
        ))}
      </div>

      {/* Revenue & Profit Trend - Full Chart */}
      <div className="bg-white rounded-xl shadow-lg p-3 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold mb-3">Revenue & Profit Trend</h2>
        <div className="h-64 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            {activeChart === 'revenue' ? (
              <AreaChart data={dailySales} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: isMobile ? 9 : 12 }} interval={isMobile ? Math.floor(dailySales.length / 5) : Math.floor(dailySales.length / 8)} />
                <YAxis tick={{ fontSize: isMobile ? 9 : 12 }} tickFormatter={(v) => isMobile && v > 1000 ? `${v/1000}k` : v} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="url(#revenueGrad)" name="Revenue" />
              </AreaChart>
            ) : activeChart === 'profit' ? (
              <BarChart data={dailySales} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: isMobile ? 9 : 12 }} interval={isMobile ? Math.floor(dailySales.length / 5) : Math.floor(dailySales.length / 8)} />
                <YAxis tick={{ fontSize: isMobile ? 9 : 12 }} tickFormatter={(v) => isMobile && v > 1000 ? `${v/1000}k` : v} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} name="Profit" />
              </BarChart>
            ) : activeChart === 'margin' ? (
              <LineChart data={profitMarginData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: isMobile ? 9 : 12 }} />
                <YAxis tickFormatter={(v) => v.toFixed(0) + '%'} />
                <Tooltip formatter={(v) => v.toFixed(1) + '%'} />
                <Legend />
                <Line type="monotone" dataKey="margin" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} name="Profit Margin %" />
              </LineChart>
            ) : (
              <PieChart>
                <Pie
                  data={paymentDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={isMobile ? 40 : 60}
                  outerRadius={isMobile ? 70 : 90}
                  dataKey="value"
                  label={!isMobile}
                >
                  {paymentDistribution.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend />
              </PieChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two Column Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly Revenue Chart */}
        <div className="bg-white rounded-xl shadow-lg p-3 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold mb-3">Monthly Revenue</h2>
          <div className="h-56 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyRevenue} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: isMobile ? 10 : 12 }} angle={isMobile ? -45 : 0} textAnchor={isMobile ? "end" : "middle"} height={isMobile ? 50 : 30} />
                <YAxis tick={{ fontSize: isMobile ? 9 : 12 }} tickFormatter={(v) => isMobile && v > 1000 ? `${v/1000}k` : v} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Distribution */}
        <div className="bg-white rounded-xl shadow-lg p-3 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold mb-3">Category Distribution</h2>
          <div className="h-56 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={!isMobile}
                  label={isMobile ? false : ({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={isMobile ? 60 : 80}
                  dataKey="value"
                >
                  {categoryData.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => `${v} products`} />
                {isMobile && <Legend wrapperStyle={{ fontSize: 10 }} />}
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products by Profit */}
        <div className="bg-white rounded-xl shadow-lg p-3 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold mb-3">Top Products by Profit</h2>
          <div className="h-56 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topProducts}
                layout="vertical"
                margin={{ left: isMobile ? 60 : 80, right: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => isMobile && v > 1000 ? `${v/1000}k` : v} />
                <YAxis type="category" dataKey="name" width={isMobile ? 60 : 80} tick={{ fontSize: isMobile ? 9 : 12 }} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Bar dataKey="profit" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Profit Trend */}
        <div className="bg-white rounded-xl shadow-lg p-3 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold mb-3">Monthly Profit Trend</h2>
          <div className="h-56 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyRevenue} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: isMobile ? 10 : 12 }} angle={isMobile ? -45 : 0} textAnchor={isMobile ? "end" : "middle"} height={isMobile ? 50 : 30} />
                <YAxis tick={{ fontSize: isMobile ? 9 : 12 }} tickFormatter={(v) => isMobile && v > 1000 ? `${v/1000}k` : v} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend />
                <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Profit" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Payment Methods */}
        <div className="bg-white rounded-xl shadow-lg p-3 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold mb-3">Payment Methods Distribution</h2>
          <div className="space-y-3">
            {paymentDistribution.map((method, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                  <span className="text-sm">{method.name}</span>
                </div>
                <div className="text-right">
                  <span className="font-semibold">{formatCurrency(method.value)}</span>
                  <span className="text-xs text-gray-500 ml-2">
                    ({((method.value / summary.totalRevenue) * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-xl shadow-lg p-3 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold mb-3">Quick Statistics</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <div className="flex items-center gap-2"><Users size={16} className="text-blue-500" /><span>Total Customers</span></div>
              <span className="font-semibold">{summary.totalCustomers}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <div className="flex items-center gap-2"><Package size={16} className="text-green-500" /><span>Total Products</span></div>
              <span className="font-semibold">{summary.totalProducts}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <div className="flex items-center gap-2"><ShoppingBag size={16} className="text-purple-500" /><span>Total Sales</span></div>
              <span className="font-semibold">{summary.totalSales}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <div className="flex items-center gap-2"><TrendingUp size={16} className="text-orange-500" /><span>Profit Margin</span></div>
              <span className="font-semibold text-green-600">{summary.profitMargin.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Analytics;
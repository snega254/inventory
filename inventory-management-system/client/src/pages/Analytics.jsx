import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  Package,
  IndianRupee,
  ShoppingBag,
  Calendar,
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
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import API from '../services/api';
import toast from 'react-hot-toast';

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalProfit: 0,
    totalProducts: 0,
    totalSales: 0,
    avgOrderValue: 0,
    profitMargin: 0
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
      processAnalyticsData(salesRes.data, productsRes.data);
    } catch (error) {
      toast.error('Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  const processAnalyticsData = (sales, products) => {
    const productMap = new Map();
    products.forEach(p => productMap.set(p._id.toString(), p));

    let totalRevenue = 0, totalProfit = 0;
    sales.forEach(sale => {
      totalRevenue += sale.total || 0;
      sale.items?.forEach(item => {
        const product = productMap.get(item.product?.toString());
        if (product) {
          totalProfit += (item.price - (product.purchasePrice || 0)) * item.quantity;
        }
      });
    });

    const totalSales = sales.length;
    const avgOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    setSummary({ totalRevenue, totalProfit, totalProducts: products.length, totalSales, avgOrderValue, profitMargin });

    const categoryMap = new Map();
    products.forEach(p => {
      const cat = p.category || 'Uncategorized';
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
    });
    setCategoryData(Array.from(categoryMap.entries()).map(([name, value]) => ({ name: name.length > 12 ? name.substring(0, 10) + '..' : name, value })));

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
    setTopProducts(Array.from(productProfitMap.entries()).map(([name, data]) => ({ name: name.length > 18 ? name.substring(0, 15) + '...' : name, profit: data.profit })).sort((a, b) => b.profit - a.profit).slice(0, 5));

    const monthlyMap = new Map();
    sales.forEach(sale => {
      const date = new Date(sale.createdAt);
      const month = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
      const existing = monthlyMap.get(month) || { revenue: 0, profit: 0 };
      existing.revenue += sale.total || 0;
      monthlyMap.set(month, existing);
    });
    setMonthlyRevenue(Array.from(monthlyMap.entries()).map(([month, data]) => ({ month, revenue: data.revenue })).sort((a, b) => new Date(a.month) - new Date(b.month)));

    const dailyMap = new Map();
    sales.forEach(sale => {
      const date = new Date(sale.createdAt).toISOString().split('T')[0];
      const display = new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      const existing = dailyMap.get(date) || { date: display, revenue: 0, profit: 0 };
      existing.revenue += sale.total || 0;
      dailyMap.set(date, existing);
    });
    setSalesData(Array.from(dailyMap.values()).slice(-30));
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  const formatCurrency = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(v);

  if (loading) return <div className="flex justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div><h1 className="text-xl sm:text-2xl font-semibold">Analytics Dashboard</h1><p className="text-xs sm:text-sm text-gray-500">Last 30 days performance</p></div>
        <div className="flex items-center gap-2 text-xs sm:text-sm bg-blue-50 px-2 sm:px-3 py-1 rounded-full"><Calendar size={14} className="text-blue-600" /><span className="text-blue-600 font-medium">Last 30 Days</span></div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-3 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold mb-3">Revenue & Profit Trend</h2>
        <div className="h-64 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={salesData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: isMobile ? 9 : 12 }} interval={isMobile ? Math.floor(salesData.length / 5) : Math.floor(salesData.length / 8)} />
              <YAxis tick={{ fontSize: isMobile ? 9 : 12 }} tickFormatter={(v) => isMobile && v > 1000 ? `${v/1000}k` : v} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Legend wrapperStyle={{ fontSize: isMobile ? 10 : 12 }} />
              <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={false} name="Revenue" />
              <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} dot={false} name="Profit" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
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

        <div className="bg-white rounded-xl shadow-lg p-3 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold mb-3">Category Distribution</h2>
          <div className="h-56 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" labelLine={!isMobile} label={isMobile ? false : ({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} outerRadius={isMobile ? 60 : 80} dataKey="value">
                  {categoryData.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                {isMobile && <Legend wrapperStyle={{ fontSize: 10 }} />}
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-3 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold mb-3">Top Products by Profit</h2>
          <div className="h-56 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts} layout="vertical" margin={{ left: isMobile ? 60 : 80, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => isMobile && v > 1000 ? `${v/1000}k` : v} />
                <YAxis type="category" dataKey="name" width={isMobile ? 60 : 80} tick={{ fontSize: isMobile ? 9 : 12 }} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Bar dataKey="profit" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-3 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold mb-3">Key Metrics</h2>
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            {[
              { icon: Activity, color: 'blue', label: 'Avg Daily Sales', value: formatCurrency(summary.totalRevenue / 30) },
              { icon: TrendingUp, color: 'green', label: 'Profit Margin', value: `${summary.profitMargin.toFixed(1)}%` },
              { icon: ShoppingBag, color: 'purple', label: 'Avg Order', value: formatCurrency(summary.avgOrderValue) },
              { icon: Package, color: 'orange', label: 'Products', value: summary.totalProducts }
            ].map((item, i) => (
              <div key={i} className="bg-gray-50 p-2 sm:p-4 rounded-lg">
                <div className="flex items-center gap-2"><item.icon className={`text-${item.color}-600`} size={isMobile ? 14 : 20} /><span className="text-xs sm:text-sm text-gray-600">{item.label}</span></div>
                <p className="text-xs sm:text-base font-semibold mt-1">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Analytics;
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Package,
  Truck,
  AlertTriangle
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import axios from 'axios';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalSuppliers: 0,
    lowStockItems: 0,
    todayRevenue: 0,
    monthlySales: [],
    topProducts: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error('Please login again');
        return;
      }
      
      // Fetch current stats
      const { data: currentStats } = await axios.get(
        'http://localhost:5000/api/sales/dashboard/stats',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Format dates properly and ensure all values have defaults
      const formattedMonthlySales = (currentStats.monthlySales || []).map(item => ({
        ...item,
        // Keep the full date string for display
        fullDate: item.date,
        // Format for display if needed
        displayDate: new Date(item.date).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        })
      }));

      const safeStats = {
        totalProducts: currentStats.totalProducts || 0,
        totalSuppliers: currentStats.totalSuppliers || 0,
        lowStockItems: currentStats.lowStockItems || 0,
        todayRevenue: currentStats.todayRevenue || 0,
        monthlySales: formattedMonthlySales,
        topProducts: (currentStats.topProducts || []).slice(0, 3)
      };
      
      setStats(safeStats);
    } catch (error) {
      console.error('Dashboard error:', error);
      toast.error('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    {
      title: 'Total Products',
      value: stats.totalProducts,
      icon: Package,
      color: 'bg-blue-500',
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Total Suppliers',
      value: stats.totalSuppliers,
      icon: Truck,
      color: 'bg-green-500',
      iconColor: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Low Stock Items',
      value: stats.lowStockItems,
      icon: AlertTriangle,
      color: 'bg-yellow-500',
      iconColor: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    }
  ];

  // Ensure monthlySales is an array and has data
  const monthlySalesData = Array.isArray(stats.monthlySales) ? stats.monthlySales : [];
  const topProductsData = Array.isArray(stats.topProducts) ? stats.topProducts : [];

  // Custom formatter for X-axis to show full date
  const formatXAxis = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short'
    });
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.title}</p>
                <p className="text-2xl font-semibold mt-1">{card.value}</p>
              </div>
              <div className={`${card.bgColor} p-3 rounded-lg`}>
                <card.icon className={card.iconColor} size={24} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Monthly Revenue Chart with Today's Revenue Highlight */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl shadow-sm p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Monthly Revenue</h3>
            <div className="text-sm bg-purple-50 px-3 py-1 rounded-full">
              <span className="text-purple-600 font-medium">
                Today: ₹{(stats.todayRevenue || 0).toLocaleString()}
              </span>
            </div>
          </div>
          <div className="h-80">
            {monthlySalesData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlySalesData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatXAxis}
                    interval={Math.floor(monthlySalesData.length / 8)} // Show ~8 labels
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [`₹${(value || 0).toLocaleString()}`, 'Revenue']}
                    labelFormatter={(label) => {
                      const date = new Date(label);
                      return date.toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        weekday: 'long'
                      });
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                No revenue data available
              </div>
            )}
          </div>
        </motion.div>

        {/* Top 3 Products by Revenue */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl shadow-sm p-6"
        >
          <h3 className="text-lg font-semibold mb-4">Top 3 Selling Products</h3>
          <div className="space-y-3">
            {topProductsData.length > 0 ? (
              topProductsData.map((product, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                      index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-600'
                    }`}>
                      {index + 1}
                    </div>
                    <span className="font-medium text-sm">{product.name || 'Unknown'}</span>
                  </div>
                  <span className="font-semibold text-primary-600 text-sm">
                    ₹{(product.revenue || 0).toLocaleString()}
                  </span>
                </div>
              ))
            ) : (
              <div className="h-40 flex items-center justify-center text-gray-400">
                No sales data available
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Daily Sales Performance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white rounded-xl shadow-sm p-6"
      >
        <h3 className="text-lg font-semibold mb-4">Daily Sales Performance</h3>
        <div className="h-64">
          {monthlySalesData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlySalesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatXAxis}
                  interval={Math.floor(monthlySalesData.length / 6)} // Show ~6 labels
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [`₹${(value || 0).toLocaleString()}`, 'Revenue']}
                  labelFormatter={(label) => {
                    const date = new Date(label);
                    return date.toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      weekday: 'long'
                    });
                  }}
                />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              No sales data available
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Dashboard;
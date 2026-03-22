import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Download,
  FileText,
  Calendar,
  Filter,
  IndianRupee,
  Users,
  CreditCard,
  TrendingUp,
  TrendingDown,
  DollarSign,
  RefreshCw,
  Printer,
  ChevronDown,
  X,
  PieChart,
  BarChart3,
  DownloadCloud,
  Eye,
  EyeOff,
  ShoppingBag,
  Package,
  Truck,
  AlertCircle
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Sector
} from 'recharts';

const Reports = () => {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)),
    end: new Date()
  });
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc');
  const [viewMode, setViewMode] = useState('detailed');
  const [showCharts, setShowCharts] = useState(true);
  const [activeChart, setActiveChart] = useState('profit');
  const [activePieIndex, setActivePieIndex] = useState(0);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalProfit: 0,
    totalTransactions: 0,
    averageOrderValue: 0,
    cashCount: 0,
    upiCount: 0,
    cardCount: 0,
    totalProducts: 0,
    totalSuppliers: 0,
    topProducts: [],
    topSuppliers: [],
    dailyStats: [],
    monthlyStats: [],
    paymentBreakdown: []
  });

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (sales.length > 0 && products.length > 0) {
      filterAndCalculateData();
    }
  }, [sales, products, suppliers, dateRange, paymentFilter]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      const salesRes = await axios.get('http://localhost:5000/api/sales', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const productsRes = await axios.get('http://localhost:5000/api/products', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const suppliersRes = await axios.get('http://localhost:5000/api/suppliers', {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSales(salesRes.data);
      setProducts(productsRes.data);
      setSuppliers(Array.isArray(suppliersRes.data) ? suppliersRes.data : suppliersRes.data.suppliers || []);
      
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to fetch report data');
    } finally {
      setLoading(false);
    }
  };

  const filterAndCalculateData = () => {
    // Filter sales by date range
    const filteredSales = sales.filter(sale => {
      const saleDate = new Date(sale.createdAt);
      return saleDate >= dateRange.start && saleDate <= dateRange.end;
    });

    // Apply payment filter
    const paymentFiltered = paymentFilter === 'all' 
      ? filteredSales 
      : filteredSales.filter(s => s.paymentMethod === paymentFilter);

    // Calculate revenue stats
    const totalRevenue = paymentFiltered.reduce((sum, sale) => sum + (sale.total || 0), 0);
    const totalTransactions = paymentFiltered.length;
    const averageOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    // Create product lookup map for faster access
    const productMap = new Map();
    products.forEach(product => {
      productMap.set(product._id.toString(), product);
    });

    // =========== CALCULATE TOTAL PROFIT ===========
    let totalProfit = 0;
    const dailyProfitMap = new Map();
    const monthlyProfitMap = new Map();
    const productProfitMap = new Map();

    paymentFiltered.forEach(sale => {
      const saleDate = new Date(sale.createdAt);
      const dateStr = saleDate.toISOString().split('T')[0];
      const monthYear = `${saleDate.toLocaleString('default', { month: 'short' })} ${saleDate.getFullYear()}`;
      
      let saleProfit = 0;

      sale.items?.forEach(item => {
        const product = productMap.get(item.product?.toString());
        if (product) {
          const purchasePrice = product.purchasePrice || 0;
          const sellingPrice = item.price || 0;
          const quantity = item.quantity || 0;
          const itemProfit = (sellingPrice - purchasePrice) * quantity;
          
          saleProfit += itemProfit;
          totalProfit += itemProfit;

          // Update product profit map
          const productName = item.productName || 'Unknown';
          const existing = productProfitMap.get(productName) || { 
            name: productName,
            quantity: 0, 
            revenue: 0, 
            profit: 0 
          };
          existing.quantity += quantity;
          existing.revenue += sellingPrice * quantity;
          existing.profit += itemProfit;
          productProfitMap.set(productName, existing);
        }
      });

      // Update daily profit
      const currentDaily = dailyProfitMap.get(dateStr) || { 
        date: saleDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        fullDate: dateStr,
        revenue: 0, 
        profit: 0, 
        transactions: 0 
      };
      currentDaily.revenue += sale.total || 0;
      currentDaily.profit += saleProfit;
      currentDaily.transactions += 1;
      dailyProfitMap.set(dateStr, currentDaily);

      // Update monthly profit
      const currentMonthly = monthlyProfitMap.get(monthYear) || { 
        month: monthYear,
        revenue: 0, 
        profit: 0, 
        transactions: 0 
      };
      currentMonthly.revenue += sale.total || 0;
      currentMonthly.profit += saleProfit;
      currentMonthly.transactions += 1;
      monthlyProfitMap.set(monthYear, currentMonthly);
    });

    // Convert maps to arrays
    const dailyStats = Array.from(dailyProfitMap.values()).sort((a, b) => 
      new Date(a.fullDate) - new Date(b.fullDate)
    );

    const monthlyStats = Array.from(monthlyProfitMap.values());

    const topProducts = Array.from(productProfitMap.values())
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10);

    // Payment method breakdown
    const cashCount = paymentFiltered.filter(s => s.paymentMethod === 'Cash').length;
    const upiCount = paymentFiltered.filter(s => s.paymentMethod === 'UPI').length;
    const cardCount = paymentFiltered.filter(s => s.paymentMethod === 'Card').length;

    const paymentBreakdown = [
      { name: 'Cash', value: cashCount, amount: paymentFiltered.filter(s => s.paymentMethod === 'Cash').reduce((sum, s) => sum + (s.total || 0), 0) },
      { name: 'UPI', value: upiCount, amount: paymentFiltered.filter(s => s.paymentMethod === 'UPI').reduce((sum, s) => sum + (s.total || 0), 0) },
      { name: 'Card', value: cardCount, amount: paymentFiltered.filter(s => s.paymentMethod === 'Card').reduce((sum, s) => sum + (s.total || 0), 0) }
    ].filter(p => p.value > 0);

    setStats({
      totalRevenue,
      totalProfit,
      totalTransactions,
      averageOrderValue,
      cashCount,
      upiCount,
      cardCount,
      totalProducts: products.length,
      totalSuppliers: suppliers.length,
      topProducts,
      dailyStats,
      monthlyStats,
      paymentBreakdown
    });
  };

  const getFilteredSales = () => {
    let filtered = sales.filter(sale => {
      const saleDate = new Date(sale.createdAt);
      return saleDate >= dateRange.start && saleDate <= dateRange.end;
    });

    if (paymentFilter !== 'all') {
      filtered = filtered.filter(s => s.paymentMethod === paymentFilter);
    }

    if (search) {
      filtered = filtered.filter(sale =>
        sale.invoiceId?.toLowerCase().includes(search.toLowerCase()) ||
        sale.customerName?.toLowerCase().includes(search.toLowerCase()) ||
        sale.items?.some(item => item.productName?.toLowerCase().includes(search.toLowerCase()))
      );
    }

    switch(sortBy) {
      case 'date_desc':
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case 'date_asc':
        filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case 'amount_desc':
        filtered.sort((a, b) => (b.total || 0) - (a.total || 0));
        break;
      case 'amount_asc':
        filtered.sort((a, b) => (a.total || 0) - (b.total || 0));
        break;
    }

    return filtered;
  };

  const calculateSaleProfit = (sale) => {
    let profit = 0;
    const productMap = new Map();
    products.forEach(p => productMap.set(p._id.toString(), p));
    
    sale.items?.forEach(item => {
      const product = productMap.get(item.product?.toString());
      if (product) {
        const purchasePrice = product.purchasePrice || 0;
        const sellingPrice = item.price || 0;
        const quantity = item.quantity || 0;
        profit += (sellingPrice - purchasePrice) * quantity;
      }
    });
    return profit;
  };

  const exportToPDF = async () => {
    setExporting(true);
    try {
      const doc = new jsPDF();
      const filteredSales = getFilteredSales();
      
      doc.setFontSize(24);
      doc.setTextColor(33, 33, 33);
      doc.text('Sales Report', 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Period: ${dateRange.start.toLocaleDateString()} to ${dateRange.end.toLocaleDateString()}`,
        14, 32
      );

      doc.setFontSize(14);
      doc.setTextColor(33, 33, 33);
      doc.text('Summary', 14, 45);
      
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      
      const summaryY = 55;
      doc.text(`Total Revenue: ₹${stats.totalRevenue.toLocaleString()}`, 14, summaryY);
      doc.text(`Total Profit: ₹${stats.totalProfit.toLocaleString()}`, 14, summaryY + 7);
      doc.text(`Total Transactions: ${stats.totalTransactions}`, 14, summaryY + 14);
      doc.text(`Average Order Value: ₹${stats.averageOrderValue.toFixed(2)}`, 14, summaryY + 21);

      doc.text('Payment Methods:', 14, summaryY + 35);
      doc.text(`Cash: ${stats.cashCount} transactions (₹${stats.paymentBreakdown.find(p => p.name === 'Cash')?.amount.toLocaleString() || 0})`, 14, summaryY + 42);
      doc.text(`UPI: ${stats.upiCount} transactions (₹${stats.paymentBreakdown.find(p => p.name === 'UPI')?.amount.toLocaleString() || 0})`, 14, summaryY + 49);
      doc.text(`Card: ${stats.cardCount} transactions (₹${stats.paymentBreakdown.find(p => p.name === 'Card')?.amount.toLocaleString() || 0})`, 14, summaryY + 56);

      const tableColumn = ['Date', 'Invoice ID', 'Customer', 'Payment', 'Items', 'Revenue', 'Profit'];
      const tableRows = [];
      
      filteredSales.slice(0, 50).forEach(sale => {
        const itemCount = sale.items?.length || 0;
        const saleProfit = calculateSaleProfit(sale);
        const saleData = [
          new Date(sale.createdAt).toLocaleDateString(),
          sale.invoiceId,
          sale.customerName || 'Guest',
          sale.paymentMethod,
          itemCount.toString(),
          `₹${(sale.total || 0).toLocaleString()}`,
          `₹${saleProfit.toLocaleString()}`
        ];
        tableRows.push(saleData);
      });

      if (filteredSales.length > 50) {
        tableRows.push(['...', '...', '...', '...', '...', '...', `+${filteredSales.length - 50} more`]);
      }
      
      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 140,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] }
      });
      
      doc.save(`sales-report-${dateRange.start.toISOString().split('T')[0]}.pdf`);
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  const exportToCSV = () => {
    const filteredSales = getFilteredSales();
    
    const headers = ['Date', 'Invoice ID', 'Customer', 'Payment Method', 'Items', 'Revenue', 'Profit', 'Status'];
    const csvData = filteredSales.map(sale => {
      const saleProfit = calculateSaleProfit(sale);
      return [
        new Date(sale.createdAt).toLocaleDateString(),
        sale.invoiceId,
        sale.customerName || 'Guest',
        sale.paymentMethod,
        sale.items?.length || 0,
        sale.total || 0,
        saleProfit,
        sale.status || 'Paid'
      ];
    });

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${dateRange.start.toISOString().split('T')[0]}.csv`;
    a.click();
    
    toast.success('CSV exported successfully');
  };

  const getPaymentMethodColor = (method) => {
    switch(method) {
      case 'Cash': return 'bg-green-100 text-green-700';
      case 'UPI': return 'bg-blue-100 text-blue-700';
      case 'Card': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const resetFilters = () => {
    setSearch('');
    setPaymentFilter('all');
    setDateRange({
      start: new Date(new Date().setDate(new Date().getDate() - 30)),
      end: new Date()
    });
    setSortBy('date_desc');
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('en-IN').format(value);
  };

  const filteredSales = getFilteredSales();

  const renderActiveShape = (props) => {
    const RADIAN = Math.PI / 180;
    const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius + 10) * cos;
    const sy = cy + (outerRadius + 10) * sin;
    const mx = cx + (outerRadius + 30) * cos;
    const my = cy + (outerRadius + 30) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 22;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 6}
          outerRadius={outerRadius + 10}
          fill={fill}
        />
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
        <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#333" fontSize={12}>
          {`${payload.name}: ${formatCurrency(value)}`}
        </text>
      </g>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading reports data...</p>
        </div>
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Profit Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Track your business profitability</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={fetchAllData}
            className="px-4 py-2 border rounded-lg flex items-center space-x-2 hover:bg-gray-50 transition-colors"
            title="Refresh data"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => setShowCharts(!showCharts)}
            className="px-4 py-2 border rounded-lg flex items-center space-x-2 hover:bg-gray-50 transition-colors"
          >
            {showCharts ? <EyeOff size={18} /> : <Eye size={18} />}
            <span className="hidden sm:inline">{showCharts ? 'Hide Charts' : 'Show Charts'}</span>
          </button>
          <button
            onClick={exportToPDF}
            disabled={exporting || filteredSales.length === 0}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            <Download size={18} className={exporting ? 'animate-bounce' : ''} />
            <span className="hidden sm:inline">{exporting ? 'Exporting...' : 'PDF'}</span>
          </button>
          <button
            onClick={exportToCSV}
            disabled={filteredSales.length === 0}
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            <DownloadCloud size={18} />
            <span className="hidden sm:inline">CSV</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Total Revenue</p>
              <p className="text-3xl font-bold mt-1">{formatCurrency(stats.totalRevenue)}</p>
            </div>
            <div className="bg-white bg-opacity-30 p-3 rounded-lg">
              <IndianRupee size={24} />
            </div>
          </div>
          <p className="text-blue-100 text-xs mt-2">{formatNumber(stats.totalTransactions)} transactions</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Total Profit</p>
              <p className="text-3xl font-bold mt-1">{formatCurrency(stats.totalProfit)}</p>
            </div>
            <div className="bg-white bg-opacity-30 p-3 rounded-lg">
              <TrendingUp size={24} />
            </div>
          </div>
          <p className="text-green-100 text-xs mt-2">Margin: {stats.totalRevenue > 0 ? ((stats.totalProfit / stats.totalRevenue) * 100).toFixed(1) : 0}%</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Avg Order Value</p>
              <p className="text-3xl font-bold mt-1">{formatCurrency(stats.averageOrderValue)}</p>
            </div>
            <div className="bg-white bg-opacity-30 p-3 rounded-lg">
              <ShoppingBag size={24} />
            </div>
          </div>
          <p className="text-purple-100 text-xs mt-2">Per transaction</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Total Products</p>
              <p className="text-3xl font-bold mt-1">{formatNumber(stats.totalProducts)}</p>
            </div>
            <div className="bg-white bg-opacity-30 p-3 rounded-lg">
              <Package size={24} />
            </div>
          </div>
          <p className="text-orange-100 text-xs mt-2">{formatNumber(stats.totalSuppliers)} suppliers</p>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-4">
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[250px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search by invoice, customer, or product..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Date Range */}
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <DatePicker
                selected={dateRange.start}
                onChange={(date) => setDateRange({ ...dateRange, start: date })}
                selectsStart
                startDate={dateRange.start}
                endDate={dateRange.end}
                className="w-36 pl-8 pr-2 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                dateFormat="dd/MM/yyyy"
                placeholderText="Start Date"
              />
            </div>
            <span className="text-gray-400">to</span>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <DatePicker
                selected={dateRange.end}
                onChange={(date) => setDateRange({ ...dateRange, end: date })}
                selectsEnd
                startDate={dateRange.start}
                endDate={dateRange.end}
                minDate={dateRange.start}
                className="w-36 pl-8 pr-2 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                dateFormat="dd/MM/yyyy"
                placeholderText="End Date"
              />
            </div>
          </div>

          {/* Payment Method Filter */}
          <div className="w-40">
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            >
              <option value="all">All Payments</option>
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Card">Card</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="w-40">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="amount_desc">Highest Amount</option>
              <option value="amount_asc">Lowest Amount</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('summary')}
              className={`px-3 py-2 text-sm flex items-center space-x-1 ${
                viewMode === 'summary' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <BarChart3 size={16} />
              <span>Summary</span>
            </button>
            <button
              onClick={() => setViewMode('detailed')}
              className={`px-3 py-2 text-sm flex items-center space-x-1 ${
                viewMode === 'detailed' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <FileText size={16} />
              <span>Detailed</span>
            </button>
          </div>

          {/* Reset Filters */}
          {(search || paymentFilter !== 'all' || sortBy !== 'date_desc' || 
            dateRange.start.toISOString().split('T')[0] !== new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]) && (
            <button
              onClick={resetFilters}
              className="px-3 py-2 text-gray-600 hover:text-gray-800 flex items-center space-x-1 text-sm"
            >
              <X size={16} />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Active Filters Display */}
        <div className="flex flex-wrap gap-2 mt-3">
          {paymentFilter !== 'all' && (
            <span className="inline-flex items-center space-x-1 px-2 py-1 bg-primary-50 text-primary-600 text-xs rounded-full">
              <span>Payment: {paymentFilter}</span>
              <button onClick={() => setPaymentFilter('all')} className="hover:text-primary-800">
                <X size={12} />
              </button>
            </span>
          )}
          {search && (
            <span className="inline-flex items-center space-x-1 px-2 py-1 bg-primary-50 text-primary-600 text-xs rounded-full">
              <span>Search: "{search}"</span>
              <button onClick={() => setSearch('')} className="hover:text-primary-800">
                <X size={12} />
              </button>
            </span>
          )}
          <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
            {filteredSales.length} transactions found
          </span>
        </div>
      </div>

      {/* Charts Section */}
      {showCharts && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Chart Type Selector */}
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {['profit', 'revenue', 'transactions', 'payment'].map((chart) => (
              <button
                key={chart}
                onClick={() => setActiveChart(chart)}
                className={`px-4 py-2 rounded-lg text-sm font-medium capitalize whitespace-nowrap ${
                  activeChart === chart
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border'
                }`}
              >
                {chart === 'profit' && '💰 Daily Profit'}
                {chart === 'revenue' && '📈 Revenue'}
                {chart === 'transactions' && '🛒 Transactions'}
                {chart === 'payment' && '💳 Payment Methods'}
              </button>
            ))}
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Main Chart */}
            <div className="bg-white rounded-xl shadow-lg p-4 lg:col-span-2">
              <h3 className="text-lg font-semibold mb-4">
                {activeChart === 'profit' && 'Daily Profit Trend'}
                {activeChart === 'revenue' && 'Daily Revenue Trend'}
                {activeChart === 'transactions' && 'Daily Transaction Volume'}
                {activeChart === 'payment' && 'Payment Method Distribution'}
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  {activeChart === 'profit' && (
                    <BarChart data={stats.dailyStats}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="date" 
                        angle={-45} 
                        textAnchor="end" 
                        height={60} 
                        interval={0}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="profit" fill="#10b981" name="Profit" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  )}

                  {activeChart === 'revenue' && (
                    <AreaChart data={stats.dailyStats}>
                      <defs>
                        <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="date" 
                        angle={-45} 
                        textAnchor="end" 
                        height={60} 
                        interval={0}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="url(#revenueGradient)" name="Revenue" />
                    </AreaChart>
                  )}

                  {activeChart === 'transactions' && (
                    <LineChart data={stats.dailyStats}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="date" 
                        angle={-45} 
                        textAnchor="end" 
                        height={60} 
                        interval={0}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="transactions" stroke="#f59e0b" strokeWidth={2} name="Transactions" />
                    </LineChart>
                  )}

                  {activeChart === 'payment' && (
                    <RePieChart>
                      <Pie
                        activeIndex={activePieIndex}
                        activeShape={renderActiveShape}
                        data={stats.paymentBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        dataKey="amount"
                        onMouseEnter={(_, index) => setActivePieIndex(index)}
                      >
                        {stats.paymentBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                    </RePieChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Products by Profit */}
            <div className="bg-white rounded-xl shadow-lg p-4">
              <h3 className="text-lg font-semibold mb-4">Top 5 Products by Profit</h3>
              <div className="space-y-3">
                {stats.topProducts.slice(0, 5).map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                        index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-primary-600'
                      }`}>
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium text-sm">{product.name}</p>
                        <p className="text-xs text-gray-500">{formatNumber(product.quantity)} units</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600 text-sm">{formatCurrency(product.profit)}</p>
                      <p className="text-xs text-gray-500">Revenue: {formatCurrency(product.revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Profit Margin Analysis */}
            <div className="bg-white rounded-xl shadow-lg p-4">
              <h3 className="text-lg font-semibold mb-4">Profit Analysis</h3>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Overall Profit Margin</p>
                  <p className="text-3xl font-bold text-green-600">
                    {stats.totalRevenue > 0 ? ((stats.totalProfit / stats.totalRevenue) * 100).toFixed(1) : 0}%
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-xs text-blue-600">Total Revenue</p>
                    <p className="text-lg font-bold text-blue-700">{formatCurrency(stats.totalRevenue)}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-xs text-green-600">Total Profit</p>
                    <p className="text-lg font-bold text-green-700">{formatCurrency(stats.totalProfit)}</p>
                  </div>
                </div>

                <div className="border-t pt-3">
                  <p className="text-sm font-medium mb-2">Profit per Transaction</p>
                  <p className="text-2xl font-bold text-primary-600">
                    {stats.totalTransactions > 0 ? formatCurrency(stats.totalProfit / stats.totalTransactions) : formatCurrency(0)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Sales Table */}
      {viewMode === 'detailed' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-xl shadow-lg overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredSales.length > 0 ? (
                  filteredSales.map((sale) => {
                    const saleProfit = calculateSaleProfit(sale);
                    const margin = sale.total > 0 ? ((saleProfit / sale.total) * 100).toFixed(1) : 0;
                    return (
                      <tr key={sale._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm whitespace-nowrap">
                          {new Date(sale.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-primary-600 whitespace-nowrap">
                          {sale.invoiceId}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {sale.customerName || 'Guest'}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                            {sale.items?.length || 0} items
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs ${getPaymentMethodColor(sale.paymentMethod)}`}>
                            {sale.paymentMethod}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">{formatCurrency(sale.total || 0)}</td>
                        <td className="px-6 py-4 text-sm text-green-600 font-medium">{formatCurrency(saleProfit)}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            margin >= 20 ? 'bg-green-100 text-green-700' :
                            margin >= 10 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {margin}%
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                      <AlertCircle className="mx-auto mb-3 text-gray-400" size={32} />
                      <p>No sales data found for the selected period</p>
                      <p className="text-sm text-gray-400 mt-1">Try adjusting your filters or date range</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          {filteredSales.length > 0 && (
            <div className="bg-gray-50 px-6 py-3 border-t">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <span className="text-sm text-gray-600">
                  Showing {filteredSales.length} of {sales.length} transactions
                </span>
                <div className="flex flex-wrap gap-4 text-sm">
                  <span>
                    <span className="text-gray-500">Total Revenue: </span>
                    <span className="font-medium">{formatCurrency(stats.totalRevenue)}</span>
                  </span>
                  <span>
                    <span className="text-gray-500">Total Profit: </span>
                    <span className="font-medium text-green-600">{formatCurrency(stats.totalProfit)}</span>
                  </span>
                  <span>
                    <span className="text-gray-500">Avg Margin: </span>
                    <span className="font-medium">{stats.totalRevenue > 0 ? ((stats.totalProfit / stats.totalRevenue) * 100).toFixed(1) : 0}%</span>
                  </span>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

export default Reports;
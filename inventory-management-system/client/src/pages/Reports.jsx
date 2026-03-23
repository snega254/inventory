import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Download,
  FileText,
  Calendar,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  DownloadCloud,
  Eye,
  EyeOff,
  ShoppingBag,
  Package,
  Truck,
  AlertCircle,
  BarChart3,
  PieChart,
  LineChart as LineChartIcon
} from 'lucide-react';
import API from '../services/api';
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
  ResponsiveContainer
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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
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
    dailyStats: [],
    paymentBreakdown: []
  });

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      const salesRes = await API.get('/sales');
      const productsRes = await API.get('/products');
      const suppliersRes = await API.get('/suppliers');

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
    const filteredSales = sales.filter(sale => {
      const saleDate = new Date(sale.createdAt);
      return saleDate >= dateRange.start && saleDate <= dateRange.end;
    });

    const paymentFiltered = paymentFilter === 'all' 
      ? filteredSales 
      : filteredSales.filter(s => s.paymentMethod === paymentFilter);

    const totalRevenue = paymentFiltered.reduce((sum, sale) => sum + (sale.total || 0), 0);
    const totalTransactions = paymentFiltered.length;
    const averageOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    const productMap = new Map();
    products.forEach(product => {
      productMap.set(product._id.toString(), product);
    });

    let totalProfit = 0;
    const dailyProfitMap = new Map();
    const productProfitMap = new Map();

    paymentFiltered.forEach(sale => {
      const saleDate = new Date(sale.createdAt);
      const dateStr = saleDate.toISOString().split('T')[0];
      const displayDate = saleDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      
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

      const currentDaily = dailyProfitMap.get(dateStr) || { 
        date: displayDate,
        fullDate: dateStr,
        revenue: 0, 
        profit: 0, 
        transactions: 0 
      };
      currentDaily.revenue += sale.total || 0;
      currentDaily.profit += saleProfit;
      currentDaily.transactions += 1;
      dailyProfitMap.set(dateStr, currentDaily);
    });

    const dailyStats = Array.from(dailyProfitMap.values()).sort((a, b) => 
      new Date(a.fullDate) - new Date(b.fullDate)
    );

    const topProducts = Array.from(productProfitMap.values())
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5);

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

  const exportToPDF = () => {
    setExporting(true);
    try {
      const doc = new jsPDF();
      const filteredSales = getFilteredSales();
      
      doc.setFontSize(24);
      doc.text('Sales Report', 14, 22);
      doc.setFontSize(10);
      doc.text(`Period: ${dateRange.start.toLocaleDateString()} to ${dateRange.end.toLocaleDateString()}`, 14, 32);

      doc.setFontSize(14);
      doc.text('Summary', 14, 45);
      doc.setFontSize(10);
      const summaryY = 55;
      doc.text(`Total Revenue: ₹${stats.totalRevenue.toLocaleString()}`, 14, summaryY);
      doc.text(`Total Profit: ₹${stats.totalProfit.toLocaleString()}`, 14, summaryY + 7);
      doc.text(`Total Transactions: ${stats.totalTransactions}`, 14, summaryY + 14);
      doc.text(`Average Order Value: ₹${stats.averageOrderValue.toFixed(2)}`, 14, summaryY + 21);

      const tableColumn = ['Date', 'Invoice ID', 'Customer', 'Payment', 'Revenue', 'Profit'];
      const tableRows = [];
      filteredSales.forEach(sale => {
        const saleProfit = calculateSaleProfit(sale);
        tableRows.push([
          new Date(sale.createdAt).toLocaleDateString(),
          sale.invoiceId || 'N/A',
          sale.customerName || 'Guest',
          sale.paymentMethod || 'N/A',
          `₹${(sale.total || 0).toLocaleString()}`,
          `₹${saleProfit.toLocaleString()}`
        ]);
      });

      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 90,
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
    try {
      const filteredSales = getFilteredSales();
      const headers = ['Date', 'Invoice ID', 'Customer', 'Payment Method', 'Items', 'Revenue', 'Profit', 'Status'];
      const csvData = filteredSales.map(sale => {
        const saleProfit = calculateSaleProfit(sale);
        return [
          `"${new Date(sale.createdAt).toLocaleDateString()}"`,
          `"${sale.invoiceId || 'N/A'}"`,
          `"${sale.customerName || 'Guest'}"`,
          `"${sale.paymentMethod || 'N/A'}"`,
          sale.items?.length || 0,
          sale.total || 0,
          saleProfit,
          `"${sale.status || 'Paid'}"`
        ];
      });

      const csvContent = [headers.join(','), ...csvData.map(row => row.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `sales-report-${dateRange.start.toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('CSV exported successfully');
    } catch (error) {
      console.error('CSV export error:', error);
      toast.error('Failed to export CSV');
    }
  };

  const getPaymentMethodColor = (method) => {
    switch(method) {
      case 'Cash': return 'bg-green-100 text-green-700';
      case 'UPI': return 'bg-blue-100 text-blue-700';
      case 'Card': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatCurrency = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(v);
  const filteredSales = getFilteredSales();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Profit Reports</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Track your business profitability</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={fetchAllData} className="px-3 sm:px-4 py-2 border rounded-lg flex items-center gap-2 hover:bg-gray-50 text-sm">
            <RefreshCw size={16} /> Refresh
          </button>
          <button onClick={() => setShowCharts(!showCharts)} className="px-3 sm:px-4 py-2 border rounded-lg flex items-center gap-2 hover:bg-gray-50 text-sm">
            {showCharts ? <EyeOff size={16} /> : <Eye size={16} />}
            {showCharts ? 'Hide Charts' : 'Show Charts'}
          </button>
          <button onClick={exportToPDF} disabled={exporting || !filteredSales.length} className="bg-primary-600 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50 text-sm">
            <Download size={16} /> PDF
          </button>
          <button onClick={exportToCSV} disabled={!filteredSales.length} className="bg-green-600 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50 text-sm">
            <DownloadCloud size={16} /> CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-3 text-white">
          <p className="text-xs opacity-80">Total Revenue</p>
          <p className="text-lg font-bold">{formatCurrency(stats.totalRevenue)}</p>
          <p className="text-xs mt-1">{stats.totalTransactions} transactions</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-3 text-white">
          <p className="text-xs opacity-80">Total Profit</p>
          <p className="text-lg font-bold">{formatCurrency(stats.totalProfit)}</p>
          <p className="text-xs mt-1">Margin: {stats.totalRevenue > 0 ? ((stats.totalProfit / stats.totalRevenue) * 100).toFixed(1) : 0}%</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-3 text-white">
          <p className="text-xs opacity-80">Avg Order Value</p>
          <p className="text-lg font-bold">{formatCurrency(stats.averageOrderValue)}</p>
          <p className="text-xs mt-1">Per transaction</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-3 text-white">
          <p className="text-xs opacity-80">Total Products</p>
          <p className="text-lg font-bold">{stats.totalProducts}</p>
          <p className="text-xs mt-1">{stats.totalSuppliers} suppliers</p>
        </div>
      </div>

      {/* Charts Section */}
      {showCharts && (
        <>
          {/* Chart Selector */}
          <div className="flex flex-wrap gap-2">
            {['profit', 'revenue', 'payment'].map(chart => (
              <button
                key={chart}
                onClick={() => setActiveChart(chart)}
                className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
                  activeChart === chart ? 'bg-primary-600 text-white' : 'bg-white border text-gray-600'
                }`}
              >
                {chart === 'profit' && <TrendingUp size={14} />}
                {chart === 'revenue' && <IndianRupee size={14} />}
                {chart === 'payment' && <PieChart size={14} />}
                {chart === 'profit' && 'Profit Trend'}
                {chart === 'revenue' && 'Revenue Trend'}
                {chart === 'payment' && 'Payment Methods'}
              </button>
            ))}
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Main Chart */}
            <div className="bg-white rounded-xl shadow-lg p-3 sm:p-6 lg:col-span-2">
              <h3 className="text-base sm:text-lg font-semibold mb-3">
                {activeChart === 'profit' && 'Daily Profit Trend'}
                {activeChart === 'revenue' && 'Daily Revenue Trend'}
                {activeChart === 'payment' && 'Payment Method Distribution'}
              </h3>
              <div className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  {activeChart === 'profit' ? (
                    <AreaChart data={stats.dailyStats}>
                      <defs>
                        <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: isMobile ? 9 : 12 }} interval={isMobile ? Math.floor(stats.dailyStats.length / 5) : Math.floor(stats.dailyStats.length / 8)} />
                      <YAxis tick={{ fontSize: isMobile ? 9 : 12 }} tickFormatter={(v) => isMobile && v > 1000 ? `${v/1000}k` : v} />
                      <Tooltip formatter={(v) => formatCurrency(v)} />
                      <Area type="monotone" dataKey="profit" stroke="#10b981" fill="url(#profitGrad)" name="Profit" />
                    </AreaChart>
                  ) : activeChart === 'revenue' ? (
                    <BarChart data={stats.dailyStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: isMobile ? 9 : 12 }} interval={isMobile ? Math.floor(stats.dailyStats.length / 5) : Math.floor(stats.dailyStats.length / 8)} />
                      <YAxis tick={{ fontSize: isMobile ? 9 : 12 }} tickFormatter={(v) => isMobile && v > 1000 ? `${v/1000}k` : v} />
                      <Tooltip formatter={(v) => formatCurrency(v)} />
                      <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Revenue" />
                    </BarChart>
                  ) : (
                    <RePieChart>
                      <Pie
                        data={stats.paymentBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={isMobile ? 50 : 70}
                        outerRadius={isMobile ? 80 : 100}
                        dataKey="amount"
                        label={!isMobile}
                      >
                        {stats.paymentBreakdown.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => formatCurrency(v)} />
                      <Legend />
                    </RePieChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Products by Profit */}
            <div className="bg-white rounded-xl shadow-lg p-3 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold mb-3">Top Products by Profit</h3>
              <div className="space-y-3">
                {stats.topProducts.map((product, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs ${
                        idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : 'bg-orange-500'
                      }`}>{idx + 1}</span>
                      <span className="text-sm truncate max-w-[150px]">{product.name}</span>
                    </div>
                    <span className="font-semibold text-green-600 text-sm">{formatCurrency(product.profit)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Profit Analysis */}
            <div className="bg-white rounded-xl shadow-lg p-3 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold mb-3">Profit Analysis</h3>
              <div className="space-y-4">
                <div className="bg-green-50 p-3 rounded-lg text-center">
                  <p className="text-sm text-gray-600">Overall Profit Margin</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.totalRevenue > 0 ? ((stats.totalProfit / stats.totalRevenue) * 100).toFixed(1) : 0}%
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-blue-50 p-2 rounded-lg text-center">
                    <p className="text-xs text-blue-600">Revenue</p>
                    <p className="font-bold">{formatCurrency(stats.totalRevenue)}</p>
                  </div>
                  <div className="bg-green-50 p-2 rounded-lg text-center">
                    <p className="text-xs text-green-600">Profit</p>
                    <p className="font-bold">{formatCurrency(stats.totalProfit)}</p>
                  </div>
                </div>
                <div className="border-t pt-2">
                  <p className="text-sm text-gray-600">Profit per Transaction</p>
                  <p className="text-xl font-bold text-primary-600">
                    {stats.totalTransactions > 0 ? formatCurrency(stats.totalProfit / stats.totalTransactions) : formatCurrency(0)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" placeholder="Search by invoice, customer..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" />
          </div>
          <div className="flex gap-2">
            <DatePicker selected={dateRange.start} onChange={(d) => setDateRange({ ...dateRange, start: d })} className="px-2 py-2 border rounded-lg text-sm w-28" placeholderText="Start" />
            <DatePicker selected={dateRange.end} onChange={(d) => setDateRange({ ...dateRange, end: d })} className="px-2 py-2 border rounded-lg text-sm w-28" placeholderText="End" />
          </div>
          <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
            <option value="all">All Payments</option>
            <option value="Cash">Cash</option>
            <option value="UPI">UPI</option>
            <option value="Card">Card</option>
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
            <option value="date_desc">Newest First</option>
            <option value="date_asc">Oldest First</option>
            <option value="amount_desc">Highest Amount</option>
            <option value="amount_asc">Lowest Amount</option>
          </select>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Invoice</th>
                <th className="px-3 py-2 text-left">Customer</th>
                <th className="px-3 py-2 text-left">Payment</th>
                <th className="px-3 py-2 text-right">Revenue</th>
                <th className="px-3 py-2 text-right">Profit</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.length > 0 ? filteredSales.map(sale => {
                const profit = calculateSaleProfit(sale);
                return (
                  <tr key={sale._id} className="border-t hover:bg-gray-50">
                    <td className="px-3 py-2">{new Date(sale.createdAt).toLocaleDateString()}</td>
                    <td className="px-3 py-2 text-primary-600">{sale.invoiceId || 'N/A'}</td>
                    <td className="px-3 py-2">{sale.customerName || 'Guest'}</td>
                    <td className="px-3 py-2"><span className={`px-2 py-1 rounded-full text-xs ${getPaymentMethodColor(sale.paymentMethod)}`}>{sale.paymentMethod}</span></td>
                    <td className="px-3 py-2 text-right">{formatCurrency(sale.total || 0)}</td>
                    <td className="px-3 py-2 text-right text-green-600">{formatCurrency(profit)}</td>
                  </tr>
                );
              }) : (
                <tr><td colSpan="6" className="text-center py-8 text-gray-500"><AlertCircle className="mx-auto mb-2" size={32} />No sales data found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredSales.length > 0 && (
          <div className="bg-gray-50 px-3 py-2 border-t flex flex-col sm:flex-row justify-between text-xs">
            <span>Showing {filteredSales.length} of {sales.length} transactions</span>
            <div className="flex gap-3">
              <span>Total Revenue: {formatCurrency(stats.totalRevenue)}</span>
              <span className="text-green-600">Total Profit: {formatCurrency(stats.totalProfit)}</span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Reports;
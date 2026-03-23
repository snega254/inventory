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
    topSuppliers: [],
    dailyStats: [],
    monthlyStats: [],
    paymentBreakdown: []
  });

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
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
    });

    const dailyStats = Array.from(dailyProfitMap.values()).sort((a, b) => 
      new Date(a.fullDate) - new Date(b.fullDate)
    );

    const topProducts = Array.from(productProfitMap.values())
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10);

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
      monthlyStats: [],
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
      
      // Title
      doc.setFontSize(24);
      doc.setTextColor(33, 33, 33);
      doc.text('Sales Report', 14, 22);
      
      // Date Range
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Period: ${dateRange.start.toLocaleDateString()} to ${dateRange.end.toLocaleDateString()}`,
        14, 32
      );

      // Summary Section
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

      // Table
      const tableColumn = ['Date', 'Invoice ID', 'Customer', 'Payment', 'Items', 'Revenue', 'Profit'];
      const tableRows = [];
      
      filteredSales.forEach(sale => {
        const itemCount = sale.items?.length || 0;
        const saleProfit = calculateSaleProfit(sale);
        const saleData = [
          new Date(sale.createdAt).toLocaleDateString(),
          sale.invoiceId || 'N/A',
          sale.customerName || 'Guest',
          sale.paymentMethod || 'N/A',
          itemCount.toString(),
          `₹${(sale.total || 0).toLocaleString()}`,
          `₹${saleProfit.toLocaleString()}`
        ];
        tableRows.push(saleData);
      });

      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 120,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] }
      });
      
      // Save PDF
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
          new Date(sale.createdAt).toLocaleDateString(),
          sale.invoiceId || 'N/A',
          sale.customerName || 'Guest',
          sale.paymentMethod || 'N/A',
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

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
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
      className="space-y-4 sm:space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Profit Reports</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Track your business profitability</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={fetchAllData}
            className="px-3 sm:px-4 py-2 border rounded-lg flex items-center space-x-2 hover:bg-gray-50 transition-colors text-sm sm:text-base"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => setShowCharts(!showCharts)}
            className="px-3 sm:px-4 py-2 border rounded-lg flex items-center space-x-2 hover:bg-gray-50 transition-colors text-sm sm:text-base"
          >
            {showCharts ? <EyeOff size={16} /> : <Eye size={16} />}
            <span className="hidden sm:inline">{showCharts ? 'Hide Charts' : 'Show Charts'}</span>
          </button>
          <button
            onClick={exportToPDF}
            disabled={exporting || filteredSales.length === 0}
            className="bg-primary-600 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-primary-700 disabled:opacity-50 transition-colors text-sm sm:text-base"
          >
            <Download size={16} className={exporting ? 'animate-bounce' : ''} />
            <span>{exporting ? '...' : 'PDF'}</span>
          </button>
          <button
            onClick={exportToCSV}
            disabled={filteredSales.length === 0}
            className="bg-green-600 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-green-700 disabled:opacity-50 transition-colors text-sm sm:text-base"
          >
            <DownloadCloud size={16} />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-3 sm:p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-xs sm:text-sm">Total Revenue</p>
              <p className="text-lg sm:text-3xl font-bold mt-1">{formatCurrency(stats.totalRevenue)}</p>
            </div>
            <IndianRupee size={isMobile ? 20 : 24} className="opacity-80" />
          </div>
          <p className="text-blue-100 text-xs mt-2">{formatNumber(stats.totalTransactions)} transactions</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-3 sm:p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-xs sm:text-sm">Total Profit</p>
              <p className="text-lg sm:text-3xl font-bold mt-1">{formatCurrency(stats.totalProfit)}</p>
            </div>
            <TrendingUp size={isMobile ? 20 : 24} className="opacity-80" />
          </div>
          <p className="text-green-100 text-xs mt-2">Margin: {stats.totalRevenue > 0 ? ((stats.totalProfit / stats.totalRevenue) * 100).toFixed(1) : 0}%</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-3 sm:p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-xs sm:text-sm">Avg Order Value</p>
              <p className="text-lg sm:text-3xl font-bold mt-1">{formatCurrency(stats.averageOrderValue)}</p>
            </div>
            <ShoppingBag size={isMobile ? 20 : 24} className="opacity-80" />
          </div>
          <p className="text-purple-100 text-xs mt-2">Per transaction</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-3 sm:p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-xs sm:text-sm">Total Products</p>
              <p className="text-lg sm:text-3xl font-bold mt-1">{formatNumber(stats.totalProducts)}</p>
            </div>
            <Package size={isMobile ? 20 : 24} className="opacity-80" />
          </div>
          <p className="text-orange-100 text-xs mt-2">{formatNumber(stats.totalSuppliers)} suppliers</p>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSales.length > 0 ? (
                filteredSales.slice(0, isMobile ? 20 : 50).map((sale) => {
                  const saleProfit = calculateSaleProfit(sale);
                  return (
                    <tr key={sale._id} className="hover:bg-gray-50">
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm whitespace-nowrap">
                        {new Date(sale.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium text-primary-600 whitespace-nowrap">
                        {sale.invoiceId || 'N/A'}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm">
                        {sale.customerName || 'Guest'}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs ${getPaymentMethodColor(sale.paymentMethod)}`}>
                          {sale.paymentMethod}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm">{formatCurrency(sale.total || 0)}</td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-green-600 font-medium">{formatCurrency(saleProfit)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
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
          <div className="bg-gray-50 px-3 sm:px-6 py-3 border-t">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <span className="text-xs sm:text-sm text-gray-600">
                Showing {Math.min(filteredSales.length, isMobile ? 20 : 50)} of {filteredSales.length} transactions
              </span>
              <div className="flex flex-wrap gap-3 sm:gap-4 text-xs sm:text-sm">
                <span>
                  <span className="text-gray-500">Total Revenue: </span>
                  <span className="font-medium">{formatCurrency(stats.totalRevenue)}</span>
                </span>
                <span>
                  <span className="text-gray-500">Total Profit: </span>
                  <span className="font-medium text-green-600">{formatCurrency(stats.totalProfit)}</span>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Reports;
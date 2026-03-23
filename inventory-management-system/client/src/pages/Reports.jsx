import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Download, RefreshCw, DownloadCloud, AlertCircle, Calendar } from 'lucide-react';
import API from '../services/api';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const Reports = () => {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)),
    end: new Date()
  });
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [stats, setStats] = useState({ totalRevenue: 0, totalProfit: 0, totalTransactions: 0, averageOrderValue: 0 });

  useEffect(() => { fetchAllData(); }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const salesRes = await API.get('/sales');
      const productsRes = await API.get('/products');
      setSales(salesRes.data);
      setProducts(productsRes.data);
      calculateStats(salesRes.data, productsRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (salesData, productsData) => {
    const filtered = salesData.filter(s => {
      const d = new Date(s.createdAt);
      return d >= dateRange.start && d <= dateRange.end && (paymentFilter === 'all' || s.paymentMethod === paymentFilter);
    });

    const productMap = new Map(productsData.map(p => [p._id.toString(), p]));
    let revenue = 0, profit = 0;
    filtered.forEach(s => {
      revenue += s.total || 0;
      s.items?.forEach(i => {
        const p = productMap.get(i.product?.toString());
        if (p) profit += (i.price - (p.purchasePrice || 0)) * i.quantity;
      });
    });
    setStats({ totalRevenue: revenue, totalProfit: profit, totalTransactions: filtered.length, averageOrderValue: filtered.length ? revenue / filtered.length : 0 });
  };

  useEffect(() => { calculateStats(sales, products); }, [dateRange, paymentFilter]);

  const getFilteredSales = () => {
    let filtered = sales.filter(s => new Date(s.createdAt) >= dateRange.start && new Date(s.createdAt) <= dateRange.end);
    if (paymentFilter !== 'all') filtered = filtered.filter(s => s.paymentMethod === paymentFilter);
    if (search) filtered = filtered.filter(s => s.invoiceId?.toLowerCase().includes(search.toLowerCase()) || s.customerName?.toLowerCase().includes(search.toLowerCase()));
    return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  };

  const calculateProfit = (sale) => {
    const productMap = new Map(products.map(p => [p._id.toString(), p]));
    let profit = 0;
    sale.items?.forEach(i => {
      const p = productMap.get(i.product?.toString());
      if (p) profit += (i.price - (p.purchasePrice || 0)) * i.quantity;
    });
    return profit;
  };

  const exportToPDF = () => {
    setExporting(true);
    try {
      const doc = new jsPDF();
      const filtered = getFilteredSales();
      doc.setFontSize(24); doc.text('Sales Report', 14, 22);
      doc.setFontSize(10); doc.text(`Period: ${dateRange.start.toLocaleDateString()} to ${dateRange.end.toLocaleDateString()}`, 14, 32);
      doc.setFontSize(14); doc.text('Summary', 14, 45);
      doc.setFontSize(10);
      doc.text(`Total Revenue: ₹${stats.totalRevenue.toLocaleString()}`, 14, 55);
      doc.text(`Total Profit: ₹${stats.totalProfit.toLocaleString()}`, 14, 62);
      doc.text(`Total Transactions: ${stats.totalTransactions}`, 14, 69);
      doc.autoTable({
        head: [['Date', 'Invoice', 'Customer', 'Payment', 'Revenue', 'Profit']],
        body: filtered.map(s => [new Date(s.createdAt).toLocaleDateString(), s.invoiceId || 'N/A', s.customerName || 'Guest', s.paymentMethod || 'N/A', `₹${(s.total || 0).toLocaleString()}`, `₹${calculateProfit(s).toLocaleString()}`]),
        startY: 85,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] }
      });
      doc.save(`sales-report-${dateRange.start.toISOString().split('T')[0]}.pdf`);
      toast.success('PDF exported');
    } catch (e) { toast.error('Export failed'); } finally { setExporting(false); }
  };

  const exportToCSV = () => {
    try {
      const filtered = getFilteredSales();
      const headers = ['Date', 'Invoice', 'Customer', 'Payment', 'Items', 'Revenue', 'Profit'];
      const rows = filtered.map(s => [`"${new Date(s.createdAt).toLocaleDateString()}"`, `"${s.invoiceId || 'N/A'}"`, `"${s.customerName || 'Guest'}"`, `"${s.paymentMethod || 'N/A'}"`, s.items?.length || 0, s.total || 0, calculateProfit(s)]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `sales-report-${dateRange.start.toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success('CSV exported');
    } catch (e) { toast.error('Export failed'); }
  };

  const formatCurrency = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(v);
  const filteredSales = getFilteredSales();

  if (loading) return <div className="flex justify-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div><h1 className="text-xl sm:text-2xl font-bold">Profit Reports</h1><p className="text-xs sm:text-sm text-gray-500">Track business profitability</p></div>
        <div className="flex gap-2">
          <button onClick={fetchAllData} className="px-3 py-2 border rounded-lg text-sm flex items-center gap-1"><RefreshCw size={14} /> Refresh</button>
          <button onClick={exportToPDF} disabled={exporting || !filteredSales.length} className="bg-primary-600 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-1 disabled:opacity-50"><Download size={14} /> PDF</button>
          <button onClick={exportToCSV} disabled={!filteredSales.length} className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-1"><DownloadCloud size={14} /> CSV</button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-blue-500 text-white p-3 rounded-lg"><p className="text-xs">Revenue</p><p className="text-lg font-bold">{formatCurrency(stats.totalRevenue)}</p></div>
        <div className="bg-green-500 text-white p-3 rounded-lg"><p className="text-xs">Profit</p><p className="text-lg font-bold">{formatCurrency(stats.totalProfit)}</p></div>
        <div className="bg-purple-500 text-white p-3 rounded-lg"><p className="text-xs">Avg Order</p><p className="text-lg font-bold">{formatCurrency(stats.averageOrderValue)}</p></div>
        <div className="bg-orange-500 text-white p-3 rounded-lg"><p className="text-xs">Transactions</p><p className="text-lg font-bold">{stats.totalTransactions}</p></div>
      </div>

      <div className="bg-white rounded-lg p-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} /><input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" /></div>
          <div className="flex gap-2"><DatePicker selected={dateRange.start} onChange={(d) => setDateRange({ ...dateRange, start: d })} className="px-2 py-2 border rounded-lg text-sm w-28" placeholderText="Start" /><DatePicker selected={dateRange.end} onChange={(d) => setDateRange({ ...dateRange, end: d })} className="px-2 py-2 border rounded-lg text-sm w-28" placeholderText="End" /></div>
          <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm"><option value="all">All Payments</option><option value="Cash">Cash</option><option value="UPI">UPI</option><option value="Card">Card</option></select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm">
          <thead className="bg-gray-50"><tr><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Invoice</th><th className="px-3 py-2 text-left">Customer</th><th className="px-3 py-2 text-left">Payment</th><th className="px-3 py-2 text-right">Revenue</th><th className="px-3 py-2 text-right">Profit</th></tr></thead>
          <tbody>
            {filteredSales.length ? filteredSales.map(s => (<tr key={s._id} className="border-t"><td className="px-3 py-2">{new Date(s.createdAt).toLocaleDateString()}</td><td className="px-3 py-2 text-primary-600">{s.invoiceId || 'N/A'}</td><td className="px-3 py-2">{s.customerName || 'Guest'}</td><td className="px-3 py-2"><span className={`px-2 py-1 rounded-full text-xs ${s.paymentMethod === 'Cash' ? 'bg-green-100 text-green-700' : s.paymentMethod === 'UPI' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{s.paymentMethod}</span></td><td className="px-3 py-2 text-right">{formatCurrency(s.total || 0)}</td><td className="px-3 py-2 text-right text-green-600">{formatCurrency(calculateProfit(s))}</td></tr>)) : <tr><td colSpan="6" className="text-center py-8 text-gray-500"><AlertCircle className="mx-auto mb-2" size={32} />No sales data found</td></tr>}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export default Reports;
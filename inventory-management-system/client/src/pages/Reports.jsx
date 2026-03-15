import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Download,
  FileText,
  Calendar,
  Filter,
  Users,
  CreditCard,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const Reports = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchSales();
  }, [dateRange]);

  const fetchSales = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(
        `http://localhost:5000/api/sales?startDate=${dateRange.start}&endDate=${dateRange.end}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSales(data);
    } catch (error) {
      toast.error('Failed to fetch sales data');
    } finally {
      setLoading(false);
    }
  };

  const filteredSales = sales.filter(sale =>
    sale.invoiceId?.toLowerCase().includes(search.toLowerCase()) ||
    sale.customerName?.toLowerCase().includes(search.toLowerCase())
  );

  const totals = {
    revenue: sales.reduce((sum, sale) => sum + (sale.total || 0), 0),
    tax: sales.reduce((sum, sale) => sum + (sale.gst || 0), 0),
    discount: sales.reduce((sum, sale) => sum + (sale.discount || 0), 0),
    transactions: sales.length
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      
      doc.setFontSize(18);
      doc.text('Sales Report', 14, 22);
      
      doc.setFontSize(11);
      doc.text(`Period: ${dateRange.start} to ${dateRange.end}`, 14, 32);
      
      const tableColumn = ['Date', 'Invoice ID', 'Customer', 'Payment', 'Subtotal', 'Tax', 'Discount', 'Total'];
      const tableRows = [];
      
      filteredSales.forEach(sale => {
        const saleData = [
          new Date(sale.createdAt).toLocaleDateString(),
          sale.invoiceId,
          sale.customerName || 'Guest',
          sale.paymentMethod,
          `₹${sale.subtotal || 0}`,
          `₹${sale.gst || 0}`,
          `₹${sale.discount || 0}`,
          `₹${sale.total || 0}`
        ];
        tableRows.push(saleData);
      });
      
      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 40
      });
      
      doc.save(`sales-report-${dateRange.start}.pdf`);
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800">Sales Reports</h1>
        <button
          onClick={exportToPDF}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-primary-700"
        >
          <Download size={20} />
          <span>Export PDF</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-2xl font-semibold mt-1">₹{totals.revenue.toLocaleString()}</p>
            </div>
            <div className="bg-green-500 p-3 rounded-lg">
              <DollarSign className="text-white" size={24} />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">{totals.transactions} transactions</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Tax Collected</p>
              <p className="text-2xl font-semibold mt-1">₹{totals.tax.toLocaleString()}</p>
            </div>
            <div className="bg-blue-500 p-3 rounded-lg">
              <FileText className="text-white" size={24} />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">CGST + SGST combined</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Discounts</p>
              <p className="text-2xl font-semibold mt-1">₹{totals.discount.toLocaleString()}</p>
            </div>
            <div className="bg-yellow-500 p-3 rounded-lg">
              <TrendingUp className="text-white" size={24} />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Across all transactions</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Payment Methods</p>
              <p className="text-sm font-medium mt-1">
                Cash: {sales.filter(s => s.paymentMethod === 'Cash').length} | 
                UPI: {sales.filter(s => s.paymentMethod === 'UPI').length} | 
                Card: {sales.filter(s => s.paymentMethod === 'Card').length}
              </p>
            </div>
            <div className="bg-purple-500 p-3 rounded-lg">
              <CreditCard className="text-white" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by invoice ID or customer name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <div className="w-48">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <div className="w-48">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sales Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subtotal</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tax</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredSales.length > 0 ? (
                  filteredSales.map((sale) => (
                    <tr key={sale._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm">
                        {new Date(sale.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-primary-600">
                        {sale.invoiceId}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {sale.customerName || 'Guest'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          sale.paymentMethod === 'Cash' ? 'bg-green-100 text-green-700' :
                          sale.paymentMethod === 'UPI' ? 'bg-blue-100 text-blue-700' :
                          'bg-purple-100 text-purple-700'
                        }`}>
                          {sale.paymentMethod}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">₹{sale.subtotal || 0}</td>
                      <td className="px-6 py-4 text-sm">₹{sale.gst || 0}</td>
                      <td className="px-6 py-4 text-sm">₹{sale.discount || 0}</td>
                      <td className="px-6 py-4 text-sm font-medium">₹{sale.total || 0}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                          {sale.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="px-6 py-4 text-center text-gray-500">
                      No sales data found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default Reports;
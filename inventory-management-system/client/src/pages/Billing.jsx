import { useState, useEffect } from 'react';
import API from '../services/api';
import { motion } from 'framer-motion';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  User,
  Phone,
  CreditCard,
  IndianRupee,
  Download,
  Printer,
  FileText,
  Eye,
  EyeOff
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const Billing = () => {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState({ name: '', phone: '' });
  const [selectedPayment, setSelectedPayment] = useState('Cash');
  const [loading, setLoading] = useState(false);
  const [billNumber, setBillNumber] = useState('');
  const [showPreview, setShowPreview] = useState(true);
  const [staffName, setStaffName] = useState('');

  useEffect(() => {
    fetchProducts();
    generateBillNumber();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setStaffName(user.name || 'Staff');
  }, []);

  const generateBillNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    setBillNumber(`INV-${year}${month}${day}-${random}`);
  };

const fetchProducts = async () => {
  try {
    const { data } = await API.get('/products');
    setProducts(data);
  } catch (error) {
    toast.error('Failed to fetch products');
  }
};

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (product, color, size) => {
    const variant = product.colorVariants.find(v => v.colorName === color);
    const sizeObj = variant.sizes.find(s => s.size === size);

    if (sizeObj.quantity < 1) {
      toast.error('Out of stock');
      return;
    }

    const existingItem = cart.find(item =>
      item.product._id === product._id &&
      item.color === color &&
      item.size === size
    );

    if (existingItem) {
      if (existingItem.quantity >= sizeObj.quantity) {
        toast.error('Maximum stock reached');
        return;
      }
      setCart(cart.map(item =>
        item.product._id === product._id &&
        item.color === color &&
        item.size === size
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        product,
        color,
        size,
        quantity: 1,
        price: product.sellingPrice,
        purchasePrice: product.purchasePrice || 0,
        gst: product.gst || 5
      }]);
    }
  };

  const updateQuantity = (index, delta) => {
    const item = cart[index];
    const variant = item.product.colorVariants.find(v => v.colorName === item.color);
    const sizeObj = variant.sizes.find(s => s.size === item.size);

    const newQuantity = item.quantity + delta;
    if (newQuantity < 1) {
      removeFromCart(index);
    } else if (newQuantity <= sizeObj.quantity) {
      const newCart = [...cart];
      newCart[index].quantity = newQuantity;
      setCart(newCart);
    } else {
      toast.error('Insufficient stock');
    }
  };

  const removeFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const calculateGST = () => {
    return cart.reduce((sum, item) => {
      const itemTotal = item.price * item.quantity;
      return sum + (itemTotal * (item.gst || 5) / 100);
    }, 0);
  };

  const calculateCGST = () => {
    return calculateGST() / 2;
  };

  const calculateSGST = () => {
    return calculateGST() / 2;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateGST();
  };

  const calculateTotalProfit = () => {
    return cart.reduce((sum, item) => {
      const profit = (item.price - (item.purchasePrice || 0)) * item.quantity;
      return sum + profit;
    }, 0);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const generatePDF = (shouldSave = true) => {
    const doc = new jsPDF();
    
    // Company Header
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('ATTIRE MENSWEAR', 15, 18);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('No.186, Banglow Street, Erode Main Rd,', 15, 26);
    doc.text('Near Soorya Hospital, Tiruchengode, Tamil Nadu - 637211', 15, 32);
    doc.text('Phone: 088387 72957 | GST: 33ABCDE1234F1Z5', 15, 38);
    
    // Bill Details
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('TAX INVOICE', 105, 55, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Bill No: ${billNumber}`, 15, 65);
    doc.text(`Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`, 15, 72);
    doc.text(`Time: ${new Date().toLocaleTimeString()}`, 15, 79);
    
    // Customer Details
    doc.setFont('helvetica', 'bold');
    doc.text('Customer Details:', 15, 92);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${customer.name || 'Guest Customer'}`, 15, 100);
    doc.text(`Phone: ${customer.phone || 'N/A'}`, 15, 107);
    
    // Items Table
    const tableColumn = ['#', 'Product', 'Color', 'Size', 'Qty', 'Price', 'GST', 'Total'];
    const tableRows = [];
    
    cart.forEach((item, index) => {
      const itemTotal = item.price * item.quantity;
      const gstAmount = itemTotal * (item.gst || 5) / 100;
      
      tableRows.push([
        index + 1,
        item.product.name.substring(0, 20),
        item.color,
        item.size,
        item.quantity,
        { content: `₹${item.price.toFixed(2)}`, styles: { halign: 'right' } },
        `${item.gst || 5}%`,
        { content: `₹${(itemTotal + gstAmount).toFixed(2)}`, styles: { halign: 'right' } }
      ]);
    });
    
    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 120,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        4: { halign: 'center', cellWidth: 12 },
        5: { halign: 'right', cellWidth: 22 },
        7: { halign: 'right', cellWidth: 25 }
      }
    });
    
    const finalY = doc.lastAutoTable.finalY + 10;
    
    // Summary
    const subtotal = calculateSubtotal();
    const cgst = calculateCGST();
    const sgst = calculateSGST();
    const total = calculateTotal();
    const totalProfit = calculateTotalProfit();
    
    // Draw a light background for summary
    doc.setFillColor(248, 250, 252);
    doc.rect(120, finalY - 3, 75, 52, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('SUMMARY', 125, finalY + 2);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    // Subtotal line
    doc.text('Subtotal:', 125, finalY + 10);
    doc.text(`₹${subtotal.toFixed(2)}`, 185, finalY + 10, { align: 'right' });
    
    // CGST line
    doc.text('CGST (2.5%):', 125, finalY + 17);
    doc.text(`₹${cgst.toFixed(2)}`, 185, finalY + 17, { align: 'right' });
    
    // SGST line
    doc.text('SGST (2.5%):', 125, finalY + 24);
    doc.text(`₹${sgst.toFixed(2)}`, 185, finalY + 24, { align: 'right' });
    
    // Profit line (NEW)
    doc.setTextColor(16, 185, 129); // Green color for profit
    doc.text('Profit:', 125, finalY + 31);
    doc.text(`₹${totalProfit.toFixed(2)}`, 185, finalY + 31, { align: 'right' });
    
    // Total line with border top
    doc.setDrawColor(200, 200, 200);
    doc.line(125, finalY + 34, 190, finalY + 34);
    doc.setTextColor(59, 130, 246);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('TOTAL:', 125, finalY + 42);
    doc.text(`₹${total.toFixed(2)}`, 185, finalY + 42, { align: 'right' });
    
    // Payment Details
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Payment Method: ${selectedPayment}`, 15, finalY + 20);
    doc.text(`Bill Generated By: ${staffName}`, 15, finalY + 27);
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('This is a computer generated invoice - valid without signature', 105, 280, { align: 'center' });
    doc.text('Thank you for shopping with us!', 105, 285, { align: 'center' });
    
    if (shouldSave) {
      doc.save(`${billNumber}.pdf`);
      toast.success('Bill downloaded successfully');
    }
    
    return doc;
  };

  const handleGenerateBill = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    if (!customer.name || !customer.phone) {
      toast.error('Please enter customer details');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Calculate profit for each item and prepare items array
      const items = cart.map(item => {
        const purchasePrice = item.product.purchasePrice || 0;
        const sellingPrice = item.price;
        const quantity = item.quantity;
        const profit = (sellingPrice - purchasePrice) * quantity;
        
        return {
          product: item.product._id,
          productName: item.product.name,
          quantity: item.quantity,
          price: item.price,
          purchasePrice: purchasePrice,
          profit: profit,
          color: item.color,
          size: item.size,
          gst: item.gst
        };
      });

      const totalProfit = items.reduce((sum, item) => sum + item.profit, 0);

      console.log('Sending items with profit:', items);
      console.log('Total profit:', totalProfit);

     const response = await API.post('/sales', {
  items,
  customerName: customer.name,
  phoneNumber: customer.phone,
  paymentMethod: selectedPayment,
  discount: 0,
  totalProfit
});

      console.log('Sale created:', response.data);
      generatePDF(true);
      
      setCart([]);
      setCustomer({ name: '', phone: '' });
      generateBillNumber();
      fetchProducts();
      toast.success('Bill generated successfully!');
      
    } catch (error) {
      console.error('Error creating sale:', error);
      toast.error(error.response?.data?.message || 'Failed to process bill');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full"
    >
      {/* Product Selection Area */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Product Catalog</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="p-2 hover:bg-gray-100 rounded-lg"
                title={showPreview ? 'Hide Preview' : 'Show Preview'}
              >
                {showPreview ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              <div className="text-sm bg-blue-50 px-3 py-1 rounded-full">
                <span className="text-blue-600 font-medium">Bill: {billNumber}</span>
              </div>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search products by name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[calc(100vh-250px)] overflow-y-auto">
          {filteredProducts.map(product => (
            <div key={product._id} className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
              <h3 className="font-semibold">{product.name}</h3>
              <p className="text-sm text-gray-500 mb-2">{product.category}</p>
              <div className="flex justify-between items-center mb-3">
                <p className="text-lg font-bold text-primary-600">₹{product.sellingPrice}</p>
                <p className="text-xs text-gray-500">Cost: ₹{product.purchasePrice || 0}</p>
              </div>
              
              {product.colorVariants.map(variant => (
                <div key={variant.colorName} className="mb-2">
                  <p className="text-sm font-medium mb-1">{variant.colorName}</p>
                  <div className="flex flex-wrap gap-2">
                    {variant.sizes.map(size => (
                      <button
                        key={size.size}
                        onClick={() => addToCart(product, variant.colorName, size.size)}
                        disabled={size.quantity === 0}
                        className={`px-3 py-1 border rounded-lg text-sm ${
                          size.quantity > 0
                            ? 'hover:bg-primary-50 hover:border-primary-500'
                            : 'opacity-50 cursor-not-allowed'
                        }`}
                      >
                        {size.size} ({size.quantity})
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Bill Generation Area */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-xl shadow-sm p-4 sticky top-6 max-h-[calc(100vh-100px)] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Generate Bill</h2>
            <FileText className="text-primary-600" size={20} />
          </div>

          {/* Customer Details */}
          <div className="space-y-3 mb-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Customer Name *"
                value={customer.name}
                onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Phone Number *"
                value={customer.phone}
                onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Cart Items */}
          <div className="max-h-48 overflow-y-auto mb-4 border rounded-lg p-2">
            {cart.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <FileText className="mx-auto mb-2 text-gray-400" size={32} />
                <p className="text-sm">No items added</p>
                <p className="text-xs mt-1">Select products from catalog</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((item, index) => {
                  const profit = (item.price - (item.purchasePrice || 0)) * item.quantity;
                  return (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm truncate max-w-[120px]">{item.product.name}</p>
                        <p className="text-xs text-gray-500">
                          {item.color} - {item.size} | ₹{item.price}
                        </p>
                        <p className="text-xs text-green-600">Profit: ₹{profit.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => updateQuantity(index, -1)}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(index, 1)}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          <Plus size={14} />
                        </button>
                        <button
                          onClick={() => removeFromCart(index)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bill Summary with Profit */}
          {cart.length > 0 && (
            <div className="mb-4 bg-gray-50 p-3 rounded-lg">
              <h3 className="text-sm font-medium mb-2">Bill Summary</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">₹{formatCurrency(calculateSubtotal())}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">CGST (2.5%):</span>
                  <span className="font-medium">₹{formatCurrency(calculateCGST())}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">SGST (2.5%):</span>
                  <span className="font-medium">₹{formatCurrency(calculateSGST())}</span>
                </div>
                <div className="flex justify-between text-green-600 font-medium">
                  <span>Profit:</span>
                  <span>₹{formatCurrency(calculateTotalProfit())}</span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between font-bold">
                    <span>Grand Total:</span>
                    <span className="text-primary-600">₹{formatCurrency(calculateTotal())}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payment Methods */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {['Cash', 'UPI', 'Card'].map(method => (
              <button
                key={method}
                onClick={() => setSelectedPayment(method)}
                className={`py-2 px-3 rounded-lg border text-sm flex items-center justify-center space-x-1 ${
                  selectedPayment === method
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'hover:bg-gray-50'
                }`}
              >
                <CreditCard size={14} />
                <span>{method}</span>
              </button>
            ))}
          </div>

          {/* Generate Bill Button */}
          <button
            onClick={handleGenerateBill}
            disabled={loading || cart.length === 0 || !customer.name || !customer.phone}
            className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            <Download size={20} />
            <span>{loading ? 'Processing...' : 'Generate Bill & Download PDF'}</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default Billing;
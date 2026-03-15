import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  User,
  Phone,
  CreditCard,
  IndianRupee
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const Billing = () => {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState({ name: '', phone: '' });
  const [selectedPayment, setSelectedPayment] = useState('Cash');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get('http://localhost:5000/api/products', {
        headers: { Authorization: `Bearer ${token}` }
      });
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
        gst: product.gst
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

  const calculateTotal = () => {
    return calculateSubtotal() + calculateGST();
  };

  const handleCheckout = async () => {
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
      const items = cart.map(item => ({
        product: item.product._id,
        productName: item.product.name,
        quantity: item.quantity,
        price: item.price,
        color: item.color,
        size: item.size,
        gst: item.gst
      }));

      await axios.post(
        'http://localhost:5000/api/sales',
        {
          items,
          customerName: customer.name,
          phoneNumber: customer.phone,
          paymentMethod: selectedPayment,
          discount: 0
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Sale completed successfully!');
      setCart([]);
      setCustomer({ name: '', phone: '' });
      fetchProducts(); // Refresh stock
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to complete sale');
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
      {/* Product Catalog */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="text-lg font-semibold mb-4">Product Catalog</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProducts.map(product => (
            <div key={product._id} className="bg-white rounded-xl shadow-sm p-4">
              <h3 className="font-semibold">{product.name}</h3>
              <p className="text-sm text-gray-500 mb-2">{product.category}</p>
              <p className="text-lg font-bold text-primary-600 mb-3">₹{product.sellingPrice}</p>
              
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

      {/* Current Bill */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-xl shadow-sm p-4 sticky top-6">
          <h2 className="text-lg font-semibold mb-4">Current Bill</h2>

          {/* Customer Details */}
          <div className="space-y-3 mb-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Customer Name"
                value={customer.name}
                onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Phone Number"
                value={customer.phone}
                onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Cart Items */}
          <div className="max-h-96 overflow-y-auto mb-4">
            {cart.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Cart is empty</p>
            ) : (
              <div className="space-y-3">
                {cart.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.product.name}</p>
                      <p className="text-xs text-gray-500">
                        {item.color} - {item.size} | ₹{item.price}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateQuantity(index, -1)}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(index, 1)}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        <Plus size={16} />
                      </button>
                      <button
                        onClick={() => removeFromCart(index)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>₹{calculateSubtotal().toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>GST (5%)</span>
              <span>₹{calculateGST().toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold text-lg pt-2 border-t">
              <span>Total</span>
              <span>₹{calculateTotal().toFixed(2)}</span>
            </div>
          </div>

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
                <CreditCard size={16} />
                <span>{method}</span>
              </button>
            ))}
          </div>

          {/* Checkout Button */}
          <button
            onClick={handleCheckout}
            disabled={loading || cart.length === 0}
            className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            <IndianRupee size={20} />
            <span>{loading ? 'Processing...' : 'Complete Sale'}</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default Billing;
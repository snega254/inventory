import { useState, useEffect } from 'react';
import API from '../services/api';
import { motion } from 'framer-motion';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Filter,
  Package,
  Image as ImageIcon,
  ChevronRight
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import ProductModal from '../components/ProductModal';

const Inventory = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSupplier, setSelectedSupplier] = useState('all');
  const [suppliers, setSuppliers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [imageErrors, setImageErrors] = useState({});

  useEffect(() => {
    fetchProducts();
    fetchSuppliers();
  }, []);

  // Debug log to check image URLs
  useEffect(() => {
    if (products.length > 0) {
      console.log('Products with images:', products.map(p => ({
        name: p.name,
        images: p.colorVariants?.map(v => ({
          color: v.colorName,
          images: v.images
        }))
      })));
    }
  }, [products]);

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await API.get('/products');
      setProducts(data);
    } catch (error) {
      toast.error('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get('http://localhost:5000/api/suppliers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (Array.isArray(data)) {
        setSuppliers(data);
      } else if (data.suppliers) {
        setSuppliers(data.suppliers);
      }
    } catch (error) {
      console.error('Failed to fetch suppliers');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/products/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Product deleted successfully');
      fetchProducts();
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  const handleImageError = (productId) => {
    setImageErrors(prev => ({ ...prev, [productId]: true }));
  };

  // Get first available product image
  const getProductImage = (product) => {
    if (product.colorVariants && product.colorVariants.length > 0) {
      for (const variant of product.colorVariants) {
        if (variant.images && variant.images.length > 0) {
          return variant.images[0];
        }
      }
    }
    return null;
  };

  // Get supplier name
  const getSupplierName = (product) => {
    if (!product.supplier) return 'No Supplier';
    if (typeof product.supplier === 'object') return product.supplier.name;
    
    const found = suppliers.find(s => s._id === product.supplier);
    return found ? found.name : 'Unknown';
  };

  // Get total stock
  const getTotalStock = (product) => {
    return product.colorVariants?.reduce((total, variant) => 
      total + variant.sizes?.reduce((sum, size) => sum + (size.quantity || 0), 0), 0
    ) || 0;
  };

  // Get stock status color
  const getStockStatus = (product) => {
    const totalStock = getTotalStock(product);
    if (totalStock === 0) return { label: 'Out of Stock', color: 'bg-red-100 text-red-700' };
    
    for (const variant of product.colorVariants || []) {
      for (const size of variant.sizes || []) {
        if (size.quantity <= size.minStock) {
          return { label: 'Low Stock', color: 'bg-yellow-100 text-yellow-700' };
        }
      }
    }
    return { label: 'In Stock', color: 'bg-green-100 text-green-700' };
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      (product.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (product.sku?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (product.category?.toLowerCase() || '').includes(search.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    
    const matchesSupplier = selectedSupplier === 'all' || 
      (typeof product.supplier === 'object' ? product.supplier._id === selectedSupplier : product.supplier === selectedSupplier);
    
    return matchesSearch && matchesCategory && matchesSupplier;
  });

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Inventory</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your products, variants, and pricing</p>
        </div>
        <button
          onClick={() => {
            setEditingProduct(null);
            setIsModalOpen(true);
          }}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-primary-700 transition-colors"
        >
          <Plus size={20} />
          <span>Add Product</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search products by name, SKU, or category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          
          <div className="w-48">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="w-48">
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Suppliers</option>
              {suppliers.map(s => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Products List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <>
          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <Package className="mx-auto text-gray-400" size={48} />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No products found</h3>
              <p className="mt-2 text-sm text-gray-500">
                {search || selectedCategory !== 'all' || selectedSupplier !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Get started by adding your first product'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredProducts.map((product, index) => {
                const productImage = getProductImage(product);
                const supplierName = getSupplierName(product);
                const stockStatus = getStockStatus(product);
                const hasImageError = imageErrors[product._id];
                
                return (
                  <motion.div
                    key={product._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-100 overflow-hidden"
                  >
                    <div className="flex flex-col sm:flex-row">
                      {/* Product Image */}
                      <div className="w-full sm:w-32 h-32 bg-gray-100 flex-shrink-0">
                        {productImage && !hasImageError ? (
                          <img
                            src={productImage}
                            alt={product.name}
                            className="w-full h-full object-cover"
                            onError={() => handleImageError(product._id)}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-50">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <rect width="24" height="24" fill="#e5e7eb"/>
                              <path d="M4 16L8 12L12 16L20 8" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"/>
                              <circle cx="18" cy="8" r="1" fill="#9ca3af"/>
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          {/* Left side - Main info */}
                          <div className="flex-1 min-w-[200px]">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="text-base font-semibold text-gray-800">{product.name}</h3>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${stockStatus.color}`}>
                                {stockStatus.label}
                              </span>
                            </div>
                            
                            <div className="space-y-1">
                              <div className="flex items-center text-sm text-gray-600">
                                <span className="font-medium text-gray-500 w-20">Supplier:</span>
                                <span className="text-primary-600">{supplierName}</span>
                              </div>
                              
                              <div className="flex items-center text-sm text-gray-600">
                                <span className="font-medium text-gray-500 w-20">Category:</span>
                                <span>{product.category || 'Uncategorized'}</span>
                                {product.subCategory && (
                                  <>
                                    <ChevronRight size={14} className="mx-1 text-gray-400" />
                                    <span className="text-gray-500">{product.subCategory}</span>
                                  </>
                                )}
                              </div>
                              
                              <div className="flex items-center text-sm text-gray-600">
                                <span className="font-medium text-gray-500 w-20">SKU:</span>
                                <span className="font-mono text-xs">{product.sku}</span>
                              </div>
                            </div>

                            {/* Color Variants Preview */}
                            {product.colorVariants && product.colorVariants.length > 0 && (
                              <div className="flex items-center mt-2 space-x-1">
                                <span className="text-xs text-gray-500 mr-1">Colors:</span>
                                {product.colorVariants.slice(0, 5).map((variant, idx) => (
                                  <div
                                    key={idx}
                                    className="w-4 h-4 rounded-full border border-gray-200"
                                    style={{ 
                                      backgroundColor: variant.colorName?.toLowerCase().includes('white') ? '#ffffff' :
                                                     variant.colorName?.toLowerCase().includes('black') ? '#000000' :
                                                     variant.colorName?.toLowerCase().includes('blue') ? '#3b82f6' :
                                                     variant.colorName?.toLowerCase().includes('red') ? '#ef4444' :
                                                     variant.colorName?.toLowerCase().includes('green') ? '#10b981' :
                                                     variant.colorName?.toLowerCase().includes('yellow') ? '#f59e0b' :
                                                     variant.colorName?.toLowerCase().includes('purple') ? '#8b5cf6' :
                                                     variant.colorName?.toLowerCase().includes('pink') ? '#ec4899' :
                                                     variant.colorName?.toLowerCase().includes('brown') ? '#8b4513' :
                                                     '#cbd5e1'
                                    }}
                                    title={variant.colorName}
                                  />
                                ))}
                                {product.colorVariants.length > 5 && (
                                  <span className="text-xs text-gray-500">+{product.colorVariants.length - 5}</span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Right side - Price and Actions */}
                          <div className="flex flex-col items-end space-y-2">
                            <div className="text-right">
                              <div className="text-lg font-bold text-primary-600">
                                ₹{product.sellingPrice?.toLocaleString()}
                              </div>
                              <div className="text-xs text-gray-400 line-through">
                                ₹{product.purchasePrice?.toLocaleString()}
                              </div>
                            </div>
                            
                            <div className="flex space-x-2">
                              <button
                                onClick={() => {
                                  setEditingProduct(product);
                                  setIsModalOpen(true);
                                }}
                                className="px-3 py-1.5 border rounded-lg text-primary-600 hover:bg-primary-50 flex items-center space-x-1 text-sm"
                              >
                                <Edit size={14} />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => handleDelete(product._id)}
                                className="px-3 py-1.5 border rounded-lg text-red-600 hover:bg-red-50 flex items-center justify-center"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Product Modal */}
      <ProductModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProduct(null);
        }}
        product={editingProduct}
        onSuccess={fetchProducts}
      />
    </motion.div>
  );
};

export default Inventory;
import { useState, useEffect } from 'react';
import API from '../services/api';
import { motion } from 'framer-motion';
import { Search, Plus, Edit, Trash2, Package } from 'lucide-react';
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

  useEffect(() => { fetchProducts(); fetchSuppliers(); }, []);

  const fetchProducts = async () => {
    try { setLoading(true); const { data } = await API.get('/products'); setProducts(data); } 
    catch (error) { toast.error('Failed to fetch products'); } 
    finally { setLoading(false); }
  };

  const fetchSuppliers = async () => {
    try { const { data } = await API.get('/suppliers'); setSuppliers(Array.isArray(data) ? data : data.suppliers || []); } 
    catch (error) { console.error('Failed to fetch suppliers'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      setLoading(true);
      await API.delete(`/products/${id}`);
      toast.success('Product deleted successfully');
      await fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete product');
    } finally { setLoading(false); }
  };

  const handleImageError = (id) => setImageErrors(prev => ({ ...prev, [id]: true }));

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.includes('localhost')) return path.replace('http://localhost:5000', 'https://inventory-management-api-fxqc.onrender.com');
    return path.startsWith('http') ? path : `https://inventory-management-api-fxqc.onrender.com${path}`;
  };

  const getProductImage = (p) => p.colorVariants?.find(v => v.images?.length)?.images?.[0] || null;
  const getSupplierName = (p) => p.supplier?.name || suppliers.find(s => s._id === p.supplier)?.name || 'No Supplier';
  const getTotalStock = (p) => p.colorVariants?.reduce((t, v) => t + v.sizes?.reduce((s, sz) => s + (sz.quantity || 0), 0), 0) || 0;

  const getStockStatus = (p) => {
    const total = getTotalStock(p);
    if (total === 0) return { label: 'Out of Stock', color: 'bg-red-100 text-red-700' };
    for (const v of p.colorVariants || [])
      for (const s of v.sizes || [])
        if (s.quantity <= (s.minStock || 5)) return { label: 'Low Stock', color: 'bg-yellow-100 text-yellow-700' };
    return { label: 'In Stock', color: 'bg-green-100 text-green-700' };
  };

  const filtered = products.filter(p => 
    (p.name?.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase())) &&
    (selectedCategory === 'all' || p.category === selectedCategory) &&
    (selectedSupplier === 'all' || p.supplier?._id === selectedSupplier || p.supplier === selectedSupplier)
  );

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  if (loading && !products.length) return <div className="flex justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div><h1 className="text-xl sm:text-2xl font-semibold">Inventory</h1><p className="text-xs sm:text-sm text-gray-500">Manage your products</p></div>
        <button onClick={() => { setEditingProduct(null); setIsModalOpen(true); }} className="bg-primary-600 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center gap-2"><Plus size={18} />Add Product</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} /><input type="text" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm" /></div>
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full sm:w-48 px-3 py-2 border rounded-lg text-sm"><option value="all">All Categories</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select>
          <select value={selectedSupplier} onChange={(e) => setSelectedSupplier(e.target.value)} className="w-full sm:w-48 px-3 py-2 border rounded-lg text-sm"><option value="all">All Suppliers</option>{suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}</select>
        </div>
      </div>

      {!filtered.length ? (
        <div className="bg-white rounded-xl p-12 text-center"><Package className="mx-auto text-gray-400" size={48} /><h3 className="mt-4 text-lg font-medium">No products found</h3></div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p, i) => {
            const img = getProductImage(p), status = getStockStatus(p), hasError = imageErrors[p._id];
            return (
              <motion.div key={p._id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="flex flex-col sm:flex-row">
                  <div className="w-full sm:w-28 h-32 bg-gray-100 flex-shrink-0">
                    {img && !hasError ? <img src={getImageUrl(img)} alt={p.name} className="w-full h-full object-cover" onError={() => handleImageError(p._id)} /> : <div className="w-full h-full flex items-center justify-center"><Package size={32} className="text-gray-400" /></div>}
                  </div>
                  <div className="flex-1 p-3 sm:p-4">
                    <div className="flex flex-wrap justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1"><h3 className="text-base font-semibold">{p.name}</h3><span className={`px-2 py-0.5 rounded-full text-xs ${status.color}`}>{status.label}</span></div>
                        <div className="space-y-1 text-sm"><div className="flex"><span className="font-medium w-16">Supplier:</span><span className="text-primary-600">{getSupplierName(p)}</span></div><div className="flex"><span className="font-medium w-16">Category:</span><span>{p.category || 'Uncategorized'}</span></div><div className="flex"><span className="font-medium w-16">SKU:</span><span className="font-mono text-xs">{p.sku}</span></div></div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="text-right"><div className="text-lg font-bold text-primary-600">₹{p.sellingPrice?.toLocaleString()}</div><div className="text-xs text-gray-400 line-through">₹{p.purchasePrice?.toLocaleString()}</div></div>
                        <div className="flex gap-2">
                          <button onClick={() => { setEditingProduct(p); setIsModalOpen(true); }} className="px-3 py-1.5 border rounded-lg text-primary-600 hover:bg-primary-50 text-sm"><Edit size={14} className="inline mr-1" />Edit</button>
                          <button onClick={() => handleDelete(p._id)} className="px-3 py-1.5 border rounded-lg text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
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
      <ProductModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingProduct(null); }} product={editingProduct} onSuccess={fetchProducts} />
    </motion.div>
  );
};

export default Inventory;
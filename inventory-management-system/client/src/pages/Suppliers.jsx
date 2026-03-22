import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Plus,
  Truck,
  Mail,
  Phone,
  MapPin,
  FileText,
  Eye,
  Filter,
  X
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import SupplierModal from '../components/SupplierModal';

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [viewingSupplier, setViewingSupplier] = useState(null);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      console.log('Fetching suppliers with token:', token ? 'Yes' : 'No');
      
      const response = await axios.get('http://localhost:5000/api/suppliers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Suppliers response:', response.data);
      
      // Handle response
      if (Array.isArray(response.data)) {
        setSuppliers(response.data);
      } else if (response.data.suppliers) {
        setSuppliers(response.data.suppliers);
      } else {
        setSuppliers([]);
      }
      
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      if (error.response?.status === 401) {
        toast.error('Please login again');
      } else if (error.response?.status === 500) {
        toast.error('Server error. Please check backend console for details.');
      } else {
        toast.error('Failed to fetch suppliers');
      }
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  // Get unique categories from suppliers
  const getCategories = () => {
    const cats = new Set();
    suppliers.forEach(supplier => {
      supplier.categories?.forEach(cat => {
        if (cat.mainCategory) cats.add(cat.mainCategory);
      });
    });
    return Array.from(cats);
  };

  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = 
      (supplier.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (supplier.email?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (supplier.gst?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (supplier.phone || '').includes(search);
    
    const matchesStatus = statusFilter === 'all' || supplier.status === statusFilter;
    
    const matchesCategory = categoryFilter === 'all' || 
      (supplier.categories && supplier.categories.some(c => c.mainCategory === categoryFilter));
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Suppliers</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your vendor and supply chain partners</p>
        </div>
        <button
          onClick={() => {
            setEditingSupplier(null);
            setIsModalOpen(true);
          }}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-primary-700"
        >
          <Plus size={20} />
          <span>Add Supplier</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by name, email, GST, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <div className="w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div className="w-48">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Categories</option>
              {getCategories().map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Suppliers Grid */}
      {filteredSuppliers.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Truck className="mx-auto text-gray-400" size={48} />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No suppliers found</h3>
          <p className="mt-2 text-sm text-gray-500">
            {search || statusFilter !== 'all' || categoryFilter !== 'all' 
              ? 'Try adjusting your filters'
              : 'Get started by adding your first supplier'}
          </p>
          {(search || statusFilter !== 'all' || categoryFilter !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setCategoryFilter('all');
              }}
              className="mt-4 text-primary-600 hover:text-primary-700"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSuppliers.map((supplier, index) => (
            <motion.div
              key={supplier._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                    <Truck className="text-primary-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{supplier.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      supplier.status === 'Active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {supplier.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Mail size={16} className="mr-2 flex-shrink-0" />
                  <span className="truncate">{supplier.email}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Phone size={16} className="mr-2 flex-shrink-0" />
                  <span>{supplier.phone}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <FileText size={16} className="mr-2 flex-shrink-0" />
                  <span className="font-mono text-xs">{supplier.gst}</span>
                </div>
                {supplier.address && (
                  <div className="flex items-start text-sm text-gray-600">
                    <MapPin size={16} className="mr-2 mt-1 flex-shrink-0" />
                    <span className="line-clamp-2">{supplier.address}</span>
                  </div>
                )}
              </div>

              {/* Categories */}
              {supplier.categories && supplier.categories.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs font-medium text-gray-500 mb-2">CATEGORIES</p>
                  <div className="flex flex-wrap gap-2">
                    {supplier.categories.map((cat, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-primary-50 text-primary-700 text-sm rounded-full"
                      >
                        {cat.mainCategory}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment Terms */}
              {supplier.paymentTerms && (
                <div className="mt-3 text-xs text-gray-500">
                  Payment: {supplier.paymentTerms}
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-2 mt-4">
                <button
                  onClick={() => setViewingSupplier(supplier)}
                  className="flex-1 px-3 py-2 border rounded-lg text-primary-600 hover:bg-primary-50 flex items-center justify-center space-x-1"
                >
                  <Eye size={16} />
                  <span>View</span>
                </button>
                <button
                  onClick={() => {
                    setEditingSupplier(supplier);
                    setIsModalOpen(true);
                  }}
                  className="px-3 py-2 border rounded-lg text-gray-600 hover:bg-gray-50"
                >
                  Edit
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modals */}
      <SupplierModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingSupplier(null);
        }}
        supplier={editingSupplier}
        onSuccess={fetchSuppliers}
      />

      {viewingSupplier && (
        <SupplierProfileModal
          supplier={viewingSupplier}
          onClose={() => setViewingSupplier(null)}
        />
      )}
    </motion.div>
  );
};

// Supplier Profile Modal Component
const SupplierProfileModal = ({ supplier, onClose }) => {
  if (!supplier) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">{supplier.name}</h2>
              <p className="text-gray-500 text-sm mt-1">{supplier.address}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <X size={20} />
            </button>
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50 p-4 rounded-lg">
            <div>
              <p className="text-xs text-gray-500">Phone</p>
              <p className="font-medium">{supplier.phone}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Email</p>
              <p className="font-medium">{supplier.email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">GSTIN</p>
              <p className="font-medium font-mono text-sm">{supplier.gst}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Payment Terms</p>
              <p className="font-medium">{supplier.paymentTerms || '30 days'}</p>
            </div>
          </div>

          {/* Categories */}
          {supplier.categories && supplier.categories.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-lg mb-3">Categories</h3>
              <div className="flex flex-wrap gap-2">
                {supplier.categories.map((cat, idx) => (
                  <span
                    key={idx}
                    className="px-4 py-2 bg-primary-100 text-primary-700 rounded-lg"
                  >
                    {cat.mainCategory}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Bank Details */}
          {supplier.bankDetails && (supplier.bankDetails.accountName || supplier.bankDetails.bankName) && (
            <div className="mb-6">
              <h3 className="font-semibold text-lg mb-3">Bank Details</h3>
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                {supplier.bankDetails.accountName && (
                  <div>
                    <p className="text-xs text-gray-500">Account Name</p>
                    <p className="font-medium">{supplier.bankDetails.accountName}</p>
                  </div>
                )}
                {supplier.bankDetails.accountNumber && (
                  <div>
                    <p className="text-xs text-gray-500">Account Number</p>
                    <p className="font-medium">{supplier.bankDetails.accountNumber}</p>
                  </div>
                )}
                {supplier.bankDetails.bankName && (
                  <div>
                    <p className="text-xs text-gray-500">Bank Name</p>
                    <p className="font-medium">{supplier.bankDetails.bankName}</p>
                  </div>
                )}
                {supplier.bankDetails.ifscCode && (
                  <div>
                    <p className="text-xs text-gray-500">IFSC Code</p>
                    <p className="font-medium">{supplier.bankDetails.ifscCode}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {supplier.notes && (
            <div className="mb-6">
              <h3 className="font-semibold text-lg mb-3">Notes</h3>
              <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{supplier.notes}</p>
            </div>
          )}

          {/* Close Button */}
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Suppliers;
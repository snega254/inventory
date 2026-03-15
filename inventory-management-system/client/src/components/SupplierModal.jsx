import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, XCircle } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const SupplierModal = ({ isOpen, onClose, supplier, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    gst: '',
    categories: [],
    otherCategories: [],
    status: 'Active' // Default status
  });

  const [otherCategoryInput, setOtherCategoryInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Available main categories
  const mainCategories = [
    'Shirts',
    'Trousers/Pants',
    'Sets & Occasion Wear',
    'Other Categories'
  ];

  // Status options
  const statusOptions = ['Active', 'Inactive'];

  useEffect(() => {
    if (supplier) {
      // Separate predefined and other categories
      const predefined = supplier.categories
        ?.map(c => c.mainCategory)
        .filter(cat => mainCategories.includes(cat)) || [];
      
      const other = supplier.categories
        ?.map(c => c.mainCategory)
        .filter(cat => !mainCategories.includes(cat)) || [];

      setFormData({
        name: supplier.name || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || '',
        gst: supplier.gst || '',
        categories: predefined,
        otherCategories: other,
        status: supplier.status || 'Active'
      });
    }
  }, [supplier]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const url = supplier
        ? `http://localhost:5000/api/suppliers/${supplier._id}`
        : 'http://localhost:5000/api/suppliers';
      
      const method = supplier ? 'put' : 'post';

      // Combine predefined and other categories
      const allCategories = [
        ...formData.categories,
        ...formData.otherCategories
      ];

      // Format categories for backend
      const categoriesData = allCategories.map(cat => ({
        mainCategory: cat,
        subCategories: []
      }));

      const dataToSend = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        gst: formData.gst,
        categories: categoriesData,
        status: formData.status
      };

      await axios[method](url, dataToSend, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success(supplier ? 'Supplier updated successfully' : 'Supplier created successfully');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (category) => {
    if (formData.categories.includes(category)) {
      setFormData({
        ...formData,
        categories: formData.categories.filter(c => c !== category)
      });
    } else {
      setFormData({
        ...formData,
        categories: [...formData.categories, category]
      });
    }
  };

  const addOtherCategory = () => {
    if (otherCategoryInput.trim()) {
      setFormData({
        ...formData,
        otherCategories: [...formData.otherCategories, otherCategoryInput.trim()]
      });
      setOtherCategoryInput('');
    }
  };

  const removeOtherCategory = (categoryToRemove) => {
    setFormData({
      ...formData,
      otherCategories: formData.otherCategories.filter(c => c !== categoryToRemove)
    });
  };

  const handleOtherCategoryKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addOtherCategory();
    }
  };

  if (!isOpen) return null;

  const totalCategories = formData.categories.length + formData.otherCategories.length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              {supplier ? 'Edit Supplier' : 'Add New Supplier'}
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Company Name */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Company Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                required
              />
            </div>

            {/* Phone & Email - Side by side */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Phone *
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                  required
                />
              </div>
            </div>

            {/* GST */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                GST Number *
              </label>
              <input
                type="text"
                value={formData.gst}
                onChange={(e) => setFormData({ ...formData, gst: e.target.value.toUpperCase() })}
                className="w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                required
                placeholder="27ABCDE1234F1Z5"
              />
            </div>

            {/* Address */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Address *
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows="2"
                className="w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                required
              />
            </div>

            {/* Status Dropdown */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                {statusOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            {/* Categories - Compact checkboxes */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Categories (select multiple)
              </label>
              
              {/* Predefined Categories */}
              <div className="space-y-1.5 bg-gray-50 p-3 rounded-lg mb-3">
                {mainCategories.map(category => (
                  <label key={category} className="flex items-center space-x-2 p-1.5 hover:bg-white rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.categories.includes(category)}
                      onChange={() => toggleCategory(category)}
                      className="w-3.5 h-3.5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-xs text-gray-700">{category}</span>
                  </label>
                ))}
              </div>

              {/* Other Categories Input - Shows when "Other Categories" is selected */}
              {formData.categories.includes('Other Categories') && (
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Add Custom Categories
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={otherCategoryInput}
                      onChange={(e) => setOtherCategoryInput(e.target.value)}
                      onKeyPress={handleOtherCategoryKeyPress}
                      placeholder="e.g., Winter Wear, Accessories"
                      className="flex-1 px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                    <button
                      type="button"
                      onClick={addOtherCategory}
                      className="px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Display Custom Categories */}
              {formData.otherCategories.length > 0 && (
                <div className="mb-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Custom Categories Added:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {formData.otherCategories.map((cat, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center space-x-1 px-2 py-1 bg-primary-50 text-primary-700 text-xs rounded-full"
                      >
                        <span>{cat}</span>
                        <button
                          type="button"
                          onClick={() => removeOtherCategory(cat)}
                          className="hover:text-red-600"
                        >
                          <XCircle size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {totalCategories === 0 && (
                <p className="text-xs text-red-500 mt-1">Select at least one category</p>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex space-x-2 pt-3">
              <button
                type="submit"
                disabled={loading || totalCategories === 0}
                className="flex-1 bg-primary-600 text-white py-1.5 text-sm rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : supplier ? 'Update Supplier' : 'Create Supplier'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 border py-1.5 text-sm rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default SupplierModal;
// src/components/ProductModal.jsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Trash2, Upload } from 'lucide-react';
import API from '../services/api';
import toast from 'react-hot-toast';

const ProductModal = ({ isOpen, onClose, product, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    supplier: '',
    supplierName: '',
    sku: '',
    category: '',
    subCategory: '',
    purchasePrice: 0,
    sellingPrice: 0,
    profit: 0,
    gst: 5,
    colorVariants: [
      {
        colorName: '',
        images: [],
        sizes: [
          { size: 'S', quantity: 0, minStock: 1 }
        ]
      }
    ]
  });

  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fetchingSuppliers, setFetchingSuppliers] = useState(true);
  const [customColorInput, setCustomColorInput] = useState('');
  const [customSizeInput, setCustomSizeInput] = useState('');
  const [selectedVariantForSize, setSelectedVariantForSize] = useState(null);

  // Common size suggestions
  const commonSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'Free Size', '28', '30', '32', '34', '36', '38', '40'];

  // Comprehensive color options based on categories
  const colorOptions = {
    'Shirts': [
      'White', 'Black', 'Navy Blue', 'Light Blue', 'Sky Blue',
      'Grey', 'Charcoal', 'Beige', 'Khaki', 'Olive Green',
      'Burgundy', 'Maroon', 'Pink', 'Peach', 'Lavender',
      'Mustard Yellow', 'Coral', 'Mint Green', 'Teal', 'Brown'
    ],
    'Trousers/Pants': [
      'Black', 'Navy Blue', 'Charcoal Grey', 'Light Grey', 'Beige',
      'Khaki', 'Olive Green', 'Brown', 'Tan', 'Cream',
      'White', 'Maroon', 'Burgundy', 'Navy', 'Dark Brown'
    ],
    'Sets & Occasion Wear': [
      'Black', 'Navy Blue', 'Maroon', 'Burgundy', 'Gold',
      'Silver', 'Ivory', 'Cream', 'Beige', 'Charcoal',
      'Royal Blue', 'Emerald Green', 'Wine Red', 'Peach', 'Lavender'
    ],
    'Other Categories': [
      'Black', 'White', 'Grey', 'Navy', 'Red',
      'Blue', 'Green', 'Yellow', 'Orange', 'Purple',
      'Pink', 'Brown', 'Beige', 'Olive', 'Teal'
    ]
  };

  // All colors flat list
  const allColors = [...new Set(Object.values(colorOptions).flat())].sort();

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    if (product) {
      // Find supplier name from suppliers list
      const supplierObj = suppliers.find(s => s._id === product.supplier);
      
      setFormData({
        name: product.name || '',
        supplier: product.supplier?._id || product.supplier || '',
        supplierName: supplierObj?.name || '',
        sku: product.sku || '',
        category: product.category || '',
        subCategory: product.subCategory || '',
        purchasePrice: product.purchasePrice || 0,
        sellingPrice: product.sellingPrice || 0,
        profit: product.profit || 0,
        gst: product.gst || 5,
        colorVariants: product.colorVariants || [
          {
            colorName: '',
            images: [],
            sizes: [{ size: 'S', quantity: 0, minStock: 1 }]
          }
        ]
      });
    }
  }, [product, suppliers]);

  // Generate SKU in background
  useEffect(() => {
    if (!product && formData.supplier && formData.name) {
      generateSku();
    }
  }, [formData.supplier, formData.name, formData.category]);

  // Calculate profit
  useEffect(() => {
    const totalQuantity = formData.colorVariants.reduce((total, variant) => 
      total + variant.sizes.reduce((sum, size) => sum + (size.quantity || 0), 0), 0
    );
    const profit = (formData.sellingPrice - formData.purchasePrice) * totalQuantity;
    setFormData(prev => ({ ...prev, profit }));
  }, [formData.purchasePrice, formData.sellingPrice, formData.colorVariants]);

  const fetchSuppliers = async () => {
    try {
      const response = await API.get('/suppliers');
      
      if (Array.isArray(response.data)) {
        setSuppliers(response.data);
      } else if (response.data.suppliers) {
        setSuppliers(response.data.suppliers);
      } else {
        setSuppliers([]);
      }
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
      toast.error('Failed to load suppliers');
    } finally {
      setFetchingSuppliers(false);
    }
  };

  // Generate SKU in background
  const generateSku = async () => {
    try {
      const selectedSupplier = suppliers.find(s => s._id === formData.supplier);
      if (!selectedSupplier) return;

      const supplierPrefix = selectedSupplier.name
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, 3)
        .toUpperCase();

      const categoryPrefix = formData.category
        ? formData.category.substring(0, 3).toUpperCase()
        : 'PRD';

      const namePrefix = formData.name
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, 3)
        .toUpperCase();

      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const newSku = `${supplierPrefix}-${categoryPrefix}-${namePrefix}-${randomNum}`;

      setFormData(prev => ({ ...prev, sku: newSku }));
    } catch (error) {
      console.error('Error generating SKU:', error);
    }
  };

  // Image upload function
  const uploadImages = async (variantIndex, files) => {
    const uploadFormData = new FormData();
    Array.from(files).forEach(file => {
      uploadFormData.append('images', file);
    });

    setUploading(true);
    try {
      const { data } = await API.post('/upload', uploadFormData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      // Update the variant with new image URLs
      setFormData(prev => {
        const updatedVariants = [...prev.colorVariants];
        updatedVariants[variantIndex] = {
          ...updatedVariants[variantIndex],
          images: [...updatedVariants[variantIndex].images, ...data.urls]
        };
        return { ...prev, colorVariants: updatedVariants };
      });
      
      toast.success('Images uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload images');
    } finally {
      setUploading(false);
    }
  };

  // Handle image upload
  const handleImageUpload = async (variantIndex, event) => {
    const files = event.target.files;
    if (files.length > 0) {
      await uploadImages(variantIndex, files);
      event.target.value = null;
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = product ? `/products/${product._id}` : '/products';
      const method = product ? 'put' : 'post';

      const totalQuantity = formData.colorVariants.reduce((total, variant) => 
        total + variant.sizes.reduce((sum, size) => sum + (size.quantity || 0), 0), 0
      );

      const dataToSend = {
        name: formData.name,
        supplier: formData.supplier,
        sku: formData.sku,
        category: formData.category,
        subCategory: formData.subCategory,
        purchasePrice: formData.purchasePrice,
        sellingPrice: formData.sellingPrice,
        profit: formData.profit,
        gst: formData.gst,
        colorVariants: formData.colorVariants,
        totalQuantity
      };

      if (method === 'post') {
        await API.post(url, dataToSend);
      } else {
        await API.put(url, dataToSend);
      }

      toast.success(product ? 'Product updated successfully' : 'Product added successfully');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Product operation failed:', error);
      if (error.response?.status === 403) {
        toast.error('You don\'t have permission to add products. Contact admin.');
      } else {
        toast.error(error.response?.data?.message || 'Operation failed');
      }
    } finally {
      setLoading(false);
    }
  };

  // Color Variant functions
  const addColorVariant = () => {
    setFormData({
      ...formData,
      colorVariants: [
        ...formData.colorVariants,
        {
          colorName: '',
          images: [],
          sizes: [{ size: 'S', quantity: 0, minStock: 1 }]
        }
      ]
    });
  };

  const removeColorVariant = (index) => {
    if (formData.colorVariants.length > 1) {
      const updatedVariants = formData.colorVariants.filter((_, i) => i !== index);
      setFormData({ ...formData, colorVariants: updatedVariants });
    }
  };

  const updateVariantColor = (index, value) => {
    const updatedVariants = [...formData.colorVariants];
    updatedVariants[index].colorName = value;
    setFormData({ ...formData, colorVariants: updatedVariants });
  };

  const addCustomColor = (variantIndex) => {
    if (customColorInput.trim()) {
      const updatedVariants = [...formData.colorVariants];
      updatedVariants[variantIndex].colorName = customColorInput.trim();
      setFormData({ ...formData, colorVariants: updatedVariants });
      setCustomColorInput('');
    }
  };

  const removeImage = (variantIndex, imageIndex) => {
    setFormData(prev => {
      const updatedVariants = [...prev.colorVariants];
      updatedVariants[variantIndex] = {
        ...updatedVariants[variantIndex],
        images: updatedVariants[variantIndex].images.filter((_, i) => i !== imageIndex)
      };
      return { ...prev, colorVariants: updatedVariants };
    });
  };

  // Size management functions
  const addSize = (variantIndex) => {
    if (customSizeInput.trim()) {
      setFormData(prev => {
        const updatedVariants = [...prev.colorVariants];
        updatedVariants[variantIndex] = {
          ...updatedVariants[variantIndex],
          sizes: [...updatedVariants[variantIndex].sizes, {
            size: customSizeInput.trim(),
            quantity: 0,
            minStock: 1
          }]
        };
        return { ...prev, colorVariants: updatedVariants };
      });
      setCustomSizeInput('');
      setSelectedVariantForSize(null);
    }
  };

  const removeSize = (variantIndex, sizeIndex) => {
    setFormData(prev => {
      const updatedVariants = [...prev.colorVariants];
      if (updatedVariants[variantIndex].sizes.length > 1) {
        updatedVariants[variantIndex] = {
          ...updatedVariants[variantIndex],
          sizes: updatedVariants[variantIndex].sizes.filter((_, i) => i !== sizeIndex)
        };
      }
      return { ...prev, colorVariants: updatedVariants };
    });
  };

  const updateSizeQuantity = (variantIndex, sizeIndex, field, value) => {
    setFormData(prev => {
      const updatedVariants = [...prev.colorVariants];
      updatedVariants[variantIndex] = {
        ...updatedVariants[variantIndex],
        sizes: updatedVariants[variantIndex].sizes.map((size, i) => 
          i === sizeIndex ? { ...size, [field]: Number(value) } : size
        )
      };
      return { ...prev, colorVariants: updatedVariants };
    });
  };

  const handleSupplierChange = (e) => {
    const supplierId = e.target.value;
    const selectedSupplier = suppliers.find(s => s._id === supplierId);
    setFormData({ 
      ...formData, 
      supplier: supplierId,
      supplierName: selectedSupplier?.name || ''
    });
  };

  // Get color options based on selected category
  const getColorOptions = () => {
    if (!formData.category) return allColors;
    return colorOptions[formData.category] || allColors;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              {product ? 'Edit Product' : 'Add New Product'}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Supplier Selection */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <label className="block text-sm font-medium text-blue-700 mb-1">
                Select Supplier *
              </label>
              <select
                value={formData.supplier}
                onChange={handleSupplierChange}
                className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                required
              >
                <option value="">-- Choose Supplier --</option>
                {fetchingSuppliers ? (
                  <option disabled>Loading suppliers...</option>
                ) : (
                  suppliers
                    .filter(s => s.status === 'Active')
                    .map(s => (
                      <option key={s._id} value={s._id}>{s.name}</option>
                    ))
                )}
              </select>
            </div>

            {/* Product Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                }}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            {/* Category and SubCategory */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => {
                    setFormData({ 
                      ...formData, 
                      category: e.target.value,
                      subCategory: ''
                    });
                  }}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select Category</option>
                  {Object.keys(colorOptions).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sub Category
                </label>
                <select
                  value={formData.subCategory}
                  onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  disabled={!formData.category}
                >
                  <option value="">Select Sub Category</option>
                  {formData.category === 'Shirts' && [
                    'Linen', 'Embroidery', 'Flannel', 'Viscose', 'Designer',
                    'Mandarin collar', 'Oxford', 'Double pocket', 'Corduroy',
                    'Stained', 'Drop shoulder', 'Oversized'
                  ].map(sub => <option key={sub} value={sub}>{sub}</option>)}
                  
                  {formData.category === 'Trousers/Pants' && [
                    'Linen pants', 'Formal trousers', 'Straight fit jeans',
                    'Baggy fit jeans', 'Patched jeans', 'Cargo pants', 'Gurkha pants'
                  ].map(sub => <option key={sub} value={sub}>{sub}</option>)}
                  
                  {formData.category === 'Sets & Occasion Wear' && [
                    'Wedding outfits', 'Formal suit combos (Size M to XXL)',
                    'Sherwani sets', 'Indo-western outfits'
                  ].map(sub => <option key={sub} value={sub}>{sub}</option>)}
                  
                  {formData.category === 'Other Categories' && [
                    'Vintage Tees', 'Casual streetwear', 'Trendy jackets',
                    'Hoodies', 'Sweatshirts'
                  ].map(sub => <option key={sub} value={sub}>{sub}</option>)}
                </select>
              </div>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purchase Price *
                </label>
                <input
                  type="number"
                  value={formData.purchasePrice}
                  onChange={(e) => setFormData({ ...formData, purchasePrice: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Selling Price *
                </label>
                <input
                  type="number"
                  value={formData.sellingPrice}
                  onChange={(e) => setFormData({ ...formData, sellingPrice: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  GST (%)
                </label>
                <input
                  type="number"
                  value={formData.gst}
                  onChange={(e) => setFormData({ ...formData, gst: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  min="0"
                  max="28"
                  step="0.1"
                />
              </div>
            </div>

            {/* Profit Display */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">
                Estimated Profit: <span className="font-semibold text-green-600">₹{formData.profit.toFixed(2)}</span>
              </p>
            </div>

            {/* Color Variants with Images and Custom Sizes */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  Color Variants
                </label>
                <button
                  type="button"
                  onClick={addColorVariant}
                  className="text-primary-600 hover:text-primary-700 flex items-center space-x-1 text-sm"
                >
                  <Plus size={16} />
                  <span>Add Color</span>
                </button>
              </div>

              {formData.colorVariants.map((variant, vIndex) => (
                <div key={vIndex} className="border rounded-lg p-4 space-y-4">
                  {/* Color Selection and Remove */}
                  <div className="flex items-center justify-between">
                    <div className="flex-1 mr-2">
                      <label className="block text-xs text-gray-500 mb-1">Color</label>
                      <select
                        value={variant.colorName}
                        onChange={(e) => updateVariantColor(vIndex, e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                        required
                      >
                        <option value="">Select Color</option>
                        <optgroup label="Category Colors">
                          {getColorOptions().map(color => (
                            <option key={color} value={color}>{color}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Other Colors">
                          {allColors
                            .filter(c => !getColorOptions().includes(c))
                            .map(color => (
                              <option key={color} value={color}>{color}</option>
                            ))
                          }
                        </optgroup>
                      </select>
                      
                      {/* Custom color input */}
                      <div className="flex mt-2 space-x-2">
                        <input
                          type="text"
                          value={customColorInput}
                          onChange={(e) => setCustomColorInput(e.target.value)}
                          placeholder="Or type custom color"
                          className="flex-1 px-3 py-1 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        <button
                          type="button"
                          onClick={() => addCustomColor(vIndex)}
                          className="px-3 py-1 bg-gray-100 text-sm rounded-lg hover:bg-gray-200"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                    
                    {formData.colorVariants.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeColorVariant(vIndex)}
                        className="text-red-500 hover:text-red-700 ml-2"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>

                  {/* Image Upload Section */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-2">Product Images</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {variant.images && variant.images.map((img, imgIndex) => {
                        const imageSrc = img.startsWith('http') 
                          ? img 
                          : `http://localhost:5000/uploads/products/${img}`;
                        
                        return (
                          <div key={imgIndex} className="relative">
                            <div className="w-16 h-16 rounded-lg border overflow-hidden bg-gray-100">
                              <img 
                                src={imageSrc}
                                alt={`Product ${imgIndex + 1}`} 
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target;
                                  target.style.display = 'none';
                                  const parent = target.parentNode;
                                  if (parent) {
                                    parent.innerHTML = `
                                      <div class="w-full h-full flex items-center justify-center bg-gray-100">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                          <rect width="24" height="24" fill="#e5e7eb"/>
                                          <path d="M8 12L11 15L16 9" stroke="#9ca3af" stroke-width="2" stroke-linecap="round"/>
                                          <circle cx="17" cy="7" r="1" fill="#9ca3af"/>
                                        </svg>
                                      </div>
                                    `;
                                  }
                                }}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeImage(vIndex, imgIndex)}
                              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        );
                      })}
                      
                      {/* Upload button */}
                      <label className="w-16 h-16 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-50 relative">
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={(e) => handleImageUpload(vIndex, e)}
                          className="hidden"
                        />
                        {uploading ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
                        ) : (
                          <Upload size={20} className="text-gray-400" />
                        )}
                      </label>
                    </div>
                  </div>

                  {/* Sizes Section */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs text-gray-500">Sizes & Stock</label>
                      <button
                        type="button"
                        onClick={() => setSelectedVariantForSize(vIndex)}
                        className="text-primary-600 hover:text-primary-700 text-xs flex items-center space-x-1"
                      >
                        <Plus size={14} />
                        <span>Add Size</span>
                      </button>
                    </div>

                    {/* Size Input (shows when adding size) */}
                    {selectedVariantForSize === vIndex && (
                      <div className="flex space-x-2 mb-3">
                        <input
                          type="text"
                          value={customSizeInput}
                          onChange={(e) => setCustomSizeInput(e.target.value)}
                          placeholder="Enter size (e.g., XS, 28, Free Size)"
                          className="flex-1 px-3 py-1 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        <button
                          type="button"
                          onClick={() => addSize(vIndex)}
                          className="px-3 py-1 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedVariantForSize(null)}
                          className="px-3 py-1 border text-sm rounded-lg hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    {/* Size Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {variant.sizes.map((size, sIndex) => (
                        <div key={sIndex} className="border rounded-lg p-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm">{size.size}</span>
                            {variant.sizes.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeSize(vIndex, sIndex)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                          <div className="space-y-1">
                            <input
                              type="number"
                              value={size.quantity}
                              onChange={(e) => updateSizeQuantity(vIndex, sIndex, 'quantity', Number(e.target.value))}
                              className="w-full px-2 py-1 border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                              placeholder="Qty"
                              min="0"
                            />
                            <input
                              type="number"
                              value={size.minStock}
                              onChange={(e) => updateSizeQuantity(vIndex, sIndex, 'minStock', Number(e.target.value))}
                              className="w-full px-2 py-1 border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                              placeholder="Min"
                              min="1"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Submit Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                disabled={loading || !formData.supplier}
                className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : product ? 'Update Product' : 'Add Product'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 border py-2 rounded-lg hover:bg-gray-50"
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

export default ProductModal;
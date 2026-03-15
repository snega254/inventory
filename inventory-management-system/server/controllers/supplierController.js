import Supplier, { CATEGORIES, ALL_SUBCATEGORIES } from '../models/Supplier.js';

// @desc    Get all suppliers
// @route   GET /api/suppliers
// @access  Private
export const getSuppliers = async (req, res) => {
  try {
    const { search, status, category } = req.query;
    let query = { user: req.user._id };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { gst: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      query.status = status;
    }

    if (category) {
      query['categories.mainCategory'] = category;
    }

    const suppliers = await Supplier.find(query)
      .populate('user', 'name email')
      .sort('-createdAt');

    // Get unique categories for filtering
    const allCategories = await Supplier.distinct('categories.mainCategory');

    res.json({
      suppliers,
      categories: allCategories,
      categoryOptions: CATEGORIES,
      allSubcategories: ALL_SUBCATEGORIES
    });
  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single supplier
// @route   GET /api/suppliers/:id
// @access  Private
export const getSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findOne({
      _id: req.params.id,
      user: req.user._id
    }).populate('user', 'name email');

    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    res.json(supplier);
  } catch (error) {
    console.error('Get supplier error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create supplier
// @route   POST /api/suppliers
// @access  Private
export const createSupplier = async (req, res) => {
  try {
    const { name, phone, email, address, gst, categories, products, paymentTerms, bankDetails, notes } = req.body;

    // Check if supplier with same GST exists
    const existingSupplier = await Supplier.findOne({ 
      $or: [
        { gst: gst?.toUpperCase() },
        { email: email?.toLowerCase() }
      ]
    });

    if (existingSupplier) {
      return res.status(400).json({ 
        message: 'Supplier with this GST or Email already exists' 
      });
    }

    const supplier = await Supplier.create({
      user: req.user._id,
      name,
      phone,
      email,
      address,
      gst: gst?.toUpperCase(),
      categories: categories || [],
      products: products || [],
      paymentTerms: paymentTerms || '30 days',
      bankDetails: bankDetails || {},
      notes,
      status: 'Active'
    });

    res.status(201).json(supplier);
  } catch (error) {
    console.error('Create supplier error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update supplier
// @route   PUT /api/suppliers/:id
// @access  Private
export const updateSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    // Check if updating to an existing GST/email
    if (req.body.gst && req.body.gst.toUpperCase() !== supplier.gst) {
      const existingGST = await Supplier.findOne({ 
        gst: req.body.gst.toUpperCase(),
        _id: { $ne: supplier._id }
      });
      if (existingGST) {
        return res.status(400).json({ message: 'GST already exists' });
      }
    }

    if (req.body.email && req.body.email.toLowerCase() !== supplier.email) {
      const existingEmail = await Supplier.findOne({ 
        email: req.body.email.toLowerCase(),
        _id: { $ne: supplier._id }
      });
      if (existingEmail) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }

    // Update fields
    supplier.name = req.body.name || supplier.name;
    supplier.phone = req.body.phone || supplier.phone;
    supplier.email = req.body.email?.toLowerCase() || supplier.email;
    supplier.address = req.body.address || supplier.address;
    supplier.gst = req.body.gst?.toUpperCase() || supplier.gst;
    supplier.categories = req.body.categories || supplier.categories;
    supplier.products = req.body.products || supplier.products;
    supplier.paymentTerms = req.body.paymentTerms || supplier.paymentTerms;
    supplier.bankDetails = req.body.bankDetails || supplier.bankDetails;
    supplier.notes = req.body.notes || supplier.notes;
    supplier.status = req.body.status || supplier.status;

    const updatedSupplier = await supplier.save();
    res.json(updatedSupplier);
  } catch (error) {
    console.error('Update supplier error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete supplier
// @route   DELETE /api/suppliers/:id
// @access  Private
export const deleteSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    await supplier.deleteOne();
    res.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    console.error('Delete supplier error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get categories and subcategories
// @route   GET /api/suppliers/categories
// @access  Private
export const getCategories = async (req, res) => {
  try {
    res.json({
      categories: CATEGORIES,
      allSubcategories: ALL_SUBCATEGORIES
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: error.message });
  }
};
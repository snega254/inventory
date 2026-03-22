import User from '../models/User.js';

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
export const getUsers = async (req, res) => {
  try {
    console.log('Fetching users...');
    console.log('Current user:', req.user?._id, req.user?.role);

    // Check if user exists
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Check if user is admin
    if (req.user.role !== 'admin') {
      console.log('Non-admin attempted to access users:', req.user.role);
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const { search, role, status } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } }
      ];
    }

    if (role && role !== 'all') {
      query.role = role;
    }

    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    console.log('User query:', query);

    const users = await User.find(query)
      .select('-password')
      .populate('createdBy', 'name email')
      .sort('-createdAt');

    console.log(`Found ${users.length} users`);

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch users',
      error: error.message 
    });
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private/Admin
export const getUser = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('createdBy', 'name email');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create user (employee)
// @route   POST /api/users
// @access  Private/Admin
export const createUser = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const { name, email, password, phone, role } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Set default permissions based on role
    let permissions = {};
    switch (role) {
      case 'admin':
        permissions = {
          canCreateSales: true,
          canViewReports: true,
          canManageInventory: true,
          canManageEmployees: true,
          canManageSuppliers: true,
          canViewAnalytics: true
        };
        break;
      case 'manager':
        permissions = {
          canCreateSales: true,
          canViewReports: true,
          canManageInventory: true,
          canManageEmployees: false,
          canManageSuppliers: true,
          canViewAnalytics: true
        };
        break;
      case 'cashier':
        permissions = {
          canCreateSales: true,
          canViewReports: false,
          canManageInventory: false,
          canManageEmployees: false,
          canManageSuppliers: false,
          canViewAnalytics: false
        };
        break;
      case 'inventory_clerk':
        permissions = {
          canCreateSales: false,
          canViewReports: true,
          canManageInventory: true,
          canManageEmployees: false,
          canManageSuppliers: true,
          canViewAnalytics: false
        };
        break;
      default:
        permissions = {
          canCreateSales: true,
          canViewReports: false,
          canManageInventory: false,
          canManageEmployees: false,
          canManageSuppliers: false,
          canViewAnalytics: false
        };
    }

    const user = await User.create({
      name,
      email,
      password,
      phone: phone || '',
      role: role || 'cashier',
      permissions,
      createdBy: req.user._id
    });

    console.log('User created:', user.email, user.employeeId);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      employeeId: user.employeeId,
      role: user.role,
      permissions: user.permissions,
      isActive: user.isActive
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
export const updateUser = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update fields
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.phone = req.body.phone !== undefined ? req.body.phone : user.phone;
    user.role = req.body.role || user.role;
    user.updatedAt = Date.now();

    // Update password if provided
    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      employeeId: updatedUser.employeeId,
      role: updatedUser.role,
      isActive: updatedUser.isActive
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent deleting yourself
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    // Prevent deleting other admins
    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Cannot delete another admin' });
    }

    await user.deleteOne();
    console.log('User deleted:', user.email);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Toggle user active status
// @route   PUT /api/users/:id/toggle-status
// @access  Private/Admin
export const toggleUserStatus = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent deactivating yourself
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot change your own status' });
    }

    user.isActive = !user.isActive;
    await user.save();

    console.log('User status toggled:', user.email, user.isActive);

    res.json({
      _id: user._id,
      name: user.name,
      isActive: user.isActive
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get current user profile
// @route   GET /api/users/profile/me
// @access  Private
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('createdBy', 'name email');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ message: error.message });
  }
};
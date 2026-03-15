import User from '../models/User.js';

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
export const getUsers = async (req, res) => {
  try {
    const { search, role, status } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } }
      ];
    }

    if (role) query.role = role;
    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;

    const users = await User.find(query)
      .select('-password')
      .populate('createdBy', 'name email')
      .sort('-createdAt');

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private/Admin
export const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('createdBy', 'name email');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create user (employee)
// @route   POST /api/users
// @access  Private/Admin
export const createUser = async (req, res) => {
  try {
    const { name, email, password, phone, position, permissions, role } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Set default permissions based on position if not provided
    let userPermissions = permissions;
    if (!userPermissions) {
      switch (position) {
        case 'manager':
          userPermissions = {
            canCreateSales: true,
            canViewReports: true,
            canManageInventory: true,
            canManageEmployees: false,
            canManageSuppliers: true,
            canViewAnalytics: true
          };
          break;
        case 'cashier':
          userPermissions = {
            canCreateSales: true,
            canViewReports: false,
            canManageInventory: false,
            canManageEmployees: false,
            canManageSuppliers: false,
            canViewAnalytics: false
          };
          break;
        case 'inventory_clerk':
          userPermissions = {
            canCreateSales: false,
            canViewReports: true,
            canManageInventory: true,
            canManageEmployees: false,
            canManageSuppliers: true,
            canViewAnalytics: false
          };
          break;
        default:
          userPermissions = {
            canCreateSales: true,
            canViewReports: false,
            canManageInventory: false,
            canManageEmployees: false,
            canManageSuppliers: false,
            canViewAnalytics: false
          };
      }
    }

    const user = await User.create({
      name,
      email,
      password,
      phone,
      position: position || 'sales_associate',
      role: role || 'employee',
      permissions: userPermissions,
      createdBy: req.user._id
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      employeeId: user.employeeId,
      position: user.position,
      role: user.role,
      permissions: user.permissions,
      isActive: user.isActive
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
export const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update fields
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.phone = req.body.phone || user.phone;
    user.position = req.body.position || user.position;
    user.permissions = req.body.permissions || user.permissions;
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
      position: updatedUser.position,
      role: updatedUser.role,
      permissions: updatedUser.permissions,
      isActive: updatedUser.isActive
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent deleting yourself
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    await user.deleteOne();
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Toggle user active status
// @route   PUT /api/users/:id/toggle-status
// @access  Private/Admin
export const toggleUserStatus = async (req, res) => {
  try {
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

    res.json({
      _id: user._id,
      name: user.name,
      isActive: user.isActive
    });
  } catch (error) {
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
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
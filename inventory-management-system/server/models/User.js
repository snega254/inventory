import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'cashier', 'inventory_clerk'],
    default: 'cashier'
  },
  phone: {
    type: String,
    default: ''
  },
  employeeId: {
    type: String,
    unique: true
  },
  permissions: {
    canCreateSales: { type: Boolean, default: true },
    canViewReports: { type: Boolean, default: false },
    canManageInventory: { type: Boolean, default: false },
    canManageEmployees: { type: Boolean, default: false },
    canManageSuppliers: { type: Boolean, default: false },
    canViewAnalytics: { type: Boolean, default: false }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastLogin: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Generate employee ID before saving
userSchema.pre('save', async function(next) {
  try {
    if (!this.employeeId) {
      const count = await mongoose.model('User').countDocuments();
      this.employeeId = `EMP${String(count + 1).padStart(4, '0')}`;
    }
    
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Update the updatedAt timestamp on save
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const User = mongoose.model('User', userSchema);

export default User;
import User from '../models/User.js';

export const createDefaultAdmin = async () => {
  try {
    // Check if any admin exists
    const adminExists = await User.findOne({ role: 'admin' });
    
    if (!adminExists) {
      console.log('📝 Creating default admin user...');
      
      const defaultAdmin = await User.create({
        name: 'Shop Owner',
        email: 'admin@attire.com',
        password: 'admin123',
        phone: '9876543210',
        role: 'admin',
        position: 'manager',
        permissions: {
          canCreateSales: true,
          canViewReports: true,
          canManageInventory: true,
          canManageEmployees: true,
          canManageSuppliers: true,
          canViewAnalytics: true
        },
        isActive: true
      });

      console.log('✅ Default admin created successfully!');
      console.log('📧 Email: admin@attire.com');
      console.log('🔑 Password: admin123');
      console.log('⚠️  Please change the password after first login!');
    } else {
      console.log('✅ Admin user already exists');
    }
  } catch (error) {
    console.error('❌ Error creating default admin:', error.message);
  }
};
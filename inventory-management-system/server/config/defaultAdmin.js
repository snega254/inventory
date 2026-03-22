import User from '../models/User.js';
import bcrypt from 'bcryptjs';

export const createDefaultAdmin = async () => {
  try {
    const adminExists = await User.findOne({ email: 'admin@attire.com' });
    
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('Admin@123', 10);
      
      const admin = new User({
        name: 'Admin User',
        email: 'admin@attire.com',
        password: hashedPassword,
        role: 'admin',
        isActive: true,
        phone: '9876543210',
        position: 'Administrator',
        employeeId: 'ADMIN001'
      });
      
      await admin.save();
      console.log('✅ Default admin created successfully!');
      console.log('📧 Email: admin@attire.com');
      console.log('🔑 Password: Admin@123');
    } else {
      console.log('✅ Admin user already exists');
    }
  } catch (error) {
    console.error('Error creating default admin:', error);
  }
};
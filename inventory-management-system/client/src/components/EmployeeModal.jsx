import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const EmployeeModal = ({ isOpen, onClose, employee, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    position: 'sales_associate',
    role: 'employee',
    permissions: {
      canCreateSales: true,
      canViewReports: false,
      canManageInventory: false,
      canManageEmployees: false,
      canManageSuppliers: false,
      canViewAnalytics: false
    }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (employee) {
      setFormData({
        name: employee.name || '',
        email: employee.email || '',
        password: '',
        phone: employee.phone || '',
        position: employee.position || 'sales_associate',
        role: employee.role || 'employee',
        permissions: employee.permissions || {
          canCreateSales: true,
          canViewReports: false,
          canManageInventory: false,
          canManageEmployees: false,
          canManageSuppliers: false,
          canViewAnalytics: false
        }
      });
    } else {
      setFormData({
        name: '',
        email: '',
        password: '',
        phone: '',
        position: 'sales_associate',
        role: 'employee',
        permissions: {
          canCreateSales: true,
          canViewReports: false,
          canManageInventory: false,
          canManageEmployees: false,
          canManageSuppliers: false,
          canViewAnalytics: false
        }
      });
    }
  }, [employee]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const url = employee
        ? `http://localhost:5000/api/users/${employee._id}`
        : 'http://localhost:5000/api/users';
      
      const method = employee ? 'put' : 'post';

      // For update, don't send password if empty
      const dataToSend = { ...formData };
      if (employee && !dataToSend.password) {
        delete dataToSend.password;
      }

      await axios[method](url, dataToSend, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success(employee ? 'Employee updated successfully' : 'Employee created successfully');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (permission, value) => {
    setFormData({
      ...formData,
      permissions: {
        ...formData.permissions,
        [permission]: value
      }
    });
  };

  const handlePositionChange = (position) => {
    // Set default permissions based on position
    let permissions = { ...formData.permissions };
    
    switch(position) {
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

    setFormData({
      ...formData,
      position,
      permissions
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              {employee ? 'Edit Employee' : 'Add New Employee'}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone *
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password {!employee && '*'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required={!employee}
                  placeholder={employee ? 'Leave blank to keep current' : ''}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Position *
              </label>
              <select
                value={formData.position}
                onChange={(e) => handlePositionChange(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              >
                <option value="sales_associate">Sales Associate</option>
                <option value="cashier">Cashier</option>
                <option value="inventory_clerk">Inventory Clerk</option>
                <option value="manager">Manager</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Permissions
              </label>
              <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Create Sales</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.permissions.canCreateSales}
                      onChange={(e) => handlePermissionChange('canCreateSales', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">View Reports</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.permissions.canViewReports}
                      onChange={(e) => handlePermissionChange('canViewReports', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">Manage Inventory</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.permissions.canManageInventory}
                      onChange={(e) => handlePermissionChange('canManageInventory', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">Manage Employees</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.permissions.canManageEmployees}
                      onChange={(e) => handlePermissionChange('canManageEmployees', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">Manage Suppliers</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.permissions.canManageSuppliers}
                      onChange={(e) => handlePermissionChange('canManageSuppliers', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">View Analytics</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.permissions.canViewAnalytics}
                      onChange={(e) => handlePermissionChange('canViewAnalytics', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : employee ? 'Update Employee' : 'Create Employee'}
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

export default EmployeeModal;
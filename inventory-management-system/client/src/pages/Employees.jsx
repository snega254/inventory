import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  UserPlus,
  Mail,
  Phone,
  Briefcase,
  Shield,
  ToggleLeft,
  ToggleRight,
  Key
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import UserModal from '../components/UserModal';

const Employees = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get('http://localhost:5000/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Handle both array and object responses
      if (Array.isArray(data)) {
        setUsers(data);
      } else if (data.users) {
        setUsers(data.users);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.put(
        `http://localhost:5000/api/users/${id}/toggle-status`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setUsers(users.map(user => 
        user._id === id ? { ...user, isActive: data.isActive } : user
      ));
      
      toast.success(`User ${data.isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      toast.error('Failed to toggle status');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setUsers(users.filter(user => user._id !== id));
      toast.success('User deleted successfully');
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  const handleResetPassword = async (id) => {
    const newPassword = prompt('Enter new password for this user:');
    if (!newPassword) return;

    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `http://localhost:5000/api/users/${id}`,
        { password: newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Password reset successfully');
    } catch (error) {
      toast.error('Failed to reset password');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (user.email?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (user.employeeId?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (user.phone || '').includes(search);
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && user.isActive) ||
      (statusFilter === 'inactive' && !user.isActive);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleBadgeColor = (role) => {
    switch(role) {
      case 'admin': return 'bg-purple-100 text-purple-700';
      case 'manager': return 'bg-blue-100 text-blue-700';
      case 'cashier': return 'bg-green-100 text-green-700';
      case 'inventory_clerk': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Employees</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your team members and their access</p>
        </div>
        <button
          onClick={() => {
            setEditingUser(null);
            setIsModalOpen(true);
          }}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-primary-700"
        >
          <UserPlus size={20} />
          <span>Add Employee</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Employees</p>
              <p className="text-2xl font-semibold mt-1">{users.length}</p>
            </div>
            <div className="bg-blue-500 p-3 rounded-lg">
              <Users className="text-white" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active</p>
              <p className="text-2xl font-semibold mt-1 text-green-600">
                {users.filter(u => u.isActive).length}
              </p>
            </div>
            <div className="bg-green-500 p-3 rounded-lg">
              <Users className="text-white" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Inactive</p>
              <p className="text-2xl font-semibold mt-1 text-red-600">
                {users.filter(u => !u.isActive).length}
              </p>
            </div>
            <div className="bg-red-500 p-3 rounded-lg">
              <Users className="text-white" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Admins</p>
              <p className="text-2xl font-semibold mt-1">
                {users.filter(u => u.role === 'admin').length}
              </p>
            </div>
            <div className="bg-purple-500 p-3 rounded-lg">
              <Shield className="text-white" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by name, email, employee ID, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          
          <div className="w-40">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="cashier">Cashier</option>
              <option value="inventory_clerk">Inventory Clerk</option>
            </select>
          </div>

          <div className="w-40">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users List - Horizontal Cards */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <>
          {filteredUsers.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <Users className="mx-auto text-gray-400" size={48} />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No employees found</h3>
              <p className="mt-2 text-sm text-gray-500">
                {search || roleFilter !== 'all' || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Get started by adding your first employee'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((user, index) => (
                <motion.div
                  key={user._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-100 overflow-hidden"
                >
                  <div className="flex flex-col sm:flex-row">
                    {/* User Info */}
                    <div className="flex-1 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        {/* Left side - Main info */}
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                              user.role === 'admin' ? 'bg-purple-600' : 'bg-primary-600'
                            }`}>
                              {user.name?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <h3 className="text-base font-semibold text-gray-800">{user.name}</h3>
                              <p className="text-xs text-gray-500">{user.employeeId}</p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <div className="flex items-center text-sm text-gray-600">
                              <Mail size={14} className="mr-2 text-gray-400" />
                              <span className="truncate">{user.email}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <Phone size={14} className="mr-2 text-gray-400" />
                              <span>{user.phone || 'N/A'}</span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 mt-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                              {user.role === 'admin' ? 'Admin' : 
                               user.role === 'manager' ? 'Manager' :
                               user.role === 'cashier' ? 'Cashier' :
                               user.role === 'inventory_clerk' ? 'Inventory Clerk' : 'Employee'}
                            </span>
                            
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </span>

                            {user.createdBy && (
                              <span className="text-xs text-gray-400">
                                Added by: {user.createdBy.name}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right side - Actions */}
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setEditingUser(user);
                              setIsModalOpen(true);
                            }}
                            className="p-2 border rounded-lg text-primary-600 hover:bg-primary-50"
                            title="Edit User"
                          >
                            <Edit size={16} />
                          </button>
                          
                          <button
                            onClick={() => handleResetPassword(user._id)}
                            className="p-2 border rounded-lg text-orange-600 hover:bg-orange-50"
                            title="Reset Password"
                          >
                            <Key size={16} />
                          </button>
                          
                          <button
                            onClick={() => handleToggleStatus(user._id)}
                            className={`p-2 border rounded-lg ${
                              user.isActive 
                                ? 'text-yellow-600 hover:bg-yellow-50' 
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                            title={user.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {user.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                          </button>
                          
                          {user.role !== 'admin' && (
                            <button
                              onClick={() => handleDelete(user._id)}
                              className="p-2 border rounded-lg text-red-600 hover:bg-red-50"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {/* User Modal */}
      <UserModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingUser(null);
        }}
        user={editingUser}
        onSuccess={fetchUsers}
      />
    </motion.div>
  );
};

export default Employees;
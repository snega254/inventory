import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  Users,
  FileText,
  BarChart3,
  LogOut
} from 'lucide-react';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { motion } from 'framer-motion';

const Sidebar = () => {
  const { user, logout } = useContext(AuthContext);
  
  // Get user role
  const userRole = user?.role || 'cashier';

  // Define menu items with role-based visibility
  const getMenuItems = () => {
    const allItems = [
      { path: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'manager', 'inventory_clerk', 'cashier'] },
      { path: '/inventory', icon: Package, label: 'Inventory', roles: ['admin', 'manager', 'inventory_clerk'] },
      { path: '/billing', icon: ShoppingCart, label: 'Billing', roles: ['admin', 'manager', 'cashier'] },
      { path: '/suppliers', icon: Truck, label: 'Suppliers', roles: ['admin', 'manager', 'inventory_clerk'] },
      { path: '/employees', icon: Users, label: 'Employees', roles: ['admin'] },  // Only admin
      { path: '/reports', icon: FileText, label: 'Reports', roles: ['admin', 'manager'] },
      { path: '/analytics', icon: BarChart3, label: 'Analytics', roles: ['admin', 'manager'] }
    ];

    // Filter items based on user role
    return allItems.filter(item => item.roles.includes(userRole));
  };

  const menuItems = getMenuItems();

  // If user is cashier, show simplified view
  const isCashier = userRole === 'cashier';

  return (
    <motion.div 
      initial={{ x: -100 }}
      animate={{ x: 0 }}
      className="w-64 bg-white shadow-lg flex flex-col"
    >
      <div className="p-6">
        <h1 className="text-2xl font-bold text-primary-600">Attire</h1>
        <p className="text-sm text-gray-500">MENSWEAR</p>
        {isCashier && (
          <p className="text-xs text-gray-400 mt-1">Cashier Mode</p>
        )}
      </div>

      <nav className="flex-1 px-4">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`
            }
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t">
        <div className="mb-4 px-4 py-2 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500">Logged in as</p>
          <p className="text-sm font-medium">{user?.name}</p>
          <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
          {isCashier && (
            <p className="text-xs text-blue-500 mt-1">Limited Access Mode</p>
          )}
        </div>
        <button
          onClick={logout}
          className="flex items-center space-x-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg w-full"
        >
          <LogOut size={20} />
          <span>Sign Out</span>
        </button>
      </div>
    </motion.div>
  );
};

export default Sidebar;
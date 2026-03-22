import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  FileText,
  BarChart3,
  Users,
  LogOut
} from 'lucide-react';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { motion } from 'framer-motion';

const Sidebar = () => {
  const { user, logout } = useContext(AuthContext);

  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/inventory', icon: Package, label: 'Inventory' },
    { path: '/billing', icon: ShoppingCart, label: 'Billing' },
    { path: '/suppliers', icon: Truck, label: 'Suppliers' },
    { path: '/employees', icon: Users, label: 'Employees' },
    { path: '/reports', icon: FileText, label: 'Reports' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
  ];

  // Filter menu items based on permissions
  const filteredMenuItems = menuItems.filter(item => {
    if (user?.role === 'admin') return true;
    
    // For employees, check permissions
    switch(item.path) {
      case '/':
        return true; // Dashboard always visible
      case '/inventory':
        return user?.permissions?.canManageInventory;
      case '/billing':
        return user?.permissions?.canCreateSales;
      case '/suppliers':
        return user?.permissions?.canManageSuppliers;
      case '/employees':
        return false; // Only admin can see employees
      case '/reports':
        return user?.permissions?.canViewReports;
      case '/analytics':
        return user?.permissions?.canViewAnalytics;
      default:
        return true;
    }
  });

  return (
    <motion.div 
      initial={{ x: -100 }}
      animate={{ x: 0 }}
      className="w-64 bg-white shadow-lg flex flex-col"
    >
      <div className="p-6">
        <h1 className="text-2xl font-bold text-primary-600">Attire</h1>
        <p className="text-sm text-gray-500">Menswear</p>
      </div>

      <nav className="flex-1 px-4">
        {filteredMenuItems.map((item) => (
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
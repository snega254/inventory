import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Suppliers from './pages/Suppliers';
import Billing from './pages/Billing';
import Reports from './pages/Reports';
import Analytics from './pages/Analytics';
import Employees from './pages/Employees';
import Chatbot from './components/Chatbot';

// PrivateRoute component - checks if user is authenticated
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <PrivateRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/inventory" element={<Inventory />} />
                    <Route path="/suppliers" element={<Suppliers />} />
                    <Route path="/billing" element={<Billing />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/employees" element={<Employees />} />
                  </Routes>
                </Layout>
              </PrivateRoute>
            }
          />
        </Routes>
        <Chatbot />
      </Router>
    </AuthProvider>
  );
}

export default App;
import { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      console.log('Attempting login to:', 'http://localhost:5000/api/auth/login');
      
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        email,
        password
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });
      
      console.log('Login response:', response.data);
      
      const { data } = response;
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data));
      setUser(data);
      toast.success('Login successful!');
      return true;
    } catch (error) {
      console.error('Login error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config
      });
      
      if (error.code === 'ERR_NETWORK') {
        toast.error('Cannot connect to server. Make sure backend is running on port 5000');
      } else if (error.response) {
        // The request was made and the server responded with a status code
        toast.error(error.response.data?.message || 'Login failed');
      } else if (error.request) {
        // The request was made but no response was received
        toast.error('No response from server. Check if backend is running');
      } else {
        // Something happened in setting up the request
        toast.error('Error: ' + error.message);
      }
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    toast.success('Logged out successfully');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
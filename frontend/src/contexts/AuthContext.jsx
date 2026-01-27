import { createContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/authApi';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await api.verifyToken();
        setUser(response.data.user);
      } catch (error) {
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };
    
    const token = localStorage.getItem('token');
    if (token) checkAuth();
    else setLoading(false);
  }, []);

  const login = async (credentials) => {
    const response = await api.login(credentials);
    localStorage.setItem('token', response.data.token);
    setUser(response.data.user);
    navigate('/dashboard');
  };

  const register = async (userData) => {
    const response = await api.register(userData);
    localStorage.setItem('token', response.data.token);
    setUser(response.data.user);
    navigate('/dashboard');
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
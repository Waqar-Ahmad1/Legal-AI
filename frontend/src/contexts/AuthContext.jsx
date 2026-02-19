import { createContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI as api } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const data = await api.validateToken();
        if (data.success) {
          setUser(data.data.user);
        } else {
          localStorage.removeItem('authToken');
          setUser(null);
        }
      } catch (error) {
        localStorage.removeItem('authToken');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    const token = localStorage.getItem('authToken');
    if (token) checkAuth();
    else setLoading(false);
  }, []);

  const login = async (credentials) => {
    const data = await api.login(credentials);
    if (data.success && data.data?.access_token) {
      localStorage.setItem('authToken', data.data.access_token);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      setUser(data.data.user);
      navigate('/try-it');
    }
    return data;
  };

  const register = async (userData) => {
    const data = await api.register(userData);
    if (data.success && data.data?.access_token) {
      localStorage.setItem('authToken', data.data.access_token);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      setUser(data.data.user);
      navigate('/try-it');
    }
    return data;
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
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
import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { 
  CircularProgress, 
  Box, 
  Typography,
  Paper,
  Container
} from '@mui/material';
import { 
  Security as SecurityIcon,
  ErrorOutline as ErrorIcon
} from '@mui/icons-material';

const ProtectedAdminRoute = ({ children }) => {
  const [authState, setAuthState] = useState('checking'); // 'checking', 'authenticated', 'unauthenticated'
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const validateAdminToken = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        
        if (!token) {
          setAuthState('unauthenticated');
          setLoading(false);
          return;
        }

        // Optional: Add backend token validation here for production
        // For now, we'll just check token existence
        // In production, you might want to verify the token with your backend
        
        setAuthState('authenticated');
        
      } catch (error) {
        console.error('Token validation error:', error);
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        setAuthState('unauthenticated');
      } finally {
        setLoading(false);
      }
    };

    validateAdminToken();
  }, [location]); // Revalidate when location changes

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
      }}>
        <CircularProgress size={60} thickness={4} sx={{ mb: 3, color: '#1a237e' }} />
        <Typography variant="h6" color="text.secondary">
          Verifying Admin Access...
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Please wait while we secure your session
        </Typography>
      </Box>
    );
  }

  // Show error page if token validation fails
  if (authState === 'unauthenticated') {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)',
        p: 3
      }}>
        <Container maxWidth="sm">
          <Paper elevation={8} sx={{ 
            p: 4, 
            textAlign: 'center',
            borderRadius: 3,
            background: 'rgba(255, 255, 255, 0.95)'
          }}>
            <ErrorIcon color="error" sx={{ fontSize: 60, mb: 2 }} />
            <Typography variant="h4" component="h1" gutterBottom color="error">
              Access Denied
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              You need administrator privileges to access this page.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              Please contact your system administrator or login with valid credentials.
            </Typography>
            <Navigate to="/admin/login" replace state={{ from: location }} />
          </Paper>
        </Container>
      </Box>
    );
  }

  // Render protected content if authenticated
  return children;
};

export default ProtectedAdminRoute;
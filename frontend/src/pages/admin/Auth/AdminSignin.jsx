import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../../../services/api';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Grid,
  Alert,
  IconButton,
  InputAdornment,
  CssBaseline
} from '@mui/material';
import {
  AdminPanelSettings as AdminPanelSettingsIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Security as SecurityIcon
} from '@mui/icons-material';

// API configuration
// Removed hardcoded API_BASE_URL to use central service

const AdminLogin = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [serverMessage, setServerMessage] = useState('');
  const navigate = useNavigate();

  // Email validation function
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validation function
  const validateForm = () => {
    const newErrors = {};

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    // Clear server message when user makes changes
    if (serverMessage) {
      setServerMessage('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerMessage('');

    // Validate form
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Prepare payload according to backend expectations
      const payload = {
        email: formData.email.trim().toLowerCase(),
        password: formData.password
      };

      console.log('Sending admin login request:', payload);

      const data = await authAPI.adminLogin(payload);

      console.log('Admin login response:', data);

      if (data.success) {
        const { access_token, admin, expires_in } = data.data;

        // Store admin authentication data
        if (access_token) {
          const expiryTime = Date.now() + (expires_in * 1000);
          localStorage.setItem('authToken', access_token);
          localStorage.setItem('adminToken', access_token); // Keep for legacy if needed, but standardizing on authToken
          localStorage.setItem('adminTokenExpiry', expiryTime.toString());
          localStorage.setItem('adminUser', JSON.stringify(admin));
        }

        setServerMessage({
          type: 'success',
          text: 'Admin login successful! Redirecting to dashboard...'
        });

        // Redirect to admin dashboard after successful login
        setTimeout(() => {
          navigate('/admin/dashboard', {
            state: {
              message: 'Welcome back!',
              admin: admin
            }
          });
        }, 1500);
      } else {
        setServerMessage({
          type: 'error',
          text: data.message || 'Admin login failed. Please try again.'
        });
      }

    } catch (error) {
      console.error('Admin login error:', error);

      let errorMessage = 'Admin login failed. Please try again.';

      if (error.data) {
        // Handle enhanced error from apiRequest
        const serverError = error.data;
        console.log('Server error response:', serverError);

        if (serverError.detail) {
          errorMessage = serverError.detail;
        } else if (serverError.message) {
          errorMessage = serverError.message;
        } else if (typeof serverError === 'string') {
          errorMessage = serverError;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      setServerMessage({
        type: 'error',
        text: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClickShowPassword = () => setShowPassword(!showPassword);

  // Helper function to display server messages
  const renderServerMessage = () => {
    if (!serverMessage) return null;

    return (
      <Alert
        severity={serverMessage.type}
        sx={{
          mb: 3,
          borderRadius: 2,
          boxShadow: 1
        }}
      >
        {serverMessage.text}
      </Alert>
    );
  };

  return (
    <>
      <CssBaseline />
      <Box sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        overflow: 'hidden',
        '&::-webkit-scrollbar': {
          display: 'none'
        },
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }}>
        <Grid container justifyContent="center" sx={{ overflow: 'hidden' }}>
          <Grid item xs={12} sm={8} md={6} lg={4} sx={{ overflow: 'hidden' }}>
            <Paper elevation={6} sx={{
              p: 4,
              borderRadius: 4,
              boxShadow: '0 15px 30px rgba(0, 0, 0, 0.1)',
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              transform: 'translateY(0)',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)'
              },
              overflow: 'hidden'
            }}>
              <Box textAlign="center" mb={3}>
                <AdminPanelSettingsIcon color="primary" sx={{
                  fontSize: 50,
                  background: 'linear-gradient(45deg, #3f51b5 30%, #2196f3 90%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }} />
                <Typography variant="h4" component="h1" gutterBottom sx={{
                  fontWeight: 700,
                  color: 'text.primary',
                  mt: 1
                }}>
                  Admin Login
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Access your LegalAI Administrator Account
                </Typography>
              </Box>

              {renderServerMessage()}

              <Box
                component="form"
                onSubmit={handleSubmit}
                sx={{ mt: 2 }}
                noValidate
              >
                <TextField
                  label="Email Address"
                  name="email"
                  variant="outlined"
                  fullWidth
                  margin="normal"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  error={!!errors.email}
                  helperText={errors.email}
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AdminPanelSettingsIcon color="action" />
                      </InputAdornment>
                    )
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '& fieldset': {
                        borderColor: 'rgba(0, 0, 0, 0.1)'
                      },
                      '&:hover fieldset': {
                        borderColor: 'primary.main'
                      }
                    }
                  }}
                  placeholder="admin@legalai.com"
                />

                <TextField
                  label="Password"
                  name="password"
                  variant="outlined"
                  fullWidth
                  margin="normal"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  error={!!errors.password}
                  helperText={errors.password}
                  required
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={handleClickShowPassword}
                          edge="end"
                          sx={{ color: 'text.secondary' }}
                        >
                          {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2
                    }
                  }}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  color="primary"
                  size="large"
                  disabled={loading}
                  sx={{
                    mt: 3,
                    mb: 2,
                    py: 1.5,
                    borderRadius: 2,
                    fontWeight: 600,
                    letterSpacing: 0.5,
                    background: 'linear-gradient(45deg, #3f51b5 30%, #2196f3 90%)',
                    boxShadow: '0 3px 5px 2px rgba(33, 150, 243, 0.1)',
                    '&:hover': {
                      boxShadow: '0 5px 10px 2px rgba(33, 150, 243, 0.2)'
                    },
                    '&:disabled': {
                      background: 'grey.300'
                    }
                  }}
                >
                  {loading ? 'Signing In...' : 'Admin Sign In'}
                </Button>
              </Box>

              <Box textAlign="center" sx={{ mt: 3 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                  Don't have an admin account?{' '}
                  <Link
                    to="/admin/signup"
                    style={{
                      color: '#3f51b5',
                      textDecoration: 'none',
                      fontWeight: 600
                    }}
                    onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                    onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                  >
                    Create Admin Account
                  </Link>
                </Typography>

                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                  <Link
                    to="/"
                    style={{
                      color: '#3f51b5',
                      textDecoration: 'none',
                      fontWeight: 600
                    }}
                    onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                    onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                  >
                    ← Back to Main Site
                  </Link>
                </Typography>

                <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
                  <SecurityIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                  Secure administrator access only
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </>
  );
};

export default AdminLogin;
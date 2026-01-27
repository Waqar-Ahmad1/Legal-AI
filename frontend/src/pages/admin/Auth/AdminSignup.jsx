import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
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
  HowToRegOutlined as HowToRegOutlinedIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Security as SecurityIcon
} from '@mui/icons-material';

// API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';
const ADMIN_SIGNUP_ENDPOINT = `${API_BASE_URL}/admin/signup`;

// Validation patterns
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const AdminSignup = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    secret_key: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [serverMessage, setServerMessage] = useState('');
  const navigate = useNavigate();

  // Email validation function
  const isValidEmail = (email) => {
    return EMAIL_REGEX.test(email);
  };

  // Validation function
  const validateForm = () => {
    const newErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters long';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    } else if (!/(?=.*[a-z])/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one lowercase letter';
    } else if (!/(?=.*[A-Z])/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter';
    } else if (!/(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one number';
    } else if (!/(?=.*[@$!%*?&])/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one special character';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Secret key validation
    if (!formData.secret_key) {
      newErrors.secret_key = 'Admin secret key is required';
    } else if (formData.secret_key.length < 8) {
      newErrors.secret_key = 'Secret key must be at least 8 characters long';
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
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        secret_key: formData.secret_key
      };

      console.log('Sending admin registration request:', { ...payload, secret_key: '***' });

      const response = await axios.post(ADMIN_SIGNUP_ENDPOINT, payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      });

      console.log('Admin registration response:', response.data);

      if (response.data.success) {
        setServerMessage({
          type: 'success',
          text: 'Admin account created successfully! Redirecting to login...'
        });
        
        // Redirect to admin login page after successful registration
        setTimeout(() => {
          navigate('/admin/signin', { 
            state: { 
              message: 'Admin account created successfully! Please login to continue.',
              email: formData.email 
            }
          });
        }, 2000);
      } else {
        setServerMessage({
          type: 'error',
          text: response.data.message || 'Admin registration failed. Please try again.'
        });
      }

    } catch (error) {
      console.error('Admin registration error:', error);
      
      let errorMessage = 'Admin registration failed. Please try again.';
      
      if (error.response) {
        // Server responded with error status
        const serverError = error.response.data;
        console.log('Server error response:', serverError);
        
        if (serverError.detail) {
          errorMessage = serverError.detail;
        } else if (serverError.message) {
          errorMessage = serverError.message;
        } else if (typeof serverError === 'string') {
          errorMessage = serverError;
        } else if (serverError.success === false) {
          errorMessage = serverError.message;
        }
      } else if (error.request) {
        // Request was made but no response received
        errorMessage = 'Unable to connect to server. Please check your connection.';
      } else {
        // Something else happened
        errorMessage = error.message || 'An unexpected error occurred.';
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
  const handleClickShowConfirmPassword = () => setShowConfirmPassword(!showConfirmPassword);
  const handleClickShowSecretKey = () => setShowSecretKey(!showSecretKey);

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
                <HowToRegOutlinedIcon color="primary" sx={{ 
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
                  Admin Registration
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Create your LegalAI Administrator Account
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
                  label="Full Name"
                  name="name"
                  variant="outlined"
                  fullWidth
                  margin="normal"
                  value={formData.name}
                  onChange={handleChange}
                  error={!!errors.name}
                  helperText={errors.name}
                  required
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
                />
                
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
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2
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
                  helperText={errors.password || 'Minimum 8 characters with uppercase, lowercase, number, and special character'}
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
                
                <TextField
                  label="Confirm Password"
                  name="confirmPassword"
                  variant="outlined"
                  fullWidth
                  margin="normal"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  error={!!errors.confirmPassword}
                  helperText={errors.confirmPassword}
                  required
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle confirm password visibility"
                          onClick={handleClickShowConfirmPassword}
                          edge="end"
                          sx={{ color: 'text.secondary' }}
                        >
                          {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
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
                
                <TextField
                  label="Admin Secret Key"
                  name="secret_key"
                  variant="outlined"
                  fullWidth
                  margin="normal"
                  type={showSecretKey ? "text" : "password"}
                  value={formData.secret_key}
                  onChange={handleChange}
                  error={!!errors.secret_key}
                  helperText={errors.secret_key || 'Enter the admin authorization key'}
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SecurityIcon color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle secret key visibility"
                          onClick={handleClickShowSecretKey}
                          edge="end"
                          sx={{ color: 'text.secondary' }}
                        >
                          {showSecretKey ? <VisibilityOffIcon /> : <VisibilityIcon />}
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
                  {loading ? 'Creating Admin Account...' : 'Create Admin Account'}
                </Button>
              </Box>

              <Box textAlign="center" sx={{ mt: 3 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Already have an admin account?{' '}
                  <Link 
                    to="/admin/signin" 
                    style={{ 
                      color: '#3f51b5',
                      textDecoration: 'none',
                      fontWeight: 600
                    }}
                    onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                    onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                  >
                    Sign In
                  </Link>
                </Typography>
                <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
                  <SecurityIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                  Administrator access requires proper authorization and verification.
                </Typography>
                <Button
                  component={Link}
                  to="/"
                  sx={{
                    mt: 2,
                    color: 'text.secondary',
                    textDecoration: 'none',
                    fontWeight: 500,
                    '&:hover': {
                      color: 'primary.main',
                      backgroundColor: 'rgba(63, 81, 181, 0.04)'
                    }
                  }}
                >
                  Back to Main Site
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </>
  );
};

export default AdminSignup;
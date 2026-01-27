import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Grid,
  Alert,
  Divider,
  IconButton,
  InputAdornment,
  CssBaseline,
  CircularProgress,
  styled
} from '@mui/material';
import {
  LockOutlined as LockOutlinedIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';

const ScrollbarFreeBox = styled(Box)(({ theme }) => ({
  width: '100%',
  height: '100vh',
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: theme.palette.background.default,
  '&::-webkit-scrollbar': { display: 'none' },
  msOverflowStyle: 'none',
  scrollbarWidth: 'none'
}));

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [serverMessage, setServerMessage] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  // Check for registration success message
  useEffect(() => {
    if (location.state?.message) {
      setServerMessage({
        type: 'success',
        text: location.state.message
      });
      
      // Pre-fill email if provided
      if (location.state.email) {
        setFormData(prev => ({
          ...prev,
          email: location.state.email
        }));
      }
    }
  }, [location.state]);

  // Hide navbar and footer on mount
  useEffect(() => {
    const navbar = document.querySelector('.navbar');
    const footer = document.querySelector('.footer');
    
    if (navbar) navbar.style.display = 'none';
    if (footer) footer.style.display = 'none';

    return () => {
      if (navbar) navbar.style.display = '';
      if (footer) footer.style.display = '';
    };
  }, []);

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
      const payload = {
        email: formData.email.trim().toLowerCase(),
        password: formData.password
      };

      console.log('Sending login request:', payload);

      const response = await axios.post("http://localhost:8000/login", payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      });

      console.log('Login response:', response.data);

      if (response.data.success) {
        // Store token and user data
        if (response.data.data?.access_token) {
          localStorage.setItem("token", response.data.data.access_token);
          localStorage.setItem("user", JSON.stringify(response.data.data.user));
          
          setServerMessage({
            type: 'success',
            text: 'Login successful! Redirecting...'
          });
          
          setTimeout(() => navigate("/try-it"), 1500);
        } else {
          setServerMessage({
            type: 'error',
            text: 'Login successful but missing token. Please contact support.'
          });
        }
      } else {
        setServerMessage({
          type: 'error',
          text: response.data.message || 'Login failed. Please try again.'
        });
      }

    } catch (error) {
      console.error('Login error:', error);
      
      let errorMessage = 'Login failed. Please try again.';
      
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
        } else if (serverError.data?.message) {
          errorMessage = serverError.data.message;
        } else if (error.response.status === 401) {
          errorMessage = 'Invalid email or password';
        } else if (error.response.status === 400) {
          errorMessage = 'Invalid request format';
        } else if (error.response.status === 422) {
          errorMessage = 'Validation error. Please check your input.';
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
      <ScrollbarFreeBox>
        <Grid container justifyContent="center" sx={{ px: 2 }}>
          <Grid item xs={12} sm={8} md={6} lg={4}>
            <Paper elevation={6} sx={{
              p: { xs: 3, sm: 4 },
              borderRadius: 4,
              boxShadow: '0 15px 30px rgba(0, 0, 0, 0.1)',
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)'
              }
            }}>
              <Box textAlign="center" mb={3}>
                <LockOutlinedIcon sx={{
                  fontSize: 50,
                  background: 'linear-gradient(45deg, #3f51b5 30%, #2196f3 90%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 1
                }} />
                <Typography variant="h4" component="h1" sx={{
                  fontWeight: 700,
                  color: 'text.primary',
                  mb: 1
                }}>
                  Sign In
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Access your LegalAI account
                </Typography>
              </Box>

              {renderServerMessage()}

              <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
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
                    mb: 2,
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
                  placeholder="example@domain.com"
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
                    mb: 2,
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
                    mt: 2,
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
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
                </Button>
              </Box>

              <Divider sx={{ my: 3 }} />

              <Box textAlign="center">
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Don't have an account?{' '}
                  <Link
                    to="/register"
                    style={{
                      color: '#3f51b5',
                      textDecoration: 'none',
                      fontWeight: 600
                    }}
                    onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                    onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                  >
                    Sign Up
                  </Link>
                </Typography>
                <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
                  <Link
                    to="/forgot-password"
                    style={{
                      color: '#3f51b5',
                      textDecoration: 'none',
                      fontWeight: 600
                    }}
                    onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                    onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                  >
                    Forgot password?
                  </Link>
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </ScrollbarFreeBox>
    </>
  );
};

export default Login;
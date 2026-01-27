import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  IconButton,
  Chip,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  AppBar,
  Toolbar,
  Menu,
  MenuItem,
  CircularProgress,
  Fade,
  Slide,
  Grow,
  Zoom,
  Container,
  alpha,
  useTheme,
  Paper
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  History as HistoryIcon,
  Logout as LogoutIcon,
  AccountCircle as AccountCircleIcon,
  Security as SecurityIcon,
  InsertDriveFile as DocumentIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Dataset as DatasetIcon,
  Schedule as ScheduleIcon,
  AutoAwesome as AutoAwesomeIcon,
  Person as PersonIcon,
  Storage as StorageIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

// Enhanced animation components
const Pulse = ({ children, duration = 2000 }) => (
  <Box
    sx={{
      animation: `pulse ${duration}ms ease-in-out infinite`,
      '@keyframes pulse': {
        '0%': { transform: 'scale(1)' },
        '50%': { transform: 'scale(1.05)' },
        '100%': { transform: 'scale(1)' },
      }
    }}
  >
    {children}
  </Box>
);

const Float = ({ children, duration = 3000 }) => (
  <Box
    sx={{
      animation: `float ${duration}ms ease-in-out infinite`,
      '@keyframes float': {
        '0%': { transform: 'translateY(0px)' },
        '50%': { transform: 'translateY(-10px)' },
        '100%': { transform: 'translateY(0px)' },
      }
    }}
  >
    {children}
  </Box>
);

const Shimmer = ({ width = '100%', height = '100%', borderRadius = 1 }) => (
  <Box
    sx={{
      width,
      height,
      borderRadius,
      background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
      '@keyframes shimmer': {
        '0%': { backgroundPosition: '-200% 0' },
        '100%': { backgroundPosition: '200% 0' },
      }
    }}
  />
);

const AdminDashboard = () => {
  const [adminData, setAdminData] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [trainingHistory, setTrainingHistory] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({
    total_users: 0,
    total_admins: 0,
    total_training_documents: 0,
    active_users: 0,
    recent_training_documents: 0,
    vector_store_documents: 0,
    system_status: 'operational',
    last_updated: null
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const navigate = useNavigate();
  const theme = useTheme();

  // Get auth token for API calls
  const getAuthHeaders = () => {
    const token = localStorage.getItem('adminToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const getDisplayName = (userData) => {
    if (!userData) return 'Admin';
    
    if (userData.name) {
      return userData.name;
    }
    
    if (userData.email) {
      const username = userData.email.split('@')[0];
      return username.replace(/[._]/g, ' ')
                    .replace(/\b\w/g, char => char.toUpperCase());
    }
    
    return 'Admin';
  };

  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    const adminUser = localStorage.getItem('adminUser');
    
    if (!adminToken || !adminUser) {
      navigate('/admin/signin');
      return;
    }

    try {
      const userData = JSON.parse(adminUser);
      setAdminData({ 
        ...userData,
        displayName: getDisplayName(userData),
        welcomeName: userData.name || getDisplayName(userData)
      });
    } catch (error) {
      setAdminData({ 
        email: adminUser,
        displayName: getDisplayName({ email: adminUser }),
        welcomeName: getDisplayName({ email: adminUser })
      });
    }
    
    fetchDashboardData();
  }, [navigate]);

  const fetchDashboardData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
        setStatsLoading(true);
        setHistoryLoading(true);
      }

      // Fetch dashboard statistics and training history in parallel
      await Promise.all([
        fetchDashboardStats(),
        fetchTrainingHistory()
      ]);
      
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load dashboard data. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setStatsLoading(false);
      setHistoryLoading(false);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/dashboard/stats`, {
        headers: getAuthHeaders()
      });
      
      if (response.data.success) {
        setDashboardStats(response.data.data);
      } else {
        throw new Error(response.data.message || 'Failed to fetch stats');
      }
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
      throw err;
    }
  };

  const fetchTrainingHistory = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/training/history`, {
        headers: getAuthHeaders()
      });
      
      if (response.data.success) {
        setTrainingHistory(response.data.data?.documents || []);
      } else {
        throw new Error(response.data.message || 'Failed to fetch training history');
      }
    } catch (err) {
      console.error('Failed to fetch training history:', err);
      throw err;
    }
  };

  const handleDeleteDocument = async (documentId, documentName) => {
    if (!window.confirm(`Are you sure you want to delete "${documentName}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(documentId);
    setError('');
    setSuccess('');

    try {
      const response = await axios.delete(`${API_BASE_URL}/admin/training/document/${documentId}`, {
        headers: getAuthHeaders()
      });
      
      if (response.data.success) {
        setSuccess(`Document "${documentName}" deleted successfully!`);
        // Remove the deleted document from local state
        setTrainingHistory(prev => prev.filter(doc => doc._id !== documentId));
        // Refresh dashboard stats
        fetchDashboardStats();
      } else {
        setError(response.data.message || 'Failed to delete document');
      }
    } catch (err) {
      console.error('Delete error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to delete document. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      const validTypes = ['.pdf', '.docx', '.doc', '.txt', '.md', '.json'];
      const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      
      if (!validTypes.includes(extension)) {
        setError('Please select a PDF, DOCX, DOC, TXT, MD, or JSON file');
        return;
      }

      if (file.size > 50 * 1024 * 1024) {
        setError('File size must be less than 50MB');
        return;
      }

      setSelectedFile(file);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('adminId', adminData?.id || 'admin_001');
      formData.append('adminName', adminData?.name || adminData?.displayName || 'Admin');

      const token = localStorage.getItem('adminToken');
      
      const response = await axios.post(`${API_BASE_URL}/admin/train`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        }
      });

      if (response.data.success) {
        setSuccess('Document uploaded and training started successfully!');
        setSelectedFile(null);
        setUploadProgress(0);
        
        // Refresh dashboard data after successful upload
        setTimeout(() => {
          fetchDashboardData(true);
        }, 1500);
      } else {
        setError(response.data.message || 'Training failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.message || err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    localStorage.removeItem('adminTokenExpiry');
    navigate('/admin/signin');
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'success';
      case 'processing': return 'warning';
      case 'training': return 'info';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return <SuccessIcon />;
      case 'processing': return <CircularProgress size={16} />;
      case 'training': return <CircularProgress size={16} />;
      case 'failed': return <ErrorIcon />;
      default: return <InfoIcon />;
    }
  };

  // Loading skeleton components
  const StatsSkeleton = () => (
    <Grid container spacing={3}>
      {[1, 2, 3, 4].map((item) => (
        <Grid item xs={12} sm={6} key={item}>
          <Card sx={{ height: '100%', borderRadius: 3, overflow: 'hidden' }}>
            <CardContent sx={{ p: 4 }}>
              <Shimmer width={40} height={40} borderRadius={2} sx={{ mb: 2 }} />
              <Shimmer width="60%" height={32} sx={{ mb: 1 }} />
              <Shimmer width="40%" height={24} />
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  const HistorySkeleton = () => (
    <Box>
      {[1, 2, 3, 4, 5].map((item) => (
        <Box key={item} sx={{ mb: 2, p: 2, borderRadius: 2, background: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Shimmer width={40} height={40} borderRadius={1} />
            <Box sx={{ flex: 1 }}>
              <Shimmer width="70%" height={20} sx={{ mb: 1 }} />
              <Shimmer width="40%" height={16} />
            </Box>
            <Shimmer width={80} height={32} borderRadius={16} />
          </Box>
        </Box>
      ))}
    </Box>
  );

  if (loading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}
      >
        <Fade in={true} timeout={1000}>
          <Box sx={{ textAlign: 'center' }}>
            <Float>
              <CircularProgress 
                size={80} 
                thickness={4}
                sx={{ 
                  color: 'white',
                  mb: 3
                }} 
              />
            </Float>
            <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold', mb: 1 }}>
              LegalAI Dashboard
            </Typography>
            <Typography variant="h6" sx={{ color: 'white', opacity: 0.9 }}>
              Loading your data...
            </Typography>
          </Box>
        </Fade>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      flexGrow: 1, 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      backgroundAttachment: 'fixed'
    }}>
      {/* Enhanced App Bar */}
      <Slide direction="down" in={true} timeout={800}>
        <AppBar position="static" sx={{ 
          background: 'linear-gradient(45deg, #1a237e 0%, #3949ab 50%, #5c6bc0 100%)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          backdropFilter: 'blur(10px)'
        }}>
          <Toolbar>
            <Float>
              <AutoAwesomeIcon sx={{ mr: 2, fontSize: 32 }} />
            </Float>
            <Typography variant="h5" component="div" sx={{ 
              flexGrow: 1, 
              fontWeight: 'bold',
              background: 'linear-gradient(45deg, #ffffff, #e3f2fd)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent'
            }}>
              LegalAI Admin Dashboard
            </Typography>
            
            <IconButton
              color="inherit"
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{ 
                transition: 'all 0.3s ease-in-out',
                '&:hover': { 
                  transform: 'scale(1.1)',
                  background: alpha('#fff', 0.1)
                }
              }}
            >
              <Pulse>
                <AccountCircleIcon />
              </Pulse>
              <Typography variant="body1" sx={{ ml: 1, fontWeight: 'medium' }}>
                {adminData?.displayName || 'Admin'}
              </Typography>
            </IconButton>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
              TransitionComponent={Fade}
              sx={{
                '& .MuiPaper-root': {
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                  borderRadius: 2
                }
              }}
            >
              <MenuItem onClick={handleLogout} sx={{ py: 1.5 }}>
                <LogoutIcon sx={{ mr: 2, color: 'error.main' }} />
                <Typography variant="body2" fontWeight="medium">
                  Logout
                </Typography>
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>
      </Slide>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Welcome Section */}
        <Fade in={true} timeout={1000}>
          <Card sx={{ 
            mb: 6, 
            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
            borderRadius: 4,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(45deg, #1a237e, #3949ab, #5c6bc0)'
            }
          }}>
            <CardContent sx={{ p: 5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Pulse>
                  <AutoAwesomeIcon sx={{ 
                    fontSize: 48, 
                    mr: 3,
                    background: 'linear-gradient(45deg, #1a237e, #3949ab)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    color: 'transparent'
                  }} />
                </Pulse>
                <Box>
                  <Typography variant="h2" gutterBottom sx={{ 
                    fontWeight: 'bold',
                    background: 'linear-gradient(45deg, #1a237e, #3949ab)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    color: 'transparent',
                    mb: 1
                  }}>
                    Welcome back, {adminData?.welcomeName}!
                  </Typography>
                  <Typography variant="h6" color="text.secondary" sx={{ opacity: 0.8, mb: 1 }}>
                    Manage your LegalAI knowledge base and monitor training activities in real-time.
                  </Typography>
                  <Chip 
                    icon={<StorageIcon />}
                    label={`Database: ${dashboardStats.system_status || 'Connected'} • Vector Store: ${dashboardStats.vector_store_documents || 0} documents`}
                    variant="outlined"
                    size="small"
                    sx={{ 
                      background: alpha(theme.palette.primary.main, 0.1),
                      borderColor: alpha(theme.palette.primary.main, 0.2)
                    }}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Fade>

        {/* Update Knowledge Base Section */}
        <Grow in={true} timeout={1200}>
          <Card sx={{ 
            mb: 6,
            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
            borderRadius: 4,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            overflow: 'visible',
            position: 'relative'
          }}>
            <CardContent sx={{ p: 5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                <Float>
                  <UploadIcon sx={{ 
                    fontSize: 40, 
                    mr: 3,
                    color: 'primary.main'
                  }} />
                </Float>
                <Box>
                  <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Update Knowledge Base
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Upload legal documents to train and improve your AI chatbot
                  </Typography>
                </Box>
              </Box>

              {error && (
                <Zoom in={true}>
                  <Alert 
                    severity="error" 
                    sx={{ 
                      mb: 3, 
                      borderRadius: 3,
                      boxShadow: '0 4px 20px rgba(244, 67, 54, 0.1)'
                    }}
                    action={
                      <IconButton size="small" onClick={() => setError('')}>
                        <ErrorIcon />
                      </IconButton>
                    }
                  >
                    {error}
                  </Alert>
                </Zoom>
              )}

              {success && (
                <Zoom in={true}>
                  <Alert 
                    severity="success" 
                    sx={{ 
                      mb: 3, 
                      borderRadius: 3,
                      boxShadow: '0 4px 20px rgba(76, 175, 80, 0.1)'
                    }}
                    action={
                      <IconButton size="small" onClick={() => setSuccess('')}>
                        <SuccessIcon />
                      </IconButton>
                    }
                  >
                    {success}
                  </Alert>
                </Zoom>
              )}

              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 3, 
                flexWrap: 'wrap', 
                mb: 4,
                p: 4,
                background: alpha(theme.palette.primary.main, 0.02),
                borderRadius: 3,
                border: `2px dashed ${alpha(theme.palette.primary.main, 0.2)}`
              }}>
                <Button
                  variant="contained"
                  component="label"
                  startIcon={<UploadIcon />}
                  disabled={uploading}
                  sx={{ 
                    borderRadius: 3,
                    px: 4,
                    py: 2,
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    background: 'linear-gradient(45deg, #1a237e, #3949ab)',
                    boxShadow: '0 8px 25px rgba(26, 35, 126, 0.3)',
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 12px 35px rgba(26, 35, 126, 0.4)',
                      background: 'linear-gradient(45deg, #151c6e, #303f9f)'
                    },
                    '&:disabled': {
                      background: '#e0e0e0',
                      boxShadow: 'none'
                    }
                  }}
                >
                  Select Legal Document
                  <input
                    type="file"
                    hidden
                    accept=".pdf,.docx,.doc,.txt,.md,.json"
                    onChange={handleFileSelect}
                  />
                </Button>

                {selectedFile && (
                  <Fade in={true}>
                    <Chip
                      icon={<DocumentIcon />}
                      label={`${selectedFile.name} (${formatFileSize(selectedFile.size)})`}
                      onDelete={() => setSelectedFile(null)}
                      color="primary"
                      variant="filled"
                      sx={{ 
                        borderRadius: 2,
                        px: 2,
                        py: 2,
                        fontSize: '0.9rem',
                        background: alpha(theme.palette.primary.main, 0.1),
                        color: theme.palette.primary.main,
                        fontWeight: 'medium'
                      }}
                    />
                  </Fade>
                )}
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <SecurityIcon />}
                  onClick={handleUpload}
                  disabled={!selectedFile || uploading}
                  sx={{ 
                    borderRadius: 3,
                    px: 5,
                    py: 1.5,
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    background: 'linear-gradient(45deg, #00c853, #64dd17)',
                    boxShadow: '0 8px 25px rgba(0, 200, 83, 0.3)',
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 12px 35px rgba(0, 200, 83, 0.4)',
                      background: 'linear-gradient(45deg, #00b248, #4caf00)'
                    },
                    '&:disabled': {
                      background: '#e0e0e0',
                      boxShadow: 'none'
                    }
                  }}
                >
                  {uploading ? `Training AI Model... ${uploadProgress}%` : 'Train AI Chatbot'}
                </Button>

                <Button
                  variant="outlined"
                  onClick={() => fetchDashboardData(true)}
                  disabled={refreshing}
                  startIcon={refreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
                  sx={{ 
                    borderRadius: 3,
                    px: 3,
                    py: 1.5
                  }}
                >
                  {refreshing ? 'Refreshing...' : 'Refresh Data'}
                </Button>
              </Box>

              {uploading && (
                <Fade in={true}>
                  <Box sx={{ mt: 4 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={uploadProgress} 
                      sx={{ 
                        height: 12, 
                        borderRadius: 6,
                        background: alpha(theme.palette.primary.main, 0.1),
                        '& .MuiLinearProgress-bar': {
                          background: 'linear-gradient(45deg, #1a237e, #3949ab)',
                          borderRadius: 6,
                          animation: 'pulse 2s ease-in-out infinite'
                        }
                      }}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'text.secondary' }}>
                        Uploading to LegalAI Database...
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                        {uploadProgress}% Complete
                      </Typography>
                    </Box>
                  </Box>
                </Fade>
              )}
            </CardContent>
          </Card>
        </Grow>

        {/* Stats and History Grid */}
        <Grid container spacing={4}>
          {/* Statistics Cards */}
          <Grid item xs={12} lg={8}>
            {statsLoading ? (
              <StatsSkeleton />
            ) : (
              <Grid container spacing={3}>
                {[
                  {
                    icon: <PersonIcon sx={{ fontSize: 32 }} />,
                    title: 'Total Users',
                    value: dashboardStats.total_users || 0,
                    subtitle: 'Registered Users',
                    color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    delay: 0
                  },
                  {
                    icon: <SecurityIcon sx={{ fontSize: 32 }} />,
                    title: 'Total Admins',
                    value: dashboardStats.total_admins || 0,
                    subtitle: 'Administrators',
                    color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                    delay: 200
                  },
                  {
                    icon: <DatasetIcon sx={{ fontSize: 32 }} />,
                    title: 'Training Documents',
                    value: dashboardStats.total_training_documents || 0,
                    subtitle: 'Uploaded Documents',
                    color: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                    delay: 400
                  },
                  {
                    icon: <TrendingUpIcon sx={{ fontSize: 32 }} />,
                    title: 'Active Users',
                    value: dashboardStats.active_users || 0,
                    subtitle: 'Last 30 Days',
                    color: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                    delay: 600
                  }
                ].map((stat, index) => (
                  <Grid item xs={12} sm={6} key={stat.title}>
                    <Slide direction="up" in={true} timeout={800 + stat.delay}>
                      <Card sx={{ 
                        height: '100%',
                        background: stat.color,
                        color: 'white',
                        borderRadius: 3,
                        boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
                        transition: 'all 0.3s ease-in-out',
                        position: 'relative',
                        overflow: 'hidden',
                        '&:hover': {
                          transform: 'translateY(-8px)',
                          boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
                        },
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background: 'linear-gradient(45deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
                          opacity: 0,
                          transition: 'opacity 0.3s ease-in-out'
                        },
                        '&:hover::before': {
                          opacity: 1
                        }
                      }}>
                        <CardContent sx={{ p: 4, position: 'relative', zIndex: 1 }}>
                          <Float>
                            {stat.icon}
                          </Float>
                          <Typography variant="h2" component="div" sx={{ 
                            fontWeight: 'bold', 
                            mb: 1,
                            textShadow: '0 2px 10px rgba(0,0,0,0.2)'
                          }}>
                            {stat.value}
                          </Typography>
                          <Typography variant="h6" sx={{ 
                            opacity: 0.9,
                            mb: 0.5
                          }}>
                            {stat.title}
                          </Typography>
                          <Typography variant="body2" sx={{ 
                            opacity: 0.8
                          }}>
                            {stat.subtitle}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Slide>
                  </Grid>
                ))}
              </Grid>
            )}
          </Grid>

          {/* Recent Training & Vector Store Stats */}
          <Grid item xs={12} lg={4}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Slide direction="right" in={true} timeout={1000}>
                  <Card sx={{ 
                    height: '100%',
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    color: 'white',
                    borderRadius: 3,
                    boxShadow: '0 12px 40px rgba(240, 147, 251, 0.3)',
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 16px 45px rgba(240, 147, 251, 0.4)'
                    }
                  }}>
                    <CardContent sx={{ p: 4, textAlign: 'center' }}>
                      <Pulse>
                        <ScheduleIcon sx={{ fontSize: 48, mb: 3, opacity: 0.9 }} />
                      </Pulse>
                      <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', mb: 2 }}>
                        {dashboardStats.recent_training_documents || 0}
                      </Typography>
                      <Typography variant="h6" sx={{ opacity: 0.9, mb: 1 }}>
                        Recent Training Documents
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>
                        Last 7 Days
                      </Typography>
                    </CardContent>
                  </Card>
                </Slide>
              </Grid>

              <Grid item xs={12}>
                <Slide direction="right" in={true} timeout={1200}>
                  <Card sx={{ 
                    height: '100%',
                    background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
                    color: 'white',
                    borderRadius: 3,
                    boxShadow: '0 12px 40px rgba(255, 154, 158, 0.3)',
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 16px 45px rgba(255, 154, 158, 0.4)'
                    }
                  }}>
                    <CardContent sx={{ p: 4, textAlign: 'center' }}>
                      <Float>
                        <StorageIcon sx={{ fontSize: 48, mb: 3, opacity: 0.9 }} />
                      </Float>
                      <Typography variant="h2" component="div" sx={{ fontWeight: 'bold', mb: 2 }}>
                        {dashboardStats.vector_store_documents || 0}
                      </Typography>
                      <Typography variant="h6" sx={{ opacity: 0.9 }}>
                        Vector Store Documents
                      </Typography>
                    </CardContent>
                  </Card>
                </Slide>
              </Grid>
            </Grid>
          </Grid>
        </Grid>

        {/* Training History Section */}
        <Grow in={true} timeout={1400}>
          <Card sx={{ 
            mt: 4,
            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
            borderRadius: 4,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
          }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Pulse>
                    <HistoryIcon sx={{ 
                      fontSize: 40, 
                      mr: 3,
                      color: 'primary.main'
                    }} />
                  </Pulse>
                  <Box>
                    <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                      Training History
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      Recent AI model training sessions and document uploads
                    </Typography>
                  </Box>
                </Box>
                <IconButton 
                  onClick={() => fetchDashboardData(true)}
                  disabled={refreshing}
                  sx={{ 
                    transition: 'all 0.3s ease-in-out',
                    background: alpha(theme.palette.primary.main, 0.1),
                    '&:hover': { 
                      transform: 'rotate(180deg)',
                      background: alpha(theme.palette.primary.main, 0.2)
                    }
                  }}
                >
                  {refreshing ? <CircularProgress size={24} /> : <RefreshIcon />}
                </IconButton>
              </Box>

              {historyLoading ? (
                <HistorySkeleton />
              ) : trainingHistory.length === 0 ? (
                <Fade in={true}>
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <HistoryIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 3, opacity: 0.3 }} />
                    <Typography variant="h5" color="text.secondary" gutterBottom sx={{ fontWeight: 'medium' }}>
                      No Training History Yet
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
                      Upload your first legal document to start training your AI chatbot and see the history here.
                    </Typography>
                    <Button 
                      variant="contained" 
                      startIcon={<UploadIcon />}
                      onClick={() => document.querySelector('input[type="file"]')?.click()}
                      sx={{ borderRadius: 3, px: 4, py: 1.5 }}
                    >
                      Upload First Document
                    </Button>
                  </Box>
                </Fade>
              ) : (
                <TableContainer component={Paper} sx={{ 
                  borderRadius: 3,
                  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  background: 'white',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
                }}>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ 
                        background: 'linear-gradient(45deg, #f8f9fa, #ffffff)',
                        '& th': {
                          fontWeight: 'bold',
                          fontSize: '0.95rem',
                          py: 3,
                          borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`
                        }
                      }}>
                        <TableCell>Document</TableCell>
                        <TableCell>Upload Date</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Size</TableCell>
                        <TableCell>Uploaded By</TableCell>
                        <TableCell>Processing Time</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {trainingHistory.slice(0, 8).map((item, index) => (
                        <Fade in={true} timeout={(index + 1) * 200} key={item._id || index}>
                          <TableRow 
                            hover 
                            sx={{ 
                              transition: 'all 0.3s ease-in-out',
                              '&:hover': {
                                background: alpha(theme.palette.primary.main, 0.02),
                                transform: 'translateX(4px)'
                              },
                              '&:last-child td': { border: 0 }
                            }}
                          >
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <DocumentIcon sx={{ mr: 2, color: 'primary.main', fontSize: 24 }} />
                                <Box>
                                  <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                                    {item.documentName}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {item.documentType || 'Legal Document'} • {item.chunkCount || 0} chunks
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                {formatDate(item.uploadDate)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                icon={getStatusIcon(item.status)}
                                label={item.status || 'Unknown'}
                                color={getStatusColor(item.status)}
                                sx={{ 
                                  fontWeight: 'bold',
                                  borderRadius: 2
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                {formatFileSize(item.fileSize)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                {item.adminName || item.adminEmail || 'System'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'success.main' }}>
                                {item.processingTime || 'N/A'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <IconButton
                                onClick={() => handleDeleteDocument(item._id, item.documentName)}
                                disabled={deletingId === item._id}
                                color="error"
                                sx={{
                                  transition: 'all 0.3s ease-in-out',
                                  '&:hover': {
                                    transform: 'scale(1.1)',
                                    backgroundColor: alpha(theme.palette.error.main, 0.1)
                                  }
                                }}
                              >
                                {deletingId === item._id ? (
                                  <CircularProgress size={20} />
                                ) : (
                                  <DeleteIcon />
                                )}
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        </Fade>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {trainingHistory.length > 0 && (
                <Box sx={{ textAlign: 'center', mt: 3 }}>
                  <Button 
                    variant="outlined"
                    onClick={() => setHistoryDialogOpen(true)}
                    sx={{ 
                      borderRadius: 3,
                      px: 4,
                      py: 1.5,
                      fontWeight: 'bold'
                    }}
                  >
                    View Complete Training History ({trainingHistory.length} records)
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grow>
      </Container>

      {/* Enhanced Full History Dialog */}
      <Dialog 
        open={historyDialogOpen} 
        onClose={() => setHistoryDialogOpen(false)}
        maxWidth="xl"
        fullWidth
        TransitionComponent={Slide}
        transitionDuration={500}
        PaperProps={{
          sx: {
            borderRadius: 4,
            boxShadow: '0 25px 80px rgba(0,0,0,0.2)',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
            minHeight: '80vh'
          }
        }}
      >
        <DialogTitle sx={{ 
          background: 'linear-gradient(45deg, #1a237e 0%, #3949ab 100%)',
          color: 'white',
          py: 3
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <HistoryIcon sx={{ mr: 2, fontSize: 32 }} />
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                  Complete Training History
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  LegalAI Database • {trainingHistory.length} records
                </Typography>
              </Box>
            </Box>
            <Chip 
              label="Live Data" 
              size="small" 
              sx={{ 
                background: 'rgba(255,255,255,0.2)', 
                color: 'white',
                fontWeight: 'bold'
              }} 
            />
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <TableContainer sx={{ maxHeight: '60vh' }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow sx={{ 
                  background: 'linear-gradient(45deg, #f8f9fa, #ffffff)',
                  '& th': {
                    fontWeight: 'bold',
                    py: 3,
                    fontSize: '0.95rem',
                    background: 'transparent',
                    borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`
                  }
                }}>
                  <TableCell>Document Name</TableCell>
                  <TableCell>Upload Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>File Size</TableCell>
                  <TableCell>Processing Time</TableCell>
                  <TableCell>Chunk Count</TableCell>
                  <TableCell>Uploaded By</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {trainingHistory.map((item, index) => (
                  <TableRow 
                    key={item._id || index} 
                    hover
                    sx={{ 
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        background: alpha(theme.palette.primary.main, 0.02)
                      }
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <DocumentIcon sx={{ mr: 2, color: 'primary.main' }} />
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {item.documentName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.documentType || 'Legal Document'}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(item.uploadDate)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={item.status || 'Unknown'}
                        color={getStatusColor(item.status)}
                        size="small"
                        sx={{ fontWeight: 'bold' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {formatFileSize(item.fileSize)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="success.main" fontWeight="medium">
                        {item.processingTime || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={`${item.chunkCount || 0} chunks`}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {item.adminName || item.adminEmail || 'System'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <IconButton
                        onClick={() => handleDeleteDocument(item._id, item.documentName)}
                        disabled={deletingId === item._id}
                        color="error"
                        size="small"
                        sx={{
                          transition: 'all 0.3s ease-in-out',
                          '&:hover': {
                            transform: 'scale(1.1)',
                            backgroundColor: alpha(theme.palette.error.main, 0.1)
                          }
                        }}
                      >
                        {deletingId === item._id ? (
                          <CircularProgress size={16} />
                        ) : (
                          <DeleteIcon />
                        )}
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions sx={{ p: 3, background: alpha(theme.palette.primary.main, 0.02) }}>
          <Button 
            onClick={() => setHistoryDialogOpen(false)}
            variant="contained"
            sx={{ 
              borderRadius: 3,
              px: 4,
              py: 1,
              fontWeight: 'bold'
            }}
          >
            Close History
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminDashboard;
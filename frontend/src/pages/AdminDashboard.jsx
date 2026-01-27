import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Typography,
  Paper,
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
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Tooltip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  AppBar,
  Toolbar,
  Menu,
  MenuItem,
  Badge
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  CloudUpload as UploadIcon,
  History as HistoryIcon,
  Logout as LogoutIcon,
  AccountCircle as AccountIcon,
  Security as SecurityIcon,
  FilePresent as FileIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  InsertDriveFile as DocumentIcon,
  Schedule as ScheduleIcon,
  DataUsage as AnalyticsIcon,
  People as UsersIcon,
  Notifications as NotificationsIcon,
  Menu as MenuIcon
} from '@mui/icons-material';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

const AdminDashboard = () => {
  const [adminData, setAdminData] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [trainingHistory, setTrainingHistory] = useState([]);
  const [stats, setStats] = useState({
    totalDocuments: 0,
    totalUsers: 0,
    lastTraining: null,
    activeModels: 0
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Check admin authentication
  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    const adminUser = localStorage.getItem('adminUser');
    
    if (!adminToken || !adminUser) {
      navigate('/admin/login');
      return;
    }

    setAdminData({ username: adminUser });
    fetchDashboardData();
  }, [navigate]);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const [historyRes, statsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/admin/training-history`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_BASE_URL}/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setTrainingHistory(historyRes.data.history || []);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      if (err.response?.status === 401) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      const validTypes = ['.pdf', '.docx', '.doc', '.txt', '.md'];
      const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      
      if (!validTypes.includes(extension)) {
        setError('Please select a PDF, DOCX, DOC, TXT, or MD file');
        return;
      }

      if (file.size > 50 * 1024 * 1024) { // 50MB limit
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

    const formData = new FormData();
    formData.append('document', selectedFile);
    formData.append('filename', selectedFile.name);

    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.post(`${API_BASE_URL}/admin/train`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        }
      });

      setSuccess('File uploaded successfully! Training in progress...');
      setSelectedFile(null);
      setUploadDialogOpen(false);
      setUploadProgress(0);
      
      // Refresh data
      setTimeout(() => fetchDashboardData(), 2000);
    } catch (err) {
      console.error('Upload failed:', err);
      setError(err.response?.data?.detail || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/admin/login');
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'success';
      case 'processing': return 'warning';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
      {/* App Bar */}
      <AppBar position="static" sx={{ background: 'linear-gradient(45deg, #1a237e 30%, #3949ab 90%)' }}>
        <Toolbar>
          <DashboardIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            LegalAI Admin Dashboard
          </Typography>
          
          <Tooltip title="Notifications">
            <IconButton color="inherit">
              <Badge badgeContent={4} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          <IconButton
            color="inherit"
            onClick={(e) => setAnchorEl(e.currentTarget)}
          >
            <AccountCircleIcon />
            <Typography variant="body2" sx={{ ml: 1 }}>
              {adminData?.username}
            </Typography>
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
          >
            <MenuItem onClick={() => setAnchorEl(null)}>
              <AccountIcon sx={{ mr: 2 }} />
              Profile
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <LogoutIcon sx={{ mr: 2 }} />
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 3 }}>
        {/* Welcome Card */}
        <Card sx={{ mb: 3, background: 'linear-gradient(45deg, #ffffff 30%, #f8f9fa 90%)' }}>
          <CardContent>
            <Typography variant="h4" gutterBottom>
              Welcome back, {adminData?.username}!
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage your LegalAI knowledge base and monitor training activities.
            </Typography>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <FileIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" component="div">
                  {stats.totalDocuments}
                </Typography>
                <Typography color="text.secondary">
                  Total Documents
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <UsersIcon color="secondary" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" component="div">
                  {stats.totalUsers}
                </Typography>
                <Typography color="text.secondary">
                  Total Users
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <AnalyticsIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" component="div">
                  {stats.activeModels}
                </Typography>
                <Typography color="text.secondary">
                  Active Models
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <ScheduleIcon color="warning" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h6" component="div">
                  {stats.lastTraining ? formatDate(stats.lastTraining) : 'Never'}
                </Typography>
                <Typography color="text.secondary">
                  Last Training
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Action Section */}
        <Grid container spacing={3}>
          {/* Upload Section */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <UploadIcon color="primary" sx={{ mr: 2, fontSize: 30 }} />
                  <Typography variant="h5">
                    Update Knowledge Base
                  </Typography>
                </Box>

                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}

                {success && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    {success}
                  </Alert>
                )}

                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<CloudUploadIcon />}
                  disabled={uploading}
                  sx={{ mb: 2 }}
                >
                  Select Legal Document
                  <input
                    type="file"
                    hidden
                    accept=".pdf,.docx,.doc,.txt,.md"
                    onChange={handleFileSelect}
                  />
                </Button>

                {selectedFile && (
                  <Box sx={{ mb: 2 }}>
                    <Chip
                      icon={<DocumentIcon />}
                      label={`${selectedFile.name} (${formatFileSize(selectedFile.size)})`}
                      onDelete={() => setSelectedFile(null)}
                      color="primary"
                      variant="outlined"
                    />
                  </Box>
                )}

                <Button
                  variant="contained"
                  startIcon={uploading ? <CircularProgress size={20} /> : <SecurityIcon />}
                  onClick={handleUpload}
                  disabled={!selectedFile || uploading}
                  sx={{ 
                    background: 'linear-gradient(45deg, #1a237e 30%, #3949ab 90%)',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #151c6e 30%, #303f9f 90%)'
                    }
                  }}
                >
                  {uploading ? 'Training...' : 'Train Chatbot'}
                </Button>

                {uploading && (
                  <Box sx={{ mt: 2 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={uploadProgress} 
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                    <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
                      {uploadProgress}% Complete
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Recent Activity */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <HistoryIcon color="primary" sx={{ mr: 2, fontSize: 30 }} />
                    <Typography variant="h5">
                      Training History
                    </Typography>
                  </Box>
                  <Tooltip title="Refresh">
                    <IconButton onClick={fetchDashboardData}>
                      <RefreshIcon />
                    </IconButton>
                  </Tooltip>
                </Box>

                {trainingHistory.length === 0 ? (
                  <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    No training history yet. Upload a document to get started!
                  </Typography>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Document</TableCell>
                          <TableCell>Date</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Size</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {trainingHistory.slice(0, 5).map((item, index) => (
                          <TableRow key={index} hover>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <DocumentIcon sx={{ mr: 1, color: 'text.secondary' }} />
                                <Typography variant="body2">
                                  {item.documentName}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {formatDate(item.uploadDate)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                icon={item.status === 'completed' ? <SuccessIcon /> : <ErrorIcon />}
                                label={item.status}
                                color={getStatusColor(item.status)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {formatFileSize(item.fileSize || 0)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}

                {trainingHistory.length > 5 && (
                  <Button 
                    fullWidth 
                    sx={{ mt: 2 }}
                    onClick={() => setUploadDialogOpen(true)}
                  >
                    View All ({trainingHistory.length})
                  </Button>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Full History Dialog */}
      <Dialog 
        open={uploadDialogOpen} 
        onClose={() => setUploadDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <HistoryIcon sx={{ mr: 2 }} />
            Complete Training History
          </Box>
        </DialogTitle>
        <DialogContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Document</TableCell>
                  <TableCell>Upload Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Size</TableCell>
                  <TableCell>Admin</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {trainingHistory.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.documentName}</TableCell>
                    <TableCell>{formatDate(item.uploadDate)}</TableCell>
                    <TableCell>
                      <Chip
                        label={item.status}
                        color={getStatusColor(item.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{formatFileSize(item.fileSize || 0)}</TableCell>
                    <TableCell>{item.adminEmail}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminDashboard;
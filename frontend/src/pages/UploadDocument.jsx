import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  TextField,
  Paper,
  LinearProgress,
  Alert,
  InputAdornment,
  IconButton
} from '@mui/material';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import api from '../api/documentApi';
// import './UploadDocument.scss';

const UploadDocument = () => {
  const [file, setFile] = useState(null);
  const [documentName, setDocumentName] = useState('');
  const [description, setDescription] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!documentName) {
        setDocumentName(selectedFile.name.split('.')[0]);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    if (!file) {
      setError('Please select a file to upload');
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('document', file);
    formData.append('name', documentName);
    formData.append('description', description);

    try {
      const config = {
        onUploadProgress: progressEvent => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        }
      };

      const response = await api.uploadDocument(formData, config);
      setSuccess('Document uploaded successfully!');
      setTimeout(() => {
        navigate(`/documents/${response.data._id}`);
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Box className="upload-page">
      <Card elevation={3}>
        <CardContent>
          <Typography variant="h4" gutterBottom>
            Upload Legal Document
          </Typography>
          <Typography variant="body1" color="textSecondary" paragraph>
            Upload contracts, court filings, or other legal documents for analysis
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

          <form onSubmit={handleSubmit}>
            <Box mb={3}>
              <input
                accept=".pdf,.doc,.docx,.txt"
                style={{ display: 'none' }}
                id="document-upload"
                type="file"
                onChange={handleFileChange}
              />
              <label htmlFor="document-upload">
                <Button
                  component="span"
                  variant="outlined"
                  color="primary"
                  startIcon={<CloudUploadOutlinedIcon />}
                  fullWidth
                  sx={{ py: 3 }}
                >
                  {file ? file.name : 'Select Document'}
                </Button>
              </label>
              {uploadProgress > 0 && uploadProgress < 100 && (
                <LinearProgress 
                  variant="determinate" 
                  value={uploadProgress} 
                  sx={{ mt: 1 }}
                />
              )}
            </Box>

            {file && (
              <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: 'grey.100' }}>
                <Box display="flex" alignItems="center">
                  <DescriptionOutlinedIcon color="primary" sx={{ mr: 2 }} />
                  <Typography variant="body1" sx={{ flexGrow: 1 }}>
                    {file.name} ({Math.round(file.size / 1024)} KB)
                  </Typography>
                  <IconButton onClick={() => setFile(null)}>
                    <CloseOutlinedIcon />
                  </IconButton>
                </Box>
              </Paper>
            )}

            <TextField
              label="Document Name"
              variant="outlined"
              fullWidth
              margin="normal"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    {documentName.length}/50
                  </InputAdornment>
                )
              }}
              inputProps={{ maxLength: 50 }}
            />

            <TextField
              label="Description (Optional)"
              variant="outlined"
              fullWidth
              margin="normal"
              multiline
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    {description.length}/200
                  </InputAdornment>
                )
              }}
              inputProps={{ maxLength: 200 }}
            />

            <Box mt={4}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                disabled={loading || !file}
                fullWidth
                startIcon={<CloudUploadOutlinedIcon />}
              >
                {loading ? 'Uploading...' : 'Upload & Analyze'}
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default UploadDocument;
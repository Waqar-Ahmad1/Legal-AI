import React from 'react';
import {
    Box,
    Typography,
    Button,
    Chip,
    Paper
} from '@mui/material';
import { styled, alpha } from '@mui/material/styles';
import {
    CloudUpload as UploadIcon,
    InsertDriveFile as DocumentIcon,
    Security as SecurityIcon,
    AutoAwesome,
    Info
} from '@mui/icons-material';

const glassBox = {
    background: alpha('#1e293b', 0.5),
    backdropFilter: 'blur(12px)',
    border: `1px solid ${alpha('#94a3b8', 0.1)}`,
    borderRadius: '24px',
    p: 4,
};

const DropZone = styled(Box)(({ theme, active }) => ({
    border: `2px dashed ${active ? '#3b82f6' : alpha('#94a3b8', 0.2)}`,
    borderRadius: '20px',
    padding: '40px',
    textAlign: 'center',
    backgroundColor: active ? alpha('#3b82f6', 0.05) : 'transparent',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    '&:hover': {
        borderColor: '#3b82f6',
        backgroundColor: alpha('#3b82f6', 0.05),
    }
}));

const TrainingCenter = ({
    selectedFile,
    onFileSelect,
    onUpload,
    uploading,
    uploadProgress,
    error,
    success,
    onRemoveFile,
    formatFileSize
}) => {
    return (
        <Box sx={glassBox}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: alpha('#3b82f6', 0.1), color: '#3b82f6' }}>
                    <AutoAwesome />
                </Box>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: 'white' }}>Training Center</Typography>
                    <Typography variant="body2" sx={{ color: '#94a3b8' }}>Inject professional legal resources into the RAG vector store.</Typography>
                </Box>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 3, borderRadius: '12px' }}>{success}</Alert>}

            {!selectedFile ? (
                <DropZone component="label">
                    <input
                        type="file"
                        hidden
                        accept=".pdf,.docx,.doc,.txt,.md"
                        onChange={onFileSelect}
                    />
                    <UploadIcon sx={{ fontSize: 48, color: alpha('#3b82f6', 0.5), mb: 2 }} />
                    <Typography variant="h6" sx={{ color: 'white', mb: 1 }}>Drop legal documents here</Typography>
                    <Typography variant="body2" sx={{ color: '#94a3b8' }}>Supported: PDF, DOCX, TXT, MD (Max 50MB)</Typography>
                    <Button
                        variant="contained"
                        component="span"
                        sx={{ mt: 3, borderRadius: '10px', px: 4, bgcolor: '#3b82f6', '&:hover': { bgcolor: '#2563eb' } }}
                    >
                        Browse Files
                    </Button>
                </DropZone>
            ) : (
                <Paper sx={{ p: 3, bgcolor: alpha('#94a3b8', 0.05), borderRadius: '16px', border: `1px solid ${alpha('#3b82f6', 0.2)}` }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <DocumentIcon sx={{ fontSize: 40, color: '#3b82f6' }} />
                            <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'white' }}>{selectedFile.name}</Typography>
                                <Typography variant="caption" sx={{ color: '#94a3b8' }}>{formatFileSize(selectedFile.size)}</Typography>
                            </Box>
                        </Box>
                        {!uploading && (
                            <Button size="small" color="error" onClick={onRemoveFile} sx={{ fontWeight: 700 }}>Remove</Button>
                        )}
                    </Box>

                    {uploading ? (
                        <Box sx={{ mt: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="caption" sx={{ color: '#3b82f6', fontWeight: 700 }}>VECTORIZING DOCUMENT...</Typography>
                                <Typography variant="caption" sx={{ color: 'white', fontWeight: 700 }}>{uploadProgress}%</Typography>
                            </Box>
                            <LinearProgress
                                variant="determinate"
                                value={uploadProgress}
                                sx={{ height: 8, borderRadius: 4, bgcolor: alpha('#3b82f6', 0.1), '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: '#3b82f6' } }}
                            />
                        </Box>
                    ) : (
                        <Button
                            fullWidth
                            variant="contained"
                            startIcon={<SecurityIcon />}
                            onClick={onUpload}
                            sx={{
                                py: 1.5,
                                borderRadius: '12px',
                                bgcolor: '#3b82f6',
                                fontWeight: 700,
                                boxShadow: '0 4px 20px rgba(59, 130, 246, 0.3)',
                                '&:hover': { bgcolor: '#2563eb' }
                            }}
                        >
                            Start Training Session
                        </Button>
                    )}
                </Paper>
            )}

            <Box sx={{ mt: 4, p: 2, borderRadius: '12px', bgcolor: alpha('#f59e0b', 0.05), border: `1px solid ${alpha('#f59e0b', 0.2)}`, display: 'flex', gap: 2 }}>
                <Info sx={{ color: '#f59e0b', fontSize: 20 }} />
                <Typography variant="caption" sx={{ color: '#d97706' }}>
                    <strong>Note:</strong> Training processes may take several minutes depending on document length. The data will be indexed into the semantic vector space for immediate query availability.
                </Typography>
            </Box>
        </Box>
    );
};

export default TrainingCenter;

import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Box, Fade } from '@mui/material';
import { adminAPI } from '../../services/api';
import TrainingCenter from '../../components/admin/TrainingCenter';

const Training = () => {
    const { fetchDashboardData } = useOutletContext();

    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadSuccess, setUploadSuccess] = useState(null);
    const [uploadError, setUploadError] = useState(null);

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            setUploadError(null);
            setUploadSuccess(null);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        setUploading(true);
        setUploadProgress(0);
        setUploadError(null);

        const progressInterval = setInterval(() => {
            setUploadProgress(prev => (prev < 90 ? prev + 10 : prev));
        }, 300);

        try {
            const adminData = JSON.parse(localStorage.getItem('adminUser') || '{}');
            const response = await adminAPI.uploadDocument(selectedFile, adminData);

            clearInterval(progressInterval);
            setUploadProgress(100);

            if (response.success) {
                setUploadSuccess('Document successfully vectorized and indexed.');
                setSelectedFile(null);
                fetchDashboardData();
            } else {
                setUploadError(response.message || 'Upload failed');
            }
        } catch (err) {
            clearInterval(progressInterval);
            setUploadError(err.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + ['Bytes', 'KB', 'MB', 'GB'][i];
    };

    return (
        <Fade in timeout={500}>
            <Box>
                <TrainingCenter
                    selectedFile={selectedFile}
                    onFileSelect={handleFileSelect}
                    onUpload={handleUpload}
                    uploading={uploading}
                    uploadProgress={uploadProgress}
                    error={uploadError}
                    success={uploadSuccess}
                    onRemoveFile={() => setSelectedFile(null)}
                    formatFileSize={formatFileSize}
                />
            </Box>
        </Fade>
    );
};

export default Training;

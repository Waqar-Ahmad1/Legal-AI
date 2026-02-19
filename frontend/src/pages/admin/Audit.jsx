import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { Box, Fade } from '@mui/material';
import AuditLog from '../../components/admin/AuditLog';

const Audit = () => {
    const { adminData, fetchDashboardData } = useOutletContext();

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleString();
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + ['Bytes', 'KB', 'MB', 'GB'][i];
    };

    const getStatusColor = (status) => {
        switch (status.toLowerCase()) {
            case 'completed': return 'success';
            case 'processing': return 'warning';
            default: return 'error';
        }
    };

    return (
        <Fade in timeout={500}>
            <Box>
                <AuditLog
                    history={adminData.trainingHistory}
                    onRefresh={fetchDashboardData}
                    formatDate={formatDate}
                    formatFileSize={formatFileSize}
                    getStatusColor={getStatusColor}
                />
            </Box>
        </Fade>
    );
};

export default Audit;

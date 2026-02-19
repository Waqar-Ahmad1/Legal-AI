import React from 'react';
import { Box, Typography } from '@mui/material';
import { Dns as SystemIcon } from '@mui/icons-material';

const Settings = () => {
    return (
        <Box sx={{ p: 4, textAlign: 'center', opacity: 0.6 }}>
            <SystemIcon sx={{ fontSize: 64, mb: 2, color: '#94a3b8' }} />
            <Typography variant="h5" sx={{ color: 'white' }}>System Settings</Typography>
            <Typography variant="body2" sx={{ color: '#94a3b8' }}>Advanced configuration options coming soon.</Typography>
        </Box>
    );
};

export default Settings;

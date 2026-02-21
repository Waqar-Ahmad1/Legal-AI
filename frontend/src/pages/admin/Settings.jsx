import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Tabs,
    Tab,
    Paper,
    TextField,
    Button,
    Switch,
    FormControlLabel,
    Grid,
    CircularProgress,
    Alert,
    Divider,
    IconButton,
    InputAdornment,
} from '@mui/material';
import {
    Settings as SettingsIcon,
    Psychology as AIIcon,
    Security as SecurityIcon,
    Email as EmailIcon,
    Save as SaveIcon,
    Refresh as RefreshIcon,
    Visibility,
    VisibilityOff,
} from '@mui/icons-material';
import { adminAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

const Settings = () => {
    const { user: admin } = useAuth();
    const [activeTab, setActiveTab] = useState(0);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [showSmtpPass, setShowSmtpPass] = useState(false);

    const [settings, setSettings] = useState({
        site_name: 'Legal AI',
        contact_email: '',
        maintenance_mode: false,
        model_name: 'gpt-3.5-turbo',
        chunk_size: 1000,
        chunk_overlap: 200,
        top_k: 4,
        smtp_host: '',
        smtp_port: 587,
        smtp_user: '',
        smtp_pass: '',
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const response = await adminAPI.getSettings();
            if (response.success) {
                setSettings(response.data);
            } else {
                setError(response.message);
            }
        } catch (err) {
            setError('Failed to load settings');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        setSuccess(null);
        try {
            const response = await adminAPI.updateSettings(settings);
            if (response.success) {
                setSuccess('Settings updated successfully');
                setTimeout(() => setSuccess(null), 3000);
            } else {
                setError(response.message);
            }
        } catch (err) {
            setError('Failed to save settings');
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, checked, type } = e.target;
        setSettings(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const glassBox = {
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(12px)',
        borderRadius: '24px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        p: 4,
        color: 'white'
    };

    const TabPanel = ({ children, value, index }) => (
        <div role="tabpanel" hidden={value !== index}>
            {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
        </div>
    );

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
                <CircularProgress color="primary" />
            </Box>
        );
    }

    return (
        <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: 'white', mb: 1 }}>
                        System Settings
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#94a3b8' }}>
                        Configure global application behavior and AI parameters.
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={fetchSettings}
                        sx={{ borderColor: 'rgba(255,255,255,0.2)', color: 'white' }}
                    >
                        Reload
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                        onClick={handleSave}
                        disabled={saving}
                        sx={{ borderRadius: '12px', px: 4 }}
                    >
                        Save All Changes
                    </Button>
                </Box>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

            <Box sx={glassBox}>
                <Tabs
                    value={activeTab}
                    onChange={(e, v) => setActiveTab(v)}
                    sx={{
                        borderBottom: '1px solid rgba(255,255,255,0.1)',
                        '& .MuiTab-root': { color: '#94a3b8', fontWeight: 600 },
                        '& .Mui-selected': { color: '#3b82f6' }
                    }}
                >
                    <Tab icon={<SettingsIcon sx={{ mr: 1 }} />} label="General" iconPosition="start" />
                    <Tab icon={<AIIcon sx={{ mr: 1 }} />} label="AI Engine" iconPosition="start" />
                    <Tab icon={<SecurityIcon sx={{ mr: 1 }} />} label="Security" iconPosition="start" />
                    <Tab icon={<EmailIcon sx={{ mr: 1 }} />} label="Mail Server" iconPosition="start" />
                </Tabs>

                <TabPanel value={activeTab} index={0}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Site Name"
                                name="site_name"
                                value={settings.site_name}
                                onChange={handleChange}
                                variant="filled"
                                sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }}
                                InputLabelProps={{ style: { color: '#94a3b8' } }}
                                inputProps={{ style: { color: 'white' } }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Support Contact Email"
                                name="contact_email"
                                value={settings.contact_email}
                                onChange={handleChange}
                                variant="filled"
                                sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }}
                                InputLabelProps={{ style: { color: '#94a3b8' } }}
                                inputProps={{ style: { color: 'white' } }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.1)' }} />
                            <FormControlLabel
                                control={
                                    <Switch
                                        color="primary"
                                        name="maintenance_mode"
                                        checked={settings.maintenance_mode}
                                        onChange={handleChange}
                                    />
                                }
                                label={
                                    <Box>
                                        <Typography sx={{ color: 'white', fontWeight: 600 }}>Maintenance Mode</Typography>
                                        <Typography sx={{ color: '#94a3b8', variant: 'body2' }}>
                                            When active, users will see a maintenance page while admins can still use the system.
                                        </Typography>
                                    </Box>
                                }
                            />
                        </Grid>
                    </Grid>
                </TabPanel>

                <TabPanel value={activeTab} index={1}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Primary LLM Model"
                                name="model_name"
                                value={settings.model_name}
                                onChange={handleChange}
                                variant="filled"
                                sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }}
                                InputLabelProps={{ style: { color: '#94a3b8' } }}
                                inputProps={{ style: { color: 'white' } }}
                                placeholder="e.g. gpt-4, claude-3"
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Top-K Results"
                                name="top_k"
                                type="number"
                                value={settings.top_k}
                                onChange={handleChange}
                                variant="filled"
                                sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }}
                                InputLabelProps={{ style: { color: '#94a3b8' } }}
                                inputProps={{ style: { color: 'white' } }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Chunk Size (Characters)"
                                name="chunk_size"
                                type="number"
                                value={settings.chunk_size}
                                onChange={handleChange}
                                variant="filled"
                                sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }}
                                InputLabelProps={{ style: { color: '#94a3b8' } }}
                                inputProps={{ style: { color: 'white' } }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Chunk Overlap"
                                name="chunk_overlap"
                                type="number"
                                value={settings.chunk_overlap}
                                onChange={handleChange}
                                variant="filled"
                                sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }}
                                InputLabelProps={{ style: { color: '#94a3b8' } }}
                                inputProps={{ style: { color: 'white' } }}
                            />
                        </Grid>
                    </Grid>
                </TabPanel>

                <TabPanel value={activeTab} index={2}>
                    <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>Admin Account Security</Typography>
                    <Typography variant="body2" sx={{ color: '#94a3b8', mb: 3 }}>
                        Logged in as: <strong>{admin?.email}</strong>
                    </Typography>
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <Button
                                variant="outlined"
                                color="warning"
                                sx={{ borderRadius: '12px' }}
                            >
                                Change Password
                            </Button>
                        </Grid>
                        <Grid item xs={12}>
                            <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.1)' }} />
                            <Typography variant="h6" sx={{ color: 'white', mb: 1 }}>API Key Rotation</Typography>
                            <Typography variant="body2" sx={{ color: '#94a3b8', mb: 2 }}>
                                Rotate secrets for internal services (Database, JWT, etc)
                            </Typography>
                            <Button
                                variant="text"
                                sx={{ color: '#3b82f6' }}
                                disabled
                            >
                                Key management disabled for this session
                            </Button>
                        </Grid>
                    </Grid>
                </TabPanel>

                <TabPanel value={activeTab} index={3}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={8}>
                            <TextField
                                fullWidth
                                label="SMTP Host"
                                name="smtp_host"
                                value={settings.smtp_host}
                                onChange={handleChange}
                                variant="filled"
                                sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }}
                                InputLabelProps={{ style: { color: '#94a3b8' } }}
                                inputProps={{ style: { color: 'white' } }}
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <TextField
                                fullWidth
                                label="Port"
                                name="smtp_port"
                                type="number"
                                value={settings.smtp_port}
                                onChange={handleChange}
                                variant="filled"
                                sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }}
                                InputLabelProps={{ style: { color: '#94a3b8' } }}
                                inputProps={{ style: { color: 'white' } }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Username"
                                name="smtp_user"
                                value={settings.smtp_user}
                                onChange={handleChange}
                                variant="filled"
                                sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }}
                                InputLabelProps={{ style: { color: '#94a3b8' } }}
                                inputProps={{ style: { color: 'white' } }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Password"
                                name="smtp_pass"
                                type={showSmtpPass ? 'text' : 'password'}
                                value={settings.smtp_pass}
                                onChange={handleChange}
                                variant="filled"
                                sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }}
                                InputLabelProps={{ style: { color: '#94a3b8' } }}
                                inputProps={{ style: { color: 'white' } }}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                onClick={() => setShowSmtpPass(!showSmtpPass)}
                                                sx={{ color: '#94a3b8' }}
                                            >
                                                {showSmtpPass ? <VisibilityOff /> : <Visibility />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Grid>
                    </Grid>
                </TabPanel>
            </Box>
        </Box>
    );
};

export default Settings;

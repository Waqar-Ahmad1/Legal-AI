import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import {
    Box,
    Container,
    Typography,
    alpha,
    useTheme,
    CircularProgress,
    Alert
} from '@mui/material';

// Service layer
import { adminAPI } from '../../services/api';

// Modular components
import Sidebar from '../../components/admin/Sidebar';

const AdminLayout = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const location = useLocation();

    // UI State
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Data State (Shared context for sub-routes)
    const [adminData, setAdminData] = useState({
        stats: {
            totalUsers: 0,
            totalDocuments: 0,
            trainingSessions: 0,
            systemHealth: 100
        },
        users: [],
        trainingHistory: [],
        systemStatus: {}
    });

    const fetchDashboardData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [statsRes, historyRes, usersRes, statusRes] = await Promise.all([
                adminAPI.getDashboardStats(),
                adminAPI.getTrainingHistory(),
                adminAPI.getUsersList(),
                adminAPI.getAdminSystemStatus()
            ]);

            setAdminData(prev => ({
                stats: statsRes.success ? statsRes.data : prev.stats,
                trainingHistory: historyRes.success ? (historyRes.data.history || []) : [],
                users: usersRes.success ? (usersRes.data.users || []) : [],
                systemStatus: statusRes.success ? statusRes.data : {}
            }));

        } catch (err) {
            console.error('Failed to fetch admin data:', err);
            setError('Failed to load dashboard data. Please check your connection.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    // Handlers
    const handleLogout = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('adminUser');
        navigate('/admin/signin');
    };

    const currentTab = location.pathname.split('/').pop() || 'overview';

    const handleTabChange = (tabId) => {
        navigate(`/admin/${tabId}`);
    };

    if (loading) {
        return (
            <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: theme.palette.background.default }}>
                <CircularProgress sx={{ color: theme.palette.primary.main }} />
            </Box>
        );
    }
    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: theme.palette.background.default }}>
            <Sidebar
                currentTab={currentTab}
                onTabChange={handleTabChange}
                onLogout={handleLogout}
                collapsed={sidebarCollapsed}
                setCollapsed={setSidebarCollapsed}
            />

            <Box sx={{
                flex: 1,
                p: { xs: 2, md: 4, lg: 6 },
                overflowY: 'auto'
            }}>
                <Container maxWidth="xl" sx={{ p: 0 }}>
                    <Box sx={{ mb: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <Box>
                            <Typography variant="overline" sx={{ color: theme.palette.primary.main, fontWeight: 800, letterSpacing: 2 }}>
                                Administrative Portal
                            </Typography>
                            <Typography variant="h3" sx={{ fontWeight: 900, color: 'white', letterSpacing: -1, mt: 1 }}>
                                {currentTab.charAt(0).toUpperCase() + currentTab.slice(1)} <span style={{ color: alpha('#94a3b8', 0.3) }}>Command</span>
                            </Typography>
                        </Box>

                        <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 2, mb: 1 }}>
                            <Box sx={{ textAlign: 'right' }}>
                                <Typography variant="subtitle2" sx={{ color: 'white', fontWeight: 700 }}>
                                    {JSON.parse(localStorage.getItem('adminUser') || '{}').name || 'Admin User'}
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 700 }}>SYSTEM ONLINE</Typography>
                            </Box>
                        </Box>
                    </Box>

                    {error && <Alert severity="error" sx={{ mb: 4 }}>{error}</Alert>}

                    <Outlet context={{ adminData, fetchDashboardData }} />
                </Container>
            </Box>
        </Box>
    );
};

export default AdminLayout;

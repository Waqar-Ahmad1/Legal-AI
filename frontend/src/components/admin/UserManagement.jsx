import React from 'react';
import {
    Box,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Avatar,
    Chip,
    IconButton,
    Button
} from '@mui/material';
import { styled, alpha } from '@mui/material/styles';
import {
    People as PeopleIcon,
    MoreVert,
    Shield,
    Person
} from '@mui/icons-material';

const glassBox = {
    background: alpha('#1e293b', 0.5),
    backdropFilter: 'blur(12px)',
    border: `1px solid ${alpha('#94a3b8', 0.1)}`,
    borderRadius: '24px',
    p: 3,
};

const StyledTableRow = styled(TableRow)(({ theme }) => ({
    '&:hover': {
        backgroundColor: alpha('#94a3b8', 0.05),
    },
    '& td': {
        borderBottom: `1px solid ${alpha('#94a3b8', 0.05)}`,
        padding: '16px',
        color: '#e2e8f0',
    },
}));

const UserManagement = ({ users = [] }) => {
    return (
        <Box sx={glassBox}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ p: 1, borderRadius: '8px', bgcolor: alpha('#3b82f6', 0.1), color: '#3b82f6' }}>
                        <PeopleIcon />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: 'white' }}>User Management</Typography>
                </Box>
                <Button size="small" variant="outlined" sx={{ borderRadius: '8px', color: '#3b82f6', borderColor: '#3b82f6' }}>
                    Add New User
                </Button>
            </Box>

            {users.length === 0 ? (
                <Box sx={{ py: 8, textAlign: 'center', opacity: 0.5 }}>
                    <Person sx={{ fontSize: 48, mb: 1 }} />
                    <Typography variant="body2">No registered users found</Typography>
                </Box>
            ) : (
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ color: '#94a3b8', fontWeight: 700, borderBottom: `1px solid ${alpha('#94a3b8', 0.1)}`, py: 2 }}>USER</TableCell>
                                <TableCell sx={{ color: '#94a3b8', fontWeight: 700, borderBottom: `1px solid ${alpha('#94a3b8', 0.1)}`, py: 2 }}>ROLE</TableCell>
                                <TableCell sx={{ color: '#94a3b8', fontWeight: 700, borderBottom: `1px solid ${alpha('#94a3b8', 0.1)}`, py: 2 }}>STATUS</TableCell>
                                <TableCell sx={{ color: '#94a3b8', fontWeight: 700, borderBottom: `1px solid ${alpha('#94a3b8', 0.1)}`, py: 2 }}>JOINED</TableCell>
                                <TableCell sx={{ color: '#94a3b8', fontWeight: 700, borderBottom: `1px solid ${alpha('#94a3b8', 0.1)}`, py: 2 }} align="right">ACTIONS</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {users.map((user, index) => (
                                <StyledTableRow key={index}>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Avatar sx={{ width: 32, height: 32, bgcolor: alpha('#3b82f6', 0.2), color: '#3b82f6', fontWeight: 700, fontSize: '0.8rem' }}>
                                                {user.username?.charAt(0).toUpperCase() || 'U'}
                                            </Avatar>
                                            <Box>
                                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{user.username}</Typography>
                                                <Typography variant="caption" sx={{ opacity: 0.5 }}>{user.email || 'no-email@legalai.com'}</Typography>
                                            </Box>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            {user.role === 'admin' && <Shield sx={{ fontSize: 14, color: '#3b82f6' }} />}
                                            <Typography variant="body2" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>{user.role || 'user'}</Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label="ACTIVE"
                                            size="small"
                                            sx={{
                                                fontWeight: 800,
                                                fontSize: '0.65rem',
                                                bgcolor: alpha('#10b981', 0.1),
                                                color: '#10b981',
                                                border: 'none'
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">{user.joinedDate || 'Recent'}</Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton size="small" sx={{ color: '#94a3b8' }}>
                                            <MoreVert fontSize="inherit" />
                                        </IconButton>
                                    </TableCell>
                                </StyledTableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
};

export default UserManagement;

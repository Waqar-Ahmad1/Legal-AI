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
    Chip,
    IconButton,
    Tooltip
} from '@mui/material';
import { styled, alpha } from '@mui/material/styles';
import {
    History as HistoryIcon,
    InsertDriveFile as DocumentIcon,
    CheckCircle,
    Error,
    Refresh,
    OpenInNew
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

const AuditLog = ({ history, onRefresh, formatDate, formatFileSize, getStatusColor }) => {
    return (
        <Box sx={glassBox}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ p: 1, borderRadius: '8px', bgcolor: alpha('#3b82f6', 0.1), color: '#3b82f6' }}>
                        <HistoryIcon />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: 'white' }}>System Audit Log</Typography>
                </Box>
                <Tooltip title="Refresh Log">
                    <IconButton onClick={onRefresh} sx={{ color: '#94a3b8' }}>
                        <Refresh />
                    </IconButton>
                </Tooltip>
            </Box>

            {history.length === 0 ? (
                <Box sx={{ py: 8, textAlign: 'center', opacity: 0.5 }}>
                    <HistoryIcon sx={{ fontSize: 48, mb: 1 }} />
                    <Typography variant="body2">No audit entries found</Typography>
                </Box>
            ) : (
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ color: '#94a3b8', fontWeight: 700, borderBottom: `1px solid ${alpha('#94a3b8', 0.1)}`, py: 2 }}>DOCUMENT</TableCell>
                                <TableCell sx={{ color: '#94a3b8', fontWeight: 700, borderBottom: `1px solid ${alpha('#94a3b8', 0.1)}`, py: 2 }}>TIMESTAMP</TableCell>
                                <TableCell sx={{ color: '#94a3b8', fontWeight: 700, borderBottom: `1px solid ${alpha('#94a3b8', 0.1)}`, py: 2 }}>STATUS</TableCell>
                                <TableCell sx={{ color: '#94a3b8', fontWeight: 700, borderBottom: `1px solid ${alpha('#94a3b8', 0.1)}`, py: 2 }}>SIZE</TableCell>
                                <TableCell sx={{ color: '#94a3b8', fontWeight: 700, borderBottom: `1px solid ${alpha('#94a3b8', 0.1)}`, py: 2 }} align="right">ACTIONS</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {history.map((item, index) => (
                                <StyledTableRow key={index}>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <DocumentIcon sx={{ color: '#3b82f6', fontSize: 20 }} />
                                            <Box>
                                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{item.documentName}</Typography>
                                                <Typography variant="caption" sx={{ opacity: 0.6 }}>Internal Source</Typography>
                                            </Box>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{formatDate(item.uploadDate)}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            icon={item.status === 'completed' ? <CheckCircle sx={{ fontSize: '16px !important' }} /> : <Error sx={{ fontSize: '16px !important' }} />}
                                            label={item.status.toUpperCase()}
                                            size="small"
                                            sx={{
                                                fontWeight: 800,
                                                fontSize: '0.65rem',
                                                bgcolor: alpha(getStatusColor(item.status) === 'success' ? '#10b981' : getStatusColor(item.status) === 'warning' ? '#f59e0b' : '#ef4444', 0.1),
                                                color: getStatusColor(item.status) === 'success' ? '#10b981' : getStatusColor(item.status) === 'warning' ? '#f59e0b' : '#ef4444',
                                                border: 'none'
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatFileSize(item.fileSize || 0)}</Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="View Metadata">
                                            <IconButton size="small" sx={{ color: '#94a3b8' }}>
                                                <OpenInNew fontSize="inherit" />
                                            </IconButton>
                                        </Tooltip>
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

export default AuditLog;

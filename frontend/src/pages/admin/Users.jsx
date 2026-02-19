import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { Box, Fade } from '@mui/material';
import UserManagement from '../../components/admin/UserManagement';

const Users = () => {
    const { adminData } = useOutletContext();
    return (
        <Fade in timeout={500}>
            <Box>
                <UserManagement users={adminData.users} />
            </Box>
        </Fade>
    );
};

export default Users;

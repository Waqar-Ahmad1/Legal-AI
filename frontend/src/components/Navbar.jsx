import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button, AppBar, Toolbar, Typography, Box, Container, IconButton, Menu, MenuItem, useMediaQuery, useTheme } from '@mui/material';
import { styled } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import logo from '../assets/logo.svg';

// Styled components
const StyledAppBar = styled(AppBar)(({ theme }) => ({
  position: 'fixed',
  boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
  color: theme.palette.text.primary,
  zIndex: theme.zIndex.drawer + 1,
}));

const LogoBox = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'scale(1.03)',
  },
});

const LogoImg = styled('img')({
  height: '48px',
  width: 'auto',
  transition: 'all 0.3s ease',
  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
  '&:hover': {
    transform: 'scale(1.1)',
    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2)) brightness(1.05)',
  },
});

const NavButton = styled(Button)({
  margin: '0 8px',
  fontWeight: 600,
  textTransform: 'none',
  fontSize: '1rem',
  borderRadius: '8px',
  padding: '8px 16px',
  transition: 'all 0.3s ease',
  '&:hover': {
    backgroundColor: 'rgba(255,255,255,0.2)',
    transform: 'translateY(-2px)',
  },
});

const PrimaryButton = styled(NavButton)({
  backgroundColor: 'rgba(0, 120, 255, 0.1)',
  '&:hover': {
    backgroundColor: 'rgba(0, 120, 255, 0.2)',
  },
});

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
    navigate('/login');
  };

  return (
    <StyledAppBar position="fixed">
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          {/* Logo with enhanced hover effects */}
          <LogoBox 
            component={Link} 
            to="/" 
            sx={{ 
              flexGrow: 1, 
              textDecoration: 'none', 
              color: 'inherit',
              '&:hover': {
                '& img': {
                  transform: 'scale(1.1)',
                },
                '& h6': {
                  color: 'primary.main'
                }
              }
            }}
          >
            <LogoImg src={logo} alt="LegalAI Logo" />
            <Typography variant="h6" noWrap sx={{ 
              fontWeight: 700,
              transition: 'color 0.3s ease'
            }}>
              LegalAI
            </Typography>
          </LogoBox>

          {/* Desktop Navigation */}
          {!isMobile ? (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <NavButton color="inherit" component={Link} to="/">
                Home
              </NavButton>
              
              <NavButton color="inherit" component={Link} to="/about">
                About
              </NavButton>
              
              {user ? (
                <>
                  <PrimaryButton color="inherit" component={Link} to="/dashboard">
                    Dashboard
                  </PrimaryButton>
                  <NavButton color="inherit" component={Link} to="/upload">
                    Upload
                  </NavButton>
                  {user.role === 'admin' && (
                    <NavButton color="inherit" component={Link} to="/admin">
                      Admin
                    </NavButton>
                  )}
                  <NavButton 
                    color="inherit" 
                    onClick={handleLogout}
                    sx={{ 
                      backgroundColor: 'rgba(255, 50, 50, 0.1)',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 50, 50, 0.2)',
                      }
                    }}
                  >
                    Logout
                  </NavButton>
                </>
              ) : (
                <>
                  <PrimaryButton 
                    color="inherit" 
                    component={Link} 
                    to="/try-it"
                    sx={{
                      backgroundColor: 'rgba(0, 200, 100, 0.1)',
                      '&:hover': {
                        backgroundColor: 'rgba(0, 200, 100, 0.2)',
                      }
                    }}
                  >
                    Try It Now
                  </PrimaryButton>
                  
                  <NavButton color="inherit" component={Link} to="/register">
                    Register
                  </NavButton>
                  
                  <PrimaryButton color="inherit" component={Link} to="/login">
                    Login
                  </PrimaryButton>
                </>
              )}
            </Box>
          ) : (
            /* Mobile Navigation */
            <>
              <IconButton
                size="large"
                edge="end"
                color="inherit"
                aria-label="menu"
                onClick={handleMenuOpen}
                sx={{ ml: 2 }}
              >
                <MenuIcon />
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleMenuClose}
                PaperProps={{
                  elevation: 0,
                  sx: {
                    mt: 1.5,
                    minWidth: 200,
                    borderRadius: 2,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                    '& .MuiMenuItem-root': {
                      py: 1.5,
                      px: 3,
                      transition: 'all 0.2s',
                      '&:hover': {
                        backgroundColor: 'rgba(0, 120, 255, 0.1)',
                        transform: 'translateX(4px)'
                      }
                    },
                  },
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              >
                <MenuItem component={Link} to="/" onClick={handleMenuClose}>Home</MenuItem>
                <MenuItem component={Link} to="/about" onClick={handleMenuClose}>About</MenuItem>
                
                {user ? (
                  <>
                    <MenuItem component={Link} to="/dashboard" onClick={handleMenuClose}>
                      Dashboard
                    </MenuItem>
                    <MenuItem component={Link} to="/upload" onClick={handleMenuClose}>
                      Upload
                    </MenuItem>
                    {user.role === 'admin' && (
                      <MenuItem component={Link} to="/admin" onClick={handleMenuClose}>
                        Admin
                      </MenuItem>
                    )}
                    <MenuItem 
                      onClick={handleLogout}
                      sx={{ 
                        color: 'error.main',
                        backgroundColor: 'rgba(255, 50, 50, 0.05)',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 50, 50, 0.1)',
                        }
                      }}
                    >
                      Logout
                    </MenuItem>
                  </>
                ) : (
                  <>
                    <MenuItem 
                      component={Link} 
                      to="/try-it" 
                      onClick={handleMenuClose}
                      sx={{ color: 'success.main' }}
                    >
                      Try It Now
                    </MenuItem>
                    <MenuItem component={Link} to="/register" onClick={handleMenuClose}>
                      Register
                    </MenuItem>
                    <MenuItem 
                      component={Link} 
                      to="/login" 
                      onClick={handleMenuClose}
                      sx={{ color: 'primary.main' }}
                    >
                      Login
                    </MenuItem>
                  </>
                )}
              </Menu>
            </>
          )}
        </Toolbar>
      </Container>
    </StyledAppBar>
  );
};

export default Navbar;
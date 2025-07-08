import React from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Box, 
  IconButton,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { 
  Event as EventIcon, 
  Person as PersonIcon,
  Help as HelpIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [mobileMenuAnchor, setMobileMenuAnchor] = React.useState(null);
  const [eventsMenuAnchor, setEventsMenuAnchor] = React.useState(null);

  const menuItems = [
    {
      label: 'Events',
      icon: <EventIcon />,
      path: '/events'
    },
    {
      label: 'Account',
      icon: <PersonIcon />,
      path: '/account'
    },
    {
      label: 'Help',
      icon: <HelpIcon />,
      path: '/help'
    }
  ];

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleMobileMenuOpen = (event) => {
    setMobileMenuAnchor(event.currentTarget);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuAnchor(null);
  };

  const handleNavigation = (path) => {
    navigate(path);
    handleMobileMenuClose();
  };

  const handleEventsMenuOpen = (event) => {
    setEventsMenuAnchor(event.currentTarget);
  };

  const handleEventsMenuClose = () => {
    setEventsMenuAnchor(null);
  };

  return (
    <AppBar 
      position="static" 
      elevation={1}
      sx={{ 
        backgroundColor: 'background.paper',
        color: 'text.primary',
        borderBottom: 1,
        borderColor: 'divider'
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        {/* Logo/Brand */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              fontWeight: 600,
              cursor: 'pointer',
              color: 'primary.main'
            }}
            onClick={() => navigate('/dashboard')}
          >
            Event Check-in
          </Typography>
        </Box>

        {/* Desktop Navigation */}
        {!isMobile && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              startIcon={<EventIcon />}
              onClick={() => navigate('/events')}
              sx={{
                color: isActive('/events') ? 'primary.main' : 'text.secondary',
                backgroundColor: isActive('/events') ? 'primary.light' : 'transparent',
                '&:hover': {
                  backgroundColor: isActive('/events') ? 'primary.main' : 'action.hover',
                  color: isActive('/events') ? 'primary.contrastText' : 'text.primary'
                },
                fontWeight: isActive('/events') ? 600 : 400,
                borderRadius: 2,
                px: 2,
                py: 1
              }}
            >
              Events
            </Button>
            <Button
              startIcon={<PersonIcon />}
              onClick={() => navigate('/account')}
              sx={{
                color: isActive('/account') ? 'primary.main' : 'text.secondary',
                backgroundColor: isActive('/account') ? 'primary.light' : 'transparent',
                '&:hover': {
                  backgroundColor: isActive('/account') ? 'primary.main' : 'action.hover',
                  color: isActive('/account') ? 'primary.contrastText' : 'text.primary'
                },
                fontWeight: isActive('/account') ? 600 : 400,
                borderRadius: 2,
                px: 2,
                py: 1
              }}
            >
              Account
            </Button>
            <Button
              startIcon={<HelpIcon />}
              onClick={() => navigate('/help')}
              sx={{
                color: isActive('/help') ? 'primary.main' : 'text.secondary',
                backgroundColor: isActive('/help') ? 'primary.light' : 'transparent',
                '&:hover': {
                  backgroundColor: isActive('/help') ? 'primary.main' : 'action.hover',
                  color: isActive('/help') ? 'primary.contrastText' : 'text.primary'
                },
                fontWeight: isActive('/help') ? 600 : 400,
                borderRadius: 2,
                px: 2,
                py: 1
              }}
            >
              Help
            </Button>
            <Button
              startIcon={<LogoutIcon />}
              onClick={handleLogout}
              sx={{
                color: 'error.main',
                '&:hover': {
                  backgroundColor: 'error.light',
                  color: 'error.contrastText'
                },
                fontWeight: 600,
                borderRadius: 2,
                px: 2,
                py: 1
              }}
            >
              Sign Out
            </Button>
          </Box>
        )}

        {/* Mobile Menu Button */}
        {isMobile && (
          <IconButton
            edge="end"
            color="inherit"
            aria-label="menu"
            onClick={handleMobileMenuOpen}
          >
            <MenuIcon />
          </IconButton>
        )}

        {/* Mobile Menu */}
        <Menu
          anchorEl={mobileMenuAnchor}
          open={Boolean(mobileMenuAnchor)}
          onClose={handleMobileMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          {menuItems.map((item) => (
            <MenuItem
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              sx={{
                backgroundColor: isActive(item.path) ? 'primary.light' : 'transparent',
                color: isActive(item.path) ? 'primary.main' : 'text.primary',
                fontWeight: isActive(item.path) ? 600 : 400,
                minWidth: 150
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {item.icon}
                {item.label}
              </Box>
            </MenuItem>
          ))}
          <MenuItem
            onClick={handleLogout}
            sx={{
              color: 'error.main',
              fontWeight: 600,
              borderTop: 1,
              borderColor: 'divider',
              mt: 0.5
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LogoutIcon />
              Sign Out
            </Box>
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Header; 
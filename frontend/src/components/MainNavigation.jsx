import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  List, 
  ListItem, 
  ListItemText, 
  ListItemIcon, 
  Typography, 
  Box,
  Divider,
  Button
} from '@mui/material';
import { 
  Event as EventIcon, 
  Dashboard as DashboardIcon,
  Person as ProfileIcon,
  Info as InfoIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const MainNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const menuItems = [
    {
      label: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/dashboard'
    },
    {
      label: 'Events',
      icon: <EventIcon />,
      path: '/events'
    },
    {
      label: 'Activity',
      icon: <InfoIcon />,
      path: '/activity'
    },
    {
      label: 'Account',
      icon: <ProfileIcon />,
      path: '/profile'
    }
  ];

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Box sx={{ 
      width: 250, 
      bgcolor: 'background.paper', 
      borderRight: 1, 
      borderColor: 'divider', 
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      margin: 0,
      padding: 0,
      overflow: 'hidden',
      position: 'relative',
      boxSizing: 'border-box'
    }}>
      <Typography variant="h6" sx={{ p: 2, pb: 1, fontWeight: 600, margin: 0 }}>
        Event Check-in
      </Typography>
      <Divider sx={{ margin: 0 }} />
      
      {/* Navigation Items */}
      <List sx={{ flexGrow: 1 }}>
        {menuItems.map((item) => (
          <ListItem 
            key={item.path}
            button 
            onClick={() => navigate(item.path)}
            sx={{
              backgroundColor: isActive(item.path) ? 'primary.light' : 'transparent',
              color: isActive(item.path) ? 'primary.contrastText' : 'inherit',
              '&:hover': {
                backgroundColor: isActive(item.path) ? 'primary.main' : 'action.hover'
              }
            }}
          >
            <ListItemIcon sx={{ color: isActive(item.path) ? 'inherit' : 'primary.main' }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText 
              primary={item.label} 
              sx={{ 
                fontWeight: isActive(item.path) ? 600 : 400 
              }}
            />
          </ListItem>
        ))}
      </List>

      {/* Logout Button */}
      <Box sx={{ 
        p: 2, 
        borderTop: 1, 
        borderColor: 'divider',
        margin: 0,
        boxSizing: 'border-box'
      }}>
        <Button
          fullWidth
          variant="outlined"
          color="error"
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
          sx={{
            fontWeight: 600,
            borderRadius: 2,
            py: 1.5,
            margin: 0,
            '&:hover': {
              backgroundColor: 'error.light',
              color: 'error.contrastText'
            }
          }}
        >
          Logout
        </Button>
      </Box>
    </Box>
  );
};

export default MainNavigation; 
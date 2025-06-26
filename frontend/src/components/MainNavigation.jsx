import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  List, 
  ListItem, 
  ListItemText, 
  ListItemIcon, 
  Typography, 
  Box,
  Divider 
} from '@mui/material';
import { 
  Event as EventIcon, 
  Assessment as AnalyticsIcon,
  Dashboard as DashboardIcon,
  Person as ProfileIcon,
  Info as InfoIcon
} from '@mui/icons-material';

const MainNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

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
      label: 'Analytics',
      icon: <AnalyticsIcon />,
      path: '/analytics'
    },
    {
      label: 'Activity',
      icon: <InfoIcon />,
      path: '/activity'
    },
    {
      label: 'Profile',
      icon: <ProfileIcon />,
      path: '/profile'
    }
  ];

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <Box sx={{ width: 250, bgcolor: 'background.paper', borderRight: 1, borderColor: 'divider', height: '100vh' }}>
      <Typography variant="h6" sx={{ p: 2, pb: 1, fontWeight: 600 }}>
        Event Check-in
      </Typography>
      <Divider />
      <List>
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
    </Box>
  );
};

export default MainNavigation; 
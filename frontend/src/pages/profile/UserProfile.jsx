import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  CircularProgress,
  Avatar,
  Divider,
  Chip,
  Paper,
  Tooltip,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  IconButton,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Security as SecurityIcon,
  CalendarToday as CalendarIcon,
  Lock as LockIcon,
  Edit as EditIcon,
  ContentCopy as ContentCopyIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';

import MainLayout from '../../components/layout/MainLayout';
import { useAuth } from '../../contexts/AuthContext';
import { getUserProfile, getAllUsers } from '../../services/api';
import AvatarIcon from '../../components/dashboard/AvatarIcon';

const ROLE_LABELS = {
  admin: 'Admin',
  staff: 'Staff',
  operations_manager: 'Operations Manager'
};

const ROLE_COLORS = {
  admin: '#CB1033',
  staff: '#FAA951',
  operations_manager: '#31365E'
};

// Helper function to generate color from string
function stringToColor(string) {
  let hash = 0;
  for (let i = 0; i < string.length; i++) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 50%)`;
}

// Extract initials from name
function getInitials(name, email) {
  if (name) {
    const parts = name.trim().split(' ');
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    } else {
      const firstInitial = parts[0].charAt(0).toUpperCase();
      const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
      return firstInitial + lastInitial;
    }
  }
  // Fallback to email initials
  if (email) {
    return email.substring(0, 2).toUpperCase();
  }
  return 'U';
}

const UserProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [profileColor, setProfileColor] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [savingColor, setSavingColor] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Determine if viewing own profile
  // If no userId param, it's the current user's own profile
  // If userId matches currentUser.id, it's own profile
  // Otherwise, viewing someone else's profile (read-only)
  const isOwnProfile = !userId || userId === currentUser?.id;

  useEffect(() => {
    loadProfile();
    loadAllUsers();
  }, [userId]);
  
  // Edit permissions:
  // - Users can ONLY edit their own profile
  // - Admins/Ops should use Account Settings to edit other users
  // - All other profiles are view-only
  const canEditProfile = isOwnProfile;

  const loadProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getUserProfile(userId);
      setUser(response.data.user);
      setProfileColor(response.data.user.profileColor || '');
    } catch (err) {
      setError('Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  const loadAllUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await getAllUsers();
      setAllUsers(response.data.users || []);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleColorChange = async (color) => {
    if (!isOwnProfile) return;
    setSavingColor(true);
    try {
      await api.put(`/users/profile/${user._id}`, { profileColor: color || null });
      setProfileColor(color);
      setUser({ ...user, profileColor: color || null });
      setShowColorPicker(false);
      toast.success('Profile color updated!');
      // Reload profile to refresh avatar icon color
      await loadProfile();
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to update profile color.';
      toast.error(errorMsg);
    } finally {
      setSavingColor(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not available';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not available';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <MainLayout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress size={60} />
        </Box>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <Alert severity="error" sx={{ maxWidth: 500 }}>
            {error}
          </Alert>
        </Box>
      </MainLayout>
    );
  }

  if (!user) {
    return (
      <MainLayout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <Alert severity="warning" sx={{ maxWidth: 500 }}>
            User not found.
          </Alert>
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout userName={
      user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName}`
        : user.firstName || user.lastName || user.email || 'User'
    }>
      <Box 
        display="flex" 
        flexDirection={{ xs: 'column', md: 'row' }}
        gap={{ xs: 2, md: 3 }} 
        sx={{ 
          height: { xs: 'auto', md: 'calc(100vh - 120px)' },
          minHeight: { xs: 'auto', md: 'calc(100vh - 120px)' }
        }}
      >
        {/* Left Panel - Profile Details */}
        <Box 
          flex={1} 
          sx={{ 
            overflowY: { xs: 'visible', md: 'auto' }, 
            pr: { xs: 0, md: 2 },
            width: { xs: '100%', md: 'auto' }
          }}
        >
          {/* Profile Header - Horizontal Layout */}
          <Box 
            display="flex" 
            flexDirection={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'center', sm: 'flex-start' }}
            gap={{ xs: 2, sm: 3 }} 
            mb={4}
          >
            {/* Large Avatar with Big Initials */}
            <Box position="relative">
              <Avatar
                sx={{
                  width: { xs: 80, sm: 120 },
                  height: { xs: 80, sm: 120 },
                  bgcolor: profileColor || stringToColor(
                    user.firstName && user.lastName 
                      ? `${user.firstName} ${user.lastName}`
                      : user.firstName || user.lastName || user.email
                  ),
                  fontSize: { xs: '2rem', sm: '3rem' },
                  fontWeight: 700,
                  border: '3px solid #e0e0e0'
                }}
              >
                {getInitials(
                  user.firstName && user.lastName 
                    ? `${user.firstName} ${user.lastName}`
                    : user.firstName || user.lastName || user.username || user.email,
                  user.email
                )}
              </Avatar>
              
              {/* Pencil icon overlay (bottom right) for color editing */}
              {isOwnProfile && (
                <IconButton
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    bgcolor: '#fff',
                    border: '2px solid #e0e0e0',
                    width: { xs: 28, sm: 36 },
                    height: { xs: 28, sm: 36 },
                    '&:hover': {
                      bgcolor: '#f5f5f5'
                    }
                  }}
                  onClick={() => setShowColorPicker(!showColorPicker)}
                >
                  <EditIcon sx={{ fontSize: { xs: 14, sm: 18 }, color: '#666' }} />
                </IconButton>
              )}
            </Box>
            
            {/* Name and Info */}
            <Box flex={1} sx={{ width: { xs: '100%', sm: 'auto' }, textAlign: { xs: 'center', sm: 'left' } }}>
              <Typography 
                variant={isMobile ? 'h5' : 'h4'} 
                fontWeight={700} 
                color="#1a1a1a" 
                mb={1}
              >
                {user.firstName && user.lastName 
                  ? `${user.firstName} ${user.lastName}`
                  : user.firstName 
                  ? user.firstName 
                  : user.lastName 
                  ? user.lastName 
                  : user.email}
              </Typography>
              <Box display="flex" alignItems="center" justifyContent={{ xs: 'center', sm: 'flex-start' }} gap={1}>
                <Typography variant="body2" color="text.secondary">
                  {user.email}
                </Typography>
                <Tooltip title="Copy email to clipboard">
                  <IconButton
                    size="small"
                    sx={{ 
                      color: '#666',
                      '&:hover': {
                        color: '#1bcddc',
                        backgroundColor: 'rgba(27, 205, 220, 0.1)'
                      }
                    }}
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(user.email);
                        toast.success('Email copied to clipboard!');
                      } catch (err) {
                        // Fallback for older browsers
                        const textArea = document.createElement('textarea');
                        textArea.value = user.email;
                        document.body.appendChild(textArea);
                        textArea.select();
                        try {
                          document.execCommand('copy');
                          toast.success('Email copied to clipboard!');
                        } catch (fallbackErr) {
                          toast.error('Failed to copy email');
                        }
                        document.body.removeChild(textArea);
                      }
                    }}
                  >
                    <ContentCopyIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </Box>

          {/* Profile Color Picker - Only for own profile */}
          {isOwnProfile && showColorPicker && (
            <Paper
              elevation={3}
              sx={{
                mb: 4,
                p: { xs: 2, sm: 3 },
                borderRadius: 2,
                backgroundColor: '#fafafa',
                border: '1px solid #e0e0e0'
              }}
            >
              <Typography variant="body2" fontWeight={600} mb={2} color="#222">
                Choose Profile Color
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 1, sm: 1.5 }, justifyContent: { xs: 'center', sm: 'flex-start' } }}>
                {[
                  '#1bcddc', '#31365E', '#CB1033', '#FAA951',
                  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
                  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
                  '#BB8FCE', '#85C1E2', '#F8B739', '#E74C3C',
                  '#3498DB', '#2ECC71', '#9B59B6', '#E67E22',
                  '#1ABC9C', '#34495E', '#F39C12', '#E91E63'
                ].map((color) => (
                  <Tooltip key={color} title={color}>
                    <Box
                      onClick={() => handleColorChange(color)}
                      sx={{
                        width: { xs: 40, sm: 48 },
                        height: { xs: 40, sm: 48 },
                        borderRadius: '50%',
                        bgcolor: color,
                        cursor: 'pointer',
                        border: profileColor === color ? '4px solid #31365E' : '2px solid #ddd',
                        transition: 'all 0.2s',
                        '&:hover': { transform: 'scale(1.15)' }
                      }}
                    />
                  </Tooltip>
                ))}
              </Box>
              {profileColor && (
                <Box mt={2} display="flex" justifyContent={{ xs: 'center', sm: 'flex-start' }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleColorChange('')}
                    disabled={savingColor}
                    sx={{ textTransform: 'none' }}
                  >
                    Reset to Default
                  </Button>
                </Box>
              )}
            </Paper>
          )}

          {/* Account Information Card - Condensed */}
          <Box mb={4}>
            <Card sx={{ 
              borderRadius: 2, 
              boxShadow: '0 1px 3px rgba(0,0,0,0.12)', 
              border: '1px solid #e0e0e0',
              width: '100%'
            }}>
              <Box sx={{ p: { xs: 1.5, sm: 2 }, borderBottom: '1px solid #e0e0e0', backgroundColor: '#fafafa' }}>
                <Typography variant="subtitle1" fontWeight={600} color="#1a1a1a">
                  Account Information
                </Typography>
              </Box>
              
              <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, 
                  gap: { xs: 1.5, sm: 2 } 
                }}>
                  {/* Email */}
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', mb: 0.5, display: 'block' }}>
                      Email
                    </Typography>
                    <Typography variant="body2" color="#1a1a1a">
                      {user.email}
                    </Typography>
                  </Box>

                  {/* Name */}
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', mb: 0.5, display: 'block' }}>
                      Name
                    </Typography>
                    <Typography variant="body2" color="#1a1a1a">
                      {user.firstName && user.lastName 
                        ? `${user.firstName} ${user.lastName}`
                        : user.firstName 
                        ? user.firstName 
                        : user.lastName 
                        ? user.lastName 
                        : 'Not set'}
                    </Typography>
                  </Box>

                  {/* Role */}
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', mb: 0.5, display: 'block' }}>
                      Role
                    </Typography>
                    <Chip
                      label={ROLE_LABELS[user.role] || user.role}
                      size="small"
                      sx={{
                        backgroundColor: ROLE_COLORS[user.role] || '#666',
                        color: 'white',
                        fontWeight: 600,
                        height: 24,
                        fontSize: '0.75rem'
                      }}
                    />
                  </Box>

                  {/* Status */}
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', mb: 0.5, display: 'block' }}>
                      Status
                    </Typography>
                    <Chip
                      label={user.isActive ? 'Active' : 'Inactive'}
                      size="small"
                      color={user.isActive ? 'success' : 'default'}
                      sx={{ 
                        height: 24,
                        fontSize: '0.75rem'
                      }}
                    />
                  </Box>

                  {/* Last Login */}
                  {user.lastLogin && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', mb: 0.5, display: 'block' }}>
                        Last Login
                      </Typography>
                      <Typography variant="body2" color="#1a1a1a">
                        {formatDateTime(user.lastLogin)}
                      </Typography>
                    </Box>
                  )}

                  {/* Member Since */}
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', mb: 0.5, display: 'block' }}>
                      Member Since
                    </Typography>
                    <Typography variant="body2" color="#1a1a1a">
                      {formatDate(user.createdAt)}
                    </Typography>
                  </Box>
                </Box>

                {(user.isInvited || !user.isActive) && (
                  <Box mt={2}>
                    {user.isInvited && (
                      <Alert severity="info" sx={{ py: 1, fontSize: '0.875rem' }}>
                        Invited - account setup pending
                      </Alert>
                    )}
                    {!user.isActive && (
                      <Alert severity="warning" sx={{ py: 1, fontSize: '0.875rem' }}>
                        Account inactive
                      </Alert>
                    )}
                  </Box>
                )}
              </Box>
            </Card>
          </Box>
        </Box>

        {/* Right Panel - Contact List */}
        <Box sx={{ 
          width: { xs: '100%', md: 320 }, 
          borderLeft: { xs: 'none', md: '1px solid #e0e0e0' },
          borderTop: { xs: '1px solid #e0e0e0', md: 'none' },
          pl: { xs: 0, md: 3 },
          pt: { xs: 3, md: 0 }
        }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant={isMobile ? 'subtitle1' : 'h6'} fontWeight={600} color="#1a1a1a">
                Contact list
              </Typography>
              <LockIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            </Box>
          </Box>

          {loadingUsers ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <List sx={{ 
              maxHeight: { xs: '400px', md: 'calc(100vh - 200px)' }, 
              overflowY: 'auto', 
              pr: { xs: 0, md: 1 } 
            }}>
              {allUsers.filter(u => u.isActive).map((contactUser) => (
                <ListItem
                  key={contactUser._id}
                  disablePadding
                  sx={{
                    mb: 0.5,
                    borderRadius: 1,
                    backgroundColor: contactUser._id === user._id ? '#e3f2fd' : 'transparent',
                    '&:hover': {
                      backgroundColor: contactUser._id === user._id ? '#e3f2fd' : '#f5f5f5'
                    }
                  }}
                >
                  <ListItemButton
                    onClick={() => navigate(`/profile/${contactUser._id}`)}
                    selected={contactUser._id === user._id}
                    sx={{
                      borderRadius: 1,
                      py: 1.5,
                      '&.Mui-selected': {
                        backgroundColor: '#e3f2fd',
                        '&:hover': {
                          backgroundColor: '#e3f2fd'
                        }
                      }
                    }}
                  >
                    <ListItemAvatar>
                      <AvatarIcon 
                        user={contactUser}
                        userId={contactUser._id}
                        showTooltip={false}
                      />
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography
                            sx={{
                              fontWeight: contactUser._id === user._id ? 600 : 400,
                              fontSize: '0.9375rem'
                            }}
                          >
                            {contactUser.firstName && contactUser.lastName
                              ? `${contactUser.firstName} ${contactUser.lastName}`
                              : contactUser.firstName 
                              ? contactUser.firstName 
                              : contactUser.lastName 
                              ? contactUser.lastName 
                              : contactUser.email}
                          </Typography>
                          {contactUser._id === currentUser?.id && (
                            <Tooltip title="Your profile">
                              <PersonIcon 
                                sx={{ 
                                  fontSize: 16, 
                                  color: '#1bcddc',
                                  ml: 0.5
                                }} 
                              />
                            </Tooltip>
                          )}
                        </Box>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Box>
    </MainLayout>
  );
};

export default UserProfile;

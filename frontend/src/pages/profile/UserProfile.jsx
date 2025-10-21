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
  Chip
} from '@mui/material';
import {
  Edit as EditIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Security as SecurityIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';

import MainLayout from '../../components/layout/MainLayout';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { getUserProfile } from '../../services/api';
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

const UserProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { isAdmin, isOperationsManager } = usePermissions();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);

  const isOwnProfile = !userId || userId === currentUser?.id;
  const canEditProfile = isOwnProfile || isAdmin || isOperationsManager;

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getUserProfile(userId);
      setUser(response.data.user);
    } catch (err) {
      setError('Failed to load profile.');
    } finally {
      setLoading(false);
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
    <MainLayout>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" fontWeight={700} color="primary.main" gutterBottom>
          👤 {isOwnProfile ? 'My Profile' : `${user.username || user.email}'s Profile`}
        </Typography>
        {canEditProfile && (
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/profile/edit/${user._id}`)}
            sx={{ 
              backgroundColor: '#1bcddc', 
              color: '#fff', 
              fontWeight: 700, 
              px: 3, 
              borderRadius: 2, 
              boxShadow: 'none', 
              '&:hover': { backgroundColor: '#17b3c0' } 
            }}
          >
            Edit Profile
          </Button>
        )}
      </Box>

      <Box display="flex" gap={4}>
        {/* Profile Card */}
        <Card sx={{ borderRadius: 3, boxShadow: '0 2px 8px #eee', p: 3, minWidth: 300 }}>
          <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
            <AvatarIcon 
              user={user} 
              userId={user._id}
              showTooltip={false}
            />
            <Typography variant="h5" fontWeight={600} mt={2} textAlign="center">
              {user.username || 'No username set'}
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              {user.email}
            </Typography>
          </Box>

          <Divider sx={{ mb: 3 }} />

          <Box display="flex" flexDirection="column" gap={2}>
            <Box display="flex" alignItems="center" gap={2}>
              <SecurityIcon color="primary" />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Role
                </Typography>
                <Chip
                  label={ROLE_LABELS[user.role] || user.role}
                  size="small"
                  sx={{
                    backgroundColor: ROLE_COLORS[user.role] || '#666',
                    color: 'white',
                    fontWeight: 600,
                    borderRadius: 1,
                    mt: 0.5
                  }}
                />
              </Box>
            </Box>

            <Box display="flex" alignItems="center" gap={2}>
              <CalendarIcon color="primary" />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Account Status
                </Typography>
                <Chip
                  label={user.isActive ? 'Active' : 'Inactive'}
                  size="small"
                  color={user.isActive ? 'success' : 'default'}
                  sx={{ borderRadius: 1, mt: 0.5 }}
                />
              </Box>
            </Box>

            {user.lastLogin && (
              <Box display="flex" alignItems="center" gap={2}>
                <CalendarIcon color="primary" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Last Login
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {formatDateTime(user.lastLogin)}
                  </Typography>
                </Box>
              </Box>
            )}

            <Box display="flex" alignItems="center" gap={2}>
              <CalendarIcon color="primary" />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Member Since
                </Typography>
                <Typography variant="body2" fontWeight={500}>
                  {formatDate(user.createdAt)}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Card>

        {/* Additional Info Card */}
        <Card sx={{ borderRadius: 3, boxShadow: '0 2px 8px #eee', p: 3, flex: 1 }}>
          <Typography variant="h6" fontWeight={600} mb={3}>
            Account Information
          </Typography>

          <Box display="flex" flexDirection="column" gap={3}>
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Email Address
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <EmailIcon color="primary" fontSize="small" />
                <Typography variant="body1" fontWeight={500}>
                  {user.email}
                </Typography>
              </Box>
            </Box>

            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Username
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <PersonIcon color="primary" fontSize="small" />
                <Typography variant="body1" fontWeight={500}>
                  {user.username || 'Not set'}
                </Typography>
              </Box>
            </Box>

            {user.isInvited && (
              <Alert severity="info" sx={{ mt: 2 }}>
                This user was invited and may not have completed their account setup yet.
              </Alert>
            )}

            {!user.isActive && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                This account is currently inactive.
              </Alert>
            )}
          </Box>
        </Card>
      </Box>
    </MainLayout>
  );
};

export default UserProfile;

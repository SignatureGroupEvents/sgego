import React from 'react';
import { Avatar, IconButton, Tooltip } from '@mui/material';
import { useNavigate } from 'react-router-dom';

function stringToColor(string) {
  let hash = 0;
  for (let i = 0; i < string.length; i++) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Convert hash to HSL for better color control
  const hue = Math.abs(hash) % 360;
  const saturation = 70; // Keep colors vibrant
  const lightness = 50; // Keep colors medium brightness for good contrast
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function stringAvatar(name) {
  return {
    sx: {
      bgcolor: stringToColor(name),
    },
  };
}       

// Extract initials from username (first name initial + last name initial)
function getInitials(username) {
  if (!username) return 'U';
  
  const parts = username.trim().split(' ');
  if (parts.length === 1) {
    // Only one name, return first two characters
    return parts[0].substring(0, 2).toUpperCase();
  } else {
    // Multiple names, return first letter of first and last name
    const firstInitial = parts[0].charAt(0).toUpperCase();
    const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
    return firstInitial + lastInitial;
  }
}

export default function AvatarIcon({ user, userId, showTooltip = true }) {
  const navigate = useNavigate();
  
  const handleAvatarClick = () => {
    if (userId) {
      navigate(`/account/edit/${userId}`);
    }
  };

  const initials = getInitials(user.username);
  const displayName = user.username || 'Unknown';

  const avatarElement = (
    <Avatar {...stringAvatar(displayName)}>
      {initials}
    </Avatar>
  );

  const tooltipTitle = showTooltip ? `${displayName}${user.email ? ` (${user.email})` : ''}` : '';

  if (userId) {
    return (
      <Tooltip title={tooltipTitle} arrow>
        <IconButton 
          onClick={handleAvatarClick}
          size="small"
          sx={{ 
            p: 0,
            '&:hover': {
              transform: 'scale(1.1)',
              transition: 'transform 0.2s ease-in-out'
            }
          }}
        >
          {avatarElement}
        </IconButton>
      </Tooltip>
    );
  }

  return showTooltip ? (
    <Tooltip title={tooltipTitle} arrow>
      {avatarElement}
    </Tooltip>
  ) : avatarElement;
}
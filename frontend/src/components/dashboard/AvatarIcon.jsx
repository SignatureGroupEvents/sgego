import React from 'react';
import { Avatar, IconButton, Tooltip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { getUserDisplayName } from '../../utils/userDisplay';

function stringToColor(string) {
  if (!string) return '#9e9e9e';
  let hash = 0;
  for (let i = 0; i < string.length; i++) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  const saturation = 70;
  const lightness = 50;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function stringAvatar(displayName, profileColor) {
  return {
    sx: {
      bgcolor: (profileColor && String(profileColor).trim()) ? profileColor.trim() : stringToColor(displayName),
    },
  };
}

/** Initials from display name (e.g. "Lisa Scott" -> "LS", "John" -> "JO") */
function getInitials(displayName) {
  if (!displayName || displayName === 'Someone') return '?';
  const parts = String(displayName).trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return displayName.slice(0, 2).toUpperCase();
}

export default function AvatarIcon({ user, userId, showTooltip = true }) {
  const navigate = useNavigate();

  if (!user) return null;

  const displayName = getUserDisplayName(user, 'Someone');
  const initials = getInitials(displayName);
  const profileColor = user.profileColor || null;

  const avatarElement = (
    <Avatar {...stringAvatar(displayName, profileColor)}>
      {initials}
    </Avatar>
  );

  const handleAvatarClick = () => {
    if (userId) navigate(`/profile/${userId}`);
  };

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
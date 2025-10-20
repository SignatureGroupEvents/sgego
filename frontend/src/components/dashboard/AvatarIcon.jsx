import React from 'react';
import { Avatar, IconButton, Tooltip } from '@mui/material';
import { useNavigate } from 'react-router-dom';

function stringToColor(string) {
  let hash = 0;
  for (let i = 0; i < string.length; i++) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
}

function stringAvatar(name) {
  return {
    sx: {
      bgcolor: stringToColor(name),
    },
  };
}       

export default function AvatarIcon({ user, userId, showTooltip = true }) {
  const navigate = useNavigate();
  
  const handleAvatarClick = () => {
    if (userId) {
      navigate(`/account/edit/${userId}`);
    }
  };

  const avatarElement = (
    <Avatar {...stringAvatar(user.username)}>
      {user.username.charAt(0)}
    </Avatar>
  );

  const tooltipTitle = showTooltip ? `${user.username}${user.email ? ` (${user.email})` : ''}` : '';

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
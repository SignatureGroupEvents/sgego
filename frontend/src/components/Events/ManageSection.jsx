import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import InventoryIcon from '@mui/icons-material/Inventory';
import UploadIcon from '@mui/icons-material/Upload';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EventIcon from '@mui/icons-material/Event';

const BUTTON_SIZE = { xs: '100%', sm: 250 };

const ManageSection = ({
  onInventory,
  onUpload,
  onAddGuest,
  onAddEvent,
  canModify
}) => (
  <Box
    sx={{
      mt: 3,
      mb: 4,
      px: { xs: 1, sm: 3 },
      py: 2,
      borderRadius: 5,
      backgroundColor: '#f5f6f7',
      border: '1px solid #e0e0e0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      boxShadow: 0,
    }}
  >
    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, ml: 1 }}>
      Manage Your Event
    </Typography>
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        flexWrap: { xs: 'nowrap', sm: 'wrap' },
        gap: 2,
        width: '100%',
        justifyContent: { xs: 'center', sm: 'flex-start' },
        alignItems: { xs: 'stretch', sm: 'center' },
      }}
    >
      <Button
        variant="outlined"
        startIcon={<InventoryIcon />}
        onClick={onInventory}
        sx={{
          borderRadius: 5,
          fontWeight: 600,
          minWidth: BUTTON_SIZE,
          width: BUTTON_SIZE,
          height: 40,
        }}
      >
        Inventory
      </Button>
      {canModify && (
        <Button
          variant="outlined"
          startIcon={<UploadIcon />}
          onClick={onUpload}
          sx={{
            borderRadius: 5,
            fontWeight: 600,
            minWidth: BUTTON_SIZE,
            width: BUTTON_SIZE,
            height: 40,
          }}
        >
          Upload More Guests
        </Button>
      )}
      <Button
        variant="outlined"
        startIcon={<PersonAddIcon />}
        onClick={onAddGuest}
        sx={{
          borderRadius: 5,
          fontWeight: 600,
          minWidth: BUTTON_SIZE,
          width: BUTTON_SIZE,
          height: 40,
        }}
      >
        Add Single Guest
      </Button>
      {canModify && (
        <Button
          variant="contained"
          startIcon={<EventIcon />}
          onClick={onAddEvent}
          sx={{
            borderRadius: 5,
            fontWeight: 600,
            minWidth: { xs: '100%', sm: 300 },
            width: { xs: '100%', sm: 300 },
            height: 40,
            color: 'white',
            '&:hover': {
              color: 'white',
            },
            '&:active': {
              color: 'white',
            },
          }}
        >
          Add Additional Event
        </Button>
      )}
    </Box>
  </Box>
);

export default ManageSection; 
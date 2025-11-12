import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  LocalOffer as LocalOfferIcon
} from '@mui/icons-material';
import api from '../../services/api';
import toast from 'react-hot-toast';

const TagManagement = ({ event, onUpdate }) => {
  const [tags, setTags] = useState(event?.availableTags || []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState('#1976d2');
  const [tagDescription, setTagDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const presetColors = [
    '#1976d2', '#d32f2f', '#388e3c', '#f57c00', '#7b1fa2',
    '#0288d1', '#c2185b', '#00796b', '#e64a19', '#5d4037',
    '#455a64', '#1976d2', '#303f9f', '#512da8', '#7b1fa2'
  ];

  const handleOpenDialog = (tag = null) => {
    if (tag) {
      setEditingTag(tag);
      setTagName(tag.name || '');
      setTagColor(tag.color || '#1976d2');
      setTagDescription(tag.description || '');
    } else {
      setEditingTag(null);
      setTagName('');
      setTagColor('#1976d2');
      setTagDescription('');
    }
    setError('');
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingTag(null);
    setTagName('');
    setTagColor('#1976d2');
    setTagDescription('');
    setError('');
  };

  const handleSaveTag = async () => {
    if (!tagName.trim()) {
      setError('Tag name is required');
      return;
    }

    // Check for duplicate names (excluding the tag being edited)
    const existingTag = tags.find(
      t => t.name.toLowerCase() === tagName.trim().toLowerCase() && 
      (!editingTag || t._id !== editingTag._id)
    );
    if (existingTag) {
      setError('A tag with this name already exists');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const updatedTags = [...tags];
      
      if (editingTag) {
        // Update existing tag
        const index = updatedTags.findIndex(t => t._id === editingTag._id || t.name === editingTag.name);
        if (index !== -1) {
          updatedTags[index] = {
            ...updatedTags[index],
            name: tagName.trim(),
            color: tagColor,
            description: tagDescription.trim()
          };
        }
      } else {
        // Add new tag
        updatedTags.push({
          name: tagName.trim(),
          color: tagColor,
          description: tagDescription.trim()
        });
      }

      // Update event with new tags
      const response = await api.put(`/events/${event._id}`, {
        availableTags: updatedTags
      });

      setTags(updatedTags);
      handleCloseDialog();
      
      if (onUpdate) {
        onUpdate(response.data.event);
      }
      
      toast.success(editingTag ? 'Tag updated successfully' : 'Tag created successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save tag');
      toast.error(err.response?.data?.message || 'Failed to save tag');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTag = async (tagToDelete) => {
    if (!window.confirm(`Are you sure you want to delete the tag "${tagToDelete.name}"? This will remove it from all guests that have this tag.`)) {
      return;
    }

    try {
      const updatedTags = tags.filter(t => 
        (t._id && t._id !== tagToDelete._id) || 
        (!t._id && t.name !== tagToDelete.name)
      );

      const response = await api.put(`/events/${event._id}`, {
        availableTags: updatedTags
      });

      setTags(updatedTags);
      
      if (onUpdate) {
        onUpdate(response.data.event);
      }
      
      toast.success('Tag deleted successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete tag');
    }
  };

  return (
    <Card sx={{ borderRadius: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocalOfferIcon color="primary" />
            Guest Tags
          </Typography>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Tag
          </Button>
        </Box>

        {tags.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            No tags created yet. Create tags to organize and categorize your guests.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {tags.map((tag, index) => (
              <Chip
                key={tag._id || tag.name || index}
                label={tag.name}
                sx={{
                  backgroundColor: tag.color || '#1976d2',
                  color: 'white',
                  '&:hover': {
                    opacity: 0.8
                  }
                }}
                icon={<LocalOfferIcon sx={{ color: 'white !important' }} />}
                onDelete={() => handleDeleteTag(tag)}
                deleteIcon={
                  <Tooltip title="Delete tag">
                    <DeleteIcon sx={{ color: 'white !important' }} />
                  </Tooltip>
                }
                onClick={() => handleOpenDialog(tag)}
                clickable
              />
            ))}
          </Box>
        )}

        {/* Create/Edit Tag Dialog */}
        <Dialog 
          open={dialogOpen} 
          onClose={handleCloseDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {editingTag ? 'Edit Tag' : 'Create New Tag'}
          </DialogTitle>
          <DialogContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField
                fullWidth
                label="Tag Name"
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
                required
                placeholder="e.g., VIP, Speaker, Sponsor"
              />

              <TextField
                fullWidth
                label="Description (optional)"
                value={tagDescription}
                onChange={(e) => setTagDescription(e.target.value)}
                multiline
                rows={2}
                placeholder="Add a description for this tag"
              />

              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Tag Color
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Box
                    sx={{
                      width: 50,
                      height: 50,
                      backgroundColor: tagColor,
                      borderRadius: 1,
                      border: '2px solid',
                      borderColor: 'divider',
                      flexShrink: 0
                    }}
                  />
                  <TextField
                    value={tagColor}
                    onChange={(e) => setTagColor(e.target.value)}
                    placeholder="#1976d2"
                    size="small"
                    sx={{ flex: 1 }}
                    helperText="Enter hex color code (e.g., #1976d2)"
                  />
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {presetColors.map((color) => (
                    <Box
                      key={color}
                      onClick={() => setTagColor(color)}
                      sx={{
                        width: 32,
                        height: 32,
                        backgroundColor: color,
                        borderRadius: 1,
                        border: tagColor === color ? '3px solid' : '1px solid',
                        borderColor: tagColor === color ? 'primary.main' : 'divider',
                        cursor: 'pointer',
                        '&:hover': {
                          opacity: 0.8,
                          transform: 'scale(1.1)'
                        },
                        transition: 'all 0.2s'
                      }}
                    />
                  ))}
                </Box>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveTag}
              variant="contained"
              disabled={saving || !tagName.trim()}
              startIcon={saving ? <CircularProgress size={20} /> : null}
            >
              {saving ? 'Saving...' : editingTag ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default TagManagement;


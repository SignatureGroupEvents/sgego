import React, { useState, useRef } from 'react';
import { Box, Typography, Button, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Alert, CircularProgress, Snackbar, IconButton, Autocomplete, TextField, Chip, FormControl, InputLabel, Select, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Upload as UploadIcon, Edit as EditIcon, Delete as DeleteIcon, Save as SaveIcon, Cancel as CancelIcon, FileDownload as FileDownloadIcon, Home as HomeIcon } from '@mui/icons-material';
import { uploadInventoryCSV, fetchInventory, updateInventoryItem, addInventoryItem, deleteInventoryItem, updateInventoryAllocation, exportInventoryCSV, exportInventoryExcel } from '../../services/api';
import { useParams } from 'react-router-dom';
import MainNavigation from '../layout/MainNavigation';
import { getEvent, getEvents } from '../../services/events';
import EventIcon from '@mui/icons-material/Event';
import { useAuth } from '../../contexts/AuthContext';

const InventoryPage = ({ eventId }) => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef();
  const [editRowId, setEditRowId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [deletingId, setDeletingId] = useState(null);
  const [event, setEvent] = useState(null);
  const [parentEvent, setParentEvent] = useState(null);
  const [allEvents, setAllEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editValuesMap, setEditValuesMap] = useState({});
  const [addItemModalOpen, setAddItemModalOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    type: '',
    style: '',
    size: '',
    gender: '',
    qtyWarehouse: 0,
    qtyBeforeEvent: 0,
    postEventCount: 0
  });
  const { isOperationsManager, isAdmin } = (typeof useAuth === 'function' ? useAuth() : { isOperationsManager: false, isAdmin: false });
  
  // Determine if user can modify inventory
  const canModifyInventory = isOperationsManager || isAdmin;

  const loadInventory = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchInventory(eventId);
      setInventory(res.data.inventory || []);
    } catch (err) {
      setError('Failed to load inventory.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadInventory();
    // Fetch event details for breadcrumbs
    getEvent(eventId).then(ev => {
      setEvent(ev);
      if (ev && ev.parentEventId) {
        getEvent(ev.parentEventId).then(setParentEvent);
      } else {
        setParentEvent(null);
      }
    });
    // Fetch all events for allocation dropdown
    setEventsLoading(true);
    getEvents().then(res => {
      const all = res.events || res;
      setAllEvents(all);
      // Filter: main event and its children
      let mainEvent = all.find(ev => ev._id === eventId) || all.find(ev => ev._id === (event && event._id));
      if (!mainEvent) mainEvent = all.find(ev => ev._id === (parentEvent && parentEvent._id));
      if (!mainEvent) mainEvent = all.find(ev => ev._id === (event && event.parentEventId));
      if (!mainEvent) mainEvent = all.find(ev => ev._id === (parentEvent && parentEvent.parentEventId));
      if (!mainEvent) mainEvent = all.find(ev => ev._id === eventId);
      if (!mainEvent) mainEvent = all[0];
      const children = all.filter(ev => ev.parentEventId === mainEvent._id);
      setFilteredEvents([mainEvent, ...children]);
      setEventsLoading(false);
    });
    // eslint-disable-next-line
  }, [eventId]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError('');
    setSuccess('');
    try {
      await uploadInventoryCSV(eventId, file);
      setSuccess('Inventory uploaded successfully!');
      loadInventory();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload inventory.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleEditClick = (item) => {
    setEditRowId(item._id);
    setEditValues({
      qtyWarehouse: item.qtyWarehouse,
      qtyOnSite: item.qtyOnSite,
      currentInventory: item.currentInventory,
    });
  };

  const handleEditChange = (field, value) => {
    setEditValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditSave = async (item) => {
    // Convert to numbers and validate
    const values = {
      qtyWarehouse: Number(editValues.qtyWarehouse),
      qtyOnSite: Number(editValues.qtyOnSite),
      currentInventory: Number(editValues.currentInventory),
    };
    if (
      isNaN(values.qtyWarehouse) ||
      isNaN(values.qtyOnSite) ||
      isNaN(values.currentInventory) ||
      values.currentInventory === null ||
      values.currentInventory === undefined
    ) {
      setError('All inventory fields must be valid numbers.');
      return;
    }
    try {
      await updateInventoryItem(item._id, values);
      setSuccess('Inventory item updated!');
      setEditRowId(null);
      loadInventory();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update inventory item.');
    }
  };

  const handleEditCancel = () => {
    setEditRowId(null);
    setEditValues({});
  };

  const handleEnterEditMode = () => {
    setIsEditMode(true);
    // Initialize edit values for all inventory items
    const initialEditValues = {};
    inventory.forEach(item => {
      initialEditValues[item._id] = {
        qtyBeforeEvent: item.qtyBeforeEvent || item.qtyOnSite || 0,
        postEventCount: item.postEventCount || 0,
      };
    });
    setEditValuesMap(initialEditValues);
  };

  const handleExitEditMode = () => {
    setIsEditMode(false);
    setEditValuesMap({});
  };

  const handleEditValueChange = (itemId, field, value) => {
    setEditValuesMap(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value
      }
    }));
  };

  const handleSaveAllChanges = async () => {
    try {
      // Save all changes
      const savePromises = Object.entries(editValuesMap).map(([itemId, values]) => {
        const numericValues = {
          qtyBeforeEvent: Number(values.qtyBeforeEvent),
          postEventCount: Number(values.postEventCount),
        };
        
        // Validate values
        if (
          isNaN(numericValues.qtyBeforeEvent) ||
          isNaN(numericValues.postEventCount) ||
          numericValues.qtyBeforeEvent < 0 ||
          numericValues.postEventCount < 0
        ) {
          throw new Error(`Invalid values for item ${itemId}`);
        }
        
        return updateInventoryItem(itemId, numericValues);
      });
      
      await Promise.all(savePromises);
      setSuccess('All inventory items updated successfully!');
      setIsEditMode(false);
      setEditValuesMap({});
      loadInventory();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update inventory items.');
    }
  };

  const handleDeleteClick = (itemId) => {
    setDeletingId(itemId);
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteInventoryItem(deletingId);
      setSuccess('Inventory item deleted!');
      setDeletingId(null);
      loadInventory();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete inventory item.');
    }
  };

  const handleDeleteCancel = () => {
    setDeletingId(null);
  };

  const handleAllocationChange = async (item, newAllocatedEvents) => {
    try {
      await updateInventoryAllocation(item._id, newAllocatedEvents.map(ev => ev._id));
      setSuccess('Inventory allocation updated!');
      loadInventory();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update allocation.');
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await exportInventoryCSV(eventId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `inventory_${event?.eventContractNumber || eventId}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setSuccess('CSV exported successfully!');
    } catch (err) {
      setError('Failed to export CSV.');
    }
  };

  const handleExportExcel = async () => {
    try {
      const response = await exportInventoryExcel(eventId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `inventory_${event?.eventContractNumber || eventId}_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setSuccess('Excel file exported successfully!');
    } catch (err) {
      setError('Failed to export Excel file.');
    }
  };

  const handleOpenAddItemModal = () => {
    setAddItemModalOpen(true);
    setNewItem({
      type: '',
      style: '',
      size: '',
      gender: '',
      qtyWarehouse: 0,
      qtyBeforeEvent: 0,
      postEventCount: 0
    });
  };

  const handleCloseAddItemModal = () => {
    setAddItemModalOpen(false);
    setNewItem({
      type: '',
      style: '',
      size: '',
      gender: '',
      qtyWarehouse: 0,
      qtyBeforeEvent: 0,
      postEventCount: 0
    });
  };

  const handleNewItemChange = (field, value) => {
    setNewItem(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddItem = async () => {
    try {
      // Validate required fields
      if (!newItem.type || !newItem.style) {
        setError('Type and Style are required fields.');
        return;
      }

      // Convert numeric fields
      const itemData = {
        ...newItem,
        qtyWarehouse: Number(newItem.qtyWarehouse),
        qtyBeforeEvent: Number(newItem.qtyBeforeEvent),
        postEventCount: Number(newItem.postEventCount)
      };

      // Validate numeric values
      if (
        isNaN(itemData.qtyWarehouse) ||
        isNaN(itemData.qtyBeforeEvent) ||
        isNaN(itemData.postEventCount) ||
        itemData.qtyWarehouse < 0 ||
        itemData.qtyBeforeEvent < 0 ||
        itemData.postEventCount < 0
      ) {
        setError('All quantity fields must be valid numbers.');
        return;
      }

      // Add the new item to the inventory
      await addInventoryItem(eventId, itemData);
      setSuccess('Inventory item added successfully!');
      handleCloseAddItemModal();
      loadInventory();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add inventory item.');
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <MainNavigation />
<<<<<<< HEAD
      <Box sx={{ flex: 1, overflow: 'auto', p: 4 }}>
        <Typography variant="h4" fontWeight={700} color="primary.main" gutterBottom>
          Inventory Management
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>
          {event?.eventName} - {event?.eventContractNumber}
        </Typography>

        {/* Alerts */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {/* Actions */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {canModifyInventory && (
            <>
              <Button
                variant="contained"
                startIcon={<UploadIcon />}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                sx={{ borderRadius: 2, fontWeight: 600 }}
              >
                {uploading ? 'Uploading...' : 'Upload CSV/Excel'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <Button
                variant="contained"
                color="secondary"
                onClick={handleOpenAddItemModal}
                sx={{ borderRadius: 2, fontWeight: 600 }}
              >
                Add Item
              </Button>
            </>
          )}
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={handleExportCSV}
            sx={{ borderRadius: 2 }}
          >
>>>>>>> origin/byoung
            Export CSV
          </Button>
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={handleExportExcel}
            sx={{ borderRadius: 2 }}
          >
            Export Excel
          </Button>
        </Box>
<<<<<<< HEAD

        {/* Inventory Table */}
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Inventory Items ({inventory.length})
            </Typography>
            
            {inventory.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No inventory items
                </Typography>
                <Typography color="textSecondary" paragraph>
                  Upload a CSV or Excel file to get started.
                </Typography>
                {canModifyInventory && (
                  <Button
                    variant="contained"
                    startIcon={<UploadIcon />}
                    onClick={() => fileInputRef.current?.click()}
                    sx={{ borderRadius: 2, fontWeight: 600 }}
                  >
                    Upload Inventory
                  </Button>
                )}
              </Box>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table>
>>>>>>> origin/byoung
                  <TableHead>
                    <TableRow>
                      <TableCell>Item</TableCell>
                      <TableCell>Style</TableCell>
                      <TableCell>Size</TableCell>
                      <TableCell>Gender</TableCell>
                      <TableCell>Qty Warehouse</TableCell>
                      <TableCell>Qty Before Event</TableCell>
                      <TableCell>Current Inventory</TableCell>
                      <TableCell>Post Event Count</TableCell>
                      <TableCell>Allocated Events</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {inventory.map((item) => (
                      <TableRow key={item._id} hover>
                        <TableCell>
                          <Typography variant="subtitle2" fontWeight={600}>
                            {item.type || item.item}
                          </Typography>
                        </TableCell>
                        <TableCell>{item.style || '-'}</TableCell>
                        <TableCell>{item.size || '-'}</TableCell>
                        <TableCell>{item.gender || '-'}</TableCell>
                        <TableCell>
                          {isEditMode ? (
                            <TextField
                              type="number"
                              size="small"
                              value={editValuesMap[item._id]?.qtyWarehouse || item.qtyWarehouse || 0}
                              onChange={(e) => handleEditValueChange(item._id, 'qtyWarehouse', e.target.value)}
                              sx={{ width: 80 }}
                            />
                          ) : (
                            item.qtyWarehouse || 0
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditMode ? (
                            <TextField
                              type="number"
                              size="small"
                              value={editValuesMap[item._id]?.qtyBeforeEvent || item.qtyBeforeEvent || item.qtyOnSite || 0}
                              onChange={(e) => handleEditValueChange(item._id, 'qtyBeforeEvent', e.target.value)}
                              sx={{ width: 80 }}
                            />
                          ) : (
                            item.qtyBeforeEvent || item.qtyOnSite || 0
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography 
                            variant="body2" 
                            color={item.currentInventory > 0 ? 'success.main' : 'error.main'}
                            fontWeight={600}
                          >
                            {item.currentInventory || 0}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {isEditMode ? (
                            <TextField
                              type="number"
                              size="small"
                              value={editValuesMap[item._id]?.postEventCount || item.postEventCount || 0}
                              onChange={(e) => handleEditValueChange(item._id, 'postEventCount', e.target.value)}
                              sx={{ width: 80 }}
                            />
                          ) : (
                            item.postEventCount || 0
                          )}
                        </TableCell>
                        <TableCell>
                          {eventsLoading ? (
                            <CircularProgress size={20} />
                          ) : (canModifyInventory) ? (
                            <Autocomplete
                              multiple
                              size="small"
                              options={filteredEvents}
                              getOptionLabel={option => option.eventName}
                              value={filteredEvents.filter(ev => item.allocatedEvents?.includes(ev._id))}
                              onChange={(_, newValue) => handleAllocationChange(item, newValue)}
                              renderInput={params => <TextField {...params} variant="outlined" label="Allocated Events" />}
                              renderTags={(value, getTagProps) =>
                                value.map((option, index) => (
                                  <Chip label={option.eventName} {...getTagProps({ index })} key={option._id} />
                                ))
                              }
                              disableCloseOnSelect
                              sx={{ minWidth: 200 }}
                            />
                          ) : (
                            <Box display="flex" flexWrap="wrap" gap={0.5}>
                              {filteredEvents.filter(ev => item.allocatedEvents?.includes(ev._id)).map(ev => (
                                <Chip key={ev._id} label={ev.eventName} size="small" />
                              ))}
                            </Box>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          {canModifyInventory && !isEditMode && (
                            <IconButton color="error" onClick={() => handleDeleteClick(item._id)} size="small">
                              <DeleteIcon />
                            </IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={!!deletingId}
          onClose={handleDeleteCancel}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Delete Inventory Item?</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Are you sure you want to delete this inventory item? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeleteCancel} variant="outlined">
              Cancel
            </Button>
            <Button onClick={handleDeleteConfirm} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>
        
        {/* Add Item Modal */}
        <Dialog 
          open={addItemModalOpen} 
          onClose={handleCloseAddItemModal}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              minWidth: 500,
              maxWidth: 600
            }
          }}
        >
          <DialogTitle>Add Inventory Item</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 2 }}>
              <TextField
                label="Type *"
                value={newItem.type}
                onChange={(e) => handleNewItemChange('type', e.target.value)}
                required
                fullWidth
              />
              <TextField
                label="Style *"
                value={newItem.style}
                onChange={(e) => handleNewItemChange('style', e.target.value)}
                required
                fullWidth
              />
              <TextField
                label="Size"
                value={newItem.size}
                onChange={(e) => handleNewItemChange('size', e.target.value)}
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>Gender</InputLabel>
                <Select
                  value={newItem.gender}
                  onChange={(e) => handleNewItemChange('gender', e.target.value)}
                  label="Gender"
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        zIndex: 9999
                      }
                    }
                  }}
                >
                  <MenuItem value="">
                    <em>Select gender (optional)</em>
                  </MenuItem>
                  <MenuItem value="M">Male (M)</MenuItem>
                  <MenuItem value="W">Female (W)</MenuItem>
                  <MenuItem value="N/A">Not Applicable (N/A)</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Qty Warehouse"
                type="number"
                value={newItem.qtyWarehouse}
                onChange={(e) => handleNewItemChange('qtyWarehouse', e.target.value)}
                fullWidth
                inputProps={{ min: 0 }}
              />
              <TextField
                label="Qty Before Event"
                type="number"
                value={newItem.qtyBeforeEvent}
                onChange={(e) => handleNewItemChange('qtyBeforeEvent', e.target.value)}
                fullWidth
                inputProps={{ min: 0 }}
              />
              <TextField
                label="Post Event Count"
                type="number"
                value={newItem.postEventCount}
                onChange={(e) => handleNewItemChange('postEventCount', e.target.value)}
                fullWidth
                inputProps={{ min: 0 }}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseAddItemModal} variant="outlined">
              Cancel
            </Button>
            <Button onClick={handleAddItem} variant="contained" color="primary">
              Add Item
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

// Wrapper component for use in routes
function InventoryPageWrapper() {
  const { eventId } = useParams();
  return <InventoryPage eventId={eventId} />;
}

export default InventoryPageWrapper; 
import React, { useState, useRef } from 'react';
import { Box, Typography, Button, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Alert, CircularProgress, Snackbar, IconButton, Autocomplete, TextField, Chip, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem, Grid } from '@mui/material';
import { Upload as UploadIcon, Edit as EditIcon, Delete as DeleteIcon, Save as SaveIcon, Cancel as CancelIcon, FileDownload as FileDownloadIcon, Home as HomeIcon, Add as AddIcon } from '@mui/icons-material';
import { uploadInventoryCSV, fetchInventory, updateInventoryItem, deleteInventoryItem, updateInventoryAllocation, exportInventoryCSV, exportInventoryExcel, addInventoryItem } from '../../services/api';
import { useParams } from 'react-router-dom';
import TopNavBar from '../TopNavBar';
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
  const [isEditMode, setIsEditMode] = useState(false);
  const [editValues, setEditValues] = useState({});
  const [deletingId, setDeletingId] = useState(null);
  const [event, setEvent] = useState(null);
  const [parentEvent, setParentEvent] = useState(null);
  const [allEvents, setAllEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [filteredEvents, setFilteredEvents] = useState([]);
  
  // Add Item Dialog State
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [newItem, setNewItem] = useState({
    type: '',
    style: '',
    size: '',
    gender: '',
    qtyWarehouse: 0,
    qtyBeforeEvent: 0,
    postEventCount: 0,
    notes: ''
  });
  
  const { isOperationsManager, isAdmin } = (typeof useAuth === 'function' ? useAuth() : { isOperationsManager: false, isAdmin: false });

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

  const handleEditModeToggle = () => {
    if (isEditMode) {
      // Cancel edit mode
      setIsEditMode(false);
      setEditValues({});
    } else {
      // Enter edit mode - initialize edit values for all items
      const initialEditValues = {};
      inventory.forEach(item => {
        initialEditValues[item._id] = {
          qtyWarehouse: item.qtyWarehouse,
          qtyBeforeEvent: item.qtyBeforeEvent,
          postEventCount: item.postEventCount || 0,
        };
      });
      setEditValues(initialEditValues);
      setIsEditMode(true);
    }
  };

  const handleEditChange = (itemId, field, value) => {
    setEditValues(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value
      }
    }));
  };

  const handleEditSave = async (item) => {
    const values = editValues[item._id];
    if (!values) return;

    // Convert to numbers and validate
    const validatedValues = {
      qtyWarehouse: Number(values.qtyWarehouse),
      qtyBeforeEvent: Number(values.qtyBeforeEvent),
      postEventCount: Number(values.postEventCount || 0),
    };
    
    if (
      isNaN(validatedValues.qtyWarehouse) ||
      isNaN(validatedValues.qtyBeforeEvent) ||
      isNaN(validatedValues.postEventCount)
    ) {
      setError('All inventory fields must be valid numbers.');
      return;
    }
    
    try {
      await updateInventoryItem(item._id, validatedValues);
      setSuccess('Inventory item updated!');
      loadInventory();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update inventory item.');
    }
  };

  const handleSaveAll = async () => {
    try {
      // Save all modified items
      const savePromises = inventory.map(item => {
        const values = editValues[item._id];
        if (!values) return Promise.resolve();
        
        const validatedValues = {
          qtyWarehouse: Number(values.qtyWarehouse),
          qtyBeforeEvent: Number(values.qtyBeforeEvent),
          postEventCount: Number(values.postEventCount || 0),
        };
        
        if (
          isNaN(validatedValues.qtyWarehouse) ||
          isNaN(validatedValues.qtyBeforeEvent) ||
          isNaN(validatedValues.postEventCount)
        ) {
          throw new Error('All inventory fields must be valid numbers.');
        }
        
        return updateInventoryItem(item._id, validatedValues);
      });
      
      await Promise.all(savePromises);
      setSuccess('All inventory items updated successfully!');
      setIsEditMode(false);
      setEditValues({});
      loadInventory();
    } catch (err) {
      setError(err.message || 'Failed to update inventory items.');
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

  // Add Item Handlers
  const handleAddItemClick = () => {
    setAddItemDialogOpen(true);
    setNewItem({
      type: '',
      style: '',
      size: '',
      gender: '',
      qtyWarehouse: 0,
      qtyBeforeEvent: 0,
      postEventCount: 0,
      notes: ''
    });
  };

  const handleAddItemClose = () => {
    setAddItemDialogOpen(false);
    setNewItem({
      type: '',
      style: '',
      size: '',
      gender: '',
      qtyWarehouse: 0,
      qtyBeforeEvent: 0,
      postEventCount: 0,
      notes: ''
    });
  };

  const handleNewItemChange = (field, value) => {
    setNewItem(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddItemSubmit = async () => {
    // Validate required fields
    if (!newItem.type || !newItem.style) {
      setError('Type and Style are required fields.');
      return;
    }

    // Validate numeric fields
    const numericFields = ['qtyWarehouse', 'qtyBeforeEvent', 'postEventCount'];
    for (const field of numericFields) {
      if (isNaN(Number(newItem[field])) || Number(newItem[field]) < 0) {
        setError(`${field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} must be a valid number.`);
        return;
      }
    }

    setAddingItem(true);
    setError('');

    try {
      await addInventoryItem(eventId, {
        ...newItem,
        qtyWarehouse: Number(newItem.qtyWarehouse),
        qtyBeforeEvent: Number(newItem.qtyBeforeEvent),
        postEventCount: Number(newItem.postEventCount)
      });
      
      setSuccess('Inventory item added successfully!');
      handleAddItemClose();
      loadInventory();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add inventory item.');
    } finally {
      setAddingItem(false);
    }
  };

  return (
<<<<<<< Updated upstream
    <Box sx={{ p: 4 }}>
      <TopNavBar
        breadcrumbs={[
          { label: 'Home', to: '/events', icon: <HomeIcon /> },
          ...(parentEvent
            ? [
                { label: parentEvent.eventName, to: `/events/${parentEvent._id}` },
                { label: event?.eventName, to: `/events/${event?._id}` },
                { label: 'Inventory' }
              ]
            : [
                { label: event?.eventName, to: `/events/${event?._id}` },
                { label: 'Inventory' }
              ]),
        ]}
      />
      <Typography variant="h4" gutterBottom>Inventory</Typography>
      <Box display="flex" gap={2} mb={2}>
        <Button variant="contained" color="primary" onClick={handleExportCSV} startIcon={<FileDownloadIcon />}>
          Export CSV
        </Button>
        <Button variant="contained" color="secondary" onClick={handleExportExcel} startIcon={<FileDownloadIcon />}>
          Export Excel
        </Button>
=======
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <MainNavigation />
      <Box sx={{ flex: 1, overflow: 'auto', p: 4 }}>
        <Typography variant="h4" gutterBottom>Inventory</Typography>
        
        {/* Action Buttons */}
        <Box display="flex" gap={2} mb={2} flexWrap="wrap" justifyContent="space-between" alignItems="center">
          <Box display="flex" gap={2} flexWrap="wrap">
            {isEditMode ? (
              <>
                <Button 
                  variant="contained" 
                  color="success" 
                  onClick={handleSaveAll} 
                  startIcon={<SaveIcon />}
                >
                  Save All Changes
                </Button>
                <Button 
                  variant="outlined" 
                  color="secondary" 
                  onClick={handleEditModeToggle} 
                  startIcon={<CancelIcon />}
                >
                  Cancel Edit
                </Button>
              </>
            ) : (
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleEditModeToggle} 
                startIcon={<EditIcon />}
              >
                Edit Inventory
              </Button>
            )}
            
            <Button variant="contained" color="primary" onClick={handleExportCSV} startIcon={<FileDownloadIcon />}>
              Export CSV
            </Button>
            <Button variant="contained" color="secondary" onClick={handleExportExcel} startIcon={<FileDownloadIcon />}>
              Export Excel
            </Button>
          </Box>
          
          {/* Add Item Button - Right Side */}
          <Button 
            variant="contained" 
            color="success" 
            onClick={handleAddItemClick} 
            startIcon={<AddIcon />}
            disabled={isEditMode}
          >
            Add Item
          </Button>
        </Box>
        
        <Typography variant="body2" color="textSecondary" mb={2}>
          {isEditMode 
            ? 'Edit mode is active. Click "Save All Changes" to save your modifications or "Cancel Edit" to discard changes.'
            : 'Upload a CSV file to import inventory for this event. The table below shows all inventory items for this event.'
          }
        </Typography>
        
        <Button
          variant="contained"
          startIcon={<UploadIcon />}
          component="label"
          disabled={uploading || isEditMode}
          sx={{ mb: 3 }}
        >
          {uploading ? 'Uploading...' : 'Upload Inventory CSV'}
          <input
            type="file"
            accept=".csv"
            hidden
            ref={fileInputRef}
            onChange={handleFileChange}
          />
        </Button>
        
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Snackbar open autoHideDuration={3000} onClose={() => setSuccess('')} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
          <Alert onClose={() => setSuccess('')} severity="success" sx={{ width: '100%' }}>{success}</Alert>
        </Snackbar>}
        
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px"><CircularProgress /></Box>
        ) : (
          <Card>
            <CardContent>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Type</TableCell>
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
                    {inventory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} align="center">No inventory found.</TableCell>
                      </TableRow>
                    ) : (
                      inventory.map(item => (
                        <TableRow key={item._id}>
                          <TableCell>{item.type}</TableCell>
                          <TableCell>{item.style}</TableCell>
                          <TableCell>{item.size}</TableCell>
                          <TableCell>{item.gender}</TableCell>
                          <TableCell>
                            {isEditMode && editValues[item._id] ? (
                              <input
                                type="number"
                                min="0"
                                required
                                value={editValues[item._id].qtyWarehouse}
                                onChange={e => handleEditChange(item._id, 'qtyWarehouse', e.target.value)}
                                style={{ width: 70 }}
                              />
                            ) : (
                              item.qtyWarehouse
                            )}
                          </TableCell>
                          <TableCell>
                            {isEditMode && editValues[item._id] ? (
                              <input
                                type="number"
                                min="0"
                                required
                                value={editValues[item._id].qtyBeforeEvent}
                                onChange={e => handleEditChange(item._id, 'qtyBeforeEvent', e.target.value)}
                                style={{ width: 70 }}
                              />
                            ) : (
                              item.qtyBeforeEvent
                            )}
                          </TableCell>
                          <TableCell>
                            {item.currentInventory}
                          </TableCell>
                          <TableCell>
                            {isEditMode && editValues[item._id] ? (
                              <input
                                type="number"
                                min="0"
                                value={editValues[item._id].postEventCount || 0}
                                onChange={e => handleEditChange(item._id, 'postEventCount', e.target.value)}
                                style={{ width: 70 }}
                              />
                            ) : (
                              item.postEventCount ?? '-'
                            )}
                          </TableCell>
                          <TableCell>
                            {eventsLoading ? (
                              <CircularProgress size={20} />
                            ) : (isOperationsManager || isAdmin) ? (
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
                            {isEditMode ? (
                              <IconButton 
                                color="success" 
                                onClick={() => handleEditSave(item)} 
                                size="small"
                                title="Save this item"
                              >
                                <SaveIcon />
                              </IconButton>
                            ) : (
                              <IconButton 
                                color="error" 
                                onClick={() => handleDeleteClick(item._id)} 
                                size="small"
                                title="Delete this item"
                              >
                                <DeleteIcon />
                              </IconButton>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              {deletingId && (
                <Box sx={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', bgcolor: 'rgba(0,0,0,0.2)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Card sx={{ minWidth: 300, p: 2 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Delete Inventory Item?</Typography>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        Are you sure you want to delete this inventory item? This action cannot be undone.
                      </Typography>
                      <Box display="flex" gap={2} justifyContent="flex-end" mt={2}>
                        <Button onClick={handleDeleteCancel} variant="outlined">Cancel</Button>
                        <Button onClick={handleDeleteConfirm} color="error" variant="contained">Delete</Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Box>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* Add Item Dialog */}
        <Dialog 
          open={addItemDialogOpen} 
          onClose={handleAddItemClose}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Add New Inventory Item</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Type *"
                  value={newItem.type}
                  onChange={(e) => handleNewItemChange('type', e.target.value)}
                  required
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Style *"
                  value={newItem.style}
                  onChange={(e) => handleNewItemChange('style', e.target.value)}
                  required
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Size"
                  value={newItem.size}
                  onChange={(e) => handleNewItemChange('size', e.target.value)}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Gender</InputLabel>
                  <Select
                    value={newItem.gender}
                    label="Gender"
                    onChange={(e) => handleNewItemChange('gender', e.target.value)}
                  >
                    <MenuItem value="">None</MenuItem>
                    <MenuItem value="Men">Men</MenuItem>
                    <MenuItem value="Women">Women</MenuItem>
                    <MenuItem value="Unisex">Unisex</MenuItem>
                    <MenuItem value="Youth">Youth</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Qty Warehouse"
                  type="number"
                  value={newItem.qtyWarehouse}
                  onChange={(e) => handleNewItemChange('qtyWarehouse', e.target.value)}
                  margin="normal"
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Qty Before Event"
                  type="number"
                  value={newItem.qtyBeforeEvent}
                  onChange={(e) => handleNewItemChange('qtyBeforeEvent', e.target.value)}
                  margin="normal"
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Post Event Count"
                  type="number"
                  value={newItem.postEventCount}
                  onChange={(e) => handleNewItemChange('postEventCount', e.target.value)}
                  margin="normal"
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  value={newItem.notes}
                  onChange={(e) => handleNewItemChange('notes', e.target.value)}
                  margin="normal"
                  multiline
                  rows={3}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleAddItemClose} disabled={addingItem}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddItemSubmit} 
              variant="contained" 
              color="success"
              disabled={addingItem || !newItem.type || !newItem.style}
              startIcon={addingItem ? <CircularProgress size={20} /> : <AddIcon />}
            >
              {addingItem ? 'Adding...' : 'Add Item'}
            </Button>
          </DialogActions>
        </Dialog>
>>>>>>> Stashed changes
      </Box>
      <Typography variant="body2" color="textSecondary" mb={2}>
        Upload a CSV file to import inventory for this event. The table below shows all inventory items for this event.
      </Typography>
      <Button
        variant="contained"
        startIcon={<UploadIcon />}
        component="label"
        disabled={uploading}
        sx={{ mb: 3 }}
      >
        {uploading ? 'Uploading...' : 'Upload Inventory CSV'}
        <input
          type="file"
          accept=".csv"
          hidden
          ref={fileInputRef}
          onChange={handleFileChange}
        />
      </Button>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Snackbar open autoHideDuration={3000} onClose={() => setSuccess('')} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={() => setSuccess('')} severity="success" sx={{ width: '100%' }}>{success}</Alert>
      </Snackbar>}
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px"><CircularProgress /></Box>
      ) : (
        <Card>
          <CardContent>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Type</TableCell>
                    <TableCell>Style</TableCell>
                    <TableCell>Size</TableCell>
                    <TableCell>Gender</TableCell>
                    <TableCell>Qty Warehouse</TableCell>
                    <TableCell>Qty On Site</TableCell>
                    <TableCell>Current Inventory</TableCell>
                    <TableCell>Post Event Count</TableCell>
                    <TableCell>Allocated Events</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {inventory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} align="center">No inventory found.</TableCell>
                    </TableRow>
                  ) : (
                    inventory.map(item => (
                      <TableRow key={item._id}>
                        <TableCell>{item.type}</TableCell>
                        <TableCell>{item.style}</TableCell>
                        <TableCell>{item.size}</TableCell>
                        <TableCell>{item.gender}</TableCell>
                        <TableCell>
                          {editRowId === item._id ? (
                            <input
                              type="number"
                              min="0"
                              required
                              value={editValues.qtyWarehouse}
                              onChange={e => handleEditChange('qtyWarehouse', e.target.value)}
                              style={{ width: 70 }}
                            />
                          ) : (
                            item.qtyWarehouse
                          )}
                        </TableCell>
                        <TableCell>
                          {editRowId === item._id ? (
                            <input
                              type="number"
                              min="0"
                              required
                              value={editValues.qtyOnSite}
                              onChange={e => handleEditChange('qtyOnSite', e.target.value)}
                              style={{ width: 70 }}
                            />
                          ) : (
                            item.qtyOnSite
                          )}
                        </TableCell>
                        <TableCell>
                          {editRowId === item._id ? (
                            <input
                              type="number"
                              min="0"
                              required
                              value={editValues.currentInventory}
                              onChange={e => handleEditChange('currentInventory', e.target.value)}
                              style={{ width: 70 }}
                            />
                          ) : (
                            item.currentInventory
                          )}
                        </TableCell>
                        <TableCell>{item.postEventCount ?? '-'}</TableCell>
                        <TableCell>
                          {eventsLoading ? (
                            <CircularProgress size={20} />
                          ) : (isOperationsManager || isAdmin) ? (
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
                          {editRowId === item._id ? (
                            <>
                              <IconButton color="success" onClick={() => handleEditSave(item)} size="small"><SaveIcon /></IconButton>
                              <IconButton color="inherit" onClick={handleEditCancel} size="small"><CancelIcon /></IconButton>
                            </>
                          ) : (
                            <>
                              <IconButton color="primary" onClick={() => handleEditClick(item)} size="small"><EditIcon /></IconButton>
                              <IconButton color="error" onClick={() => handleDeleteClick(item._id)} size="small"><DeleteIcon /></IconButton>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            {deletingId && (
              <Box sx={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', bgcolor: 'rgba(0,0,0,0.2)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Card sx={{ minWidth: 300, p: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Delete Inventory Item?</Typography>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Are you sure you want to delete this inventory item? This action cannot be undone.
                    </Typography>
                    <Box display="flex" gap={2} justifyContent="flex-end" mt={2}>
                      <Button onClick={handleDeleteCancel} variant="outlined">Cancel</Button>
                      <Button onClick={handleDeleteConfirm} color="error" variant="contained">Delete</Button>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

function InventoryPageWrapper() {
  const { eventId } = useParams();
  return <InventoryPage eventId={eventId} />;
}

export default InventoryPageWrapper; 
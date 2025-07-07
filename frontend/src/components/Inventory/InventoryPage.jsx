import React, { useState, useRef } from 'react';
import { Box, Typography, Button, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Alert, CircularProgress, Snackbar, IconButton, Autocomplete, TextField, Chip } from '@mui/material';
import { Upload as UploadIcon, Edit as EditIcon, Delete as DeleteIcon, Save as SaveIcon, Cancel as CancelIcon, FileDownload as FileDownloadIcon, Home as HomeIcon } from '@mui/icons-material';
import { uploadInventoryCSV, fetchInventory, updateInventoryItem, deleteInventoryItem, updateInventoryAllocation, exportInventoryCSV, exportInventoryExcel } from '../../services/api';
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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', height: '100vh' }}>
        <MainNavigation />
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <MainNavigation />
      <Box sx={{ flex: 1, overflow: 'auto', p: { xs: 2, md: 3 } }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight={700} color="primary.main" gutterBottom>
            Inventory Management
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            {event?.eventName} - {event?.eventContractNumber}
          </Typography>
        </Box>

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
            </>
          )}
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={handleExportCSV}
            sx={{ borderRadius: 2 }}
          >
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
                  <TableHead>
                    <TableRow>
                      <TableCell>Item</TableCell>
                      <TableCell>Style</TableCell>
                      <TableCell>Size</TableCell>
                      <TableCell>Warehouse</TableCell>
                      <TableCell>On Site</TableCell>
                      <TableCell>Current</TableCell>
                      {canModifyInventory && <TableCell>Actions</TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {inventory.map((item) => (
                      <TableRow key={item._id} hover>
                        <TableCell>
                          <Typography variant="subtitle2" fontWeight={600}>
                            {item.item}
                          </Typography>
                        </TableCell>
                        <TableCell>{item.style || '-'}</TableCell>
                        <TableCell>{item.size || '-'}</TableCell>
                        <TableCell>
                          {editRowId === item._id ? (
                            <TextField
                              type="number"
                              value={editValues.qtyWarehouse}
                              onChange={(e) => handleEditChange('qtyWarehouse', e.target.value)}
                              size="small"
                              sx={{ width: 80 }}
                            />
                          ) : (
                            item.qtyWarehouse || 0
                          )}
                        </TableCell>
                        <TableCell>
                          {editRowId === item._id ? (
                            <TextField
                              type="number"
                              value={editValues.qtyOnSite}
                              onChange={(e) => handleEditChange('qtyOnSite', e.target.value)}
                              size="small"
                              sx={{ width: 80 }}
                            />
                          ) : (
                            item.qtyOnSite || 0
                          )}
                        </TableCell>
                        <TableCell>
                          {editRowId === item._id ? (
                            <TextField
                              type="number"
                              value={editValues.currentInventory}
                              onChange={(e) => handleEditChange('currentInventory', e.target.value)}
                              size="small"
                              sx={{ width: 80 }}
                            />
                          ) : (
                            <Typography 
                              variant="body2" 
                              color={item.currentInventory > 0 ? 'success.main' : 'error.main'}
                              fontWeight={600}
                            >
                              {item.currentInventory || 0}
                            </Typography>
                          )}
                        </TableCell>
                        {canModifyInventory && (
                          <TableCell>
                            {editRowId === item._id ? (
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => handleEditSave(item)}
                                >
                                  <SaveIcon />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  color="default"
                                  onClick={handleEditCancel}
                                >
                                  <CancelIcon />
                                </IconButton>
                              </Box>
                            ) : (
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => handleEditClick(item)}
                                >
                                  <EditIcon />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDeleteClick(item._id)}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Box>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <Snackbar
          open={!!deletingId}
          message="Are you sure you want to delete this item?"
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button color="inherit" size="small" onClick={handleDeleteCancel}>
                Cancel
              </Button>
              <Button color="error" size="small" onClick={handleDeleteConfirm}>
                Delete
              </Button>
            </Box>
          }
        />
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
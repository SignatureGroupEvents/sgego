import React, { useState, useRef } from 'react';
import { Box, Typography, Button, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Alert, CircularProgress, Snackbar, IconButton, Autocomplete, TextField, Chip } from '@mui/material';
import { Upload as UploadIcon, Edit as EditIcon, Delete as DeleteIcon, Save as SaveIcon, Cancel as CancelIcon, FileDownload as FileDownloadIcon } from '@mui/icons-material';
import { uploadInventoryCSV, fetchInventory, updateInventoryItem, deleteInventoryItem, updateInventoryAllocation, exportInventoryCSV, exportInventoryExcel } from '../../services/api';
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
  const [editRowId, setEditRowId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [deletingId, setDeletingId] = useState(null);
  const [event, setEvent] = useState(null);
  const [parentEvent, setParentEvent] = useState(null);
  const [allEvents, setAllEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [filteredEvents, setFilteredEvents] = useState([]);
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

  return (
    <Box sx={{ p: 4 }}>
      <TopNavBar
        breadcrumbs={[
          { label: 'Events', to: '/events', icon: <EventIcon /> },
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
import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography,
  FormControl, InputLabel, Select, MenuItem, Alert, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, Chip, IconButton,
  Tooltip, Collapse, Grid, Divider
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';

const CSVColumnMapper = ({ 
  open, 
  onClose, 
  csvFile, 
  onMappingComplete,
  eventId 
}) => {
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvPreview, setCsvPreview] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});
  const [errors, setErrors] = useState([]);
  const [showPreview, setShowPreview] = useState(false);

  // Define the required and optional fields for inventory
  const inventoryFields = {
    required: [
      { key: 'type', label: 'Type', description: 'Product type (e.g., Sneakers, Hats, Bags)' },
      { key: 'style', label: 'Brand', description: 'Brand name' }
    ],
    optional: [
      { key: 'size', label: 'Size', description: 'Size (S, M, L, XL, etc.)' },
      { key: 'gender', label: 'Gender', description: 'M, W, or N/A' },
      { key: 'color', label: 'Color', description: 'Color name' },
      { key: 'qtyWarehouse', label: 'Qty Warehouse', description: 'Quantity in warehouse' }
    ]
  };

  const allFields = [...inventoryFields.required, ...inventoryFields.optional];

  useEffect(() => {
    if (csvFile && open) {
      parseCSV();
    }
  }, [csvFile, open]);

  const parseCSV = async () => {
    try {
      const text = await csvFile.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        setErrors(['CSV file appears to be empty']);
        return;
      }

      // Parse headers (first line)
      const headers = lines[0].split(',').map(header => 
        header.trim().replace(/"/g, '')
      );
      setCsvHeaders(headers);

      // Parse preview data (first 5 rows)
      const previewData = lines.slice(1, 6).map(line => {
        const values = line.split(',').map(val => val.trim().replace(/"/g, ''));
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        return row;
      });
      setCsvPreview(previewData);

      // Auto-map obvious matches
      const autoMapping = {};
      headers.forEach(header => {
        const lowerHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        // Try to auto-match common variations
        const matches = {
          'type': ['type', 'producttype', 'itemtype'],
          'style': ['brand'],
          'size': ['size', 'sizes'],
          'gender': ['gender', 'sex', 'style'],
          'color': ['color', 'colour'],
          'qtyWarehouse': ['qtywarehouse', 'warehouseqty', 'warehouse', 'warehouseinventory', 'qtywh']
        };

        Object.entries(matches).forEach(([field, variations]) => {
          if (variations.includes(lowerHeader)) {
            autoMapping[field] = header;
          }
        });
      });

      setColumnMapping(autoMapping);
      setErrors([]);
    } catch (error) {
      setErrors(['Failed to parse CSV file: ' + error.message]);
    }
  };

  const handleMappingChange = (field, csvColumn) => {
    setColumnMapping(prev => ({
      ...prev,
      [field]: csvColumn
    }));
  };

  const validateMapping = () => {
    const newErrors = [];
    
    // Check required fields
    inventoryFields.required.forEach(field => {
      if (!columnMapping[field.key]) {
        newErrors.push(`Required field "${field.label}" must be mapped`);
      }
    });

    // Check for duplicate mappings
    const mappedColumns = Object.values(columnMapping).filter(Boolean);
    const uniqueColumns = new Set(mappedColumns);
    if (mappedColumns.length !== uniqueColumns.size) {
      newErrors.push('Each CSV column can only be mapped to one field');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleConfirmMapping = () => {
    if (validateMapping()) {
      onMappingComplete(columnMapping, csvFile);
    }
  };

  const getMappingStatus = () => {
    const requiredMapped = inventoryFields.required.every(field => columnMapping[field.key]);
    const totalMapped = Object.values(columnMapping).filter(Boolean).length;
    return { requiredMapped, totalMapped };
  };

  const { requiredMapped, totalMapped } = getMappingStatus();

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { minHeight: '70vh', maxHeight: '90vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Map CSV Columns</Typography>
          <Box display="flex" alignItems="center" gap={1}>
            <Chip 
              label={`${totalMapped} columns mapped`}
              color={requiredMapped ? "success" : "warning"}
              size="small"
            />
            <IconButton 
              onClick={() => setShowPreview(!showPreview)}
              size="small"
            >
              {showPreview ? <VisibilityOffIcon /> : <VisibilityIcon />}
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ overflow: 'auto' }}>
        {errors.length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
              Validation Errors:
            </Typography>
            <Box component="ul" sx={{ margin: 0, paddingLeft: 2 }}>
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </Box>
          </Alert>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Map your CSV columns to the inventory fields. Required fields are marked with *.
        </Typography>

        {/* CSV Preview */}
        <Collapse in={showPreview}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>CSV Preview</Typography>
            <TableContainer component={Paper} sx={{ maxHeight: 200 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {csvHeaders.map(header => (
                      <TableCell key={header} sx={{ fontWeight: 'bold', backgroundColor: 'grey.100' }}>
                        {header}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {csvPreview.map((row, index) => (
                    <TableRow key={index}>
                      {csvHeaders.map(header => (
                        <TableCell key={header}>
                          {row[header]}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Collapse>

        {/* Column Mapping */}
        <Typography variant="h6" gutterBottom>Column Mapping</Typography>
        
        {/* Required Fields */}
        <Typography variant="subtitle1" color="error" gutterBottom sx={{ fontWeight: 'bold' }}>
          Required Fields *
        </Typography>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {inventoryFields.required.map(field => (
            <Grid item xs={12} md={6} key={field.key}>
              <FormControl fullWidth size="small">
                <InputLabel>
                  {field.label} *
                </InputLabel>
                <Select
                  value={columnMapping[field.key] || ''}
                  onChange={(e) => handleMappingChange(field.key, e.target.value)}
                  label={`${field.label} *`}
                  displayEmpty
                  endAdornment={
                    <Tooltip title={field.description} placement="top">
                      <InfoIcon sx={{ fontSize: 16, color: 'action.active', mr: 1 }} />
                    </Tooltip>
                  }
                >
                  <MenuItem value="" disabled>
                    <em>Select CSV column</em>
                  </MenuItem>
                  {csvHeaders.map(header => (
                    <MenuItem key={header} value={header}>
                      {header}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* Optional Fields */}
        <Typography variant="subtitle1" color="text.secondary" gutterBottom sx={{ fontWeight: 'bold' }}>
          Optional Fields
        </Typography>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {inventoryFields.optional.map(field => (
            <Grid item xs={12} md={6} lg={4} key={field.key}>
              <FormControl fullWidth size="small">
                <InputLabel>
                  {field.label}
                </InputLabel>
                <Select
                  value={columnMapping[field.key] || ''}
                  onChange={(e) => handleMappingChange(field.key, e.target.value)}
                  label={field.label}
                  displayEmpty
                  endAdornment={
                    <Tooltip title={field.description} placement="top">
                      <InfoIcon sx={{ fontSize: 16, color: 'action.active', mr: 1 }} />
                    </Tooltip>
                  }
                >
                  <MenuItem value="">
                    <em>Skip this field</em>
                  </MenuItem>
                  {csvHeaders.map(header => (
                    <MenuItem key={header} value={header}>
                      {header}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          ))}
        </Grid>

        {/* Mapping Summary */}
        <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
            Mapping Summary
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={1}>
            {Object.entries(columnMapping).filter(([_, csvCol]) => csvCol).map(([field, csvCol]) => {
              const fieldInfo = allFields.find(f => f.key === field);
              const isRequired = inventoryFields.required.some(f => f.key === field);
              return (
                <Chip
                  key={field}
                  label={`${fieldInfo?.label}: ${csvCol}`}
                  color={isRequired ? "primary" : "default"}
                  size="small"
                  icon={isRequired ? <CheckCircleIcon /> : undefined}
                />
              );
            })}
            {Object.keys(columnMapping).filter(key => columnMapping[key]).length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No columns mapped yet
              </Typography>
            )}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        <Button 
          onClick={handleConfirmMapping}
          variant="contained"
          disabled={!requiredMapped}
          startIcon={requiredMapped ? <CheckCircleIcon /> : <ErrorIcon />}
          color={requiredMapped ? "primary" : "error"}
        >
          {requiredMapped ? 'Import with Mapping' : 'Complete Required Fields'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CSVColumnMapper;
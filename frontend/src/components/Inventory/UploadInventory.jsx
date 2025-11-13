import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Stepper,
  Step,
  StepLabel,
  Chip
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Upload as UploadIcon,
  CloudUpload as CloudUploadIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  FilePresent as FilePresentIcon,
  Delete as DeleteIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { uploadInventoryCSV, fetchInventory } from '../../services/api';
import MainLayout from '../layout/MainLayout';
import { getEvent } from '../../services/events';
import EventHeader from '../Events/EventHeader';

const UploadInventory = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  // State management
  const [activeStep, setActiveStep] = useState(0);
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [columnMapping, setColumnMapping] = useState({});
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState(null);
  const [event, setEvent] = useState(null);
  const [existingInventory, setExistingInventory] = useState([]);
  const [duplicateRows, setDuplicateRows] = useState([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

  React.useEffect(() => {
    getEvent(eventId).then(setEvent);
  }, [eventId]);

  // Expected columns for inventory data
  const expectedColumns = {
    type: { required: true, label: 'TYPE', section: 'required' },
    style: { required: true, label: 'BRAND', section: 'required' },
    product: { required: false, label: 'PRODUCT', section: 'optional' },
    size: { required: false, label: 'SIZE', section: 'optional' },
    gender: { required: false, label: 'GENDER', section: 'optional' },
    color: { required: false, label: 'COLOR', section: 'optional' },
    qtyWarehouse: { required: false, label: 'QTY WAREHOUSE', section: 'optional' },
    qtyBeforeEvent: { required: false, label: 'QTY BEFORE EVENT', section: 'optional' },
    qtyOnSite: { required: false, label: 'QTY ON SITE', section: 'optional' },
    currentInventory: { required: false, label: 'CURRENT INVENTORY', section: 'optional' },
    postEventCount: { required: false, label: 'POST EVENT COUNT', section: 'optional' }
  };

  // Parse CSV data
  const parseCSV = (csvText) => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) return { headers: [], data: [] };

    // Handle quoted CSV fields properly
    const parseCSVLine = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseCSVLine(lines[0]).map(h => h.replace(/"/g, ''));
    const data = lines.slice(1).map((line, index) => {
      const values = parseCSVLine(line).map(v => v.replace(/"/g, ''));
      const row = {};
      headers.forEach((header, i) => {
        row[header] = values[i] || '';
      });
      row._rowIndex = index + 2;
      return row;
    });

    return { headers, data };
  };

  // Parse Excel data
  const parseExcel = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const fileData = new Uint8Array(e.target.result);
          const workbook = XLSX.read(fileData, { type: 'array' });
          
          // Get the first worksheet
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Convert to JSON with header row
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            defval: '',
            raw: false
          });
          
          if (jsonData.length === 0) {
            resolve({ headers: [], data: [] });
            return;
          }
          
          // First row is headers
          const headers = jsonData[0].map(h => String(h || '').trim()).filter(h => h);
          
          // Remaining rows are data
          const rowData = jsonData.slice(1)
            .filter(row => row.some(cell => cell !== '')) // Filter out completely empty rows
            .map((row, index) => {
              const rowObj = {};
              headers.forEach((header, i) => {
                // Convert cell value to string, handling null/undefined
                rowObj[header] = row[i] !== undefined && row[i] !== null ? String(row[i]).trim() : '';
              });
              rowObj._rowIndex = index + 2; // +2 because index 0 is header, and we start from row 2
              return rowObj;
            });
          
          resolve({ headers, data: rowData });
        } catch (error) {
          reject(new Error(`Error parsing Excel file: ${error.message}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Error reading file'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  };

  // Convert Excel data to CSV format for backend
  const convertToCSV = (headers, data) => {
    // Create CSV string
    const csvRows = [];
    
    // Add headers
    csvRows.push(headers.join(','));
    
    // Add data rows
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header] || '';
        // Escape quotes and wrap in quotes if contains comma or quote
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvRows.push(values.join(','));
    });
    
    return csvRows.join('\n');
  };

  // Validate parsed data
  const validateData = (headers, data) => {
    const validationErrors = [];
    const validationWarnings = [];

    // Check if we have enough data
    if (data.length === 0) {
      validationErrors.push('No data rows found in the file');
    }

    // Check that required fields are mapped
    const requiredFieldsMapped = ['type', 'style'].every(
      field => columnMapping[field] && columnMapping[field] !== ''
    );
    
    if (!requiredFieldsMapped) {
      validationErrors.push('Required fields (Type and Brand) must be mapped');
    }

    // Check for empty required fields in data
    data.forEach((row, index) => {
      const mappedRow = mapRowData(row);
      
      if (!mappedRow.type || !mappedRow.style) {
        validationWarnings.push(`Row ${index + 2}: Missing required information (type or brand)`);
      }
    });

    return { errors: validationErrors, warnings: validationWarnings };
  };

  // Map row data based on column mapping
  const mapRowData = (row) => {
    const mappedRow = {};
    Object.entries(columnMapping).forEach(([inventoryField, csvColumn]) => {
      if (csvColumn && csvColumn !== 'ignore' && row[csvColumn] !== undefined) {
        mappedRow[inventoryField] = row[csvColumn];
      }
    });
    return mappedRow;
  };

  // Handle file operations
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelection(files[0]);
    }
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      handleFileSelection(selectedFile);
    }
  };

  // Check if file is Excel format
  const isExcelFile = (file) => {
    const excelTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'application/excel'
    ];
    const excelExtensions = ['.xlsx', '.xls'];
    
    return excelTypes.some(type => file.type.includes(type)) ||
           excelExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
  };

  // Check if file is CSV format
  const isCSVFile = (file) => {
    return file.type.includes('csv') || 
           file.type === 'text/csv' ||
           file.name.toLowerCase().endsWith('.csv');
  };

  const handleFileSelection = async (selectedFile) => {
    // Validate file type
    if (!isCSVFile(selectedFile) && !isExcelFile(selectedFile)) {
      setErrors(['Please select a CSV or Excel file (.csv, .xlsx, .xls)']);
      return;
    }

    setFile(selectedFile);
    setIsProcessing(true);
    setErrors([]);
    setWarnings([]);
    
    try {
      let headers, data;
      
      if (isExcelFile(selectedFile)) {
        // Parse Excel file
        const result = await parseExcel(selectedFile);
        headers = result.headers;
        data = result.data;
      } else {
        // Parse CSV file
        const text = await selectedFile.text();
        const result = parseCSV(text);
        headers = result.headers;
        data = result.data;
      }
      
      if (headers.length === 0) {
        setErrors(['File appears to be empty or invalid']);
        setIsProcessing(false);
        return;
      }

      setParsedData({ headers, data });
      
      // Auto-map columns that match expected names
      const autoMapping = {};
      headers.forEach(header => {
        const lowerHeader = header.toLowerCase().trim();
        Object.entries(expectedColumns).forEach(([field, config]) => {
          const lowerLabel = config.label.toLowerCase();
          if (lowerHeader === lowerLabel ||
              lowerHeader.includes(lowerLabel.split(' ')[0]) || 
              lowerHeader === field ||
              (field === 'type' && (lowerHeader.includes('type'))) ||
              (field === 'style' && (lowerHeader.includes('brand'))) ||
              (field === 'product' && (lowerHeader.includes('product') || lowerHeader.includes('product name'))) ||
              (field === 'size' && lowerHeader.includes('size')) ||
              (field === 'gender' && (lowerHeader.includes('gender') || lowerHeader.includes('sex') || lowerHeader.includes('style'))) ||
              (field === 'color' && (lowerHeader.includes('color') || lowerHeader.includes('colour'))) ||
              (field === 'qtyWarehouse' && (lowerHeader.includes('warehouse') || lowerHeader.includes('qtywh'))) ||
              (field === 'qtyBeforeEvent' && lowerHeader.includes('before')) ||
              (field === 'qtyOnSite' && lowerHeader.includes('onsite')) ||
              (field === 'currentInventory' && lowerHeader.includes('current'))) {
            autoMapping[field] = header;
          }
        });
      });
      
      setColumnMapping(autoMapping);
      setActiveStep(1);
      
    } catch (error) {
      setErrors([`Error processing file: ${error.message}`]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleColumnMappingChange = (inventoryField, csvColumn) => {
    setColumnMapping(prev => ({
      ...prev,
      [inventoryField]: csvColumn || ''
    }));
  };

  // Check for duplicates against existing inventory
  const checkForDuplicates = async () => {
    setCheckingDuplicates(true);
    try {
      // Fetch existing inventory
      const response = await fetchInventory(eventId);
      const existing = response.data.inventory || [];
      setExistingInventory(existing);

      const duplicates = [];
      const mappedItems = parsedData.data.map((row, index) => {
        const mappedRow = mapRowData(row);
        return {
          ...mappedRow,
          _rowIndex: index + 2,
          _originalRow: row
        };
      });

      // Check each mapped item against existing inventory
      // All fields (Type, Brand, Product, Gender, Size, Color) must match for a duplicate
      mappedItems.forEach((item) => {
        const itemKey = `${item.type || ''}-${item.style || ''}-${item.product || ''}-${item.gender || ''}-${item.size || ''}-${item.color || ''}`;
        
        const isDuplicate = existing.some(existingItem => {
          const existingKey = `${existingItem.type || ''}-${existingItem.style || ''}-${existingItem.product || ''}-${existingItem.gender || ''}-${existingItem.size || ''}-${existingItem.color || ''}`;
          return existingKey === itemKey;
        });

        if (isDuplicate) {
          duplicates.push({
            rowIndex: item._rowIndex,
            item: `${item.type || ''} - ${item.style || ''}${item.product ? ` - ${item.product}` : ''} (${item.size || 'N/A'}, ${item.gender || 'N/A'}, ${item.color || 'N/A'})`,
            reason: 'Item already exists',
            rowData: item._originalRow
          });
        }
      });

      setDuplicateRows(duplicates);
      return duplicates;
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      return [];
    } finally {
      setCheckingDuplicates(false);
    }
  };

  const validateAndProceed = async () => {
    const { errors: validationErrors, warnings: validationWarnings } = validateData(
      parsedData.headers, 
      parsedData.data
    );
    
    setErrors(validationErrors);
    setWarnings(validationWarnings);
    
    if (validationErrors.length === 0) {
      // Check for duplicates before proceeding
      await checkForDuplicates();
      setActiveStep(2);
    }
  };

  const handleUpload = async () => {
    setIsProcessing(true);
    setUploadProgress(0);
    
    try {
      // Convert Excel to CSV if needed, or use original CSV
      let fileToUpload = file;
      
      if (isExcelFile(file)) {
        // Convert Excel data to CSV format
        const csvContent = convertToCSV(parsedData.headers, parsedData.data);
        const csvBlob = new Blob([csvContent], { type: 'text/csv' });
        fileToUpload = new File([csvBlob], file.name.replace(/\.(xlsx|xls)$/i, '.csv'), { type: 'text/csv' });
      }

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await uploadInventoryCSV(eventId, fileToUpload, columnMapping);

      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setUploadResults(response.data);
      setActiveStep(3);
      
    } catch (error) {
      const errorMessages = [];
      
      if (error.response?.data) {
        const errorData = error.response.data;
        
        // Handle duplicate errors with row information
        if (errorData.message && (errorData.message.includes('duplicate') || errorData.message.includes('Duplicate'))) {
          errorMessages.push('Duplicate inventory items found. Each combination of Type, Brand, Size, Gender, and Color must be unique.');
          
          // Add skipped items (already in database)
          if (errorData.results?.skippedItems && errorData.results.skippedItems.length > 0) {
            errorMessages.push(`\nRows already in database (${errorData.results.skippedItems.length}):`);
            errorData.results.skippedItems.forEach((item) => {
              errorMessages.push(`  Row ${item.row}: ${item.item} - ${item.reason}`);
            });
          }
          
          // Add file duplicates (duplicates within the uploaded file)
          if (errorData.results?.fileDuplicates && errorData.results.fileDuplicates.length > 0) {
            errorMessages.push(`\nDuplicate rows within file (${errorData.results.fileDuplicates.length}):`);
            errorData.results.fileDuplicates.forEach((item) => {
              errorMessages.push(`  Row ${item.row}: ${item.item} - ${item.reason}`);
            });
          }
        } else {
          // Other errors
          errorMessages.push(errorData.message || 'Upload failed');
          
          // Add any row-specific errors
          if (errorData.results?.errors && errorData.results.errors.length > 0) {
            errorData.results.errors.forEach((err) => {
              errorMessages.push(err);
            });
          }
        }
      } else if (error.message) {
        errorMessages.push(error.message);
      } else {
        errorMessages.push('Upload failed');
      }
      
      setErrors(errorMessages);
      setIsProcessing(false);
      setUploadProgress(0);
    }
  };

  const clearFile = () => {
    setFile(null);
    setParsedData(null);
    setColumnMapping({});
    setErrors([]);
    setWarnings([]);
    setActiveStep(0);
    setUploadResults(null);
    setUploadProgress(0);
    setDuplicateRows([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const steps = [
    'Upload File',
    'Map Columns',
    'Review & Upload',
    'Complete'
  ];

  return (
    <MainLayout eventName={event?.eventName || 'Loading Event...'} parentEventName={event?.parentEventId ? 'Main Event' : null} parentEventId={event?.parentEventId || null}>
      <EventHeader event={event} />
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <Container maxWidth="lg">
          <Box sx={{ my: 4 }}>
            {/* Header */}
            <Box display="flex" alignItems="center" mb={4}>
              <IconButton onClick={() => navigate(`/events/${eventId}/inventory`)} sx={{ mr: 2 }}>
                <ArrowBackIcon />
              </IconButton>
              <Box>
                <Typography variant="h4" gutterBottom>
                  Upload Inventory
                </Typography>
                <Typography variant="subtitle1" color="textSecondary">
                  Import inventory from a CSV or Excel file
                </Typography>
              </Box>
            </Box>

            {/* Stepper */}
            <Card sx={{ mb: 4 }}>
              <CardContent>
                <Stepper activeStep={activeStep} alternativeLabel>
                  {steps.map((label, index) => (
                    <Step key={label}>
                      <StepLabel
                        StepIconProps={{
                          sx: {
                            '&.Mui-completed': {
                              color: 'success.main'
                            },
                            '&.Mui-active': {
                              color: 'primary.main'
                            }
                          }
                        }}
                      >
                        {label}
                      </StepLabel>
                    </Step>
                  ))}
                </Stepper>
              </CardContent>
            </Card>

            {/* Step Content */}
            {activeStep === 0 && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Step 1: Select File
                  </Typography>
                  
                  {/* File Upload Area */}
                  <Box
                    sx={{
                      border: 2,
                      borderStyle: 'dashed',
                      borderColor: dragActive ? 'primary.main' : file ? 'success.main' : 'grey.300',
                      borderRadius: 2,
                      p: 8,
                      textAlign: 'center',
                      backgroundColor: dragActive ? 'primary.light' : file ? 'success.light' : 'background.default',
                      mb: 3,
                      transition: 'all 0.3s ease',
                      cursor: 'pointer'
                    }}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => !file && fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                      onChange={handleFileSelect}
                      style={{ display: 'none' }}
                    />
                    
                    {!file ? (
                      <Box>
                        <CloudUploadIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" gutterBottom>
                          Drop your CSV or Excel file here
                        </Typography>
                        <Typography color="textSecondary" paragraph>
                          or click to browse and select a file
                        </Typography>
                        <Button
                          variant="contained"
                          startIcon={<UploadIcon />}
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                          }}
                        >
                          Choose File
                        </Button>
                      </Box>
                    ) : (
                      <Box>
                        <FilePresentIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                        <Typography variant="h6" gutterBottom>
                          {file.name}
                        </Typography>
                        <Typography color="textSecondary" paragraph>
                          {(file.size / 1024).toFixed(1)} KB
                        </Typography>
                        <Button
                          variant="outlined"
                          startIcon={<DeleteIcon />}
                          color="error"
                          onClick={(e) => {
                            e.stopPropagation();
                            clearFile();
                          }}
                        >
                          Remove File
                        </Button>
                      </Box>
                    )}
                    
                    {isProcessing && (
                      <Box mt={3}>
                        <CircularProgress size={30} />
                        <Typography variant="body2" color="textSecondary" mt={1}>
                          Processing file...
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  {/* Expected Format Info */}
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Supported File Formats:
                    </Typography>
                    <Typography variant="body2" component="div">
                      <strong>CSV (.csv)</strong> or <strong>Excel (.xlsx, .xls)</strong> files are supported.<br />
                      <strong>Required columns:</strong> Type, Brand<br />
                      <strong>Optional columns:</strong> Size, Gender, Color, Qty Warehouse, Qty Before Event, Qty On Site, Current Inventory, Post Event Count
                    </Typography>
                  </Alert>

                  {/* Errors */}
                  {errors.length > 0 && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>Issues found:</Typography>
                      {errors.map((error, index) => (
                        <Typography key={index} variant="body2">• {error}</Typography>
                      ))}
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}

            {activeStep === 1 && parsedData && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Step 2: Map Columns to Inventory Fields
                  </Typography>
                  <Typography color="textSecondary" paragraph sx={{ mb: 4 }}>
                    Select the column from your file that corresponds to each inventory field.
                  </Typography>
                  
                  {/* REQUIRED FIELDS Section */}
                  <Box sx={{ mb: 4 }}>
                    <Typography 
                      variant="subtitle2" 
                      sx={{ 
                        fontWeight: 'bold',
                        color: 'text.primary',
                        mb: 3,
                        textDecoration: 'underline',
                        textDecorationStyle: 'dotted',
                        textUnderlineOffset: '4px'
                      }}
                    >
                      REQUIRED FIELDS
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {['type', 'style'].map((field) => {
                        const config = expectedColumns[field];
                        return (
                          <Box key={field} sx={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
                            <Box sx={{ minWidth: 200, flexShrink: 0, pt: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.875rem' }}>
                                {config.label} *
                              </Typography>
                            </Box>
                            <FormControl sx={{ minWidth: 320, maxWidth: 500 }}>
                              <Select
                                value={columnMapping[field] || ''}
                                onChange={(e) => handleColumnMappingChange(field, e.target.value)}
                                displayEmpty
                                sx={{ 
                                  backgroundColor: 'background.paper',
                                  height: '40px',
                                  '& .MuiSelect-select': {
                                    color: columnMapping[field] ? 'text.primary' : '#999',
                                    padding: '8px 14px'
                                  },
                                  '& .MuiOutlinedInput-notchedOutline': {
                                    borderColor: '#ddd'
                                  },
                                  '&:hover .MuiOutlinedInput-notchedOutline': {
                                    borderColor: '#999'
                                  },
                                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                    borderColor: 'primary.main',
                                    borderWidth: '2px'
                                  }
                                }}
                              >
                                <MenuItem value="" disabled>
                                  <em style={{ color: '#999', fontStyle: 'normal' }}>Select Column</em>
                                </MenuItem>
                                {parsedData.headers.map((header) => (
                                  <MenuItem key={header} value={header}>
                                    {header}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>

                  {/* OPTIONAL COLUMNS Section */}
                  <Box sx={{ mb: 4 }}>
                    <Typography 
                      variant="subtitle2" 
                      sx={{ 
                        fontWeight: 'bold',
                        color: 'text.primary',
                        mb: 3
                      }}
                    >
                      OPTIONAL COLUMNS
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {Object.entries(expectedColumns)
                        .filter(([field, config]) => config.section === 'optional')
                        .map(([field, config]) => {
                          return (
                            <Box key={field} sx={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
                              <Box sx={{ minWidth: 200, flexShrink: 0, pt: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.875rem' }}>
                                  {config.label}
                                </Typography>
                              </Box>
                              <FormControl sx={{ minWidth: 320, maxWidth: 500 }}>
                                <Select
                                  value={columnMapping[field] || ''}
                                  onChange={(e) => handleColumnMappingChange(field, e.target.value)}
                                  displayEmpty
                                  sx={{ 
                                    backgroundColor: 'background.paper',
                                    height: '40px',
                                    '& .MuiSelect-select': {
                                      color: columnMapping[field] ? 'text.primary' : '#999',
                                      padding: '8px 14px'
                                    },
                                    '& .MuiOutlinedInput-notchedOutline': {
                                      borderColor: '#ddd'
                                    },
                                    '&:hover .MuiOutlinedInput-notchedOutline': {
                                      borderColor: '#999'
                                    },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                      borderColor: 'primary.main',
                                      borderWidth: '2px'
                                    }
                                  }}
                                >
                                  <MenuItem value="" disabled>
                                    <em style={{ color: '#999', fontStyle: 'normal' }}>Select Column</em>
                                  </MenuItem>
                                  {parsedData.headers.map((header) => (
                                    <MenuItem key={header} value={header}>
                                      {header}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </Box>
                          );
                        })}
                    </Box>
                  </Box>

                  <Box display="flex" justifyContent="space-between" mt={4}>
                    <Button onClick={() => setActiveStep(0)}>
                      Back
                    </Button>
                    <Button 
                      variant="contained" 
                      onClick={validateAndProceed}
                      disabled={!columnMapping.type || !columnMapping.style || checkingDuplicates}
                    >
                      {checkingDuplicates ? 'Checking...' : 'Next: Review Data'}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            )}

            {activeStep === 2 && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Step 3: Review and Upload
                  </Typography>
                  
                  {/* Checking for duplicates indicator */}
                  {checkingDuplicates && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                      <CircularProgress size={20} />
                      <Typography variant="body2" color="textSecondary">
                        Checking for duplicates...
                      </Typography>
                    </Box>
                  )}

                  {/* Summary */}
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Paper sx={{ p: 3, textAlign: 'center', backgroundColor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="h3" color="primary.main" gutterBottom sx={{ fontWeight: 700 }}>
                          {parsedData.data.length}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Total Items
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Paper sx={{ p: 3, textAlign: 'center', backgroundColor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="h3" color="success.main" gutterBottom sx={{ fontWeight: 700 }}>
                          {parsedData.data.length - duplicateRows.length}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Will be Added
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Paper sx={{ p: 3, textAlign: 'center', backgroundColor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="h3" color={duplicateRows.length > 0 ? 'warning.main' : 'text.secondary'} gutterBottom sx={{ fontWeight: 700 }}>
                          {duplicateRows.length}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Will be Skipped (Duplicates)
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>

                  {/* Items That Will Be Added Table */}
                  {parsedData.data.length - duplicateRows.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                        Items That Will Be Added ({parsedData.data.length - duplicateRows.length})
                      </Typography>
                      <TableContainer component={Paper} sx={{ maxHeight: 400, overflow: 'auto' }}>
                        <Table size="small" stickyHeader>
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 600 }}>Row</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>Brand</TableCell>
                              {columnMapping.product && (
                                <TableCell sx={{ fontWeight: 600 }}>Product</TableCell>
                              )}
                              {columnMapping.size && (
                                <TableCell sx={{ fontWeight: 600 }}>Size</TableCell>
                              )}
                              {columnMapping.gender && (
                                <TableCell sx={{ fontWeight: 600 }}>Gender</TableCell>
                              )}
                              {columnMapping.color && (
                                <TableCell sx={{ fontWeight: 600 }}>Color</TableCell>
                              )}
                              {columnMapping.qtyWarehouse && (
                                <TableCell sx={{ fontWeight: 600 }}>Qty Warehouse</TableCell>
                              )}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {parsedData.data.map((row, index) => {
                              const rowIndex = index + 2;
                              const mappedRow = mapRowData(row);
                              const isDuplicate = duplicateRows.some(dup => dup.rowIndex === rowIndex);
                              
                              if (isDuplicate) return null;
                              
                              return (
                                <TableRow key={`add-${index}`}>
                                  <TableCell>{rowIndex}</TableCell>
                                  <TableCell>{mappedRow.type || '-'}</TableCell>
                                  <TableCell>{mappedRow.style || '-'}</TableCell>
                                  {columnMapping.product && (
                                    <TableCell>{mappedRow.product || '-'}</TableCell>
                                  )}
                                  {columnMapping.size && (
                                    <TableCell>{mappedRow.size || '-'}</TableCell>
                                  )}
                                  {columnMapping.gender && (
                                    <TableCell>{mappedRow.gender || '-'}</TableCell>
                                  )}
                                  {columnMapping.color && (
                                    <TableCell>{mappedRow.color || '-'}</TableCell>
                                  )}
                                  {columnMapping.qtyWarehouse && (
                                    <TableCell>{mappedRow.qtyWarehouse || '-'}</TableCell>
                                  )}
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  )}

                  {/* Issues Table */}
                  {(warnings.length > 0 || duplicateRows.length > 0) && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                        Items with Issues
                      </Typography>
                      <TableContainer component={Paper} sx={{ maxHeight: 400, overflow: 'auto' }}>
                        <Table size="small" stickyHeader>
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 600 }}>Row</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>Item</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>Issue Type</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>Details</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {/* Duplicate rows */}
                            {duplicateRows.map((duplicate, index) => (
                              <TableRow key={`dup-${index}`}>
                                <TableCell>{duplicate.rowIndex}</TableCell>
                                <TableCell>{duplicate.item}</TableCell>
                                <TableCell>
                                  <Chip label="Duplicate" color="warning" size="small" />
                                </TableCell>
                                <TableCell>{duplicate.reason}</TableCell>
                              </TableRow>
                            ))}
                            {/* Warning rows */}
                            {warnings.map((warning, index) => {
                              const rowMatch = warning.match(/Row (\d+):/);
                              const rowNum = rowMatch ? rowMatch[1] : index + 1;
                              const warningText = warning.replace(/Row \d+: /, '');
                              return (
                                <TableRow key={`warn-${index}`}>
                                  <TableCell>{rowNum}</TableCell>
                                  <TableCell>-</TableCell>
                                  <TableCell>
                                    <Chip label="Warning" color="info" size="small" />
                                  </TableCell>
                                  <TableCell>{warningText}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  )}

                  {/* Errors */}
                  {errors.length > 0 && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" gutterBottom>Errors (must be fixed):</Typography>
                      {errors.map((error, index) => (
                        <Typography key={index} variant="body2">• {error}</Typography>
                      ))}
                    </Alert>
                  )}

                  {/* Upload Progress */}
                  {isProcessing && (
                    <Box sx={{ mb: 3 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="body2">
                          Uploading inventory...
                        </Typography>
                        <Typography variant="body2">
                          {uploadProgress}%
                        </Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={uploadProgress} />
                    </Box>
                  )}

                  <Box display="flex" justifyContent="space-between">
                    <Button onClick={() => {
                      setDuplicateRows([]);
                      setActiveStep(1);
                    }} disabled={isProcessing || checkingDuplicates}>
                      Back
                    </Button>
                    <Button 
                      variant="contained" 
                      onClick={handleUpload}
                      disabled={errors.length > 0 || isProcessing || checkingDuplicates}
                      startIcon={<SaveIcon />}
                    >
                      Upload {parsedData.data.length - duplicateRows.length} Items
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            )}

            {activeStep === 3 && uploadResults && (
              <Card>
                <CardContent>
                  <Box sx={{ textAlign: 'center', mb: 4 }}>
                    <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
                    <Typography variant="h5" gutterBottom>
                      Upload Complete!
                    </Typography>
                  </Box>
                  
                  <Grid container spacing={3}>
                    {/* Success Section */}
                    <Grid size={12}>
                      <Paper 
                        sx={{ 
                          p: 0,
                          backgroundColor: 'background.paper',
                          border: '1px solid',
                          borderColor: 'divider',
                          overflow: 'hidden'
                        }}
                      >
                        <Box 
                          sx={{ 
                            height: 6,
                            backgroundColor: 'success.main',
                            width: '100%'
                          }}
                        />
                        <Box sx={{ p: 3 }}>
                          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                            <Box>
                              <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 700 }} gutterBottom>
                                {uploadResults.results?.newItemsAdded || 0}
                              </Typography>
                              <Typography variant="body1" sx={{ fontWeight: 500, color: 'text.secondary' }}>
                                Successfully Added
                              </Typography>
                            </Box>
                            <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main' }} />
                          </Box>
                        </Box>
                      </Paper>
                    </Grid>

                    {/* Errors Section */}
                    {(uploadResults.results?.errors?.length || 0) > 0 && (
                      <Grid size={12}>
                        <Paper 
                          sx={{ 
                            p: 0,
                            backgroundColor: 'background.paper',
                            border: '1px solid',
                            borderColor: 'divider',
                            overflow: 'hidden'
                          }}
                        >
                          <Box 
                            sx={{ 
                              height: 6,
                              backgroundColor: 'error.main',
                              width: '100%'
                            }}
                          />
                          <Box sx={{ p: 3 }}>
                            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                              <Box>
                                <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 700 }} gutterBottom>
                                  {uploadResults.results?.errors?.length || 0}
                                </Typography>
                                <Typography variant="body1" sx={{ fontWeight: 500, color: 'text.secondary' }}>
                                  Errors
                                </Typography>
                              </Box>
                              <ErrorIcon sx={{ fontSize: 48, color: 'error.main' }} />
                            </Box>
                            <Box component="ul" sx={{ margin: 0, paddingLeft: 2 }}>
                              {uploadResults.results.errors.map((error, index) => (
                                <li key={index}>
                                  <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                                    {error}
                                  </Typography>
                                </li>
                              ))}
                            </Box>
                          </Box>
                        </Paper>
                      </Grid>
                    )}

                    {/* Skipped Items Section (Duplicates) */}
                    {((uploadResults.results?.skippedItems?.length || 0) > 0 || (uploadResults.results?.fileDuplicates?.length || 0) > 0) && (
                      <Grid size={12}>
                        <Paper 
                          sx={{ 
                            p: 0,
                            backgroundColor: 'background.paper',
                            border: '1px solid',
                            borderColor: 'warning.main',
                            overflow: 'hidden'
                          }}
                        >
                          <Box 
                            sx={{ 
                              height: 6,
                              backgroundColor: 'warning.main',
                              width: '100%'
                            }}
                          />
                          <Box sx={{ p: 3 }}>
                            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                              <Box>
                                <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 700 }} gutterBottom>
                                  {(uploadResults.results?.skippedItems?.length || 0) + (uploadResults.results?.fileDuplicates?.length || 0)}
                                </Typography>
                                <Typography variant="body1" sx={{ fontWeight: 500, color: 'text.secondary' }}>
                                  Duplicates Skipped
                                </Typography>
                              </Box>
                              <WarningIcon sx={{ fontSize: 48, color: 'warning.main' }} />
                            </Box>
                            
                            {uploadResults.results?.skippedItems?.length > 0 && (
                              <Box mb={2}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                                  Already in Database ({uploadResults.results.skippedItems.length}):
                                </Typography>
                                <Box component="ul" sx={{ margin: 0, paddingLeft: 2, maxHeight: 200, overflowY: 'auto' }}>
                                  {uploadResults.results.skippedItems.map((item, index) => (
                                    <li key={index}>
                                      <Typography variant="body2">
                                        <strong>Row {item.row}:</strong> {item.item}
                                      </Typography>
                                    </li>
                                  ))}
                                </Box>
                              </Box>
                            )}

                            {uploadResults.results?.fileDuplicates?.length > 0 && (
                              <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                                  Duplicates Within File ({uploadResults.results.fileDuplicates.length}):
                                </Typography>
                                <Box component="ul" sx={{ margin: 0, paddingLeft: 2, maxHeight: 200, overflowY: 'auto' }}>
                                  {uploadResults.results.fileDuplicates.map((item, index) => (
                                    <li key={index}>
                                      <Typography variant="body2">
                                        <strong>Row {item.row}:</strong> {item.item} - {item.reason}
                                      </Typography>
                                    </li>
                                  ))}
                                </Box>
                              </Box>
                            )}
                          </Box>
                        </Paper>
                      </Grid>
                    )}

                  </Grid>

                  <Box display="flex" gap={2} justifyContent="center" mt={4}>
                    <Button
                      variant="contained"
                      onClick={() => navigate(`/events/${eventId}/inventory`)}
                    >
                      View Inventory
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={clearFile}
                    >
                      Upload More Items
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            )}

          </Box>
        </Container>
      </Box>
    </MainLayout>
  );
};

export default UploadInventory;


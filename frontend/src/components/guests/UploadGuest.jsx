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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
  Visibility as VisibilityIcon,
  Save as SaveIcon,
  TableChart as TableChartIcon
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import api from '../../services/api';
import MainLayout from '../layout/MainLayout';
import HomeIcon from '@mui/icons-material/Home';
import EventIcon from '@mui/icons-material/Event';
import { getEvent } from '../../services/events';
import EventHeader from '../Events/EventHeader';

const UploadGuest = () => {
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
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState(null);
  const [event, setEvent] = useState(null);
  const [copying, setCopying] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [copyError, setCopyError] = useState('');

  React.useEffect(() => {
    getEvent(eventId).then(setEvent);
  }, [eventId]);

  // Expected columns for guest data
  const expectedColumns = {
    firstName: { required: true, label: 'First Name' },
    lastName: { required: true, label: 'Last Name' },
    email: { required: false, label: 'Email' },
    jobTitle: { required: false, label: 'Job Title' },
    company: { required: false, label: 'Company' },
    attendeeType: { required: false, label: 'Attendee Type' },
    notes: { required: false, label: 'Notes' },
    qrCodeData: { required: false, label: 'QR Code Data' }
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

  // Validate parsed data
  const validateData = (headers, data) => {
    const validationErrors = [];
    const validationWarnings = [];

    // Check if we have enough data
    if (data.length === 0) {
      validationErrors.push('No data rows found in the file');
    }

    // Check for empty required fields in data
    data.forEach((row, index) => {
      const mappedRow = mapRowData(row);
      if (!mappedRow.firstName || !mappedRow.lastName) {
        validationWarnings.push(`Row ${index + 2}: Missing required name fields`);
      }
      
      // Validate email format if provided
      if (mappedRow.email && !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(mappedRow.email)) {
        validationWarnings.push(`Row ${index + 2}: Invalid email format: ${mappedRow.email}`);
      }
    });

    return { errors: validationErrors, warnings: validationWarnings };
  };

  // Map row data based on column mapping
  const mapRowData = (row) => {
    const mappedRow = {};
    Object.entries(columnMapping).forEach(([csvColumn, guestField]) => {
      if (guestField && guestField !== 'ignore') {
        mappedRow[guestField] = row[csvColumn];
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
        const lowerHeader = header.toLowerCase();
        Object.entries(expectedColumns).forEach(([field, config]) => {
          const lowerLabel = config.label.toLowerCase();
          if (lowerHeader.includes(lowerLabel.split(' ')[0]) || 
              lowerHeader === field ||
              (field === 'firstName' && (lowerHeader.includes('first') || lowerHeader.includes('fname'))) ||
              (field === 'lastName' && (lowerHeader.includes('last') || lowerHeader.includes('lname')))) {
            autoMapping[header] = field;
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

  const handleColumnMappingChange = (csvColumn, guestField) => {
    setColumnMapping(prev => ({
      ...prev,
      [csvColumn]: guestField
    }));
  };

  const validateAndProceed = () => {
    const { errors: validationErrors, warnings: validationWarnings } = validateData(
      parsedData.headers, 
      parsedData.data
    );
    
    setErrors(validationErrors);
    setWarnings(validationWarnings);
    
    if (validationErrors.length === 0) {
      setActiveStep(2);
    }
  };

  // Determine main event ID for upload
  const mainEventId = eventId; // Use current event ID, backend handles inheritance

  const handleUpload = async () => {
    setIsProcessing(true);
    setUploadProgress(0);
    
    try {
      const mappedGuests = parsedData.data.map(row => {
        const mappedRow = mapRowData(row);
        // Add mainEventId and set defaults
        return {
          ...mappedRow,
          eventId: mainEventId,
          hasExistingQR: !!mappedRow.qrCodeData,
          additionalInfo: {}
        };
      });

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await api.post('/guests/bulk-add', {
        eventId: mainEventId,
        guests: mappedGuests
      });

      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setUploadResults(response.data);
      setActiveStep(3);
      
    } catch (error) {
      setErrors([`Upload failed: ${error.response?.data?.message || error.message}`]);
      setIsProcessing(false);
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
              <IconButton onClick={() => navigate(`/events/${eventId}`)} sx={{ mr: 2 }}>
                <ArrowBackIcon />
              </IconButton>
              <Box>
                <Typography variant="h4" gutterBottom>
                  Upload Guest List
                </Typography>
                <Typography variant="subtitle1" color="textSecondary">
                  Import guests from a CSV or Excel file
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
                      <strong>Required columns:</strong> First Name, Last Name<br />
                      <strong>Optional columns:</strong> Email, Job Title, Company, Attendee Type, Notes, QR Code Data
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
                    Step 2: Map Columns to Guest Fields
                  </Typography>
                  <Typography color="textSecondary" paragraph>
                    Map each column from your file to the corresponding guest field.
                  </Typography>
                  <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(auto-fit, minmax(220px, 1fr))`,
                    gap: 3,
                    mb: 2
                  }}>
                    {parsedData.headers.map((header, index) => (
                      <FormControl fullWidth key={index}>
                        <InputLabel>Map "{header}" to</InputLabel>
                        <Select
                          value={columnMapping[header] || ''}
                          onChange={(e) => handleColumnMappingChange(header, e.target.value)}
                          label={`Map "${header}" to`}
                        >
                          <MenuItem value="">
                            <em>Don't import this column</em>
                          </MenuItem>
                          {Object.entries(expectedColumns).map(([field, config]) => (
                            <MenuItem key={field} value={field}>
                              {config.label} {config.required && '*'}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    ))}
                  </Box>
                  <Box display="flex" justifyContent="space-between" mt={4}>
                    <Button onClick={() => setActiveStep(0)}>
                      Back
                    </Button>
                    <Button 
                      variant="contained" 
                      onClick={validateAndProceed}
                      disabled={Object.keys(columnMapping).length === 0}
                    >
                      Next: Review Data
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
                  
                  {/* Summary */}
                  <Grid container spacing={2}>
                    <Grid xs={12} md={4}>
                      <Paper sx={{ p: 3, textAlign: 'center', backgroundColor: 'primary.light' }}>
                        <Typography variant="h3" color="primary.main" gutterBottom>
                          {parsedData.data.length}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Total Guests
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid xs={12} md={4}>
                      <Paper sx={{ p: 3, textAlign: 'center', backgroundColor: 'success.light' }}>
                        <Typography variant="h3" color="success.main" gutterBottom>
                          {Object.values(columnMapping).filter(v => v && v !== 'ignore').length}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Mapped Fields
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid xs={12} md={4}>
                      <Paper sx={{ p: 3, textAlign: 'center', backgroundColor: 'warning.light' }}>
                        <Typography variant="h3" color="warning.main" gutterBottom>
                          {warnings.length}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Warnings
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>

                  {/* Warnings */}
                  {warnings.length > 0 && (
                    <Alert severity="warning" sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" gutterBottom>Warnings:</Typography>
                      {warnings.slice(0, 5).map((warning, index) => (
                        <Typography key={index} variant="body2">• {warning}</Typography>
                      ))}
                      {warnings.length > 5 && (
                        <Typography variant="body2">• ... and {warnings.length - 5} more</Typography>
                      )}
                    </Alert>
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

                  {/* Preview Button */}
                  <Button
                    variant="outlined"
                    startIcon={<VisibilityIcon />}
                    onClick={() => setPreviewDialogOpen(true)}
                    sx={{ mb: 3 }}
                  >
                    Preview Data ({parsedData.data.length} rows)
                  </Button>

                  {/* Upload Progress */}
                  {isProcessing && (
                    <Box sx={{ mb: 3 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="body2">
                          Uploading guests...
                        </Typography>
                        <Typography variant="body2">
                          {uploadProgress}%
                        </Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={uploadProgress} />
                    </Box>
                  )}

                  <Box display="flex" justifyContent="space-between">
                    <Button onClick={() => setActiveStep(1)} disabled={isProcessing}>
                      Back
                    </Button>
                    <Button 
                      variant="contained" 
                      onClick={handleUpload}
                      disabled={errors.length > 0 || isProcessing}
                      startIcon={<SaveIcon />}
                    >
                      Upload {parsedData.data.length} Guests
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            )}

            {activeStep === 3 && uploadResults && (
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
                  <Typography variant="h5" gutterBottom>
                    Upload Complete!
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid xs={12}>
                      <Paper sx={{ p: 3 }}>
                        <Typography variant="h4" color="success.main" gutterBottom>
                          {uploadResults.successful || 0}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Successfully Added
                        </Typography>
                      </Paper>
                    </Grid>
                    {uploadResults.duplicates > 0 && (
                      <Grid xs={12}>
                        <Paper sx={{ p: 3 }}>
                          <Typography variant="h4" color="warning.main" gutterBottom>
                            {uploadResults.duplicates}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Duplicates Skipped
                          </Typography>
                        </Paper>
                      </Grid>
                    )}
                    {uploadResults.errors > 0 && (
                      <Grid xs={12}>
                        <Paper sx={{ p: 3 }}>
                          <Typography variant="h4" color="error.main" gutterBottom>
                            {uploadResults.errors}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Errors
                          </Typography>
                        </Paper>
                      </Grid>
                    )}
                  </Grid>

                  <Box display="flex" gap={2} justifyContent="center">
                    <Button
                      variant="contained"
                      onClick={() => navigate(`/events/${eventId}`)}
                    >
                      View Event
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={clearFile}
                    >
                      Upload More Guests
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* Preview Dialog */}
            <Dialog 
              open={previewDialogOpen} 
              onClose={() => setPreviewDialogOpen(false)}
              maxWidth="lg"
              fullWidth
            >
              <DialogTitle>
                <Box display="flex" alignItems="center">
                  <TableChartIcon sx={{ mr: 1 }} />
                  Data Preview
                </Box>
              </DialogTitle>
              <DialogContent>
                {parsedData && (
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          {parsedData.headers.map((header) => (
                            <TableCell key={header}>
                              <Box>
                                <Typography variant="subtitle2">{header}</Typography>
                                <Typography variant="caption" color="textSecondary">
                                  → {columnMapping[header] ? expectedColumns[columnMapping[header]]?.label : 'Not mapped'}
                                </Typography>
                              </Box>
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {parsedData.data.slice(0, 10).map((row, index) => (
                          <TableRow key={index} hover>
                            {parsedData.headers.map((header) => (
                              <TableCell key={header}>
                                {row[header]}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
                {parsedData && parsedData.data.length > 10 && (
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 2, textAlign: 'center' }}>
                    Showing first 10 of {parsedData.data.length} rows
                  </Typography>
                )}
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setPreviewDialogOpen(false)}>Close</Button>
              </DialogActions>
            </Dialog>
          </Box>
        </Container>
      </Box>
    </MainLayout>
    );
};

export default UploadGuest;
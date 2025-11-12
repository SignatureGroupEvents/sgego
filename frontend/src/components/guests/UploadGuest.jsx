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
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider
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
  Save as SaveIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import api, { getGuests } from '../../services/api';
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState(null);
  const [event, setEvent] = useState(null);
  const [copying, setCopying] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [copyError, setCopyError] = useState('');
  const [existingGuests, setExistingGuests] = useState([]);
  const [duplicateRows, setDuplicateRows] = useState([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

  React.useEffect(() => {
    getEvent(eventId).then(setEvent);
  }, [eventId]);

  // Expected columns for guest data
  // Note: At least one of firstName, lastName, or email is required
  const expectedColumns = {
    firstName: { required: false, label: 'FIRST NAME', section: 'required' },
    lastName: { required: false, label: 'LAST NAME', section: 'required' },
    email: { required: false, label: 'EMAIL ADDRESS', section: 'required' },
    jobTitle: { required: false, label: 'INVITEE TITLE', section: 'optional' },
    company: { required: false, label: 'COMPANY', section: 'optional' },
    attendeeType: { required: false, label: 'ATTENDEE TYPE', section: 'optional' },
    notes: { required: false, label: 'NOTES', section: 'optional' },
    qrCodeData: { required: false, label: 'QR CODE DATA', section: 'optional' }
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

    // Check that at least one required field is mapped (firstName, lastName, or email)
    const requiredFieldsMapped = ['firstName', 'lastName', 'email'].some(
      field => columnMapping[field] && columnMapping[field] !== ''
    );
    
    if (!requiredFieldsMapped) {
      validationErrors.push('At least one required field (First Name, Last Name, or Email Address) must be mapped');
    }

    // Check for empty required fields in data
    data.forEach((row, index) => {
      const mappedRow = mapRowData(row);
      const hasName = mappedRow.firstName || mappedRow.lastName;
      const hasEmail = mappedRow.email;
      
      if (!hasName && !hasEmail) {
        validationWarnings.push(`Row ${index + 2}: Missing required information (name or email)`);
      }
      
      // Validate email format if provided
      if (mappedRow.email && !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(mappedRow.email)) {
        validationWarnings.push(`Row ${index + 2}: Invalid email format: ${mappedRow.email}`);
      }
    });

    return { errors: validationErrors, warnings: validationWarnings };
  };

  // Map row data based on column mapping
  // columnMapping now maps: { fieldName: csvColumnName }
  const mapRowData = (row) => {
    const mappedRow = {};
    Object.entries(columnMapping).forEach(([guestField, csvColumn]) => {
      if (csvColumn && csvColumn !== 'ignore' && row[csvColumn] !== undefined) {
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
      // Reverse mapping: field -> csvColumn
      const autoMapping = {};
      headers.forEach(header => {
        const lowerHeader = header.toLowerCase().trim();
        Object.entries(expectedColumns).forEach(([field, config]) => {
          const lowerLabel = config.label.toLowerCase();
          if (lowerHeader === lowerLabel ||
              lowerHeader.includes(lowerLabel.split(' ')[0]) || 
              lowerHeader === field ||
              (field === 'firstName' && (lowerHeader.includes('first') || lowerHeader.includes('fname'))) ||
              (field === 'lastName' && (lowerHeader.includes('last') || lowerHeader.includes('lname'))) ||
              (field === 'email' && (lowerHeader.includes('email') || lowerHeader.includes('e-mail'))) ||
              (field === 'jobTitle' && (lowerHeader.includes('title') || lowerHeader.includes('job'))) ||
              (field === 'company' && lowerHeader.includes('company'))) {
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

  const handleColumnMappingChange = (guestField, csvColumn) => {
    setColumnMapping(prev => ({
      ...prev,
      [guestField]: csvColumn || ''
    }));
  };

  // Check for duplicates against existing guests
  const checkForDuplicates = async () => {
    setCheckingDuplicates(true);
    try {
      // Fetch existing guests
      const response = await getGuests(eventId, true);
      const existing = response.data.guests || [];
      setExistingGuests(existing);

      const duplicates = [];
      const mappedGuests = parsedData.data.map((row, index) => {
        const mappedRow = mapRowData(row);
        return {
          ...mappedRow,
          _rowIndex: index + 2, // +2 because row 1 is header, and index is 0-based
          _originalRow: row
        };
      });

      // Check each mapped guest against existing guests
      mappedGuests.forEach((guest) => {
        let isDuplicate = false;
        let reason = '';

        // Check by email if provided
        if (guest.email) {
          const emailMatch = existing.find(
            eg => eg.email && eg.email.toLowerCase().trim() === guest.email.toLowerCase().trim()
          );
          if (emailMatch) {
            isDuplicate = true;
            reason = 'Email already exists';
          }
        }

        // Check by name if no email match
        if (!isDuplicate && guest.firstName && guest.lastName) {
          const nameMatch = existing.find(
            eg => eg.firstName && eg.lastName &&
            eg.firstName.toLowerCase().trim() === guest.firstName.toLowerCase().trim() &&
            eg.lastName.toLowerCase().trim() === guest.lastName.toLowerCase().trim()
          );
          if (nameMatch) {
            isDuplicate = true;
            reason = guest.email ? 'Name already exists' : 'Name or email already exists';
          }
        }

        if (isDuplicate) {
          duplicates.push({
            rowIndex: guest._rowIndex,
            name: `${guest.firstName || ''} ${guest.lastName || ''}`.trim() || 'Unknown',
            email: guest.email || 'No email',
            reason: reason,
            rowData: guest._originalRow
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
                  <Typography color="textSecondary" paragraph sx={{ mb: 4 }}>
                    Select the column from your file that corresponds to each guest field.
                  </Typography>
                  
                  {/* AT LEAST ONE REQUIRED Section */}
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
                      AT LEAST ONE REQUIRED
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {['firstName', 'lastName', 'email'].map((field) => {
                        const config = expectedColumns[field];
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
                        .map(([field, config]) => (
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
                        ))}
                    </Box>
                  </Box>

                  <Box display="flex" justifyContent="space-between" mt={4}>
                    <Button onClick={() => setActiveStep(0)}>
                      Back
                    </Button>
                    <Button 
                      variant="contained" 
                      onClick={validateAndProceed}
                      disabled={!['firstName', 'lastName', 'email'].some(
                        field => columnMapping[field] && columnMapping[field] !== ''
                      ) || checkingDuplicates}
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
                    <Grid xs={12} md={4}>
                      <Paper sx={{ p: 3, textAlign: 'center', backgroundColor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="h3" color="primary.main" gutterBottom sx={{ fontWeight: 700 }}>
                          {parsedData.data.length}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Total Guests
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid xs={12} md={4}>
                      <Paper sx={{ p: 3, textAlign: 'center', backgroundColor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="h3" color="success.main" gutterBottom sx={{ fontWeight: 700 }}>
                          {parsedData.data.length - duplicateRows.length}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Will be Added
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid xs={12} md={4}>
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

                  {/* Rows That Will Be Added Table */}
                  {parsedData.data.length - duplicateRows.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                        Rows That Will Be Added ({parsedData.data.length - duplicateRows.length})
                      </Typography>
                      <TableContainer component={Paper} sx={{ maxHeight: 400, overflow: 'auto' }}>
                        <Table size="small" stickyHeader>
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 600 }}>Row</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                              {columnMapping.jobTitle && (
                                <TableCell sx={{ fontWeight: 600 }}>Job Title</TableCell>
                              )}
                              {columnMapping.company && (
                                <TableCell sx={{ fontWeight: 600 }}>Company</TableCell>
                              )}
                              {columnMapping.attendeeType && (
                                <TableCell sx={{ fontWeight: 600 }}>Attendee Type</TableCell>
                              )}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {parsedData.data.map((row, index) => {
                              const rowIndex = index + 2; // +2 because row 1 is header, and index is 0-based
                              const mappedRow = mapRowData(row);
                              const isDuplicate = duplicateRows.some(dup => dup.rowIndex === rowIndex);
                              
                              // Skip duplicates and rows with errors
                              if (isDuplicate) return null;
                              
                              const firstName = mappedRow.firstName || '';
                              const lastName = mappedRow.lastName || '';
                              const name = `${firstName} ${lastName}`.trim() || 'Unknown';
                              
                              return (
                                <TableRow key={`add-${index}`}>
                                  <TableCell>{rowIndex}</TableCell>
                                  <TableCell>{name}</TableCell>
                                  <TableCell>{mappedRow.email || '-'}</TableCell>
                                  {columnMapping.jobTitle && (
                                    <TableCell>{mappedRow.jobTitle || '-'}</TableCell>
                                  )}
                                  {columnMapping.company && (
                                    <TableCell>{mappedRow.company || '-'}</TableCell>
                                  )}
                                  {columnMapping.attendeeType && (
                                    <TableCell>{mappedRow.attendeeType || '-'}</TableCell>
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
                        Rows with Issues
                      </Typography>
                      <TableContainer component={Paper} sx={{ maxHeight: 400, overflow: 'auto' }}>
                        <Table size="small" stickyHeader>
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 600 }}>Row</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>Issue Type</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>Details</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {/* Duplicate rows */}
                            {duplicateRows.map((duplicate, index) => (
                              <TableRow key={`dup-${index}`}>
                                <TableCell>{duplicate.rowIndex}</TableCell>
                                <TableCell>{duplicate.name}</TableCell>
                                <TableCell>{duplicate.email}</TableCell>
                                <TableCell>
                                  <Chip label="Duplicate" color="warning" size="small" />
                                </TableCell>
                                <TableCell>{duplicate.reason}</TableCell>
                              </TableRow>
                            ))}
                            {/* Warning rows */}
                            {warnings.map((warning, index) => {
                              // Extract row number from warning message (format: "Row X: message")
                              const rowMatch = warning.match(/Row (\d+):/);
                              const rowNum = rowMatch ? rowMatch[1] : index + 1;
                              const warningText = warning.replace(/Row \d+: /, '');
                              return (
                                <TableRow key={`warn-${index}`}>
                                  <TableCell>{rowNum}</TableCell>
                                  <TableCell>-</TableCell>
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
                      Upload {parsedData.data.length - duplicateRows.length} Guests
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
                    {/* Success Section - Always shown first */}
                    <Grid xs={12}>
                      <Paper 
                        sx={{ 
                          p: 0,
                          backgroundColor: 'background.paper',
                          border: '1px solid',
                          borderColor: 'divider',
                          overflow: 'hidden'
                        }}
                      >
                        {/* Colored top bar */}
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
                                {uploadResults.results?.added?.length || 0}
                              </Typography>
                              <Typography variant="body1" sx={{ fontWeight: 500, color: 'text.secondary' }}>
                                Successfully Added
                              </Typography>
                            </Box>
                            <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main' }} />
                          </Box>
                          {(uploadResults.results?.added?.length || 0) > 0 && parsedData && (
                            <TableContainer sx={{ maxHeight: 500, overflow: 'auto' }}>
                              <Table size="small" stickyHeader>
                                <TableHead>
                                  <TableRow>
                                    <TableCell sx={{ fontWeight: 600 }}>Row</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                                    {columnMapping.jobTitle && (
                                      <TableCell sx={{ fontWeight: 600 }}>Job Title</TableCell>
                                    )}
                                    {columnMapping.company && (
                                      <TableCell sx={{ fontWeight: 600 }}>Company</TableCell>
                                    )}
                                    {columnMapping.attendeeType && (
                                      <TableCell sx={{ fontWeight: 600 }}>Attendee Type</TableCell>
                                    )}
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {uploadResults.results.added.map((addedItem, index) => {
                                    const rowIndex = addedItem.index - 1; // Convert 1-based to 0-based
                                    const rowData = parsedData.data[rowIndex];
                                    const mappedRow = mapRowData(rowData);
                                    return (
                                      <TableRow key={index}>
                                        <TableCell>{addedItem.index}</TableCell>
                                        <TableCell>{addedItem.name}</TableCell>
                                        <TableCell>{addedItem.email || '-'}</TableCell>
                                        {columnMapping.jobTitle && (
                                          <TableCell>{mappedRow.jobTitle || '-'}</TableCell>
                                        )}
                                        {columnMapping.company && (
                                          <TableCell>{mappedRow.company || '-'}</TableCell>
                                        )}
                                        {columnMapping.attendeeType && (
                                          <TableCell>{mappedRow.attendeeType || '-'}</TableCell>
                                        )}
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          )}
                        </Box>
                      </Paper>
                    </Grid>

                    {/* Errors Section - Shown second */}
                    {(uploadResults.results?.errors?.length || 0) > 0 && (
                      <Grid xs={12}>
                        <Paper 
                          sx={{ 
                            p: 0,
                            backgroundColor: 'background.paper',
                            border: '1px solid',
                            borderColor: 'divider',
                            overflow: 'hidden'
                          }}
                        >
                          {/* Colored top bar */}
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
                            <TableContainer sx={{ maxHeight: 500, overflow: 'auto' }}>
                              <Table size="small" stickyHeader>
                                <TableHead>
                                  <TableRow>
                                    <TableCell sx={{ fontWeight: 600 }}>Row</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Error</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {uploadResults.results.errors.map((errorItem, index) => {
                                    const rowIndex = errorItem.index - 1; // Convert 1-based to 0-based
                                    const rowData = parsedData.data[rowIndex];
                                    return (
                                      <TableRow key={index}>
                                        <TableCell>{errorItem.index}</TableCell>
                                        <TableCell>{errorItem.name}</TableCell>
                                        <TableCell>{errorItem.email || '-'}</TableCell>
                                        <TableCell>
                                          <Typography variant="body2" color="error.main">
                                            {errorItem.error}
                                          </Typography>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          </Box>
                        </Paper>
                      </Grid>
                    )}

                    {/* Duplicates Section - Shown last */}
                    {(uploadResults.results?.duplicates?.length || 0) > 0 && (
                      <Grid xs={12}>
                        <Paper 
                          sx={{ 
                            p: 0,
                            backgroundColor: 'background.paper',
                            border: '1px solid',
                            borderColor: 'divider',
                            overflow: 'hidden'
                          }}
                        >
                          {/* Colored top bar */}
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
                                  {uploadResults.results?.duplicates?.length || 0}
                                </Typography>
                                <Typography variant="body1" sx={{ fontWeight: 500, color: 'text.secondary' }}>
                                  Duplicates Skipped
                                </Typography>
                              </Box>
                              <WarningIcon sx={{ fontSize: 48, color: 'warning.main' }} />
                            </Box>
                            <TableContainer sx={{ maxHeight: 500, overflow: 'auto' }}>
                              <Table size="small" stickyHeader>
                                <TableHead>
                                  <TableRow>
                                    <TableCell sx={{ fontWeight: 600 }}>Row</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Reason</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {uploadResults.results.duplicates.map((duplicate, index) => (
                                    <TableRow key={index}>
                                      <TableCell>{duplicate.index}</TableCell>
                                      <TableCell>{duplicate.name}</TableCell>
                                      <TableCell>{duplicate.email || '-'}</TableCell>
                                      <TableCell>
                                        <Typography variant="body2" color="text.secondary">
                                          {duplicate.reason}
                                        </Typography>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          </Box>
                        </Paper>
                      </Grid>
                    )}
                  </Grid>

                  <Box display="flex" gap={2} justifyContent="center" mt={4}>
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

          </Box>
        </Container>
      </Box>
    </MainLayout>
    );
};

export default UploadGuest;
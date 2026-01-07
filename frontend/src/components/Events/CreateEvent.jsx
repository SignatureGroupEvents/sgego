import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import {
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  FormControlLabel,
  Switch,
  Chip,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Grid,
  IconButton,
  Divider,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import api from '../../services/api';
import MainLayout from '../layout/MainLayout';
import HomeIcon from '@mui/icons-material/Home';
import EventIcon from '@mui/icons-material/Event';

// Validation schema for each step
const stepValidationSchemas = [
  Yup.object({
    eventName: Yup.string().required('Event name is required'),
    eventContractNumber: Yup.string()
      .required('Contract number is required')
      .test('contract-uniqueness', 'Contract number is already in use', async function(value) {
        if (!value) return true; // Let required validation handle empty values
        
        try {
          const response = await api.get(`/events/check-contract/${encodeURIComponent(value)}`);
          return response.data.available;
        } catch (error) {
          // If API call fails, don't block the form - let server handle it
          return true;
        }
      }),
    eventStart: Yup.string().required('Event start date is required'),
  }),
  Yup.object({}), // Gift Settings step - no validation required
  Yup.object({})  // Confirmation step - no validation required
];

const CreateEvent = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const steps = ['Basic Info', 'Gift Settings', 'Confirmation'];

  const initialValues = {
    eventName: '',
    eventContractNumber: '',
    eventStart: '',
    eventEnd: '',
    includeStyles: false,
    allowMultipleGifts: false,
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    setError('');

    try {
      await api.post('/events', values);
      navigate('/events');
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to create event');
    }

    setLoading(false);
  };


  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString();
  };

  const StepContent = ({ values, setFieldValue, errors, touched }) => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Typography 
              variant={isMobile ? 'subtitle1' : 'h6'} 
              gutterBottom
              sx={{ fontSize: { xs: '1rem', sm: '1.125rem', md: '1.25rem' } }}
            >
              Event Information
            </Typography>
            <Grid container spacing={{ xs: 1.5, sm: 2 }}>
              <Grid xs={12}>
                <Field name="eventName">
                  {({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label={
                        <span>
                          Event Name <span style={{ color: 'red' }}>*</span>
                        </span>
                      }
                      error={touched.eventName && !!errors.eventName}
                      helperText={touched.eventName && errors.eventName}
                    />
                  )}
                </Field>
              </Grid>
              <Grid xs={12}>
                <Field name="eventContractNumber">
                  {({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label={
                        <span>
                          Contract Number <span style={{ color: 'red' }}>*</span>
                        </span>
                      }
                      error={touched.eventContractNumber && !!errors.eventContractNumber}
                      helperText={
                        touched.eventContractNumber && errors.eventContractNumber 
                          ? errors.eventContractNumber 
                          : "Unique identifier for this event"
                      }
                    />
                  )}
                </Field>
              </Grid>
              <Grid xs={12} md={6}>
                <Field name="eventStart">
                  {({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label={
                        <span>
                          Event Date <span style={{ color: 'red' }}>*</span>
                        </span>
                      }
                      type="date"
                      InputLabelProps={{ shrink: true }}
                      error={touched.eventStart && !!errors.eventStart}
                      helperText={touched.eventStart && errors.eventStart}
                    />
                  )}
                </Field>
              </Grid>
              <Grid xs={12} md={6}>
                <Field name="eventEnd">
                  {({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="End Date (Optional)"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                    />
                  )}
                </Field>
              </Grid>
            </Grid>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography 
              variant={isMobile ? 'subtitle1' : 'h6'} 
              gutterBottom
              sx={{ fontSize: { xs: '1rem', sm: '1.125rem', md: '1.25rem' } }}
            >
              Gift Selection Settings
            </Typography>
            <Grid container spacing={{ xs: 1.5, sm: 2 }}>
              <Grid xs={12}>
                <FormControlLabel
                  control={
                    <Field name="includeStyles">
                      {({ field }) => (
                        <Switch
                          checked={field.value}
                          onChange={field.onChange}
                          name={field.name}
                          size={isMobile ? 'small' : 'medium'}
                        />
                      )}
                    </Field>
                  }
                  label={
                    <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                      Include style selection for gifts
                    </Typography>
                  }
                  sx={{ mb: 1 }}
                />
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ 
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    ml: { xs: 0, sm: 4 },
                    pl: { xs: 0, sm: 0 }
                  }}
                >
                  This allows your to staff to select all information for the gift, if not selected, the staff will only be able to select the gift type.
                </Typography>
              </Grid>
              <Grid xs={12}>
                <FormControlLabel
                  control={
                    <Field name="allowMultipleGifts">
                      {({ field }) => (
                        <Switch
                          checked={field.value}
                          onChange={field.onChange}
                          name={field.name}
                          size={isMobile ? 'small' : 'medium'}
                        />
                      )}
                    </Field>
                  }
                  label={
                    <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                      Allow multiple gift selection
                    </Typography>
                  }
                  sx={{ mb: 1 }}
                />
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ 
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    ml: { xs: 0, sm: 4 },
                    pl: { xs: 0, sm: 0 }
                  }}
                >
                  This allows your to staff to select multiple gifts for the same guest.
                </Typography>
              </Grid>
            </Grid>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, mb: { xs: 2, sm: 3 } }}>
              <CheckCircleIcon 
                color="success" 
                sx={{ fontSize: { xs: 24, sm: 28, md: 32 } }} 
              />
              <Typography 
                variant={isMobile ? 'subtitle1' : 'h6'}
                sx={{ fontSize: { xs: '1rem', sm: '1.125rem', md: '1.25rem' } }}
              >
                Confirm Event Details
              </Typography>
            </Box>

            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                mb: { xs: 2, sm: 3 },
                fontSize: { xs: '0.75rem', sm: '0.875rem' }
              }}
            >
              Please review the information below and click "Create Event" to proceed.
            </Typography>

            {/* Basic Information */}
            <Card sx={{ mb: { xs: 1.5, sm: 2 } }}>
              <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                <Typography 
                  variant={isMobile ? 'subtitle2' : 'h6'} 
                  gutterBottom 
                  color="primary"
                  sx={{ fontSize: { xs: '0.875rem', sm: '1rem', md: '1.25rem' } }}
                >
                  Basic Information
                </Typography>
                <Grid container spacing={{ xs: 1.5, sm: 2 }}>
                  <Grid xs={12} md={6}>
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                    >
                      Event Name
                    </Typography>
                    <Typography 
                      variant="body1" 
                      fontWeight={500}
                      sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                    >
                      {values.eventName || 'Not specified'}
                    </Typography>
                  </Grid>
                  <Grid xs={12} md={6}>
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                    >
                      Contract Number
                    </Typography>
                    <Typography 
                      variant="body1" 
                      fontWeight={500}
                      sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                    >
                      {values.eventContractNumber || 'Not specified'}
                    </Typography>
                  </Grid>
                  <Grid xs={12} md={6}>
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                    >
                      Start Date
                    </Typography>
                    <Typography 
                      variant="body1" 
                      fontWeight={500}
                      sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                    >
                      {formatDate(values.eventStart)}
                    </Typography>
                  </Grid>
                  <Grid xs={12} md={6}>
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                    >
                      End Date
                    </Typography>
                    <Typography 
                      variant="body1" 
                      fontWeight={500}
                      sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                    >
                      {formatDate(values.eventEnd)}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Gift Settings */}
            <Card>
              <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                <Typography 
                  variant={isMobile ? 'subtitle2' : 'h6'} 
                  gutterBottom 
                  color="primary"
                  sx={{ fontSize: { xs: '0.875rem', sm: '1rem', md: '1.25rem' } }}
                >
                  Gift Settings
                </Typography>
                <Grid container spacing={{ xs: 1.5, sm: 2 }}>
                  <Grid xs={12}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1,
                      flexWrap: { xs: 'wrap', sm: 'nowrap' }
                    }}>
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                      >
                        Include Style Selection:
                      </Typography>
                      <Typography 
                        variant="body1" 
                        fontWeight={500}
                        sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                      >
                        {values.includeStyles ? 'Yes' : 'No'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid xs={12}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1,
                      flexWrap: { xs: 'wrap', sm: 'nowrap' }
                    }}>
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                      >
                        Allow Multiple Gifts:
                      </Typography>
                      <Typography 
                        variant="body1" 
                        fontWeight={500}
                        sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                      >
                        {values.allowMultipleGifts ? 'Yes' : 'No'}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <MainLayout>
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {/* Header */}
        <Box sx={{ mb: { xs: 2, sm: 3, md: 4 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, mb: { xs: 1, sm: 2 } }}>
            <IconButton 
              onClick={() => navigate('/events')}
              size={isMobile ? 'small' : 'medium'}
            >
              <ArrowBackIcon fontSize={isMobile ? 'small' : 'medium'} />
            </IconButton>
            <Typography 
              variant={isMobile ? 'h5' : 'h4'} 
              fontWeight={700} 
              color="primary.main"
              sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2rem' } }}
            >
              Create New Event
            </Typography>
          </Box>
          <Typography 
            variant={isMobile ? 'body2' : 'subtitle1'} 
            color="text.secondary"
            sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
          >
            Set up a new event
          </Typography>
        </Box>

        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: { xs: 2, sm: 3 },
              fontSize: { xs: '0.875rem', sm: '1rem' }
            }}
          >
            {error}
          </Alert>
        )}

        <Paper elevation={2} sx={{ borderRadius: { xs: 2, sm: 3 }, p: { xs: 2, sm: 2.5, md: 3 } }}>
          <Stepper 
            activeStep={activeStep} 
            orientation={isMobile ? 'vertical' : 'horizontal'}
            sx={{ mb: { xs: 3, sm: 4 } }}
          >
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel 
                  sx={{
                    '& .MuiStepLabel-label': {
                      fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' }
                    }
                  }}
                >
                  {label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>

          <Formik
            initialValues={initialValues}
            validationSchema={stepValidationSchemas[activeStep]}
            onSubmit={(values) => {
              // Only submit when explicitly called, not on navigation
              handleSubmit(values);
            }}
          >
            {({ values, setFieldValue, errors, touched, isValid, validateForm, submitForm }) => {
              // Check if current step is valid
              const isCurrentStepValid = () => {
                // Check for errors in current step fields
                const currentStepErrors = Object.keys(errors).filter(key => {
                  // Only check errors for fields that belong to the current step
                  switch (activeStep) {
                    case 0: // Basic Info
                      return ['eventName', 'eventContractNumber', 'eventStart'].includes(key);
                    case 1: // Gift Settings
                      return false; // No validation required
                    case 2: // Confirmation
                      return false; // No validation required
                    default:
                      return false;
                  }
                });
                
                // For step 0, check both errors and that required fields have values
                if (activeStep === 0) {
                  const hasRequiredFields = 
                    values.eventName?.trim() && 
                    values.eventContractNumber?.trim() && 
                    values.eventStart;
                  
                  // If fields are touched but have errors, or if required fields are missing, invalid
                  const hasErrors = currentStepErrors.length > 0;
                  const missingRequiredFields = !hasRequiredFields;
                  
                  return !hasErrors && !missingRequiredFields;
                }
                
                return currentStepErrors.length === 0;
              };

              const handleCreateEvent = () => {
                submitForm();
              };

              return (
                <Box>
                  <StepContent
                    values={values}
                    setFieldValue={setFieldValue}
                    errors={errors}
                    touched={touched}
                  />

                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    flexDirection: { xs: 'column-reverse', sm: 'row' },
                    gap: { xs: 1.5, sm: 2 },
                    mt: { xs: 3, sm: 4 }
                  }}>
                    <Button
                      disabled={activeStep === 0}
                      onClick={() => setActiveStep((prev) => prev - 1)}
                      variant="outlined"
                      fullWidth={isMobile}
                      size={isMobile ? 'medium' : 'large'}
                      sx={{ 
                        borderRadius: 2,
                        minHeight: { xs: 44, sm: 'auto' }
                      }}
                    >
                      Back
                    </Button>

                    <Box sx={{ 
                      display: 'flex', 
                      gap: { xs: 1.5, sm: 2 },
                      width: { xs: '100%', sm: 'auto' }
                    }}>
                      {/* Show Next button for all steps except the last one */}
                      {activeStep < steps.length - 1 && (
                        <Button
                          variant="contained"
                          onClick={async () => {
                            // Validate form before proceeding
                            await validateForm();
                            
                            // Check if current step is valid after validation
                            if (isCurrentStepValid()) {
                              setActiveStep((prev) => prev + 1);
                            }
                          }}
                          disabled={!isCurrentStepValid()}
                          fullWidth={isMobile}
                          size={isMobile ? 'medium' : 'large'}
                          sx={{ 
                            borderRadius: 2, 
                            fontWeight: 600,
                            minHeight: { xs: 44, sm: 'auto' }
                          }}
                        >
                          Next
                        </Button>
                      )}

                      {/* Show Create Event button only on the confirmation step */}
                      {activeStep === steps.length - 1 && (
                        <Button
                          variant="contained"
                          onClick={handleCreateEvent}
                          disabled={loading}
                          fullWidth={isMobile}
                          size={isMobile ? 'medium' : 'large'}
                          sx={{
                            borderRadius: 2,
                            fontWeight: 600,
                            bgcolor: 'success.main',
                            minHeight: { xs: 44, sm: 'auto' },
                            '&:hover': {
                              bgcolor: 'success.dark'
                            }
                          }}
                        >
                          {loading ? 'Creating...' : 'Create my event'}
                        </Button>
                      )}
                    </Box>
                  </Box>
                </Box>
              );
            }}
          </Formik>
        </Paper>
      </Box>
    </MainLayout>
  );
};

export default CreateEvent;
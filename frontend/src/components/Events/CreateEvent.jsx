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
  Divider
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
            <Typography variant="h6" gutterBottom>
              Event Information
            </Typography>
            <Grid container spacing={2}>
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
            <Typography variant="h6" gutterBottom>
              Gift Selection Settings
            </Typography>
            <Grid container spacing={2}>
              <Grid xs={12}>
                <FormControlLabel
                  control={
                    <Field name="includeStyles">
                      {({ field }) => (
                        <Switch
                        checked={field.value}
                        onChange={field.onChange}
                        name={field.name}
                        />
                      )}
                    </Field>
                  }
                  label="Include style selection for gifts"
                />
                <Typography variant="body2" color="text.secondary">This allows your to staff to select all information for the gift, if not selected, the staff will only be able to select the gift type.</Typography>
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
                        />
                      )}
                    </Field>
                  }
                  label="Allow multiple gift selection"
                />
                <Typography variant="body2" color="text.secondary">This allows your to staff to select multiple gifts for the same guest.</Typography>
              </Grid>
            </Grid>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <CheckCircleIcon color="success" sx={{ fontSize: 32 }} />
              <Typography variant="h6">
                Confirm Event Details
              </Typography>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Please review the information below and click "Create Event" to proceed.
            </Typography>

            {/* Basic Information */}
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  Basic Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Event Name</Typography>
                    <Typography variant="body1" fontWeight={500}>{values.eventName || 'Not specified'}</Typography>
                  </Grid>
                  <Grid xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Contract Number</Typography>
                    <Typography variant="body1" fontWeight={500}>{values.eventContractNumber || 'Not specified'}</Typography>
                  </Grid>
                  <Grid xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Start Date</Typography>
                    <Typography variant="body1" fontWeight={500}>{formatDate(values.eventStart)}</Typography>
                  </Grid>
                  <Grid xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">End Date</Typography>
                    <Typography variant="body1" fontWeight={500}>{formatDate(values.eventEnd)}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Gift Settings */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  Gift Settings
                </Typography>
                <Grid container spacing={2}>
                  <Grid xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" color="text.secondary">Include Style Selection:</Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {values.includeStyles ? 'Yes' : 'No'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" color="text.secondary">Allow Multiple Gifts:</Typography>
                      <Typography variant="body1" fontWeight={500}>
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
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <IconButton onClick={() => navigate('/events')}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h4" fontWeight={700} color="primary.main">
              Create New Event
            </Typography>
          </Box>
          <Typography variant="subtitle1" color="text.secondary">
            Set up a new event
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Paper elevation={2} sx={{ borderRadius: 3, p: 3 }}>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
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

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                    <Button
                      disabled={activeStep === 0}
                      onClick={() => setActiveStep((prev) => prev - 1)}
                      variant="outlined"
                    >
                      Back
                    </Button>

                    <Box sx={{ display: 'flex', gap: 2 }}>
                      {/* Show Next button for all steps except the last one */}
                      {activeStep < steps.length - 1 && (
                        <Button
                          variant="contained"
                          onClick={() => setActiveStep((prev) => prev + 1)}
                          disabled={!isCurrentStepValid()}
                          sx={{ borderRadius: 2, fontWeight: 600 }}
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
                          sx={{
                            borderRadius: 2,
                            fontWeight: 600,
                            bgcolor: 'success.main',
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
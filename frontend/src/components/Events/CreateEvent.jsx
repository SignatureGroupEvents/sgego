import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import {
  Container,
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
  IconButton
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import MainNavigation from '../layout/MainNavigation';
import HomeIcon from '@mui/icons-material/Home';
import EventIcon from '@mui/icons-material/Event';

// Validation schema
const validationSchema = Yup.object({
  eventName: Yup.string().required('Event name is required'),
  eventContractNumber: Yup.string().required('Contract number is required'),
  eventStart: Yup.string().required('Event start date is required'),
});

const CreateEvent = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { isOperationsManager, isAdmin } = useAuth();
  const navigate = useNavigate();

  if (!isOperationsManager && !isAdmin) {
    return (
      <Container>
        <Alert severity="error">
          Access denied. Only operations managers and administrators can create events.
        </Alert>
      </Container>
    );
  }

  const steps = ['Basic Info', 'Tags & Types', 'Gift Settings'];

  const initialValues = {
    eventName: '',
    eventContractNumber: '',
    eventStart: '',
    eventEnd: '',
    includeStyles: false,
    allowMultipleGifts: false,
    availableTags: [],
    attendeeTypes: [],
    // Temp fields for adding tags/types
    currentTagName: '',
    currentTagColor: '#1976d2',
    currentTagDescription: '',
    currentTypeName: '',
    currentTypeDescription: '',
    currentTypeIsDefault: false,
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    setError('');

    try {
      // Clean up the values - remove the temp fields
      const {
        currentTagName,
        currentTagColor, 
        currentTagDescription,
        currentTypeName,
        currentTypeDescription,
        currentTypeIsDefault,
        ...submitData
      } = values;

      await api.post('/events', submitData);
      navigate('/events');
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to create event');
    }
    
    setLoading(false);
  };

  const addTag = (values, setFieldValue) => {
    if (values.currentTagName.trim()) {
      const newTag = {
        name: values.currentTagName,
        color: values.currentTagColor,
        description: values.currentTagDescription
      };
      
      setFieldValue('availableTags', [...values.availableTags, newTag]);
      setFieldValue('currentTagName', '');
      setFieldValue('currentTagColor', '#1976d2');
      setFieldValue('currentTagDescription', '');
    }
  };

  const removeTag = (index, values, setFieldValue) => {
    setFieldValue('availableTags', values.availableTags.filter((_, i) => i !== index));
  };

  const addAttendeeType = (values, setFieldValue) => {
    if (values.currentTypeName.trim()) {
      const newType = {
        name: values.currentTypeName,
        description: values.currentTypeDescription,
        isDefault: values.currentTypeIsDefault
      };
      
      setFieldValue('attendeeTypes', [...values.attendeeTypes, newType]);
      setFieldValue('currentTypeName', '');
      setFieldValue('currentTypeDescription', '');
      setFieldValue('currentTypeIsDefault', false);
    }
  };

  const removeAttendeeType = (index, values, setFieldValue) => {
    setFieldValue('attendeeTypes', values.attendeeTypes.filter((_, i) => i !== index));
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
              <Grid item xs={12}>
                <Field name="eventName">
                  {({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Event Name"
                      required
                      error={touched.eventName && !!errors.eventName}
                      helperText={touched.eventName && errors.eventName}
                    />
                  )}
                </Field>
              </Grid>
              <Grid item xs={12}>
                <Field name="eventContractNumber">
                  {({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Contract Number"
                      required
                      helperText="Unique identifier for this event"
                      error={touched.eventContractNumber && !!errors.eventContractNumber}
                    />
                  )}
                </Field>
              </Grid>
              <Grid item xs={12} md={6}>
                <Field name="eventStart">
                  {({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Event Date"
                      type="date"
                      required
                      InputLabelProps={{ shrink: true }}
                      error={touched.eventStart && !!errors.eventStart}
                      helperText={touched.eventStart && errors.eventStart}
                    />
                  )}
                </Field>
              </Grid>
              <Grid item xs={12} md={6}>
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
              Tags & Attendee Types
            </Typography>
            
            {/* Tags Section */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Event Tags
                </Typography>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12}>
                    <Field name="currentTagName">
                      {({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Tag Name"
                        />
                      )}
                    </Field>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Field name="currentTagColor">
                      {({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Color"
                          type="color"
                        />
                      )}
                    </Field>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Field name="currentTagDescription">
                      {({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Description"
                        />
                      )}
                    </Field>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={() => addTag(values, setFieldValue)}
                      sx={{ height: 56 }}
                    >
                      Add Tag
                    </Button>
                  </Grid>
                </Grid>
                
                {/* Display existing tags */}
                {values.availableTags.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" gutterBottom>
                      Current Tags:
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {values.availableTags.map((tag, index) => (
                        <Chip
                          key={index}
                          label={tag.name}
                          onDelete={() => removeTag(index, values, setFieldValue)}
                          sx={{ backgroundColor: tag.color, color: 'white' }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Attendee Types Section */}
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Attendee Types
                </Typography>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={4}>
                    <Field name="currentTypeName">
                      {({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Type Name"
                        />
                      )}
                    </Field>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Field name="currentTypeDescription">
                      {({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Description"
                        />
                      )}
                    </Field>
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <Field name="currentTypeIsDefault">
                      {({ field }) => (
                        <FormControlLabel
                          control={
                            <Switch
                              checked={field.value}
                              onChange={field.onChange}
                              name={field.name}
                            />
                          }
                          label="Default"
                        />
                      )}
                    </Field>
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={() => addAttendeeType(values, setFieldValue)}
                      sx={{ height: 56 }}
                    >
                      Add Type
                    </Button>
                  </Grid>
                </Grid>
                
                {/* Display existing types */}
                {values.attendeeTypes.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" gutterBottom>
                      Current Types:
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {values.attendeeTypes.map((type, index) => (
                        <Chip
                          key={index}
                          label={`${type.name}${type.isDefault ? ' (Default)' : ''}`}
                          onDelete={() => removeAttendeeType(index, values, setFieldValue)}
                          color="primary"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Gift Settings
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
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
              </Grid>
              <Grid item xs={12}>
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
              </Grid>
            </Grid>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <MainNavigation />
      <Box sx={{ flex: 1, overflow: 'auto', p: { xs: 2, md: 3 } }}>
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
            Set up a new event with all the details
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
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ values, setFieldValue, errors, touched, isValid }) => (
              <Form>
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
                  
                  <Box>
                    {activeStep === steps.length - 1 ? (
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={loading || !isValid}
                        sx={{ borderRadius: 2, fontWeight: 600 }}
                      >
                        {loading ? 'Creating...' : 'Create Event'}
                      </Button>
                    ) : (
                      <Button
                        variant="contained"
                        onClick={() => setActiveStep((prev) => prev + 1)}
                        disabled={!isValid}
                        sx={{ borderRadius: 2, fontWeight: 600 }}
                      >
                        Next
                      </Button>
                    )}
                  </Box>
                </Box>
              </Form>
            )}
          </Formik>
        </Paper>
      </Box>
    </Box>
  );
};

export default CreateEvent; 
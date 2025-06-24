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
import MainNavigation from '../MainNavigation';
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
              <Grid size={{ xs: 12 }}>
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
              <Grid size={{ xs: 12 }}>
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
              <Grid size={{ xs: 12, md: 6 }}>
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
              <Grid size={{ xs: 12, md: 6 }}>
                <Field name="eventEnd">
                  {({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Event End (Optional)"
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
                  <Grid size={{ xs: 12, sm: 4 }}>
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
                  <Grid size={{ xs: 12, sm: 3 }}>
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
                  <Grid size={{ xs: 12, sm: 3 }}>
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
                  <Grid size={{ xs: 12, sm: 2 }}>
                    <Button
                      variant="outlined"
                      onClick={() => addTag(values, setFieldValue)}
                      startIcon={<AddIcon />}
                      fullWidth
                    >
                      Add
                    </Button>
                  </Grid>
                </Grid>
                
                <Box sx={{ mt: 2 }}>
                  {values.availableTags.map((tag, index) => (
                    <Chip
                      key={index}
                      label={tag.name}
                      onDelete={() => removeTag(index, values, setFieldValue)}
                      sx={{ 
                        mr: 1, 
                        mb: 1, 
                        backgroundColor: tag.color,
                        color: 'white'
                      }}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>

            {/* Attendee Types Section */}
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Attendee Types
                </Typography>
                <Grid container spacing={2} alignItems="center">
                  <Grid size={{ xs: 12, sm: 4 }}>
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
                  <Grid size={{ xs: 12, sm: 4 }}>
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
                  <Grid size={{ xs: 12, sm: 2 }}>
                    <Field name="currentTypeIsDefault">
                      {({ field }) => (
                        <FormControlLabel
                          control={
                            <Switch
                              checked={field.value}
                              onChange={(e) => setFieldValue('currentTypeIsDefault', e.target.checked)}
                            />
                          }
                          label="Default"
                        />
                      )}
                    </Field>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 2 }}>
                    <Button
                      variant="outlined"
                      onClick={() => addAttendeeType(values, setFieldValue)}
                      startIcon={<AddIcon />}
                      fullWidth
                    >
                      Add
                    </Button>
                  </Grid>
                </Grid>
                
                <Box sx={{ mt: 2 }}>
                  {values.attendeeTypes.map((type, index) => (
                    <Chip
                      key={index}
                      label={`${type.name}${type.isDefault ? ' (Default)' : ''}`}
                      onDelete={() => removeAttendeeType(index, values, setFieldValue)}
                      color={type.isDefault ? "primary" : "default"}
                      sx={{ mr: 1, mb: 1 }}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Gift Configuration
            </Typography>
            
            <Card>
              <CardContent>
                <Field name="includeStyles">
                  {({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value}
                          onChange={(e) => setFieldValue('includeStyles', e.target.checked)}
                        />
                      }
                      label="Include Styles"
                      sx={{ mb: 2 }}
                    />
                  )}
                </Field>
                <Typography variant="body2" color="textSecondary" paragraph>
                  When enabled, staff can select specific gift styles. When disabled, staff select generic gift types.
                </Typography>

                <Field name="allowMultipleGifts">
                  {({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value}
                          onChange={(e) => setFieldValue('allowMultipleGifts', e.target.checked)}
                        />
                      }
                      label="Allow Multiple Gifts"
                    />
                  )}
                </Field>
                <Typography variant="body2" color="textSecondary">
                  When enabled, guests can receive multiple gifts through secondary events.
                </Typography>
              </CardContent>
            </Card>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <MainNavigation />
      <Box sx={{ flex: 1, overflow: 'auto', p: 4 }}>
        <Container maxWidth="md">
          <Box sx={{ my: 4 }}>
            <Paper sx={{ p: 4 }}>
              <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                {steps.map((label) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>

              {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

              <Formik
                initialValues={initialValues}
                validationSchema={validationSchema}
                onSubmit={handleSubmit}
              >
                {({
                  values,
                  setFieldValue,
                  errors,
                  touched,
                  validateForm,
                  setTouched,
                  submitForm
                }) => (
                  <Form
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                      }
                    }}
                  >
                    <StepContent 
                      values={values} 
                      setFieldValue={setFieldValue}
                      errors={errors}
                      touched={touched}
                    />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                      <Button
                        type="button"
                        disabled={activeStep === 0}
                        onClick={() => setActiveStep(activeStep - 1)}
                      >
                        Back
                      </Button>
                      
                      {activeStep === steps.length - 1 ? (
                        <Button
                          type="button"
                          variant="contained"
                          disabled={loading}
                          onClick={submitForm}
                        >
                          {loading ? 'Creating...' : 'Create Event'}
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="contained"
                          onClick={async () => {
                            if (activeStep === 0) {
                              const errors = await validateForm();
                              setTouched({
                                eventName: true,
                                eventContractNumber: true,
                                eventStart: true,
                              });
                              if (!errors.eventName && !errors.eventContractNumber && !errors.eventStart) {
                                setActiveStep(activeStep + 1);
                              }
                            } else if (activeStep === 1) {
                              setActiveStep(activeStep + 1);
                            }
                          }}
                        >
                          Next
                        </Button>
                      )}
                    </Box>
                  </Form>
                )}
              </Formik>
            </Paper>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default CreateEvent;

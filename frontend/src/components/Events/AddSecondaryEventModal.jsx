import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Alert,
  CircularProgress
} from '@mui/material';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import api from '../../services/api';
import toast from 'react-hot-toast';

const validationSchema = Yup.object({
  eventName: Yup.string().required('Event name is required'),
  eventContractNumber: Yup.string().required('Contract number is required'),
  eventStart: Yup.string().required('Event start date is required'),
});

const AddSecondaryEventModal = ({ parentEventId, onClose, onEventAdded }) => {
  const [loading, setLoading] = useState(false);

  const initialValues = {
    eventName: '',
    eventContractNumber: '',
    eventStart: '',
    eventEnd: '',
  };

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      const response = await api.post('/events', {
        ...values,
        parentEventId,
        isMainEvent: false
      });
      
      toast.success('Secondary event created successfully');
      onEventAdded(response.data);
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create secondary event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Secondary Event</DialogTitle>
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ values, errors, touched, handleChange, handleBlur, isValid }) => (
          <Form>
            <DialogContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
                
                <Field name="eventContractNumber">
                  {({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Contract Number"
                      required
                      helperText="Unique identifier for this secondary event"
                      error={touched.eventContractNumber && !!errors.eventContractNumber}
                    />
                  )}
                </Field>
                
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
              </Box>
            </DialogContent>
            
            <DialogActions>
              <Button onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={loading || !isValid}
                sx={{ borderRadius: 2, fontWeight: 600 }}
              >
                {loading ? (
                  <>
                    <CircularProgress size={16} sx={{ mr: 1 }} />
                    Creating...
                  </>
                ) : (
                  'Create Event'
                )}
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
};

export default AddSecondaryEventModal; 
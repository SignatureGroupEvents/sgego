import React, { useState } from 'react';
import { Modal, Box, Typography, TextField, Button, Paper, Grid, Alert } from '@mui/material';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import api from '../../services/api';

const validationSchema = Yup.object({
  eventName: Yup.string().required('Event name is required'),
  eventContractNumber: Yup.string().required('Contract number is required'),
  eventStart: Yup.string().required('Event start date is required'),
});

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  boxShadow: 24,
  borderRadius: 2,
  p: 4,
};

const AddSecondaryEventModal = ({ open, onClose, parentEventId, parentContractNumber, parentEventStart, parentEventEnd, onEventAdded }) => {
  const [adjustDates, setAdjustDates] = useState(false);
  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={style} component={Paper}>
        <Typography variant="h6" gutterBottom>
          Add Secondary Event
        </Typography>
        <Formik
          initialValues={{
            eventName: '',
            eventContractNumber: parentContractNumber || '',
            eventStart: parentEventStart ? parentEventStart.slice(0, 10) : '',
            eventEnd: parentEventEnd ? parentEventEnd.slice(0, 10) : '',
          }}
          enableReinitialize
          validationSchema={validationSchema}
          onSubmit={async (values, { setSubmitting, setStatus, resetForm }) => {
            setStatus('');
            try {
              await api.post('/events', {
                ...values,
                parentEventId,
                isMainEvent: false,
              });
              resetForm();
              onEventAdded && onEventAdded();
            } catch (error) {
              setStatus(error.response?.data?.message || 'Failed to create secondary event');
            }
            setSubmitting(false);
          }}
        >
          {({ isSubmitting, errors, touched, status, values, setFieldValue }) => (
            <Form>
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
                        InputProps={{ readOnly: true }}
                        error={touched.eventContractNumber && !!errors.eventContractNumber}
                        helperText={touched.eventContractNumber && errors.eventContractNumber}
                      />
                    )}
                  </Field>
                </Grid>
                <Grid item xs={12}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body2">Use parent event dates</Typography>
                    <Button size="small" onClick={() => setAdjustDates(adjust => !adjust)} variant={adjustDates ? 'contained' : 'outlined'}>
                      {adjustDates ? 'Adjust Dates' : 'Default'}
                    </Button>
                  </Box>
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
                        value={values.eventStart}
                        InputProps={{ readOnly: !adjustDates }}
                        onChange={e => setFieldValue('eventStart', e.target.value)}
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
                        label="Event End (Optional)"
                        type="date"
                        InputLabelProps={{ shrink: true }}
                        value={values.eventEnd}
                        InputProps={{ readOnly: !adjustDates }}
                        onChange={e => setFieldValue('eventEnd', e.target.value)}
                      />
                    )}
                  </Field>
                </Grid>
              </Grid>
              {status && <Alert severity="error" sx={{ mt: 2 }}>{status}</Alert>}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                <Button onClick={onClose} sx={{ mr: 2 }} color="secondary" variant="outlined">
                  Cancel
                </Button>
                <Button type="submit" variant="contained" color="primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Adding...' : 'Add Secondary Event'}
                </Button>
              </Box>
            </Form>
          )}
        </Formik>
      </Box>
    </Modal>
  );
};

export default AddSecondaryEventModal; 
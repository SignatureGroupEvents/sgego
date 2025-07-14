import React from 'react';
import { Typography, Box, Card, CardContent, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { ExpandMore as ExpandMoreIcon, Help as HelpIcon } from '@mui/icons-material';
import MainLayout from '../components/layout/MainLayout';

const HelpPage = () => {
  const faqItems = [
    {
      question: "How do I create a new event?",
      answer: "Navigate to the Events page and click the 'Create Event' button. Fill in the required information including event name, contract number, and dates."
    },
    {
      question: "How do I upload guest lists?",
      answer: "From the event dashboard, click 'Upload More' in the Guest List section. You can upload CSV or Excel files with guest information."
    },
    {
      question: "How do I manage inventory?",
      answer: "Click 'View Inventory' from the event dashboard or navigate to the Inventory page. You can add items manually or upload via CSV."
    },
    {
      question: "How do I check in guests?",
      answer: "From the guest list, click the 'Check In' button next to any guest's name. This will open a check-in modal where you can confirm their attendance."
    },
    {
      question: "How do I add secondary events?",
      answer: "From the main event dashboard, click 'Add Additional Event' button. Secondary events are linked to the main event and share the same contract number."
    },
    {
      question: "How do I export data?",
      answer: "Most pages have export functionality. Look for 'Export CSV' or 'Export Excel' buttons in the top action bar of each page."
    }
  ];

  return (
    <MainLayout>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} color="primary.main" gutterBottom>
          Help & Support
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Find answers to common questions and learn how to use the Event Check-in System
        </Typography>
      </Box>

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <HelpIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            <Box>
              <Typography variant="h6" fontWeight={600}>
                Getting Started
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Welcome to the Event Check-in System! This guide will help you get started with managing your events.
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Typography variant="h5" fontWeight={600} gutterBottom sx={{ mb: 3 }}>
        Frequently Asked Questions
      </Typography>

      {faqItems.map((item, index) => (
        <Accordion key={index} sx={{ mb: 1 }}>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            sx={{ fontWeight: 600 }}
          >
            {item.question}
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" color="text.secondary">
              {item.answer}
            </Typography>
          </AccordionDetails>
        </Accordion>
      ))}

      <Card sx={{ mt: 4 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Need More Help?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            If you can't find the answer you're looking for, please contact your system administrator or the Signature Group Events support team.
          </Typography>
        </CardContent>
      </Card>
    </MainLayout>
  );
};

export default HelpPage; 
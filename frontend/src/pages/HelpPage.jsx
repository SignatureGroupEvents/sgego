import React from 'react';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon, Help as HelpIcon } from '@mui/icons-material';
import MainLayout from '../components/layout/MainLayout';

const PickupSettingsMixedProductsAnswer = () => (
  <Box sx={{ color: 'text.secondary', '& .MuiTypography-root': { fontSize: '0.875rem' } }}>
    <Typography variant="body2" paragraph sx={{ mb: 2 }}>
      Use <strong>station defaults</strong> for the baseline, then add <strong>product overrides</strong> for
      products that need fewer (or different) fields. The check-in modal only shows a field when it is
      actually needed for the product the guest is picking.
    </Typography>

    <Typography variant="body2" fontWeight={600} gutterBottom>
      Example: Headphones (one black option) and a Throw Blanket (two colors) at the same station
    </Typography>

    <Typography variant="body2" fontWeight={600} sx={{ mt: 2, mb: 0.5 }}>
      Station defaults
    </Typography>
    <List dense disablePadding sx={{ mb: 1 }}>
      <ListItem disablePadding sx={{ display: 'list-item', listStyleType: 'disc', ml: 2.5, py: 0.25 }}>
        <ListItemText primary="Brand — ON if brands help staff choose (e.g. Beats vs. blanket brand)" />
      </ListItem>
      <ListItem disablePadding sx={{ display: 'list-item', listStyleType: 'disc', ml: 2.5, py: 0.25 }}>
        <ListItemText primary="Product — ON when multiple product lines share a station" />
      </ListItem>
      <ListItem disablePadding sx={{ display: 'list-item', listStyleType: 'disc', ml: 2.5, py: 0.25 }}>
        <ListItemText primary="Color — ON so the blanket can offer a color choice" />
      </ListItem>
      <ListItem disablePadding sx={{ display: 'list-item', listStyleType: 'disc', ml: 2.5, py: 0.25 }}>
        <ListItemText primary="Gender, Size, Type — only if those fields actually vary" />
      </ListItem>
    </List>

    <Typography variant="body2" fontWeight={600} sx={{ mt: 2, mb: 0.5 }}>
      Product override — Headphones
    </Typography>
    <Typography variant="body2" paragraph>
      In the Inventory page, open <strong>Product overrides</strong>, add <strong>Headphones</strong> (must
      match the product name in inventory exactly), and turn <strong>Color OFF</strong>. Turn off other fields
      that do not vary. If every field is off and there is only one matching SKU, the gift auto-selects when
      Headphones is chosen.
    </Typography>

    <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
      Throw Blanket
    </Typography>
    <Typography variant="body2" paragraph>
      No override is required if it should inherit station defaults (Color ON). You can add an explicit
      override with Color ON if you prefer.
    </Typography>

    <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
      What staff see at check-in
    </Typography>
    <List dense disablePadding sx={{ mb: 1 }}>
      <ListItem disablePadding sx={{ display: 'list-item', listStyleType: 'disc', ml: 2.5, py: 0.25 }}>
        <ListItemText primary="Headphones: pick brand/product → no color step → black unit auto-selects" />
      </ListItem>
      <ListItem disablePadding sx={{ display: 'list-item', listStyleType: 'disc', ml: 2.5, py: 0.25 }}>
        <ListItemText primary="Blanket: pick brand/product → color step appears → guest picks a color" />
      </ListItem>
    </List>

    <Typography variant="body2" fontWeight={600} sx={{ mt: 2, mb: 0.5 }}>
      Tips
    </Typography>
    <List dense disablePadding>
      <ListItem disablePadding sx={{ display: 'list-item', listStyleType: 'disc', ml: 2.5, py: 0.25 }}>
        <ListItemText primary="Override product names must match inventory product names exactly." />
      </ListItem>
      <ListItem disablePadding sx={{ display: 'list-item', listStyleType: 'disc', ml: 2.5, py: 0.25 }}>
        <ListItemText primary="Use overrides for the exception — set station defaults for the product that needs more fields." />
      </ListItem>
      <ListItem disablePadding sx={{ display: 'list-item', listStyleType: 'disc', ml: 2.5, py: 0.25 }}>
        <ListItemText primary="Click Save Settings on the Inventory page after making changes." />
      </ListItem>
    </List>
  </Box>
);

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
    },
    {
      question: "How do I configure pickup modal display settings?",
      answer: "On the Inventory page, open the Pickup Settings section for your event or gift station. Check the fields you want staff to see when checking in guests (Brand, Product, Color, Size, etc.). Station defaults apply to every product unless you add a product-specific override. Click Save Settings when you are done."
    },
    {
      question: "How do I set up pickup settings when products at a station need different fields?",
      answer: <PickupSettingsMixedProductsAnswer />,
    },
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
            {typeof item.answer === 'string' ? (
              <Typography variant="body2" color="text.secondary">
                {item.answer}
              </Typography>
            ) : (
              item.answer
            )}
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
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  TextField,
  FormControlLabel,
  Switch,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  IconButton,
  InputAdornment,
  Chip,
  InputBase
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import DashboardIcon from '@mui/icons-material/Dashboard';
import { useParams, useNavigate } from 'react-router-dom';
import { getEvent, getClientPortal, updateClientPortal, regenerateClientPortalPassword } from '../../services/events';
import api from '../../services/api';
import toast from 'react-hot-toast';

const TEAL = '#00B2C0';
const TEAL_LIGHT = 'rgba(0, 178, 192, 0.08)';
const PAGE_BG = '#fdf9f6';

const parseEmails = (str) => (str || '')
  .split(/[\n,;]+/)
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export default function ClientPortalSettings() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [parentEvent, setParentEvent] = useState(null);
  const [secondaryEvents, setSecondaryEvents] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [oneTimePassword, setOneTimePassword] = useState(null);
  const [emailInput, setEmailInput] = useState('');

  const [form, setForm] = useState({
    enabled: false,
    allowedEmails: [],
    openAt: '',
    closeAt: '',
    allowCsvExport: false
  });

  useEffect(() => {
    if (!eventId) return;
    const load = async () => {
      setLoading(true);
      try {
        const eventData = await getEvent(eventId);
        setEvent(eventData);
        let main = eventData;
        if (eventData.parentEventId) {
          const parent = await getEvent(eventData.parentEventId);
          setParentEvent(parent);
          main = parent;
        } else {
          setParentEvent(eventData);
        }
        const res = await api.get(`/events?parentEventId=${main._id}`);
        setSecondaryEvents(res.data.events || res.data || []);

        const portalRes = await getClientPortal(eventId);
        const s = portalRes.settings || portalRes;
        setSettings(s);
        const emails = Array.isArray(s.allowedEmails) ? s.allowedEmails : [];
        setForm({
          enabled: !!s.enabled,
          allowedEmails: emails,
          openAt: s.openAt ? new Date(s.openAt).toISOString().slice(0, 10) : '',
          closeAt: s.closeAt ? new Date(s.closeAt).toISOString().slice(0, 10) : '',
          allowCsvExport: !!(s.options && s.options.allowCsvExport)
        });
        if (portalRes.passwordPlain) {
          setOneTimePassword(portalRes.passwordPlain);
          setPasswordModalOpen(true);
          toast.success('Copy this password now — it won\'t be shown again.');
        }
      } catch (e) {
        toast.error(e.response?.data?.message || 'Failed to load client portal settings');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [eventId]);

  const clientPortalUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/portal/${eventId}/login`
    : '';
  const clientPortalUrlShort = typeof window !== 'undefined'
    ? `${window.location.host}/portal/${eventId}/login`
    : '';

  const handleCopyUrl = () => {
    if (!clientPortalUrl) return;
    navigator.clipboard.writeText(clientPortalUrl);
    toast.success('Client URL copied to clipboard');
  };

  const handleCopyPassword = () => {
    if (!oneTimePassword) return;
    navigator.clipboard.writeText(oneTimePassword);
    toast.success('Password copied to clipboard');
  };

  const handleAddEmail = () => {
    const trimmed = emailInput.trim().toLowerCase();
    if (!trimmed) return;
    if (form.allowedEmails.includes(trimmed)) {
      setEmailInput('');
      return;
    }
    setForm((f) => ({ ...f, allowedEmails: [...f.allowedEmails, trimmed] }));
    setEmailInput('');
  };

  const handleRemoveEmail = (email) => {
    setForm((f) => ({ ...f, allowedEmails: f.allowedEmails.filter((e) => e !== email) }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = {
        enabled: form.enabled,
        allowedEmails: form.allowedEmails,
        openAt: form.openAt ? new Date(form.openAt).toISOString() : null,
        closeAt: form.closeAt ? new Date(form.closeAt).toISOString() : null,
        options: { allowCsvExport: form.allowCsvExport }
      };
      const res = await updateClientPortal(eventId, body);
      const s = res.settings || res;
      setSettings(s);
      setForm({
        enabled: !!s.enabled,
        allowedEmails: Array.isArray(s.allowedEmails) ? s.allowedEmails : [],
        openAt: s.openAt ? new Date(s.openAt).toISOString().slice(0, 10) : '',
        closeAt: s.closeAt ? new Date(s.closeAt).toISOString().slice(0, 10) : '',
        allowCsvExport: !!(s.options && s.options.allowCsvExport)
      });
      setEditing(false);
      if (res.passwordPlain) {
        setOneTimePassword(res.passwordPlain);
        setPasswordModalOpen(true);
        toast.success('Copy this password now — it won\'t be shown again.');
      } else {
        toast.success('Settings saved');
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleRegeneratePassword = async () => {
    try {
      const res = await regenerateClientPortalPassword(eventId);
      if (res.passwordPlain) {
        setOneTimePassword(res.passwordPlain);
        setPasswordModalOpen(true);
        toast.success('Copy this password now — it won\'t be shown again.');
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to regenerate password');
    }
  };

  const closePasswordModal = () => {
    setPasswordModalOpen(false);
    setOneTimePassword(null);
  };

  if (loading || !event) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh" bgcolor={PAGE_BG}>
        <CircularProgress />
      </Box>
    );
  }

  const mainEvent = parentEvent || event;
  const opsManager = mainEvent.createdBy?.email || mainEvent.createdBy?.username || '—';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: PAGE_BG, pb: 4 }}>
      <Box sx={{ maxWidth: 720, mx: 'auto', px: 2, pt: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(`/events/${eventId}/dashboard`)}
          sx={{ mb: 2, color: 'text.secondary' }}
        >
          Back to Event
        </Button>

        {/* Event information header - teal dashed box */}
        <Card
          variant="outlined"
          sx={{
            mb: 3,
            border: `2px dashed ${TEAL}`,
            borderRadius: 2,
            bgcolor: TEAL_LIGHT
          }}
        >
          <CardContent sx={{ py: 2, px: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <DashboardIcon sx={{ color: TEAL, fontSize: 28 }} />
              <Typography variant="h6" fontWeight={700} color="primary.main">
                {mainEvent.eventName || 'Event'}
              </Typography>
            </Box>
            <Chip
              label="Program Dashboard"
              size="small"
              sx={{ bgcolor: TEAL, color: 'white', fontWeight: 600, mb: 1.5 }}
            />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, typography: 'body2', color: 'text.secondary' }}>
              <span><strong>Contract:</strong> {mainEvent.eventContractNumber || '—'}</span>
              <span><strong>Start Date:</strong> {mainEvent.eventStart ? new Date(mainEvent.eventStart).toLocaleDateString() : '—'}</span>
              <span><strong>End Date:</strong> {mainEvent.eventEnd ? new Date(mainEvent.eventEnd).toLocaleDateString() : '—'}</span>
              <span><strong>Operations Manager:</strong> {opsManager}</span>
            </Box>
          </CardContent>
        </Card>

        {/* Activate Client Portal + EDIT / SAVE SETTINGS */}
        <Card sx={{ mb: 3, borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <CardContent sx={{ py: 3, px: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={form.enabled}
                      onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
                      disabled={!editing}
                      sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: TEAL }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: TEAL } }}
                    />
                  }
                  label={<Typography fontWeight={600}>Activate Client Portal</Typography>}
                />
                {!editing && (
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                    Cannot be adjusted unless you click &quot;EDIT&quot;
                  </Typography>
                )}
              </Box>
              {editing ? (
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSave}
                  disabled={saving}
                  sx={{ bgcolor: TEAL, '&:hover': { bgcolor: '#00919e' } }}
                >
                  {saving ? 'Saving…' : 'SAVE SETTINGS'}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  startIcon={<EditIcon />}
                  onClick={() => setEditing(true)}
                  sx={{ bgcolor: TEAL, '&:hover': { bgcolor: '#00919e' } }}
                >
                  EDIT
                </Button>
              )}
            </Box>

            {/* Client URL */}
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>Client URL</Typography>
            <TextField
              fullWidth
              size="small"
              value={clientPortalUrlShort}
              InputProps={{
                readOnly: true,
                sx: { borderRadius: 1 },
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={handleCopyUrl} size="small" aria-label="Copy URL" sx={{ color: TEAL }}>
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                )
              }}
              sx={{ mb: 2.5 }}
            />

            {/* Event Password */}
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>Event Password</Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>Autogenerated</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5, flexWrap: 'wrap' }}>
              <TextField
                size="small"
                value="••••••••••••"
                type="password"
                InputProps={{ readOnly: true, sx: { width: 160, borderRadius: 1 } }}
              />
              <Button
                size="small"
                variant="outlined"
                startIcon={<ContentCopyIcon />}
                onClick={handleCopyPassword}
                disabled={!oneTimePassword}
                sx={{ borderColor: TEAL, color: TEAL, '&:hover': { borderColor: TEAL, bgcolor: TEAL_LIGHT } }}
              >
                Copy
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleRegeneratePassword}
                sx={{ borderColor: TEAL, color: TEAL, '&:hover': { borderColor: TEAL, bgcolor: TEAL_LIGHT } }}
              >
                Regenerate
              </Button>
            </Box>

            {/* Email Access */}
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>Email Access</Typography>
            {editing ? (
              <>
                <Box
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 1,
                    p: 1.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 0.5
                  }}
                >
                  {form.allowedEmails.map((email) => (
                    <Chip
                      key={email}
                      label={email}
                      size="small"
                      onDelete={() => handleRemoveEmail(email)}
                      sx={{ bgcolor: TEAL_LIGHT, color: TEAL }}
                    />
                  ))}
                  <InputBase
                    placeholder="Add email and press Enter"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); handleAddEmail(); } }}
                    sx={{ flex: 1, minWidth: 180, fontSize: '0.875rem' }}
                  />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Please add the emails that will have access to the portal.
                </Typography>
              </>
            ) : (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2.5 }}>
                {(settings?.allowedEmails || []).length ? (settings.allowedEmails).map((email) => (
                  <Chip key={email} label={email} size="small" sx={{ bgcolor: TEAL_LIGHT, color: TEAL }} />
                )) : <Typography variant="body2" color="text.secondary">—</Typography>}
              </Box>
            )}
            {editing && <Box sx={{ mb: 2.5 }} />}

            {/* Portal Open */}
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>Portal Open</Typography>
            <TextField
              type="date"
              size="small"
              value={form.openAt}
              onChange={(e) => setForm((f) => ({ ...f, openAt: e.target.value }))}
              disabled={!editing}
              InputLabelProps={{ shrink: true }}
              InputProps={{ sx: { borderRadius: 1 } }}
              sx={{ mr: 2, mb: 0.5, minWidth: 160 }}
            />
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
              Defaults to event start date (can be adjusted)
            </Typography>

            {/* Portal Closed */}
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>Portal Closed</Typography>
            <TextField
              type="date"
              size="small"
              value={form.closeAt}
              onChange={(e) => setForm((f) => ({ ...f, closeAt: e.target.value }))}
              disabled={!editing}
              InputLabelProps={{ shrink: true }}
              InputProps={{ sx: { borderRadius: 1 } }}
              sx={{ mr: 2, mb: 0.5, minWidth: 160 }}
            />
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 3 }}>
              Defaults to 30 days after event start date (can be adjusted) / reopened.
            </Typography>

            {/* Client Dashboard Options */}
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>Client Dashboard Options</Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={form.allowCsvExport}
                  onChange={(e) => setForm((f) => ({ ...f, allowCsvExport: e.target.checked }))}
                  disabled={!editing}
                  sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: TEAL }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: TEAL } }}
                />
              }
              label="Allow CSV List Export"
            />
          </CardContent>
        </Card>
      </Box>

      <Dialog open={passwordModalOpen} onClose={closePasswordModal}>
        <DialogTitle>Copy this password now</DialogTitle>
        <DialogContent>
          <DialogContentText>It won&apos;t be shown again. Share it securely with your clients.</DialogContentText>
          <TextField fullWidth value={oneTimePassword || ''} InputProps={{ readOnly: true }} sx={{ mt: 2 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCopyPassword}>Copy</Button>
          <Button onClick={closePasswordModal}>Done</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

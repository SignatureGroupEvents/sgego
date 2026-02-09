import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Skeleton,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { getAllEventAnalytics } from '../../services/analytics';

function normalizeBucketToISO(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return dateStr;
  const s = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}$/.test(s)) return `${s}:00.000Z`;
  if (/^\d{4}-\d{2}-\d{2}T\d{1,2}$/.test(s)) return `${s}:00:00.000Z`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T12:00:00.000Z`;
  return s;
}

function formatTimelineLabel(dateStr, groupBy) {
  if (!dateStr) return '';
  if (groupBy === 'minute' && dateStr.includes('T') && /^\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}$/.test(dateStr)) {
    const iso = `${dateStr}:00.000Z`;
    return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'UTC' });
  }
  if (groupBy === 'hour' && dateStr.includes('T') && /^\d{4}-\d{2}-\d{2}T\d{1,2}$/.test(dateStr)) {
    const iso = `${dateStr}:00:00.000Z`;
    return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', timeZone: 'UTC' });
  }
  if (groupBy === 'day' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(dateStr + 'T12:00:00.000Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  }
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

const chartColor = '#00B2C0';
const giftsColor = '#FAA951';

export default function CheckInGiftsTimeline({ eventId, isPortalView = false, onShowAdvanced, compact = false }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isCompact = compact || isMobile;

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');
  const [timelineGroupBy, setTimelineGroupBy] = useState('hour');

  const apiFilters = useMemo(() => {
    const start = dateRangeStart?.trim() || undefined;
    const end = dateRangeEnd?.trim() || undefined;
    return {
      startDate: start,
      endDate: end || start,
      timelineGroupBy: timelineGroupBy || 'hour'
    };
  }, [dateRangeStart, dateRangeEnd, timelineGroupBy]);

  const fetchAnalytics = useCallback(async () => {
    if (!eventId) return;
    try {
      setLoading(true);
      const data = await getAllEventAnalytics(eventId, apiFilters);
      setAnalytics(data);
    } catch (err) {
      console.error('CheckInGiftsTimeline fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [eventId, apiFilters]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const timelineData = useMemo(() => {
    if (!analytics?.checkInTimeline) return [];
    const groupBy = timelineGroupBy || 'hour';
    return analytics.checkInTimeline.map(item => ({
      date: item._id.date,
      rawDate: normalizeBucketToISO(item._id.date),
      checkIns: item.checkIns ?? 0,
      giftsDistributed: item.giftsDistributed ?? 0,
      formattedDate: formatTimelineLabel(item._id.date, groupBy)
    }));
  }, [analytics?.checkInTimeline, timelineGroupBy]);

  const peakBucket = useMemo(() => {
    if (!timelineData.length) return null;
    return timelineData.reduce((acc, d) => (d.checkIns > (acc?.checkIns ?? 0) ? d : acc), null);
  }, [timelineData]);

  const avgCheckInsPerHour = useMemo(() => {
    if (!timelineData.length) return 0;
    const total = timelineData.reduce((a, b) => a + (b.checkIns || 0), 0);
    const first = new Date(timelineData[0].rawDate).getTime();
    const last = new Date(timelineData[timelineData.length - 1].rawDate).getTime();
    const spanHours = Math.max((last - first) / (1000 * 60 * 60), 1);
    return total / spanHours;
  }, [timelineData]);

  const totalGiftsInRange = useMemo(() => {
    return timelineData.reduce((a, b) => a + (b.giftsDistributed || 0), 0);
  }, [timelineData]);

  const rawCheckIns = analytics?.detailedCheckIns ?? [];

  const eventStats = analytics?.eventStats ?? { totalGuests: 0, checkedInGuests: 0, pendingGuests: 0, checkInPercentage: 0 };

  const chartHeight = isCompact ? 200 : 300;
  const chartMinHeight = isCompact ? 160 : 240;

  if (!eventId) return null;

  return (
    <Box sx={{ width: '100%', mb: compact ? 0 : 3 }}>
      <Typography
        variant={compact ? 'subtitle1' : 'h6'}
        fontWeight={600}
        color="primary.main"
        sx={{ mb: compact ? 1 : 2 }}
      >
        Check-in &amp; Gifts Timeline
      </Typography>

      {/* Date Range - compact single row */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: { xs: 1, sm: 1.5 }, mb: 1.5 }}>
        <TextField
          size="small"
          type="date"
          label="Start"
          value={dateRangeStart}
          onChange={(e) => setDateRangeStart(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: { xs: '100%', sm: 130 }, minWidth: 100 }}
        />
        <TextField
          size="small"
          type="date"
          label="End"
          value={dateRangeEnd}
          onChange={(e) => setDateRangeEnd(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: { xs: '100%', sm: 130 }, minWidth: 100 }}
        />
        <Button
          size="small"
          variant="outlined"
          onClick={() => { setDateRangeStart(''); setDateRangeEnd(''); }}
          disabled={!dateRangeStart && !dateRangeEnd}
        >
          Clear
        </Button>
        <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 100 }, flex: { xs: '1 1 100%', sm: '0 1 auto' } }}>
          <InputLabel>Group by</InputLabel>
          <Select
            value={timelineGroupBy}
            label="Group by"
            onChange={(e) => setTimelineGroupBy(e.target.value)}
          >
            <MenuItem value="minute">Minute</MenuItem>
            <MenuItem value="hour">Hour</MenuItem>
            <MenuItem value="day">Day</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 1.5, sm: 2 },
          alignItems: 'stretch',
          flex: '1 1 auto',
          minHeight: 0
        }}
      >
        {/* Chart */}
        <Box sx={{ flex: '1 1 55%', minWidth: 0, width: '100%' }}>
          {loading ? (
            <Skeleton variant="rounded" height={chartHeight} sx={{ borderRadius: 1 }} />
          ) : timelineData.length > 0 ? (
            <Card variant="outlined" sx={{ overflow: 'hidden', borderRadius: 1, boxShadow: 'none' }}>
              <CardContent sx={{ py: 1, px: { xs: 0.5, sm: 1 }, '&:last-child': { pb: 1 } }}>
                <ResponsiveContainer width="100%" height={chartHeight} minHeight={chartMinHeight}>
                  <LineChart data={timelineData} margin={{ top: 4, right: 8, left: -8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                    <XAxis dataKey="formattedDate" tick={{ fontSize: isCompact ? 10 : 12 }} stroke={theme.palette.text.secondary} />
                    <YAxis yAxisId="left" tick={{ fontSize: isCompact ? 10 : 12 }} stroke={theme.palette.text.secondary} allowDecimals={false} width={28} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: isCompact ? 10 : 12 }} stroke={theme.palette.text.secondary} allowDecimals={false} width={28} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const p = payload[0]?.payload;
                        return (
                          <Card variant="outlined" sx={{ px: 1, py: 0.5 }}>
                            <Typography variant="caption" display="block">
                              {p?.rawDate ? new Date(p.rawDate).toLocaleString(undefined, { timeZone: 'UTC', dateStyle: 'short', timeStyle: 'short' }) : ''}
                            </Typography>
                            <Typography variant="body2" fontWeight={600}>Check-ins: {p?.checkIns ?? 0}</Typography>
                            <Typography variant="body2" fontWeight={600} sx={{ color: giftsColor }}>Gifts: {p?.giftsDistributed ?? 0}</Typography>
                          </Card>
                        );
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line yAxisId="left" type="monotone" dataKey="checkIns" name="Check-ins" stroke={chartColor} strokeWidth={2} dot={{ r: 3, fill: chartColor }} />
                    <Line yAxisId="right" type="monotone" dataKey="giftsDistributed" name="Gifts" stroke={giftsColor} strokeWidth={2} dot={{ r: 3, fill: giftsColor }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : (
            <Card variant="outlined" sx={{ borderRadius: 1, boxShadow: 'none' }}>
              <CardContent sx={{ py: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No timeline data for the selected range.
                </Typography>
              </CardContent>
            </Card>
          )}
        </Box>

        {/* KPI pills - compact */}
        <Box sx={{ flex: '0 0 auto', width: { xs: '100%', sm: 'auto' }, minWidth: { sm: 140 }, display: 'flex', flexDirection: 'column', gap: 1, justifyContent: 'center' }}>
          {loading ? (
            <Skeleton variant="rounded" height={80} sx={{ borderRadius: 1 }} />
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr' }, gap: 1 }}>
              <Card variant="outlined" sx={{ borderLeft: 3, borderLeftColor: 'primary.main', boxShadow: 'none', borderRadius: 1 }}>
                <CardContent sx={{ py: 0.5, px: 1.5, '&:last-child': { pb: 0.5 } }}>
                  <Typography variant="caption" color="text.secondary" display="block">Check-in Rate</Typography>
                  <Typography variant="body2" fontWeight={700} color="primary.main">{eventStats.checkInPercentage}%</Typography>
                </CardContent>
              </Card>
              {timelineData.length > 0 && (
                <Card variant="outlined" sx={{ borderLeft: 3, borderLeftColor: 'info.main', boxShadow: 'none', borderRadius: 1 }}>
                  <CardContent sx={{ py: 0.5, px: 1.5, '&:last-child': { pb: 0.5 } }}>
                    <Typography variant="caption" color="text.secondary" display="block">Avg/hr</Typography>
                    <Typography variant="body2" fontWeight={700} color="info.main">{Math.round(avgCheckInsPerHour)}</Typography>
                  </CardContent>
                </Card>
              )}
              <Card variant="outlined" sx={{ borderLeft: 3, borderLeftColor: 'success.main', boxShadow: 'none', borderRadius: 1 }}>
                <CardContent sx={{ py: 0.5, px: 1.5, '&:last-child': { pb: 0.5 } }}>
                  <Typography variant="caption" color="text.secondary" display="block">Gifts</Typography>
                  <Typography variant="body2" fontWeight={700} color="success.main">{totalGiftsInRange}</Typography>
                </CardContent>
              </Card>
            </Box>
          )}
        </Box>
      </Box>

      {/* Check-in details - hide in compact to save space; link to Advanced for full list */}
      {!compact && rawCheckIns.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            Check-in details ({rawCheckIns.length})
          </Typography>
          <Card variant="outlined">
            <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
              <Box component="ul" sx={{ m: 0, pl: 2.5, maxHeight: 200, overflowY: 'auto' }}>
                {rawCheckIns.slice(0, 20).map((c, i) => (
                  <li key={c._id || i}>
                    <Typography variant="body2">
                      {c.guestName || 'Guest'} — {c.checkedInAt ? new Date(c.checkedInAt).toLocaleString() : '—'} — Gifts: {c.giftsCount ?? 0}
                    </Typography>
                  </li>
                ))}
              </Box>
              {rawCheckIns.length > 20 && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  Showing 20 of {rawCheckIns.length}. View full list in Advanced Analytics.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Box>
      )}

      {compact && isPortalView && onShowAdvanced && (
        <Box sx={{ mt: 1 }}>
          <Button variant="outlined" size="small" onClick={onShowAdvanced} fullWidth>
            View detailed analytics →
          </Button>
        </Box>
      )}
      {!compact && isPortalView && onShowAdvanced && (
        <Box sx={{ mt: 2 }}>
          <Button variant="outlined" size="small" onClick={onShowAdvanced}>
            View detailed analytics →
          </Button>
        </Box>
      )}
    </Box>
  );
}

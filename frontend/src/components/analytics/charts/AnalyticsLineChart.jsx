import React from 'react';
import { useTheme } from '@mui/material/styles';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import ChartWrapper from './ChartWrapper';

/**
 * AnalyticsLineChart - Standardized line chart component for analytics
 * 
 * @param {Array} data - Chart data array
 * @param {Array} lines - Array of line configurations [{ dataKey, name, color, strokeWidth }]
 * @param {string} xAxisKey - Key for X-axis data (default: 'date')
 * @param {string} title - Chart title
 * @param {boolean} loading - Loading state
 * @param {string} error - Error message
 * @param {number} height - Chart height (default: 300)
 * @param {boolean} showGrid - Show grid lines (default: true)
 * @param {boolean} showLegend - Show legend (default: true)
 * @param {Object} margin - Chart margins
 */
const AnalyticsLineChart = ({
  data = [],
  lines = [{ dataKey: 'value', name: 'Value', color: null, strokeWidth: 3 }],
  xAxisKey = 'date',
  title,
  loading = false,
  error = null,
  height = 300,
  showGrid = true,
  showLegend = true,
  margin = { top: 5, right: 30, left: 20, bottom: 5 }
}) => {
  const theme = useTheme();
  
  // Default colors from theme
  const defaultColors = [
    theme.palette.primary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.info.main,
    theme.palette.secondary.main,
    '#8884d8',
    '#82ca9d',
    '#ffc658'
  ];
  
  const isEmpty = !data || data.length === 0;
  
  // Validate data
  const validData = Array.isArray(data)
    ? data.filter(item => item && item[xAxisKey])
    : [];

  // Prepare lines with default colors
  const preparedLines = lines.map((line, index) => ({
    ...line,
    color: line.color || defaultColors[index % defaultColors.length],
    strokeWidth: line.strokeWidth || 3
  }));

  return (
    <ChartWrapper
      loading={loading}
      error={error}
      empty={isEmpty || validData.length === 0}
      emptyMessage="No data available for chart"
      height={height}
    >
      <LineChart data={validData} margin={margin}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />}
        <XAxis 
          dataKey={xAxisKey}
          tick={{ fontSize: 12 }}
        />
        <YAxis />
        <Tooltip 
          contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)' }}
        />
        {showLegend && <Legend />}
        {preparedLines.map((line, index) => (
          <Line
            key={line.dataKey || index}
            type="monotone"
            dataKey={line.dataKey}
            name={line.name}
            stroke={line.color}
            strokeWidth={line.strokeWidth}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        ))}
      </LineChart>
    </ChartWrapper>
  );
};

export default AnalyticsLineChart;


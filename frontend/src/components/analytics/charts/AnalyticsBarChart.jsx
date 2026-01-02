import React from 'react';
import { useTheme } from '@mui/material/styles';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, Cell } from 'recharts';
import ChartWrapper from './ChartWrapper';

/**
 * AnalyticsBarChart - Standardized bar chart component for analytics
 * 
 * @param {Array} data - Chart data array
 * @param {string} dataKey - Key for the data values
 * @param {string} nameKey - Key for the data labels (default: 'name')
 * @param {string} title - Chart title
 * @param {string} xAxisLabel - X-axis label
 * @param {string} yAxisLabel - Y-axis label
 * @param {boolean} horizontal - Horizontal bar chart (default: false)
 * @param {boolean} loading - Loading state
 * @param {string} error - Error message
 * @param {number} height - Chart height (default: 300)
 * @param {Array} colors - Custom color array (uses theme if not provided)
 * @param {Function} onBarClick - Click handler for bars
 * @param {boolean} showLegend - Show legend (default: false)
 * @param {Object} margin - Chart margins
 */
const AnalyticsBarChart = ({
  data = [],
  dataKey = 'value',
  nameKey = 'name',
  title,
  xAxisLabel,
  yAxisLabel,
  horizontal = false,
  loading = false,
  error = null,
  height = 300,
  colors,
  onBarClick,
  showLegend = false,
  margin = { top: 5, right: 30, left: 20, bottom: 60 }
}) => {
  const theme = useTheme();
  
  // Default color palette from theme
  const defaultColors = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.info.main,
    '#8884d8',
    '#82ca9d',
    '#ffc658',
    '#ff7300',
    '#00C49F'
  ];
  
  const chartColors = colors || defaultColors;
  const isEmpty = !data || data.length === 0;
  
  // Validate data
  const validData = Array.isArray(data) 
    ? data.filter(item => item && item[nameKey] && (item[dataKey] !== undefined && item[dataKey] !== null))
    : [];

  return (
    <ChartWrapper
      loading={loading}
      error={error}
      empty={isEmpty || validData.length === 0}
      emptyMessage="No data available for chart"
      height={height}
    >
      <BarChart
        data={validData}
        layout={horizontal ? 'vertical' : 'horizontal'}
        margin={margin}
      >
        {horizontal ? (
          <>
            <XAxis type="number" domain={[0, 'dataMax']} />
            <YAxis 
              type="category" 
              dataKey={nameKey}
              width={120}
              tick={{ fontSize: 12 }}
            />
          </>
        ) : (
          <>
            <XAxis 
              dataKey={nameKey}
              angle={-45}
              textAnchor="end"
              height={100}
              tick={{ fontSize: 12 }}
              interval={0}
            />
            <YAxis 
              domain={[0, 'dataMax']}
              tick={{ fontSize: 12 }}
            />
          </>
        )}
        <Tooltip 
          formatter={(value, name) => [value, yAxisLabel || name]}
          contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)' }}
        />
        {showLegend && <Legend />}
        <Bar 
          dataKey={dataKey}
          fill={chartColors[0]}
          radius={[4, 4, 0, 0]}
          onClick={onBarClick}
        >
          {validData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ChartWrapper>
  );
};

export default AnalyticsBarChart;


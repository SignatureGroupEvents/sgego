import React from 'react';
import { useTheme } from '@mui/material/styles';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import ChartWrapper from './ChartWrapper';

/**
 * AnalyticsPieChart - Standardized pie chart component for analytics
 * 
 * @param {Array} data - Chart data array
 * @param {string} dataKey - Key for the data values (default: 'value')
 * @param {string} nameKey - Key for the data labels (default: 'name')
 * @param {string} title - Chart title
 * @param {boolean} loading - Loading state
 * @param {string} error - Error message
 * @param {number} height - Chart height (default: 300)
 * @param {Array} colors - Custom color array (uses theme if not provided)
 * @param {boolean} showLabel - Show labels on pie segments (default: true)
 * @param {Function} onSegmentClick - Click handler for pie segments
 * @param {boolean} showLegend - Show legend (default: true)
 * @param {number} innerRadius - Inner radius for donut chart (0 = full pie)
 * @param {number} outerRadius - Outer radius (default: 100)
 * @param {Array} selectedSegments - Array of selected segment names (empty = show all)
 */
const AnalyticsPieChart = ({
  data = [],
  dataKey = 'value',
  nameKey = 'name',
  title,
  loading = false,
  error = null,
  height = 300,
  colors,
  showLabel = true,
  onSegmentClick,
  showLegend = true,
  innerRadius = 0,
  outerRadius = 100,
  selectedSegments = []
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
    '#00C49F',
    '#0088FE',
    '#00C49F',
    '#FFBB28',
    '#FF8042'
  ];
  
  const chartColors = colors || defaultColors;
  const isEmpty = !data || data.length === 0;
  
  // Validate data - filter out items with zero or negative values (pie charts can't render zero slices)
  const validData = Array.isArray(data)
    ? data.filter(item => item && item[nameKey] && (item[dataKey] !== undefined && item[dataKey] !== null) && Number(item[dataKey]) > 0)
    : [];

  // Label formatter - show realValue when present (e.g. zero-count items), else value
  const labelFormatter = showLabel 
    ? ({ value, payload }) => (payload && payload.realValue !== undefined ? payload.realValue : value)
    : null;

  return (
    <ChartWrapper
      loading={loading}
      error={error}
      empty={isEmpty || validData.length === 0}
      emptyMessage="No data available for chart"
      height={height}
    >
      <PieChart
        style={{ outline: 'none' }}
        onMouseDown={(e) => e.preventDefault()}
      >
        <Pie
          data={validData}
          cx="50%"
          cy="50%"
          label={labelFormatter}
          outerRadius={outerRadius}
          innerRadius={innerRadius}
          dataKey={dataKey}
          nameKey={nameKey}
          onClick={onSegmentClick}
          activeIndex={undefined}
          activeShape={false}
        >
          {validData.map((entry, index) => {
            const entryName = entry[nameKey];
            // If no segments selected, show all; otherwise only show selected ones
            const isSelected = selectedSegments.length === 0 || selectedSegments.includes(entryName);
            // Grey out non-selected segments, show full color for selected/all
            const fillColor = isSelected 
              ? chartColors[index % chartColors.length]
              : '#e0e0e0'; // Grey color for non-selected
            
            return (
              <Cell 
                key={`cell-${index}`} 
                fill={fillColor}
                style={{ 
                  cursor: 'pointer',
                  opacity: isSelected ? 1 : 0.5,
                  transition: 'opacity 0.2s ease',
                  outline: 'none'
                }}
              />
            );
          })}
        </Pie>
        <Tooltip 
          formatter={(value, name, props) => [value, props.payload[nameKey] || name]}
          contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)' }}
        />
        {showLegend && <Legend wrapperStyle={{ paddingTop: '20px' }} />}
      </PieChart>
    </ChartWrapper>
  );
};

export default AnalyticsPieChart;


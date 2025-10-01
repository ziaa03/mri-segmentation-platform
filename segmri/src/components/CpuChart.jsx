// CpuChart.jsx
import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';

const CpuChart = ({ cpuData }) => {
  // Convert array of values to objects for Recharts
  const chartData = cpuData.map((value, index) => ({
    name: `T${index}`,
    value
  }));

  const getBarColor = (value) => {
  if (value > 90) return '#a21f1fff';   // very high spike
  if (value > 70) return '#F87171';   // high
  if (value > 50) return '#FCA510';   // medium
  return '#1eab28ff';                   // low
};

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis domain={[0, 100]} />
        <Tooltip />
        <Bar
          dataKey="value"
          fill="#4ade80"
          label={{ position: 'top' }}
          shape={(props) => {
            const { x, y, width, height, value } = props;
            return <rect x={x} y={y} width={width} height={height} fill={getBarColor(value)} rx={4} />;
          }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default CpuChart;
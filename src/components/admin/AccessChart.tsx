import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface AccessChartProps {
  data: { hour: string; count: number }[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-dark-lighter p-3 rounded-md border border-dark-lighter">
        <p className="label text-white">{`${label}`}</p>
        <p className="intro text-primary">{`Acessos: ${payload[0].value}`}</p>
      </div>
    );
  }
  return null;
};

export const AccessChart: React.FC<AccessChartProps> = ({ data }) => {
  return (
    <div className="bg-dark-light p-6 rounded-lg shadow-lg mt-8">
      <h2 className="text-xl font-bold text-white mb-4">Acessos Totais do Dia</h2>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
            <XAxis dataKey="hour" stroke="#888888" fontSize={12} />
            <YAxis stroke="#888888" fontSize={12} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 107, 53, 0.1)' }} />
            <Bar dataKey="count" name="Acessos">
              {data.map((_entry, index) => (
                <Cell key={`cell-${index}`} fill="#FF6B35" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
import * as React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface AccessChartProps {
  data: { hour: string; count: number }[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-privacy-surface p-3 rounded-md border border-privacy-border">
        <p className="label text-privacy-text-primary">{`${label}`}</p>
        <p className="intro text-primary">{`Acessos: ${payload[0].value}`}</p>
      </div>
    );
  }
  return null;
};

export const AccessChart: React.FC<AccessChartProps> = ({ data }: AccessChartProps) => {
  return (
    <div className="bg-privacy-surface p-6 rounded-lg shadow-lg mt-8">
      <h2 className="text-xl font-bold text-privacy-text-primary mb-4">Acessos Totais do Dia</h2>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2C2C2C" />
            <XAxis dataKey="hour" stroke="#A0A0A0" fontSize={12} />
            <YAxis stroke="#A0A0A0" fontSize={12} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 95, 0, 0.1)' }} />
            <Bar dataKey="count" name="Acessos">
              {data.map((_entry: { hour: string; count: number }, index: number) => (
                <Cell key={`cell-${index}`} fill="#FF5F00" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
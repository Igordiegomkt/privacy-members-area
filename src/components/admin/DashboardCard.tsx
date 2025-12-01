import React from 'react';

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({ title, value, icon, description }) => {
  return (
    <div className="bg-dark-light p-6 rounded-lg shadow-lg">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-400">{title}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
        </div>
        <div className="p-3 bg-primary/20 rounded-lg text-primary">
          {icon}
        </div>
      </div>
      {description && (
        <p className="text-xs text-gray-500 mt-4">{description}</p>
      )}
    </div>
  );
};
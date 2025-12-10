import * as React from 'react';

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({ title, value, icon, description }: DashboardCardProps) => {
  return (
    <div className="bg-privacy-surface p-6 rounded-lg shadow-lg">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-privacy-text-secondary">{title}</p>
          <p className="text-3xl font-bold text-privacy-text-primary">{value}</p>
        </div>
        <div className="p-3 bg-primary/20 rounded-lg text-primary">
          {icon}
        </div>
      </div>
      {description && (
        <p className="text-xs text-privacy-text-secondary mt-4">{description}</p>
      )}
    </div>
  );
};
// features/systemManager/components/dashboard/StatisticCard.tsx
import React from 'react';

// Komponenta za prikaz pojedinačne kartice statistike na dashboardu
interface StatisticCardProps {
  title: string;
  icon: React.ReactNode;
  value: number | string;
  subtitle?: string;
  loading: boolean;
  onClick?: () => void;
}

const StatisticCard: React.FC<StatisticCardProps> = ({
  title,
  icon,
  value,
  subtitle,
  loading,
  onClick
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-600 font-medium">{title}</h3>
        {icon}
      </div>
      <div className="space-y-2">
        {loading ? (
          <div className="h-8 bg-gray-200 animate-pulse rounded-md"></div>
        ) : (
          <>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </>
        )}
      </div>
    </div>
  );
};

export default StatisticCard;

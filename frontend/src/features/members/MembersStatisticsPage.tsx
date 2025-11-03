import React from 'react';
import { useTranslation } from 'react-i18next';
import { useMemberData } from './hooks/useMemberData';
import { StatisticsView } from './components/StatisticsView';
import { Button } from '@components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { useTenantNavigation } from '../../hooks/useTenantNavigation';

const MembersStatisticsPage: React.FC = () => {
  const { t } = useTranslation('members');
  const { members, loading, error } = useMemberData();
  const { navigateTo } = useTenantNavigation();

  return (
    <div className="container mx-auto px-4 py-4">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => navigateTo('/members')}>
            <ChevronLeft className="w-4 h-4 mr-1" /> {t('memberList.tabs.list')}
          </Button>
        </div>
        <div className="p-0">
          {loading && (
            <div className="p-6 text-sm text-gray-500">{t('loading') || 'Učitavanje...'}</div>
          )}
          {error && (
            <div className="p-6 text-sm text-red-600">{error}</div>
          )}
          {!loading && !error && (
            <StatisticsView members={members} />
          )}
        </div>
      </div>
    </div>
  );
};

export default MembersStatisticsPage;

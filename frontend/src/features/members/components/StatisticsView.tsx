import React from 'react';
import { MemberWithDetails } from '../interfaces/memberTypes';
import { TabsContent } from '@components/ui/tabs';

interface StatisticsViewProps {
  members: MemberWithDetails[];
}

/**
 * Komponenta za prikaz statistike članstva
 */
export const StatisticsView: React.FC<StatisticsViewProps> = ({ members }) => {
  return (
    <TabsContent value="statistics" className="pt-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Ukupno članova: {members.length}</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Aktivni članovi:</span>
              <span>{members.filter(m => m.isActive).length}</span>
            </div>
            <div className="flex justify-between">
              <span>Pasivni članovi:</span>
              <span>{members.filter(m => !m.isActive).length}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Podjela po spolu</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Muški:</span>
              <span>{members.filter(m => m.gender === 'male').length}</span>
            </div>
            <div className="flex justify-between">
              <span>Ženski:</span>
              <span>{members.filter(m => m.gender === 'female').length}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Podjela po kategoriji</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Članstvo važeće:</span>
              <span>{members.filter(m => m.membershipStatus === 'registered').length}</span>
            </div>
            <div className="flex justify-between">
              <span>Neaktivni:</span>
              <span>{members.filter(m => m.membershipStatus === 'inactive').length}</span>
            </div>
            <div className="flex justify-between">
              <span>Na čekanju:</span>
              <span>{members.filter(m => m.membershipStatus === 'pending').length}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Podjela po plaćanju članarine</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Plaćena članarina:</span>
              <span>{members.filter(m => m.feeStatus === 'current').length}</span>
            </div>
            <div className="flex justify-between">
              <span>Potrebno platiti:</span>
              <span>{members.filter(m => m.feeStatus === 'payment required').length}</span>
            </div>
          </div>
        </div>
      </div>
    </TabsContent>
  );
};

export default StatisticsView;

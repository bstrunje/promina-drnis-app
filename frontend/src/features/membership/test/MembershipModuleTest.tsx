import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs";
import { Member } from '@shared/member';
import { MembershipPeriod } from '@shared/membership';
import MembershipCardManagerAdapter from "../MembershipCardManagerAdapter";
import MembershipHistoryAdapter from "../MembershipHistoryAdapter";
import { MembershipManager } from "..";
import { API_BASE_URL } from "@/utils/config";

/**
 * MembershipModuleTest - Testna komponenta za usporedbu adaptera i modularnih membership prikaza
 * Omogućuje ručno testiranje rendera i lokalno ažuriranje članstva i perioda
 */
// Type guard za sigurnu provjeru podatka iz API-ja
function isMember(obj: unknown): obj is Member {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as Member).member_id === 'number' &&
    typeof (obj as Member).first_name === 'string' &&
    typeof (obj as Member).last_name === 'string'
    // Dodaj još polja po potrebi za strožu provjeru
  );
}

const MembershipModuleTest: React.FC = () => {
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dohvati testnog člana (ID 1)
  useEffect(() => {
    const fetchMember = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/members/1`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Neuspješan fetch testnog člana');
        // Sigurna validacija podatka iz fetch-a
        const data: unknown = await response.json();
        if (isMember(data)) {
          setMember(data);
        } else {
          setError('Neispravan format podataka za člana');
        }
      } catch (err) {
        setError((err as Error).message || 'Greška pri dohvaćanju člana');
      } finally {
        setLoading(false);
      }
    };
    void fetchMember(); // void označava da svjesno ignoriramo promise
  }, []);

  // Mock funkcija za ažuriranje člana
  const handleMemberUpdate = async (updatedMember: Member) => {
    setMember(updatedMember);
    return Promise.resolve();
  };

  // Mock funkcija za ažuriranje perioda članstva
  const handlePeriodsUpdate = async (updatedPeriods: MembershipPeriod[]) => {
    if (!member) return;
    const updatedMember: Member = {
      ...member,
      membership_history: { periods: updatedPeriods }
    };
    setMember(updatedMember);
    await handleMemberUpdate(updatedMember);
  };

  if (loading) return <div className="p-4">Učitavanje...</div>;
  if (error || !member) return <div className="p-4 text-red-500">Greška: {error ?? 'Nema podataka'}</div>;

  return (
    <div className="container p-4">
      <h1 className="text-2xl font-bold mb-4">Test Membership Modularizacije</h1>
      <Tabs defaultValue="adapter">
        <TabsList>
          <TabsTrigger value="adapter">Adapteri</TabsTrigger>
          <TabsTrigger value="modular">Modularna komponenta</TabsTrigger>
        </TabsList>
        {/* Adapter prikaz */}
        <TabsContent value="adapter">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h2 className="text-xl font-semibold mb-2">MembershipCardManagerAdapter</h2>
              <MembershipCardManagerAdapter
                member={member}
                onUpdate={handleMemberUpdate}
                userRole="member_administrator"
              />
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-2">MembershipHistoryAdapter</h2>
              <MembershipHistoryAdapter
                periods={member.membership_history?.periods ?? []} // koristi nullish coalescing
                memberId={member.member_id}
                feePaymentYear={member.membership_details?.fee_payment_year}
                feePaymentDate={member.membership_details?.fee_payment_date}
                onUpdatePeriods={handlePeriodsUpdate}
              />
            </div>
          </div>
        </TabsContent>
        {/* Modularni prikaz */}
        <TabsContent value="modular">
          <MembershipManager
            member={member}
            onUpdate={handleMemberUpdate}
            userRole="member_administrator"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MembershipModuleTest;

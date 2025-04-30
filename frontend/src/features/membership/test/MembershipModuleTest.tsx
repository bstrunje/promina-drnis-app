import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs";

// Originalne komponente
import OriginalMembershipCardManager from "../../../../components/MembershipCardManager";
import OriginalMembershipHistory from "../../../../components/MembershipHistory";

// Adapteri
import MembershipCardManagerAdapter from "../MembershipCardManagerAdapter";
import MembershipHistoryAdapter from "../MembershipHistoryAdapter";

// Glavni modularni component
import { MembershipManager } from "..";

import { API_BASE_URL } from "@/utils/config";

/**
 * MembershipModuleTest - Testna komponenta za usporedbu originalnih i modulariziranih verzija
 * 
 * Ova komponenta omogućuje usporedbu:
 * 1. Originalnih komponenti
 * 2. Adaptiranih komponenti (koje koriste modularne komponente)
 * 3. Nove modularne arhitekture
 */
const MembershipModuleTest: React.FC = () => {
  const [member, setMember] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Učitaj podatke za testiranje
  useEffect(() => {
    const fetchMember = async () => {
      try {
        const token = localStorage.getItem('token');
        // Dohvati prvog člana ili člana s ID 1 za testiranje
        const response = await fetch(`${API_BASE_URL}/members/1`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch test member');
        }
        
        const data = await response.json();
        setMember(data);
      } catch (err) {
        setError((err as Error).message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchMember();
  }, []);

  // Mock funkcija za ažuriranje člana (samo za testiranje)
  const handleMemberUpdate = async (updatedMember: any) => {
    console.log('Member update requested:', updatedMember);
    // U stvarnoj implementaciji bi poslali zahtjev na server
    // Za potrebe testiranja samo ažuriramo lokalno stanje
    setMember(updatedMember);
    return Promise.resolve();
  };

  // Mock funkcija za ažuriranje perioda (samo za testiranje)
  const handlePeriodsUpdate = async (updatedPeriods: any[]) => {
    console.log('Periods update requested:', updatedPeriods);
    // Ažuriraj lokalno stanje
    setMember({
      ...member,
      membership_history: updatedPeriods
    });
    return Promise.resolve();
  };

  if (loading) {
    return <div className="p-4">Učitavanje...</div>;
  }

  if (error || !member) {
    return <div className="p-4 text-red-500">Greška: {error || 'Nije moguće učitati testne podatke'}</div>;
  }

  return (
    <div className="container p-4">
      <h1 className="text-2xl font-bold mb-4">Test Membership Modularizacije</h1>
      
      <Tabs defaultValue="comparison">
        <TabsList>
          <TabsTrigger value="comparison">Usporedni prikaz</TabsTrigger>
          <TabsTrigger value="original">Originalne komponente</TabsTrigger>
          <TabsTrigger value="adapter">Adaptirane komponente</TabsTrigger>
          <TabsTrigger value="modular">Nova modularna verzija</TabsTrigger>
        </TabsList>
        
        {/* Usporedni prikaz - paralelno prikazuje sve verzije */}
        <TabsContent value="comparison">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <h2 className="text-xl font-semibold mb-2">Originalno</h2>
              <div className="space-y-4">
                <OriginalMembershipCardManager 
                  member={member} 
                  onUpdate={handleMemberUpdate}
                  userRole="admin"
                />
                <OriginalMembershipHistory 
                  periods={member.membership_history || []}
                  memberId={member.member_id}
                  feePaymentYear={member.membership_details?.fee_payment_year}
                  feePaymentDate={member.membership_details?.fee_payment_date}
                  onUpdate={handlePeriodsUpdate}
                />
              </div>
            </div>
            
            <div>
              <h2 className="text-xl font-semibold mb-2">Adaptirano</h2>
              <div className="space-y-4">
                <MembershipCardManagerAdapter 
                  member={member} 
                  onUpdate={handleMemberUpdate}
                  userRole="admin"
                />
                <MembershipHistoryAdapter 
                  periods={member.membership_history || []}
                  memberId={member.member_id}
                  feePaymentYear={member.membership_details?.fee_payment_year}
                  feePaymentDate={member.membership_details?.fee_payment_date}
                  onUpdate={handlePeriodsUpdate}
                />
              </div>
            </div>
            
            <div>
              <h2 className="text-xl font-semibold mb-2">Modularna verzija</h2>
              <MembershipManager 
                member={member}
                onUpdate={handleMemberUpdate}
                userRole="admin"
              />
            </div>
          </div>
        </TabsContent>
        
        {/* Originalne komponente */}
        <TabsContent value="original">
          <div className="space-y-4">
            <OriginalMembershipCardManager 
              member={member} 
              onUpdate={handleMemberUpdate}
              userRole="admin"
            />
            <OriginalMembershipHistory 
              periods={member.membership_history || []}
              memberId={member.member_id}
              feePaymentYear={member.membership_details?.fee_payment_year}
              feePaymentDate={member.membership_details?.fee_payment_date}
              onUpdate={handlePeriodsUpdate}
            />
          </div>
        </TabsContent>
        
        {/* Adaptirane komponente */}
        <TabsContent value="adapter">
          <div className="space-y-4">
            <MembershipCardManagerAdapter 
              member={member} 
              onUpdate={handleMemberUpdate}
              userRole="admin"
            />
            <MembershipHistoryAdapter 
              periods={member.membership_history || []}
              memberId={member.member_id}
              feePaymentYear={member.membership_details?.fee_payment_year}
              feePaymentDate={member.membership_details?.fee_payment_date}
              onUpdate={handlePeriodsUpdate}
            />
          </div>
        </TabsContent>
        
        {/* Nova modularna verzija */}
        <TabsContent value="modular">
          <MembershipManager 
            member={member}
            onUpdate={handleMemberUpdate}
            userRole="admin"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MembershipModuleTest;

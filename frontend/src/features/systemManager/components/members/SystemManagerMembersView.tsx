import React, { useEffect, useState } from 'react';
import { Member } from '@shared/member';
import { getAllMembersForSystemManager, deleteMemberForSystemManager } from '../../utils/systemManagerApi';
import { Button } from '@components/ui/button';
import { Trash2 } from 'lucide-react';

// Jednostavan prikaz članova za System Manager, bez korištenja postojećeg MemberTable (Option B)
// Namjena: upravljanje članovima (brisanje) unutar System Manager dashboarda bez otvaranja nove kartice
const SystemManagerMembersView: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Dohvat svih članova
  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllMembersForSystemManager();
      setMembers(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Greška prilikom dohvata članova');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchMembers();
  }, []);

  // Brisanje člana uz potvrdu
  const handleDelete = async (member: Member) => {
    const fullName = member.full_name ?? `${member.first_name} ${member.last_name}`;
    const confirmed = window.confirm(`Jeste li sigurni da želite trajno obrisati člana: \n${fullName} (ID: ${member.member_id})?`);
    if (!confirmed) return;

    try {
      setLoading(true);
      await deleteMemberForSystemManager(Number(member.member_id));
      // Nakon uspješnog brisanja osvježi listu
      await fetchMembers();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Greška prilikom brisanja člana');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-md shadow">
      {/* Naslov sekcije */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Članovi</h2>
        <div className="text-sm text-gray-500">Ukupno: {members.length}</div>
      </div>

      {/* Stanje učitavanja/greške */}
      {loading && <div className="py-8 text-center text-gray-600">Učitavanje...</div>}
      {error && !loading && (
        <div className="mb-3 p-3 bg-red-50 text-red-700 border border-red-200 rounded">{error}</div>
      )}

      {/* Tablica članova */}
      {!loading && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] table-auto border-collapse">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="px-3 py-2 border-b">ID</th>
                <th className="px-3 py-2 border-b">Član</th>
                <th className="px-3 py-2 border-b">Email</th>
                <th className="px-3 py-2 border-b w-24 text-center">Akcije</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.member_id} className="hover:bg-gray-50 border-b">
                  <td className="px-3 py-2 align-middle">{m.member_id}</td>
                  <td className="px-3 py-2 align-middle">
                    <div className="font-medium text-gray-900">
                      {m.full_name ?? `${m.first_name} ${m.last_name}${m.nickname ? ` - ${m.nickname}` : ''}`}
                    </div>
                  </td>
                  <td className="px-3 py-2 align-middle">{m.email}</td>
                  <td className="px-3 py-2 align-middle text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Delete Member"
                      onClick={() => { void handleDelete(m); }}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-gray-600">Nema članova za prikaz</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SystemManagerMembersView;

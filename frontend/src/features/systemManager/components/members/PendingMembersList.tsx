// features/systemManager/components/members/PendingMembersList.tsx
import React, { useState, useEffect } from 'react';
import { User, RefreshCw, UserPlus, Key, Search, UserCog } from 'lucide-react';
import { getPendingMembers, assignPasswordToMember, assignRoleToMember, PendingMember } from '../../utils/systemManagerApi';

// Koristimo tip za člana sa statusom 'pending' iz systemManagerApi

// Komponenta za prikaz i upravljanje članovima sa statusom 'pending'
const PendingMembersList: React.FC = () => {
  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // State za modal za dodjeljivanje lozinke
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedMember, setSelectedMember] = useState<PendingMember | null>(null);
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [cardNumber, setCardNumber] = useState<string>('');
  const [assigningPassword, setAssigningPassword] = useState<boolean>(false);
  const [assignmentMessage, setAssignmentMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [assignSuperuserRole, setAssignSuperuserRole] = useState<boolean>(false);

  // Dohvat članova sa statusom 'pending' pri pokretanju komponente
  useEffect(() => {
    void fetchPendingMembers();
  }, []);

  // Funkcija za dohvat pending članova
  const fetchPendingMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      const members = await getPendingMembers();
      
      // Provjerimo da su podaci ispravnog formata
      if (Array.isArray(members)) {
        setPendingMembers(members);
      } else {
        setError('Primljeni podaci nisu u očekivanom formatu.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri dohvatu članova.');
      console.error('Error fetching pending members:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtriranje članova prema searchTerm
  const filteredMembers = pendingMembers.filter(member => {
    const fullName = (member.full_name ?? `${member.first_name} ${member.last_name}`).toLowerCase();
    const email = (member.email ?? '').toLowerCase();
    const term = searchTerm.toLowerCase();
    
    return fullName.includes(term) || email.includes(term);
  });

  // Funkcija za otvaranje modala za dodjelu lozinke
  const openPasswordModal = (member: PendingMember) => {
    setSelectedMember(member);
    setPassword('');
    setConfirmPassword('');
    setCardNumber('');
    setAssignmentMessage(null);
    setAssignSuperuserRole(false);
    setIsModalOpen(true);
  };

  // Zatvaranje modala
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedMember(null);
    setPassword('');
    setConfirmPassword('');
    setCardNumber('');
    setAssignmentMessage(null);
    setAssignSuperuserRole(false);
  };

  // Funkcija za dodjeljivanje lozinke
  const handleAssignPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedMember) return;
    
    // Provjera podudaranja lozinki
    if (password !== confirmPassword) {
      setAssignmentMessage({ type: 'error', text: 'Lozinke se ne podudaraju' });
      return;
    }
    
    // Provjera duljine lozinke
    if (password.length < 6) {
      setAssignmentMessage({ type: 'error', text: 'Lozinka mora imati najmanje 6 znakova' });
      return;
    }
    
    try {
      setAssigningPassword(true);
      setAssignmentMessage(null);
      
      // Poziv API-ja za dodjeljivanje lozinke
      await assignPasswordToMember(selectedMember.member_id, password);
      
      // Ako je označena opcija za dodjelu uloge member_superuser, dodijeli je
      if (assignSuperuserRole) {
        await assignRoleToMember(selectedMember.member_id, 'member_superuser');
      }
      
      // Uspješna dodjela
      setAssignmentMessage({ 
        type: 'success', 
        text: assignSuperuserRole 
          ? 'Lozinka je uspješno dodijeljena i član je dobio ulogu superuser!' 
          : 'Lozinka je uspješno dodijeljena!'
      });
      
      // Osvježi popis članova i zatvori modal nakon kratke pauze
      setTimeout(() => {
        void fetchPendingMembers();
        closeModal();
      }, 1500);
    } catch (err) {
      setAssignmentMessage({ 
        type: 'error', 
        text: err instanceof Error ? err.message : 'Greška pri dodjeljivanju lozinke' 
      });
    } finally {
      setAssigningPassword(false);
    }
  };

  // Generiranje standardizirane lozinke prema formatu ${full_name}-isk-${card_number}
  const generateStandardPassword = () => {
    if (!selectedMember) return;
    
    const fullName = selectedMember.full_name ?? `${selectedMember.first_name} ${selectedMember.last_name}`;
    // Ako korisnik nije unio broj iskaznice, generiramo privremeni broj od 5 znamenki
    const tempCardNumber = cardNumber || String(Math.floor(10000 + Math.random() * 90000));
    
    // Generiraj lozinku prema dinamičkom formatu
    const generatedPassword = `${fullName}-isk-${tempCardNumber}`;
    setPassword(generatedPassword);
    setConfirmPassword(generatedPassword);
    
    // Ako korisnik nije unio broj iskaznice, postavimo ovu privremenu vrijednost
    if (!cardNumber) {
      setCardNumber(tempCardNumber);
    }
  };
  


  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Članovi za registraciju</h2>
        
        <button 
          onClick={() => void fetchPendingMembers()} 
          disabled={loading}
          className="flex items-center text-sm text-blue-600 hover:text-blue-800"
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Osvježavanje...' : 'Osvježi podatke'}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded-md mb-6">
          {error}
        </div>
      )}

      {/* Pretraga */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Pretraži članove..."
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <Search className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* Tablica s članovima */}
      {loading ? (
        <div className="space-y-4">
          <div className="h-12 bg-gray-200 animate-pulse rounded-md"></div>
          <div className="h-12 bg-gray-200 animate-pulse rounded-md"></div>
          <div className="h-12 bg-gray-200 animate-pulse rounded-md"></div>
        </div>
      ) : pendingMembers.length === 0 ? (
        <div className="bg-gray-50 p-8 text-center rounded-md">
          <User className="h-10 w-10 text-gray-400 mx-auto mb-4" />
          <h3 className="text-gray-700 font-medium mb-2">Nema članova za registraciju</h3>
          <p className="text-gray-500">
            Trenutno nema članova sa statusom 'pending' koji čekaju registraciju.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ime i prezime
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Akcije
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMembers.map((member) => (
                <tr key={member.member_id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {member.full_name ?? `${member.first_name} ${member.last_name}`}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{member.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      {member.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => openPasswordModal(member)}
                      className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                    >
                      <Key className="h-4 w-4 mr-1" />
                      Dodijeli lozinku
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal za dodjeljivanje lozinke */}
      {isModalOpen && selectedMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">
              Dodjela lozinke članu: {selectedMember.full_name ?? `${selectedMember.first_name} ${selectedMember.last_name}`}
            </h3>
            
            <form onSubmit={(e) => { void handleAssignPassword(e); }} className="space-y-4">
              <div>
                <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  Broj članske iskaznice (opcionalno)
                </label>
                <input
                  type="text"
                  id="cardNumber"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Broj članske iskaznice"
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Lozinka
                </label>
                <div className="flex space-x-2">
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Lozinka"
                    required
                  />
                  <button
                    type="button"
                    onClick={generateStandardPassword}
                    className="px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200"
                  >
                    Generiraj
                  </button>
                </div>
              </div>
              
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Potvrdi lozinku
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Potvrdi lozinku"
                  required
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="assignSuperuserRole"
                  checked={assignSuperuserRole}
                  onChange={(e) => setAssignSuperuserRole(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="assignSuperuserRole" className="text-sm font-medium text-gray-700 flex items-center">
                  <UserCog className="h-4 w-4 mr-1 text-gray-500" />
                  Dodijeli ulogu member_superuser
                </label>
              </div>
              
              {assignmentMessage && (
                <div className={`p-3 rounded-md ${assignmentMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {assignmentMessage.text}
                </div>
              )}
              
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  disabled={assigningPassword}
                >
                  Odustani
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center"
                  disabled={assigningPassword}
                >
                  {assigningPassword ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Spremanje...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Dodijeli lozinku
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingMembersList;

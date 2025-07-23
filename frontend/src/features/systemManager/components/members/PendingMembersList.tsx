// features/systemManager/components/members/PendingMembersList.tsx
import React, { useState, useEffect } from 'react';
import { Check, X, Clock, User, AlertCircle, UserCog, RefreshCw, UserPlus, Search, Key, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@components/ui/use-toast';
import { getPendingMembers, assignPasswordToMember, assignRoleToMember, PendingMember } from '../../utils/systemManagerApi';

interface PendingMembersListProps {
  refreshTrigger?: number;
}

const PendingMembersList: React.FC<PendingMembersListProps> = ({ refreshTrigger }) => {
  const { toast } = useToast();
  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal and form state
  const [selectedMember, setSelectedMember] = useState<PendingMember | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [assignSuperuserRole, setAssignSuperuserRole] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const loadPendingMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      const members = await getPendingMembers();
      setPendingMembers(members);
    } catch (err) {
      console.error('Error loading pending members:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(`Failed to load pending members: ${errorMessage}`);
      toast({
        title: 'Error',
        description: `Failed to load pending members: ${errorMessage}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPendingMembers();
  }, [refreshTrigger]);

  const filteredMembers = pendingMembers.filter(member => {
    const fullName = (member.full_name ?? `${member.first_name} ${member.last_name}`).toLowerCase();
    const email = (member.email ?? '').toLowerCase();
    const term = searchTerm.toLowerCase();
    return fullName.includes(term) || email.includes(term);
  });

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedMember(null);
    setCardNumber('');
    setPassword('');
    setConfirmPassword('');
    setAssignSuperuserRole(false);
    setShowPassword(false);
  };

  const openModal = (member: PendingMember) => {
    setSelectedMember(member);
    setIsModalOpen(true);
  };

  const generateStandardPassword = () => {
    if (!selectedMember) return;
    if (!cardNumber) {
      toast({
        title: 'Info',
        description: 'Please enter a card number to generate a standard password.',
        variant: 'default',
      });
      return;
    }
    const fullName = selectedMember.full_name ?? `${selectedMember.first_name} ${selectedMember.last_name}`;
    const generatedPassword = `${fullName}-isk-${cardNumber}`;
    setPassword(generatedPassword);
    setConfirmPassword(generatedPassword);
    toast({
      title: 'Success',
      description: 'Standard password generated.',
    });
  };

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;

    if (password !== confirmPassword) {
      toast({ title: 'Error', description: 'Passwords do not match.', variant: 'destructive' });
      return;
    }
    if (!password) {
      toast({ title: 'Error', description: 'Password is required.', variant: 'destructive' });
      return;
    }

    setIsApproving(true);
    try {
      await assignPasswordToMember(selectedMember.member_id, password);
      toast({
        title: 'Success',
        description: `Password assigned to ${selectedMember.full_name}. Member is now active.`,
      });

      if (assignSuperuserRole) {
        await assignRoleToMember(selectedMember.member_id, 'member_superuser');
        toast({
          title: 'Success',
          description: 'Superuser role has been assigned.',
        });
      }

      closeModal();
      await loadPendingMembers(); // Refresh list
    } catch (err) {
      console.error('Error approving member:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      toast({
        title: 'Error',
        description: `Failed to approve member: ${errorMessage}`,
        variant: 'destructive',
      });
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Pending Members</h2>
        <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button 
              onClick={() => loadPendingMembers()} 
              disabled={loading}
              className="flex items-center text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-wait"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing...' : 'Refresh Data'}
            </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded-md flex items-center mb-4">
          <AlertCircle className="h-5 w-5 mr-2" /> {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-gray-200 animate-pulse rounded-md"></div>)}
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 rounded-lg">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Members Found</h3>
          <p className="text-gray-500">There are no pending members matching your search, or all registrations have been processed.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border rounded-lg">
           <table className="min-w-full divide-y divide-gray-200">
             <thead className="bg-gray-50">
               <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
               </tr>
             </thead>
             <tbody className="bg-white divide-y divide-gray-200">
              {filteredMembers.map((member) => (
                <tr key={member.member_id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{member.full_name ?? `${member.first_name} ${member.last_name}`}</div>
                    <div className="text-sm text-gray-500">{member.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Pending</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => openModal(member)} className="text-blue-600 hover:text-blue-900 inline-flex items-center">
                      <Key className="h-4 w-4 mr-1" /> Approve
                    </button>
                  </td>
                </tr>
              ))}
             </tbody>
           </table>
        </div>
      )}

      {isModalOpen && selectedMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-medium mb-4">Approve Member: {selectedMember.full_name}</h3>
            <form onSubmit={handleApprove} className="space-y-4">
              <div>
                <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700 mb-1">Membership Card Number (optional)</label>
                <input
                  type="text"
                  id="cardNumber"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter card number to enable generation"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="flex items-end space-x-2">
                  <div className="relative flex-grow">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                      placeholder="Enter password manually"
                      required
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500">
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={generateStandardPassword}
                    className="px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200 flex items-center"
                  >
                    <Key className="h-4 w-4 mr-1" /> Generate
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                    placeholder="Confirm password"
                    required
                  />
                   <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500">
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="assignSuperuserRole"
                  checked={assignSuperuserRole}
                  onChange={(e) => setAssignSuperuserRole(e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="assignSuperuserRole" className="text-sm font-medium text-gray-700 flex items-center">
                  <UserCog className="h-4 w-4 mr-1 text-gray-500" />
                  Assign Superuser Role
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200" disabled={isApproving}>Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center disabled:opacity-50" disabled={isApproving}>
                  {isApproving ? (
                    <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Approving...</>
                  ) : (
                    <><UserPlus className="h-4 w-4 mr-2" /> Approve Member</>
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

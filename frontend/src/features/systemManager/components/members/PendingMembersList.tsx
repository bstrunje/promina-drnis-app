// features/systemManager/components/members/PendingMembersList.tsx
import React, { useState, useEffect } from 'react';
import { Check, X, Eye, AlertCircle, Clock, User } from 'lucide-react';
import { useToast } from '@components/ui/use-toast';
import { PendingMember } from '../../utils/systemManagerApi';

interface PendingMembersListProps {
  refreshTrigger?: number;
}

const PendingMembersList: React.FC<PendingMembersListProps> = ({ refreshTrigger }) => {
  const { toast } = useToast();
  // Temporary mock functions until proper SystemManager API is implemented
  const getPendingMembers = async () => [];
  const approveMember = async (id: string) => { console.log('Approve:', id); };
  const rejectMember = async (id: string) => { console.log('Reject:', id); };
  
  const [pendingMembers, setPendingMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadPendingMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      const members = await getPendingMembers();
      setPendingMembers(members);
    } catch (err) {
      console.error('Error loading pending members:', err);
      setError('Failed to load pending members');
      toast({
        title: "Error",
        description: "Failed to load pending members",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPendingMembers();
  }, [refreshTrigger]);

  const handleApprove = async (memberId: string) => {
    try {
      setProcessingId(memberId);
      await approveMember(memberId);
      toast({
        title: "Success",
        description: "Member approved successfully"
      });
      await loadPendingMembers();
    } catch (err) {
      console.error('Error approving member:', err);
      toast({
        title: "Error",
        description: "Failed to approve member",
        variant: "destructive"
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (memberId: string) => {
    try {
      setProcessingId(memberId);
      await rejectMember(memberId);
      toast({
        title: "Success",
        description: "Member rejected successfully"
      });
      await loadPendingMembers();
    } catch (err) {
      console.error('Error rejecting member:', err);
      toast({
        title: "Error",
        description: "Failed to reject member",
        variant: "destructive"
      });
    } finally {
      setProcessingId(null);
    }
  };

  const openMemberModal = (member: PendingMember) => {
    setSelectedMember(member);
    setShowModal(true);
  };

  const closeMemberModal = () => {
    setSelectedMember(null);
    setShowModal(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading pending members...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 text-red-700 p-4 rounded-md">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      </div>
    );
  }

  if (pendingMembers.length === 0) {
    return (
      <div className="text-center p-8">
        <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Members</h3>
        <p className="text-gray-500">All member registrations have been processed.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {pendingMembers.map((member) => (
            <li key={member.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <User className="h-10 w-10 text-gray-400 mr-4" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {member.firstName} {member.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{member.email}</p>
                    <p className="text-xs text-gray-400">
                      Submitted: {new Date(member.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => openMemberModal(member)}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View Details
                  </button>
                  <button
                    onClick={() => void handleApprove(member.id)}
                    disabled={processingId === member.id}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    {processingId === member.id ? 'Processing...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => void handleReject(member.id)}
                    disabled={processingId === member.id}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                  >
                    <X className="h-4 w-4 mr-1" />
                    {processingId === member.id ? 'Processing...' : 'Reject'}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Member Details Modal */}
      {showModal && selectedMember && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Member Registration Details</h3>
                <button
                  onClick={closeMemberModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">First Name</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedMember.firstName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Last Name</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedMember.lastName}</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedMember.email}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedMember.phone || 'Not provided'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedMember.dateOfBirth ? new Date(selectedMember.dateOfBirth).toLocaleDateString() : 'Not provided'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedMember.address || 'Not provided'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Registration Date</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(selectedMember.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={closeMemberModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    void handleReject(selectedMember.id);
                    closeMemberModal();
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Reject
                </button>
                <button
                  onClick={() => {
                    void handleApprove(selectedMember.id);
                    closeMemberModal();
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingMembersList;
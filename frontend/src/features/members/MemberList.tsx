import { useState, useEffect } from 'react';
import { RefreshCw, UserPlus, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Member } from '@/types/member';
import AddMemberForm from './AddMemberForm';
import EditMemberForm from './EditMemberForm';
import ConfirmationModal from './ConfirmationModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
console.log('Actual API_URL:', API_URL);

export default function MemberList(): JSX.Element {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [deletingMember, setDeletingMember] = useState<Member | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async (): Promise<void> => {
    try {
      console.log('Fetching members...');
      setLoading(true);
      console.log('API_URL:', API_URL);
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_URL}/members`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }); 
      console.log('Response status:', response.status);
      if (!response.ok) {
        console.log('Response not OK. Status:', response.status);
        const errorText = await response.text();
        console.log('Error response:', errorText);
        throw new Error(`Failed to fetch members: ${response.status} ${errorText}`);
      }
      const data: Member[] = await response.json();
      console.log('Fetched data:', data);
      setMembers(data);
      setError(null);
    } catch (err: unknown) {
      console.error('Error fetching members:', err);
      setError('Failed to load members. Please try again later.');
    } finally {
      setLoading(false);
      console.log('Fetch attempt completed.');
    }
  };

  const handleEdit = (member: Member): void => {
    setEditingMember(member);
  };

  const handleDelete = (member: Member): void => {
    setDeletingMember(member);
    setShowConfirmModal(true);
  };

  const confirmDelete = async (): Promise<void> => {
    if (!deletingMember) return;
  
    try {
      const response = await fetch(`${API_URL}/members/${deletingMember.member_id}`, {
        method: 'DELETE',
      });
  
      if (!response.ok) throw new Error('Failed to delete member');
      
      setMembers(members.filter((m: Member) => m.member_id !== deletingMember.member_id));
      setDeletingMember(null);
      setShowConfirmModal(false);
    } catch (err) {
      setError('Failed to delete member. Please try again later.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Member Management</h1>
        <button 
          className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
          onClick={() => setShowAddForm(true)}
        >
          <UserPlus className="w-4 h-4" />
          Add Member
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Join Date</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
         <tbody className="divide-y divide-gray-200">
            {members.map((member: Member) => (
              <tr key={member.member_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div>
                        <div className="font-medium text-gray-900">
                          {member.first_name} {member.last_name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm ${
                      member.membership_type === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {member.membership_type === 'active' ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                      {member.membership_type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {member.total_hours || 0}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(member.join_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleEdit(member)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(member)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAddForm && (
        <AddMemberForm
          onClose={() => setShowAddForm(false)}
          onAdd={(newMember) => {
            setMembers([...members, newMember]);
            setShowAddForm(false);
          }}
        />
      )}

      {editingMember && (
        <EditMemberForm
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onEdit={(updatedMember: Member) => {
            setMembers(members.map((m: Member) => m.member_id === updatedMember.member_id ? updatedMember : m));
            setEditingMember(null);
          }}
        />
      )}

      {showConfirmModal && deletingMember && (
        <ConfirmationModal
          message={`Are you sure you want to delete ${deletingMember.first_name} ${deletingMember.last_name}?`}
          onConfirm={confirmDelete}
          onCancel={() => {
            setDeletingMember(null);
            setShowConfirmModal(false);
          }}
        />
      )}
    </div>
  );
}
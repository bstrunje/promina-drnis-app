import { useState, useEffect } from 'react';
import { RefreshCw, UserPlus, Edit, Trash2, CheckCircle, XCircle, Key } from 'lucide-react';
import { Alert, AlertDescription } from '@/../components/ui/alert.js';
import { Member, MemberStatus } from '../../../../shared/types/member';
import AddMemberForm from './AddMemberForm';
import EditMemberForm from './EditMemberForm';
import ConfirmationModal from './ConfirmationModal';
import AssignPasswordForm from './AssignPasswordForm';
import { API_URL } from '../../utils/config';

export default function MemberList(): JSX.Element {
 const [members, setMembers] = useState<Member[]>([]);
 const [loading, setLoading] = useState<boolean>(true);
 const [error, setError] = useState<string | null>(null);
 const [showAddForm, setShowAddForm] = useState<boolean>(false);
 const [editingMember, setEditingMember] = useState<Member | null>(null);
 const [deletingMember, setDeletingMember] = useState<Member | null>(null);
 const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
 const [assigningPasswordMember, setAssigningPasswordMember] = useState<Member | null>(null);

 useEffect(() => {
  const fetchMembers = async (): Promise<void> => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/members`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch members: ${response.status}`);
      }
      const data: Member[] = await response.json();
      
      // Calculate status for each member
      const updatedMembers = data.map(member => ({
        ...member,
        status: calculateStatus(member)
      }));

      setMembers(updatedMembers);
      setError(null);
    } catch (err) {
      console.error('Error fetching members:', err);
      setError('Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  fetchMembers();
}, []);

// Helper function to calculate status
const calculateStatus = (member: Member): MemberStatus => {
  if (member.status === 'pending') return 'pending';
  return (member.total_hours || 0) >= 20 ? 'active' : 'passive';
};

 const handleAssignPassword = (member: Member) => {
  setAssigningPasswordMember(member);
};

 const handleAdd = (newMember: Member) => {
   const memberWithDefaults = {
     ...newMember,
     total_hours: newMember.total_hours || 0
   };
   setMembers([...members, memberWithDefaults]);
   setShowAddForm(false);
 };

 const handleEdit = (member: Member) => {
  setEditingMember({
    ...member,
    total_hours: member.total_hours || 0
  });
};

 const handleDelete = (member: Member): void => {
   setDeletingMember(member);
   setShowConfirmModal(true);
 };

 const confirmDelete = async (): Promise<void> => {
   if (!deletingMember) return;

   try {
     const token = localStorage.getItem('token');
     const response = await fetch(`${API_URL}/members/${deletingMember.member_id}`, {
       method: 'DELETE',
       headers: {
         'Authorization': `Bearer ${token}`
       }
     });

     if (!response.ok) throw new Error('Failed to delete member');
     
     setMembers(members.filter(m => m.member_id !== deletingMember.member_id));
     setDeletingMember(null);
     setShowConfirmModal(false);
   } catch (error) {
     console.error('Error deleting member:', error);
     setError('Failed to delete member. Please try again later.');
   }
 };

 const getStatusColor = (status: MemberStatus) => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'passive':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
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
               <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
               <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
               <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
               <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
               <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Birth Date</th>
               <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
               <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Membership Type</th>
             </tr>
           </thead>
           <tbody className="divide-y divide-gray-200">
             {members.map((member: Member) => (
               <tr key={member.member_id} className="hover:bg-gray-50">
                 <td className="px-6 py-4">
                   <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                   {member.gender ? member.gender.charAt(0).toUpperCase() + member.gender.slice(1) : 'N/A'}
                   </span>
                 </td>
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
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm ${getStatusColor(member.status)}`}>
                    {member.status === 'active' ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : member.status === 'pending' ? (
                      <RefreshCw className="w-4 h-4" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    {member.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {member.total_hours || 0}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {member.date_of_birth ? new Date(member.date_of_birth).toLocaleDateString() : 'N/A'}
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
                      {member.status === 'pending' && (
                        <button 
                          onClick={() => handleAssignPassword(member)}
                          className="text-yellow-600 hover:text-yellow-900"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm ${
                      member.membership_type === 'regular' 
                        ? 'bg-blue-100 text-blue-800' 
                        : member.membership_type === 'supporting'
                        ? 'bg-green-100 text-green-800'
                        : member.membership_type === 'honorary'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {member.membership_type}
                    </span>
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
         onAdd={handleAdd}
       />
     )}

     {editingMember && (
       <EditMemberForm
         member={editingMember}
         onClose={() => setEditingMember(null)}
         onEdit={(updatedMember: Member) => {
           setMembers(members.map(m => m.member_id === updatedMember.member_id ? updatedMember : m));
           setEditingMember(null);
         }}
       />
     )}

     {assigningPasswordMember && (
        <AssignPasswordForm
        member={assigningPasswordMember}
        onClose={() => setAssigningPasswordMember(null)}
        onAssign={(updatedMember: Member) => {
          setMembers(members.map(m => m.member_id === updatedMember.member_id ? updatedMember : m));
          setAssigningPasswordMember(null);
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
import { useAuth } from '../../context/AuthContext';
import { useState, useEffect } from 'react';
import { RefreshCw, UserPlus, Edit, Trash2, CheckCircle, Key } from 'lucide-react';
import { Alert, AlertDescription } from '@/../components/ui/alert.js';
import { Member } from '@shared/types/member';
import AddMemberForm from './AddMemberForm';
import EditMemberForm from '../../../components/EditMemberForm';
import ConfirmationModal from '../../../components/ConfirmationModal';
import AssignPasswordForm from '../../../components/AssignPasswordForm';
import { API_URL } from '../../utils/config';
import { UserCog } from 'lucide-react';
import RoleAssignmentModal from './RoleAssignmentModal';
import { useNavigate } from 'react-router-dom';
import api from "../../utils/api";
import { useToast } from "@components/ui/use-toast";

export default function MemberList(): JSX.Element {
 const { toast } = useToast();
 const { user } = useAuth();
 const [members, setMembers] = useState<Member[]>([]);
 const [loading, setLoading] = useState<boolean>(true);
 const [error, setError] = useState<string | null>(null);
 const [showAddForm, setShowAddForm] = useState<boolean>(false);
 const [editingMember, setEditingMember] = useState<Member | null>(null);
 const [deletingMember, setDeletingMember] = useState<Member | null>(null);
 const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
 const [assigningPasswordMember, setAssigningPasswordMember] = useState<Member | null>(null);
 const [roleAssignmentMember, setRoleAssignmentMember] = useState<Member | null>(null);
 const navigate = useNavigate();
 
 useEffect(() => {
  const fetchMembers = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await api.get<Member[]>('/members');
      const data = response.data;
      
      // Calculate status for each member
      const updatedMembers = data.map((member: Member) => ({
        ...member,
        status: calculateStatus(member)
      }));
  
      setMembers(updatedMembers);
      setError(null);
    } catch (error) {
      console.error('Error fetching members:', error);
      setError(error instanceof Error ? error.message : 'Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  fetchMembers();
}, []);

// Helper function to calculate status
const calculateStatus = (member: Member): boolean => {
  if (!member.registration_completed) return false;
  return true;
};

 const handleAssignPassword = (member: Member) => {
  setAssigningPasswordMember(member);
};

const handleAdd = async (newMember: Member) => {
  try {
    const response = await api.post('/members', newMember);
    const memberWithDefaults = {
      ...response.data,
      total_hours: response.data.total_hours || 0
    };
    setMembers([...members, memberWithDefaults]);
    setShowAddForm(false);
    toast({
      title: "Success",
      description: "Member added successfully",
      variant: "success",
    });
  } catch (error) {
    setError(error instanceof Error ? error.message : 'Failed to add member');
    toast({
      title: "Error",
      description: "Failed to add member",
      variant: "destructive",
    });
  }
};

 const handleEdit = (member: Member) => {
  navigate(`/members/${member.member_id}/edit`);
};

const handleDelete = async (memberId: number): Promise<void> => {
  try {
    await api.delete(`/members/${memberId}`);
    setMembers(members.filter(m => m.member_id !== memberId));
    setDeletingMember(null);
    setShowConfirmModal(false);
    toast({
      title: "Success",
      description: "Member deleted successfully",
      variant: "success",
    });
  } catch (error) {
    console.error('Error deleting member:', error);
    setError(error instanceof Error ? error.message : 'Failed to delete member');
    toast({
      title: "Error",
      description: "Failed to delete member",
      variant: "destructive",
    });
  }
};

const handleRoleAssignment = async (memberId: number, newRole: 'member' | 'admin' | 'superuser') => {
  try {
    await api.put(`/members/${memberId}/role`, { role: newRole });
    
    setMembers(members.map(m => 
      m.member_id === memberId ? { ...m, role: newRole } : m
    ));
    setRoleAssignmentMember(null);
    toast({
      title: "Success",
      description: "Role updated successfully",
      variant: "success",
    });
  } catch (error) {
    setError(error instanceof Error ? error.message : 'Failed to update member role');
    toast({
      title: "Error",
      description: "Failed to update role",
      variant: "destructive",
    });
  }
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

 const getRegistrationStatusColor = (isRegistered: boolean) => {
  if (!isRegistered) return 'bg-yellow-100 text-yellow-800'; // pending
  return 'bg-green-100 text-green-800'; // completed
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
               <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                 Gender
               </th>
               <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                 Name
               </th>
               <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                 Status
               </th>
               <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                 Hours
               </th>
               <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                 Birth Date
               </th>
               <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                 Actions
               </th>
               <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                 Membership Type
               </th>
             </tr>
           </thead>
           <tbody className="divide-y divide-gray-200">
             {members.map((member: Member) => (
               <tr key={member.member_id} className="hover:bg-gray-50">
                 <td className="px-6 py-4">
                   <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                     {member.gender
                       ? member.gender.charAt(0).toUpperCase() +
                         member.gender.slice(1)
                       : "N/A"}
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
                   <span
                     className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm ${getRegistrationStatusColor(
                       member.registration_completed
                     )}`}
                   >
                     {member.registration_completed ? (
                       <CheckCircle className="w-4 h-4" />
                     ) : (
                       <RefreshCw className="w-4 h-4" />
                     )}
                     {member.registration_completed ? "Registered" : "Pending"}
                   </span>
                 </td>
                 <td className="px-6 py-4">{member.total_hours || 0}</td>
                 <td className="px-6 py-4 text-sm text-gray-500">
                   {member.date_of_birth
                     ? new Date(member.date_of_birth).toLocaleDateString()
                     : "N/A"}
                 </td>
                 <td className="px-6 py-4 text-sm font-medium">
                   <div className="flex items-center gap-2">
                     <button
                       onClick={() => handleEdit(member)}
                       className="text-blue-600 hover:text-blue-900"
                     >
                       <Edit className="w-4 h-4" />
                     </button>
                     {user?.role === 'superuser' && (
  <button
    onClick={() => setRoleAssignmentMember(member)}
    className="text-blue-600 hover:text-blue-900"
    title="Assign Role"
  >
    <UserCog className="w-4 h-4" />
  </button>
)}
                     {user?.role === "superuser" && (
                       <button
                         onClick={() => handleDelete(member.member_id)}
                         className="text-red-600 hover:text-red-900"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                     )}
                     {!member.registration_completed && (
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
                   <span
                     className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm ${
                       member.membership_type === "regular"
                         ? "bg-blue-100 text-blue-800"
                         : member.membership_type === "supporting"
                         ? "bg-green-100 text-green-800"
                         : member.membership_type === "honorary"
                         ? "bg-purple-100 text-purple-800"
                         : "bg-gray-100 text-gray-800"
                     }`}
                   >
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
       <AddMemberForm onClose={() => setShowAddForm(false)} onAdd={handleAdd} />
     )}

     {editingMember && (
       <EditMemberForm
         member={editingMember}
         onClose={() => setEditingMember(null)}
         onEdit={(updatedMember: Member) => {
           setMembers(
             members.map((m) =>
               m.member_id === updatedMember.member_id ? updatedMember : m
             )
           );
           setEditingMember(null);
         }}
       />
     )}

     {assigningPasswordMember && (
       <AssignPasswordForm
         member={assigningPasswordMember}
         onClose={() => setAssigningPasswordMember(null)}
         onAssign={(updatedMember: Member) => {
           setMembers(
             members.map((m) =>
               m.member_id === updatedMember.member_id ? updatedMember : m
             )
           );
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

     {roleAssignmentMember && (
  <RoleAssignmentModal
    member={roleAssignmentMember}
    onClose={() => setRoleAssignmentMember(null)}
    onAssign={handleRoleAssignment}
  />
)}
   </div>
 );

}
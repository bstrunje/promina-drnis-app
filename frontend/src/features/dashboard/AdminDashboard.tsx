import { Users, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Member } from '@shared/types/member';
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/card';

interface Props {
  member: Member;
}

interface MembershipFormData {
  feePaymentDate: string;
  cardNumber: string;
  stampIssued: boolean;
}

const AdminDashboard: React.FC<Props> = ({ member }) => {
  const navigate = useNavigate();
  const [membershipData, setMembershipData] = useState<MembershipFormData>({
    feePaymentDate: '',
    cardNumber: '',
    stampIssued: false
  });

  const handleTermination = async (reason: string) => {
    if (!reason) return;
    try {
      await fetch(`/api/members/${member.member_id}/membership/terminate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason,
          endDate: new Date().toISOString()
        })
      });
      // Handle success
    } catch (error) {
      console.error('Error terminating membership:', error);
    }
  };

  const handleMembershipUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch(`/api/members/${member.member_id}/membership`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentDate: membershipData.feePaymentDate,
          cardNumber: membershipData.cardNumber,
          stampIssued: membershipData.stampIssued
        })
      });
      // Handle success
    } catch (error) {
      console.error('Error updating membership:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-lg text-white p-6 mb-6">
        <h1 className="text-2xl font-bold mb-2">Welcome, {member.full_name}</h1>
        <p className="opacity-90">Admin Dashboard</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Membership Management</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleMembershipUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Fee Payment Date</label>
                <input
                  type="date"
                  value={membershipData.feePaymentDate}
                  onChange={(e) => setMembershipData((prev: MembershipFormData) => ({
                    ...prev,
                    feePaymentDate: e.target.value
                  }))}
                  className="w-full p-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Card Number</label>
                <input
                  type="text"
                  value={membershipData.cardNumber}
                  onChange={(e) => setMembershipData((prev: MembershipFormData) => ({
                    ...prev,
                    cardNumber: e.target.value
                  }))}
                  disabled={!membershipData.feePaymentDate}
                  className="w-full p-2 border rounded"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={membershipData.stampIssued}
                  onChange={(e) => setMembershipData((prev: MembershipFormData) => ({
                    ...prev,
                    stampIssued: e.target.checked
                  }))}
                  disabled={!membershipData.feePaymentDate}
                  className="mr-2"
                />
                <label className="text-sm font-medium">Stamp Issued</label>
              </div>

              <button
                type="submit"
                className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700"
              >
                Update Membership
              </button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Member Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <button 
              onClick={() => navigate('/members')}
              className="w-full mb-4 p-4 bg-white border rounded-lg shadow-sm flex items-center justify-between hover:shadow-md"
            >
              <div>
                <h3 className="font-medium">Member Management</h3>
                <p className="text-sm text-gray-600">Manage member accounts and permissions</p>
              </div>
              <Users className="h-5 w-5 text-purple-600" />
            </button>

            <button 
              onClick={() => navigate('/activities')}
              className="w-full p-4 bg-white border rounded-lg shadow-sm flex items-center justify-between hover:shadow-md"
            >
              <div>
                <h3 className="font-medium">Activity Management</h3>
                <p className="text-sm text-gray-600">Manage and monitor activities</p>
              </div>
              <Activity className="h-5 w-5 text-purple-600" />
            </button>
          </CardContent>
        </Card>

        {/* Membership Termination Card */}
        <Card>
          <CardHeader>
            <CardTitle>Membership Termination</CardTitle>
          </CardHeader>
          <CardContent>
            <select 
              className="w-full p-2 border rounded mb-4"
              onChange={(e) => handleTermination(e.target.value)}
            >
              <option value="">Select Reason</option>
              <option value="withdrawal">Personal Withdrawal</option>
              <option value="expulsion">Court Expulsion</option>
              <option value="death">Death</option>
            </select>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
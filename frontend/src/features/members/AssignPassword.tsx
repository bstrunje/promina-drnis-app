import React, { useState, useEffect } from 'react';
import { API_URL } from '../../utils/config';
import { Member } from '@shared/types/member';

interface PendingMember {
    member_id: number;
    full_name: string;
}

const AssignPassword: React.FC = () => {
    const [pendingMembers, setPendingMembers] = useState<PendingMember[]>([]);
    const [selectedMember, setSelectedMember] = useState<number | ''>('');
    const [password, setPassword] = useState('');

    useEffect(() => {
        fetchPendingMembers();
    }, []);

    const fetchPendingMembers = async () => {
        try {
            const response = await fetch(`${API_URL}/members/pending`);
            if (response.ok) {
                const data = await response.json();
                setPendingMembers(data.filter((member: Member) => !member.registration_completed));
            }
        } catch (error) {
            console.error('Error fetching pending members:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMember || !password) return;

        try {
            const response = await fetch(`${API_URL}/members/assign-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    memberId: selectedMember,
                    password,
                }),
            });

            if (response.ok) {
                alert('Password assigned successfully');
                setSelectedMember('');
                setPassword('');
                fetchPendingMembers();
            } else {
                alert('Failed to assign password');
            }
        } catch (error) {
            console.error('Error assigning password:', error);
            alert('An error occurred');
        }
    };

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Assign Password to Pending Members</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block mb-2">Select Member:</label>
                    <select 
                        value={selectedMember} 
                        onChange={(e) => setSelectedMember(Number(e.target.value))}
                        className="w-full p-2 border rounded"
                    >
                        <option value="">Select a member</option>
                        {pendingMembers.map((member) => (
                            <option key={member.member_id} value={member.member_id}>
                                {member.full_name}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block mb-2">Password:</label>
                    <input 
                        type="password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-2 border rounded"
                    />
                </div>
                <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
                    Assign Password
                </button>
            </form>
        </div>
    );
};

export default AssignPassword;
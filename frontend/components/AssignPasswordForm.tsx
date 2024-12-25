import React, { useState } from 'react';
import { Member } from '@shared/types/member';
import { assignPassword } from '../../frontend/src/utils/api';

interface Props {
    member: Member;
    onClose: () => void;
    onAssign: (updatedMember: Member) => void;
}

const AssignPasswordForm = ({ member, onClose, onAssign }: Props) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Submitting password for member:', member.member_id);
        setError(null);
        
        try {
            await assignPassword(member.member_id, password);
            console.log('Password assignment response received');
            onAssign({
                ...member,
                registration_completed: true
            });
            onClose();
        } catch (error: unknown) {
            console.error('Error assigning password:', error);
            if (error instanceof Error) {
                setError(error.message);
            } else {
                setError('An unexpected error occurred');
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                    Assign Password for {member.first_name} {member.last_name}
                </h3>
                {error && <p className="text-red-500 mb-4">{error}</p>}
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="w-full p-2 mb-4 border rounded"
                        required
                    />
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md mr-2"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-500 text-white rounded-md"
                        >
                            Assign Password
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AssignPasswordForm;
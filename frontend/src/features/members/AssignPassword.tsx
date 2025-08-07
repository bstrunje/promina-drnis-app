import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../../utils/config';

// Definiramo tip za člana koji dolazi s API-ja
interface ApiMember {
    member_id: number;
    full_name: string;
    registration_completed?: boolean;
}

interface PendingMember {
    member_id: number;
    full_name: string;
}

const AssignPassword: React.FC = () => {
    const { t } = useTranslation('members');
    const [pendingMembers, setPendingMembers] = useState<PendingMember[]>([]);
    const [selectedMember, setSelectedMember] = useState<number | ''>('');
    const [password, setPassword] = useState('');

    useEffect(() => {
        void fetchPendingMembers();
    }, []);

    const fetchPendingMembers = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/members/pending`);
            if (response.ok) {
                // Eksplicitno definiramo tip podataka koji očekujemo od API-ja
                const data = await response.json() as ApiMember[];
                
                // Validiramo podatke prije korištenja
                const validatedMembers = data
                    .filter(member => 
                        typeof member === 'object' && 
                        member !== null && 
                        'registration_completed' in member && 
                        !member.registration_completed
                    )
                    .map(member => ({
                        member_id: typeof member.member_id === 'number' ? member.member_id : 0,
                        full_name: typeof member.full_name === 'string' ? member.full_name : ''
                    }));
                
                setPendingMembers(validatedMembers);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error fetching pending members:', errorMessage);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMember || !password) return;

        try {
            const response = await fetch(`${API_BASE_URL}/members/assign-password`, {
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
                alert(t('auth.assignPassword.messages.passwordAssignedSuccessfully'));
                setSelectedMember('');
                setPassword('');
                void fetchPendingMembers();
            } else {
                alert(t('auth.assignPassword.messages.failedToAssignPassword'));
            }
        } catch (error) {
            console.error('Error assigning password:', error);
            alert(t('auth.assignPassword.messages.errorOccurred'));
        }
    };

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">{t('auth.assignPassword.title')}</h2>
            <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
                <div>
                    <label className="block mb-2">{t('auth.assignPassword.form.selectMember')}</label>
                    <select 
                        value={selectedMember} 
                        onChange={(e) => setSelectedMember(Number(e.target.value))}
                        className="w-full p-2 border rounded"
                    >
                        <option value="">{t('auth.assignPassword.form.selectMemberPlaceholder')}</option>
                        {pendingMembers.map((member) => (
                            <option key={member.member_id} value={member.member_id}>
                                {member.full_name}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block mb-2">{t('auth.assignPassword.form.password')}</label>
                    <input 
                        type="password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-2 border rounded"
                    />
                </div>
                <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
                    {t('auth.assignPassword.form.assignPasswordButton')}
                </button>
            </form>
        </div>
    );
};

export default AssignPassword;
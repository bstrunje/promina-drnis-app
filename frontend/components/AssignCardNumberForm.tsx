import React, { useState, useEffect } from 'react';
import { Member } from '@shared/member';
import { assignCardNumber, getAvailableCardNumbers } from '@/utils/api';

interface Props {
    member: Member;
    onClose: () => void;
    onAssign: (updatedMember: Member) => void;
}

const AssignCardNumberForm = ({ member, onClose, onAssign }: Props) => {
    const [cardNumber, setCardNumber] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [availableCardNumbers, setAvailableCardNumbers] = useState<string[]>([]);
    const [passwordPreview, setPasswordPreview] = useState('');
    const [successMessage, setSuccessMessage] = useState<{
        message: string;
        generatedPassword: string;
    } | null>(null);

    // Dohvati dostupne brojeve članskih iskaznica pri učitavanju komponente
    useEffect(() => {
        const fetchCardNumbers = async () => {
            try {
                setLoading(true);
                
                // Resetiraj izbor broja iskaznice
                setCardNumber('');
                
                // Eksplicitno osvježi podatke bez korištenja keša
                const numbers = await getAvailableCardNumbers();
                
                // Osiguraj da je rezultat uistinu array
                if (Array.isArray(numbers)) {
                    setAvailableCardNumbers(numbers);
                } else {
                    setAvailableCardNumbers([]);
                }
                
                setLoading(false);
            } catch {
                setError('Greška pri dohvatu dostupnih brojeva iskaznica');
                setAvailableCardNumbers([]);
                setLoading(false);
            }
        };

        void fetchCardNumbers();
        // Reset state kad se komponenta učita
        setError(null);
        setSuccessMessage(null);
    }, []);

    // Ažuriraj preview lozinke kad se promijeni broj iskaznice
    useEffect(() => {
        if (cardNumber) {
            setPasswordPreview(`${member.full_name}-isk-${cardNumber}`);
        } else {
            setPasswordPreview('');
        }
    }, [cardNumber, member.full_name]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        setSuccessMessage(null);
        
        try {
            // Poziv API-ja za dodjelu broja iskaznice (koji će automatski generirati lozinku)
            const response = await assignCardNumber(member.member_id, cardNumber);
            
            // Ažuriraj lokalne podatke o članu
            const updatedMember = {
                ...member,
                registration_completed: true,
                status: 'registered' as const,
                membership_details: {
                    ...member.membership_details,
                    card_number: cardNumber
                }
            };
            
            // Prikaži poruku uspjeha s generiranom lozinkom
            if (response?.generatedPassword) {
                setSuccessMessage({
                    message: "Broj članske iskaznice uspješno dodijeljen i član aktiviran.",
                    generatedPassword: response.generatedPassword
                });
                
                // Nakon 5 sekundi zatvori formu i obavijesti roditelja o promjeni
                setTimeout(() => {
                    onAssign(updatedMember);
                    onClose();
                }, 5000);
            } else {
                // Odmah zatvori u slučaju da nema informacije o lozinci
                onAssign(updatedMember);
                onClose();
            }
        } catch {
            setError('Greška pri dodjeli broja iskaznice');
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                    Assign Card Number to {member.first_name} {member.last_name}
                </h3>
                
                {error && <p className="text-red-500 mb-4">{error}</p>}
                
                {successMessage ? (
                    <div className="mb-4">
                        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4">
                            <p>{successMessage.message}</p>
                        </div>
                        
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Generirana lozinka za člana:
                            </label>
                            <div className="p-3 bg-gray-100 border rounded text-sm font-mono break-all">
                                {successMessage.generatedPassword}
                            </div>
                            <p className="text-xs text-gray-500 mt-1 mb-3">
                                Zapišite ovu lozinku! Nakon zatvaranja dijaloga nećete je više moći vidjeti.
                            </p>
                            
                            <div className="text-center">
                                <p className="text-sm text-gray-500">Dijalog će se automatski zatvoriti za 5 sekundi.</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={e => { void handleSubmit(e); }}>
                        <div className="mb-4">
                            <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700 mb-1">
                                Select Card Number
                            </label>
                            
                            {loading ? (
                                <p className="text-gray-500">Loading available card numbers...</p>
                            ) : availableCardNumbers.length > 0 ? (
                                <select
                                    id="cardNumber"
                                    value={cardNumber}
                                    onChange={(e) => setCardNumber(e.target.value)}
                                    className="w-full p-2 border rounded"
                                    required
                                >
                                    <option value="">-- Select a card number --</option>
                                    {availableCardNumbers.map((num) => (
                                        <option key={num} value={num}>
                                            {num}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <p className="text-yellow-600">No available card numbers found.</p>
                            )}
                        </div>
                        
                        {passwordPreview && (
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Password Preview (automatically generated)
                                </label>
                                <div className="p-2 bg-gray-100 border rounded text-sm font-mono">
                                    {passwordPreview}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    This password will be automatically assigned upon saving.
                                </p>
                            </div>
                        )}
                        
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
                                disabled={!cardNumber || loading}
                                className={`px-4 py-2 ${!cardNumber || loading ? 'bg-blue-300' : 'bg-blue-500'} text-white rounded-md`}
                            >
                                {loading ? 'Processing...' : 'Assign Card Number'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default AssignCardNumberForm;
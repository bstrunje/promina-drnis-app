// features/systemManager/pages/settings/sections/ChangePasswordSection.tsx
import React, { useState } from 'react';
import axios from 'axios';
import { CollapsibleSection } from '../components/CollapsibleSection';
import { useSystemManager } from '../../../../../context/SystemManagerContext';
import systemManagerApi from '../../../utils/systemManagerApi';

export const ChangePasswordSection: React.FC = () => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [message, setMessage] = useState('');
  const { manager, refreshManager } = useSystemManager();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage('');
    let usernameChanged = false;
    try {
      if (newUsername && newUsername !== manager?.username) {
        await systemManagerApi.patch('/system-manager/change-username', { newUsername });
        usernameChanged = true;
        await refreshManager(); // automatski osvježi username u UI
      }
      let passwordChanged = false;
      if (newPassword || oldPassword) {
        if (newPassword !== confirm) {
          setMessage('New password and confirmation do not match.');
          return;
        }
        if (!oldPassword) {
          setMessage('Old password is required to change password.');
          return;
        }
        await systemManagerApi.patch('/system-manager/change-password', { oldPassword, newPassword });
        passwordChanged = true;
      }

      const successMessage = [
        usernameChanged ? 'Username successfully changed.' : '',
        passwordChanged ? 'Password successfully changed.' : ''
      ].filter(Boolean).join(' ');

      if (successMessage) {
        setMessage(successMessage);
      } else if (!newUsername && !newPassword && !oldPassword) {
        setMessage('No changes were made.');
      }
      setOldPassword('');
      setNewPassword('');
      setConfirm('');
      setNewUsername('');
    } catch (err: unknown) {
      // Sigurna provjera tipa errora
      if (axios.isAxiosError(err)) {
        // Provjera da err.response.data postoji i da ima message tipa string
        const data = err.response?.data as unknown;
        const serverMsg = (typeof data === 'object' && data !== null && 'message' in data && typeof (data as { message?: unknown }).message === 'string')
          ? (data as { message: string }).message
          : undefined;
        setMessage(serverMsg ?? 'Error saving changes.');
      } else if (err instanceof Error) {
        setMessage(typeof err.message === 'string' ? err.message : 'Error saving changes.');
      } else {
        setMessage('Error saving changes.');
      }
    }
  };

  return (
    <CollapsibleSection title="Change Username & Password" defaultOpen={false}>
      <form onSubmit={e => void handleSubmit(e)} className="flex flex-col gap-4 mt-4">
        <label htmlFor="newUsername" className="font-medium">New username (optional)</label>
        <input
          id="newUsername"
          type="text"
          autoComplete="username"
          className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={newUsername}
          onChange={e => setNewUsername(e.target.value)}
          placeholder={manager?.username ?? 'Current username'}
        />
        <label htmlFor="oldPassword" className="font-medium">Old password</label>
        {/* Skriveno polje za username radi accessibility i browser autofill */}
        <input
          type="text"
          name="username"
          autoComplete="username"
          value={manager?.username ?? ''}
          style={{ display: 'none' }}
          readOnly
          tabIndex={-1}
          aria-hidden="true"
        />
        <input
          id="oldPassword"
          type="password"
          autoComplete="current-password"
          className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={oldPassword}
          onChange={e => setOldPassword(e.target.value)}
          required={!!(newPassword || confirm)}
        />
        <label htmlFor="newPassword" className="font-medium">New password</label>
        <input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          required={!!oldPassword}
        />
        <label htmlFor="confirmPassword" className="font-medium">Confirm New Password</label>
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          required={!!oldPassword}
        />
        <button
          type="submit"
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition-colors"
        >
          Save Changes
        </button>
        {message && <div className={`mt-2 text-sm ${message.includes('successfully') ? 'text-green-600' : 'text-red-600'}`}>{message}</div>}
      </form>
    </CollapsibleSection>
  );
};

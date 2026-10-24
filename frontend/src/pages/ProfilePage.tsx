import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import {
  User,
  Mail,
  Lock,
  Building2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  KeyRound,
} from 'lucide-react';
import { Badge } from '../components/common/Badge';

export const ProfilePage: React.FC = () => {
  const { user, memberships, refreshUser } = useAuth();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    setProfileMsg(null);

    try {
      await api.put('/auth/profile', { fullName });
      setProfileMsg({ type: 'success', text: 'Profile name updated successfully' });
      refreshUser();
    } catch (err: any) {
      setProfileMsg({
        type: 'error',
        text: err.response?.data?.error || 'Failed to update profile name',
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    setIsChangingPassword(true);
    setPasswordMsg(null);

    try {
      await api.put('/auth/profile', {
        currentPassword,
        newPassword,
      });

      setPasswordMsg({ type: 'success', text: 'Password successfully updated' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMsg({
        type: 'error',
        text: err.response?.data?.error || 'Failed to change password. Ensure current password is correct.',
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-vault-text">
          Account Profile & Security Settings
        </h1>
        <p className="text-sm text-vault-muted mt-1">
          Manage your enterprise credentials and verified tenant memberships.
        </p>
      </div>

      {/* Account Info Card */}
      <div className="bg-vault-surface rounded-2xl border border-vault-border p-6 sm:p-8 shadow-soft">
        <h2 className="text-base font-bold text-vault-text tracking-tight mb-4 flex items-center space-x-2">
          <User className="w-5 h-5 text-vault-accent" />
          <span>Personal Information</span>
        </h2>

        {profileMsg && (
          <div
            className={`mb-4 p-3 rounded-xl text-xs font-medium flex items-center space-x-2 ${
              profileMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {profileMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{profileMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleUpdateName} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-semibold text-vault-muted uppercase tracking-wider mb-1">
              Email Address
            </label>
            <input
              type="text"
              disabled
              value={user?.email || ''}
              className="w-full px-3.5 py-2 bg-beige-100 border border-beige-300 rounded-xl text-sm text-vault-muted cursor-not-allowed"
            />
            <span className="text-[10px] text-vault-muted mt-0.5 block">
              Email addresses are verified tenant identifiers and cannot be altered directly.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-vault-text uppercase tracking-wider mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2 bg-white border border-beige-300 rounded-xl text-sm text-vault-text focus:outline-none focus:ring-2 focus:ring-vault-accent"
            />
          </div>

          <button
            type="submit"
            disabled={isUpdatingProfile}
            className="px-4 py-2 bg-vault-accent hover:bg-vault-accentHover text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            {isUpdatingProfile ? 'Saving...' : 'Update Name'}
          </button>
        </form>
      </div>

      {/* Change Password Card */}
      <div className="bg-vault-surface rounded-2xl border border-vault-border p-6 sm:p-8 shadow-soft">
        <h2 className="text-base font-bold text-vault-text tracking-tight mb-4 flex items-center space-x-2">
          <KeyRound className="w-5 h-5 text-vault-accent" />
          <span>Security & Password</span>
        </h2>

        {passwordMsg && (
          <div
            className={`mb-4 p-3 rounded-xl text-xs font-medium flex items-center space-x-2 ${
              passwordMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {passwordMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{passwordMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-semibold text-vault-text mb-1">
              Current Password
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2 bg-white border border-beige-300 rounded-xl text-sm text-vault-text focus:outline-none focus:ring-2 focus:ring-vault-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-vault-text mb-1">
              New Password
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 8 chars, 1 uppercase, 1 number"
              className="w-full px-3.5 py-2 bg-white border border-beige-300 rounded-xl text-sm text-vault-text focus:outline-none focus:ring-2 focus:ring-vault-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-vault-text mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2 bg-white border border-beige-300 rounded-xl text-sm text-vault-text focus:outline-none focus:ring-2 focus:ring-vault-accent"
            />
          </div>

          <button
            type="submit"
            disabled={isChangingPassword}
            className="px-4 py-2 bg-vault-accent hover:bg-vault-accentHover text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            {isChangingPassword ? 'Updating...' : 'Change Password'}
          </button>
        </form>
      </div>

      {/* Associated Workspaces */}
      <div className="bg-vault-surface rounded-2xl border border-vault-border p-6 sm:p-8 shadow-soft">
        <h2 className="text-base font-bold text-vault-text tracking-tight mb-4 flex items-center space-x-2">
          <Building2 className="w-5 h-5 text-vault-accent" />
          <span>Active Workspace Memberships</span>
        </h2>

        <div className="space-y-2">
          {memberships.map((m) => (
            <div
              key={m.companyId}
              className="p-3.5 bg-beige-50/70 border border-beige-200 rounded-xl flex items-center justify-between"
            >
              <div>
                <span className="font-semibold text-sm text-vault-text block">
                  {m.companyName}
                </span>
                <span className="text-xs text-vault-muted font-mono">
                  Slug: {m.companySlug} | Tenant ID: {m.companyId}
                </span>
              </div>
              <Badge variant="primary">{m.role}</Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

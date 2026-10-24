import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  UserPlus,
  Shield,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Crown,
} from 'lucide-react';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

interface WorkspaceMember {
  userId: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  role: 'ADMIN' | 'MEMBER' | 'VIEWER';
  status: string;
  joinedAt: string;
}

export const MembersPage: React.FC = () => {
  const { activeCompany, user } = useAuth();

  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER' | 'VIEWER'>('MEMBER');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const fetchMembers = async () => {
    if (!activeCompany) return;
    setIsLoading(true);

    try {
      const res = await api.get(`/workspaces/${activeCompany.companyId}/members`);
      setMembers(res.data);
    } catch (err: any) {
      console.error('Failed to load members:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [activeCompany?.companyId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany || !inviteEmail) return;

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      await api.post(`/workspaces/${activeCompany.companyId}/members`, {
        email: inviteEmail,
        role: inviteRole,
      });

      setStatusMessage({
        type: 'success',
        text: `User ${inviteEmail} successfully added with role ${inviteRole}`,
      });
      setInviteEmail('');
      setIsInviteModalOpen(false);
      fetchMembers();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to add member to workspace',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = async (targetUserId: string, newRole: 'ADMIN' | 'MEMBER' | 'VIEWER') => {
    if (!activeCompany) return;

    try {
      await api.patch(`/workspaces/${activeCompany.companyId}/members/${targetUserId}`, {
        role: newRole,
      });
      fetchMembers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update member role');
    }
  };

  const handleRemove = async (targetUserId: string, targetEmail: string) => {
    if (!activeCompany) return;
    if (!window.confirm(`Are you sure you want to remove ${targetEmail} from this workspace?`)) return;

    try {
      await api.delete(`/workspaces/${activeCompany.companyId}/members/${targetUserId}`);
      fetchMembers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to remove member');
    }
  };

  const isAdmin = activeCompany?.role === 'ADMIN';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-vault-text">
            Workspace Members & Roles
          </h1>
          <p className="text-sm text-vault-muted mt-1">
            Manage users and permission tiers for {activeCompany?.companyName}.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-vault-accent hover:bg-vault-accentHover text-white text-sm font-semibold rounded-xl shadow-sm transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Member</span>
          </button>
        )}
      </div>

      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs font-medium flex items-start space-x-2.5 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Members Table */}
      {isLoading ? (
        <LoadingSpinner size="lg" text="Retrieving workspace roster..." />
      ) : (
        <div className="bg-vault-surface rounded-2xl border border-vault-border shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-beige-200 bg-beige-50/50 text-xs font-semibold text-vault-muted uppercase tracking-wider">
                  <th className="py-3.5 px-6">User</th>
                  <th className="py-3.5 px-6">Role</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Joined Date</th>
                  {isAdmin && <th className="py-3.5 px-6 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-beige-200">
                {members.map((m) => {
                  const isSelf = m.userId === user?.id;

                  return (
                    <tr key={m.userId} className="hover:bg-beige-50/40 transition-colors">
                      {/* Name / Email */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-beige-200 border border-beige-300 flex items-center justify-center font-bold text-xs text-brown-800">
                            {m.fullName[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-vault-text flex items-center space-x-1.5">
                              <span>{m.fullName}</span>
                              {isSelf && (
                                <span className="text-[10px] bg-beige-200 text-brown-900 px-1.5 py-0.2 rounded font-mono">
                                  You
                                </span>
                              )}
                              {m.role === 'ADMIN' && (
                                <Crown className="w-3.5 h-3.5 text-amber-600" />
                              )}
                            </div>
                            <span className="text-xs text-vault-muted">{m.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Role Dropdown or Badge */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        {isAdmin && !isSelf ? (
                          <select
                            value={m.role}
                            onChange={(e) =>
                              handleRoleChange(m.userId, e.target.value as any)
                            }
                            className="px-2.5 py-1 bg-white border border-beige-300 rounded-lg text-xs font-medium text-vault-text focus:outline-none focus:ring-2 focus:ring-vault-accent"
                          >
                            <option value="ADMIN">ADMIN</option>
                            <option value="MEMBER">MEMBER</option>
                            <option value="VIEWER">VIEWER</option>
                          </select>
                        ) : (
                          <Badge
                            variant={
                              m.role === 'ADMIN'
                                ? 'primary'
                                : m.role === 'MEMBER'
                                ? 'info'
                                : 'secondary'
                            }
                          >
                            {m.role}
                          </Badge>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className="inline-flex items-center space-x-1 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                          <span>Active</span>
                        </span>
                      </td>

                      {/* Joined Date */}
                      <td className="py-4 px-6 text-xs text-vault-muted whitespace-nowrap">
                        {new Date(m.joinedAt).toLocaleDateString()}
                      </td>

                      {/* Remove Button */}
                      {isAdmin && (
                        <td className="py-4 px-6 text-right whitespace-nowrap">
                          {!isSelf && (
                            <button
                              onClick={() => handleRemove(m.userId, m.email)}
                              className="p-1.5 rounded-lg text-vault-muted hover:text-rose-700 hover:bg-rose-50 transition-colors"
                              title="Remove from Workspace"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Add Workspace Member"
        description="Add a registered user to this tenant workspace."
        maxWidth="sm"
      >
        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-vault-text mb-1">
              User Email Address
            </label>
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="coworker@company.com"
              className="w-full px-3 py-2 bg-beige-50/60 border border-beige-300 rounded-xl text-xs text-vault-text focus:outline-none focus:ring-2 focus:ring-vault-accent"
            />
            <p className="text-[11px] text-vault-muted mt-1">
              Note: The user must already have a registered account on TrustVault.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-vault-text mb-1">
              Assigned Role
            </label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as any)}
              className="w-full px-3 py-2 bg-white border border-beige-300 rounded-xl text-xs text-vault-text focus:outline-none focus:ring-2 focus:ring-vault-accent"
            >
              <option value="MEMBER">MEMBER (Can upload and view authorized documents)</option>
              <option value="VIEWER">VIEWER (Read-only access to granted files)</option>
              <option value="ADMIN">ADMIN (Full workspace administration rights)</option>
            </select>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-beige-200">
            <button
              type="button"
              onClick={() => setIsInviteModalOpen(false)}
              className="px-3 py-1.5 text-xs text-vault-muted hover:text-vault-text"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-vault-accent text-white text-xs font-semibold rounded-xl hover:bg-vault-accentHover transition-colors"
            >
              {isSubmitting ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

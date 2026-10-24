import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/common/Modal';
import { DocumentItem } from './DocumentsPage';
import {
  Share2,
  Users,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Trash2,
  KeyRound,
  ShieldAlert,
} from 'lucide-react';
import { Badge } from '../components/common/Badge';

interface ShareModalProps {
  document: DocumentItem;
  isOpen: boolean;
  onClose: () => void;
}

interface WorkspaceMember {
  userId: string;
  email: string;
  fullName: string;
  role: string;
}

interface PermissionRecord {
  id: string;
  userId: string;
  user: { id: string; fullName: string; email: string };
  permission: 'VIEW' | 'DOWNLOAD' | 'SHARE' | 'ADMIN';
  grantedBy: { id: string; fullName: string; email: string };
  expiresAt: string | null;
  createdAt: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({ document, isOpen, onClose }) => {
  const { activeCompany, user } = useAuth();

  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [permission, setPermission] = useState<'VIEW' | 'DOWNLOAD' | 'SHARE' | 'ADMIN'>('VIEW');
  const [expiresAt, setExpiresAt] = useState('');
  const [existingPermissions, setExistingPermissions] = useState<PermissionRecord[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const fetchMembersAndPermissions = async () => {
    if (!activeCompany) return;
    try {
      const [membersRes, permsRes] = await Promise.all([
        api.get(`/workspaces/${activeCompany.companyId}/members`),
        api.get(`/documents/${document.id}/permissions`),
      ]);

      // Filter out self and owner from selectable recipients
      const eligible = membersRes.data.filter(
        (m: WorkspaceMember) => m.userId !== user?.id && m.userId !== document.owner.id
      );
      setMembers(eligible);
      setExistingPermissions(permsRes.data);

      if (eligible.length > 0 && !recipientEmail) {
        setRecipientEmail(eligible[0].email);
      }
    } catch (err) {
      console.error('Failed to load sharing data:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMembersAndPermissions();
      setStatusMessage(null);
    }
  }, [isOpen, document.id]);

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail) return;

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      await api.post(`/documents/${document.id}/share`, {
        recipientEmail,
        permission,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      });

      setStatusMessage({
        type: 'success',
        text: `Successfully granted '${permission}' permission to ${recipientEmail}`,
      });

      // Refresh list
      fetchMembersAndPermissions();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to grant permission.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async (targetUserId: string, targetEmail: string) => {
    if (!window.confirm(`Immediately revoke document access for ${targetEmail}?`)) return;

    try {
      await api.post(`/documents/${document.id}/revoke/${targetUserId}`);
      setStatusMessage({
        type: 'success',
        text: `Revoked access for ${targetEmail}`,
      });
      fetchMembersAndPermissions();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to revoke access',
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Document Sharing & Permissions"
      description={`Grant explicit user-level access to "${document.name}". Cross-tenant sharing is strictly prevented.`}
      maxWidth="lg"
    >
      <div className="space-y-6">
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
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Grant New Permission Form */}
        <form onSubmit={handleGrant} className="p-4 bg-beige-50/70 rounded-2xl border border-beige-200 space-y-4">
          <h4 className="text-xs font-bold text-vault-text uppercase tracking-wider">
            Grant Access to Workspace Member
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Recipient Selector */}
            <div>
              <label className="block text-xs font-semibold text-vault-text mb-1">
                Recipient (Must belong to {activeCompany?.companyName})
              </label>
              {members.length > 0 ? (
                <select
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-beige-300 rounded-xl text-xs text-vault-text focus:outline-none focus:ring-2 focus:ring-vault-accent"
                >
                  {members.map((m) => (
                    <option key={m.userId} value={m.email}>
                      {m.fullName} ({m.email})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="email"
                  required
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="w-full px-3 py-2 bg-white border border-beige-300 rounded-xl text-xs text-vault-text focus:outline-none focus:ring-2 focus:ring-vault-accent"
                />
              )}
            </div>

            {/* Permission Level Selector */}
            <div>
              <label className="block text-xs font-semibold text-vault-text mb-1">
                Permission Level
              </label>
              <select
                value={permission}
                onChange={(e) => setPermission(e.target.value as any)}
                className="w-full px-3 py-2 bg-white border border-beige-300 rounded-xl text-xs text-vault-text focus:outline-none focus:ring-2 focus:ring-vault-accent"
              >
                <option value="VIEW">VIEW (Read & inline preview only)</option>
                <option value="DOWNLOAD">DOWNLOAD (Read & download file)</option>
                <option value="SHARE">SHARE (Read, download & share with others)</option>
                <option value="ADMIN">ADMIN (Full document control & delete)</option>
              </select>
            </div>
          </div>

          {/* Expiration date */}
          <div>
            <label className="block text-xs font-semibold text-vault-text mb-1">
              Temporary Access Expiration (Optional)
            </label>
            <div className="relative">
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-beige-300 rounded-xl text-xs text-vault-text focus:outline-none focus:ring-2 focus:ring-vault-accent"
              />
            </div>
            <p className="text-[11px] text-vault-muted mt-1">
              Leave blank for persistent access until explicitly revoked.
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-vault-accent hover:bg-vault-accentHover text-white text-xs font-semibold rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center space-x-2"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Granting...' : 'Grant Permission'}</span>
            </button>
          </div>
        </form>

        {/* Current Active Permissions Table */}
        <div>
          <h4 className="text-xs font-bold text-vault-text uppercase tracking-wider mb-2.5">
            Active Grants ({existingPermissions.length})
          </h4>

          {existingPermissions.length === 0 ? (
            <p className="text-xs text-vault-muted italic py-3">
              No explicit user grants active. Only the document owner and company admins have access.
            </p>
          ) : (
            <div className="border border-beige-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-beige-50 border-b border-beige-200 text-vault-muted font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">User</th>
                    <th className="py-2.5 px-4">Permission</th>
                    <th className="py-2.5 px-4">Expires</th>
                    <th className="py-2.5 px-4 text-right">Revoke</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-beige-200">
                  {existingPermissions.map((p) => (
                    <tr key={p.id} className="hover:bg-beige-50/50">
                      <td className="py-2.5 px-4">
                        <span className="font-semibold text-vault-text block">{p.user.fullName}</span>
                        <span className="text-[10px] text-vault-muted">{p.user.email}</span>
                      </td>
                      <td className="py-2.5 px-4">
                        <Badge variant="info">{p.permission}</Badge>
                      </td>
                      <td className="py-2.5 px-4 text-vault-muted">
                        {p.expiresAt ? new Date(p.expiresAt).toLocaleDateString() : 'Permanent'}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleRevoke(p.userId, p.user.email)}
                          className="px-2 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors"
                        >
                          Revoke
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

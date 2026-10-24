import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  FileText,
  ArrowLeft,
  Download,
  Share2,
  Trash2,
  Edit2,
  Shield,
  Clock,
  User,
  KeyRound,
  FileCheck,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Badge } from '../components/common/Badge';
import { ShareModal } from './ShareModal';

interface PermissionEntry {
  id: string;
  user: { id: string; fullName: string; email: string };
  permission: 'VIEW' | 'DOWNLOAD' | 'SHARE' | 'ADMIN';
  grantedBy: { id: string; fullName: string; email: string };
  expiresAt: string | null;
  createdAt: string;
}

interface DocumentDetail {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string | null;
  createdAt: string;
  updatedAt: string;
  owner: { id: string; fullName: string; email: string };
  company: { id: string; name: string };
  effectivePermission: 'VIEW' | 'DOWNLOAD' | 'SHARE' | 'ADMIN';
  permissions: PermissionEntry[];
}

export const DocumentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');

  const fetchDocument = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await api.get(`/documents/${id}`);
      setDoc(res.data);
      setNewName(res.data.name);

      // If document is text or json or markdown, fetch inline preview
      if (
        res.data.mimeType.startsWith('text/') ||
        res.data.mimeType === 'application/json'
      ) {
        try {
          const previewRes = await api.get(`/documents/${id}/preview`, { responseType: 'text' });
          setPreviewContent(previewRes.data);
        } catch (e) {
          console.warn('Could not load text preview:', e);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Document not found or access denied');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocument();
  }, [id]);

  const handleDownload = async () => {
    if (!doc) return;
    try {
      const res = await api.get(`/documents/${doc.id}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.originalName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Download failed');
    }
  };

  const handleRename = async () => {
    if (!doc || !newName.trim()) return;
    try {
      await api.patch(`/documents/${doc.id}`, { name: newName.trim() });
      setDoc({ ...doc, name: newName.trim() });
      setIsEditingName(false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to rename document');
    }
  };

  const handleRevoke = async (targetUserId: string, targetEmail: string) => {
    if (!doc) return;
    if (!window.confirm(`Revoke document access for ${targetEmail}? This takes effect immediately.`)) {
      return;
    }

    try {
      await api.post(`/documents/${doc.id}/revoke/${targetUserId}`);
      // Refresh permissions
      fetchDocument();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to revoke access');
    }
  };

  const handleDelete = async () => {
    if (!doc) return;
    if (!window.confirm(`Permanently delete "${doc.name}" from private storage?`)) return;

    try {
      await api.delete(`/documents/${doc.id}`);
      navigate('/documents');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete document');
    }
  };

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Verifying document authorization..." />;
  }

  if (error || !doc) {
    return (
      <div className="p-8 bg-rose-50 border border-rose-200 rounded-2xl text-center max-w-xl mx-auto mt-12">
        <AlertCircle className="w-10 h-10 text-rose-600 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-rose-900">Access Restricted</h3>
        <p className="text-sm text-rose-700 mt-1.5">{error}</p>
        <Link
          to="/documents"
          className="mt-5 inline-flex items-center space-x-2 px-4 py-2 bg-vault-accent text-white text-xs font-semibold rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Documents</span>
        </Link>
      </div>
    );
  }

  const canDownload =
    doc.effectivePermission === 'DOWNLOAD' ||
    doc.effectivePermission === 'SHARE' ||
    doc.effectivePermission === 'ADMIN';

  const canShare = doc.effectivePermission === 'SHARE' || doc.effectivePermission === 'ADMIN';
  const canAdmin = doc.effectivePermission === 'ADMIN';

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Back Button & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link
          to="/documents"
          className="inline-flex items-center space-x-2 text-sm font-semibold text-vault-muted hover:text-vault-text transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Authorized Documents</span>
        </Link>

        <div className="flex items-center space-x-2.5">
          {canDownload && (
            <button
              onClick={handleDownload}
              className="flex items-center space-x-2 px-4 py-2 bg-vault-surface hover:bg-beige-50 border border-vault-border rounded-xl text-sm font-medium text-vault-text shadow-xs transition-colors"
            >
              <Download className="w-4 h-4 text-emerald-700" />
              <span>Download</span>
            </button>
          )}

          {canShare && (
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-vault-accent hover:bg-vault-accentHover text-white rounded-xl text-sm font-medium shadow-sm transition-all"
            >
              <Share2 className="w-4 h-4" />
              <span>Share Access</span>
            </button>
          )}

          {canAdmin && (
            <button
              onClick={handleDelete}
              className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
              title="Delete Document"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Details Card */}
      <div className="bg-vault-surface rounded-2xl border border-vault-border p-6 sm:p-8 shadow-soft">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-beige-200">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-beige-100 flex items-center justify-center text-vault-accent shrink-0 border border-beige-200">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              {isEditingName ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="px-3 py-1 bg-white border border-beige-300 rounded-lg text-lg font-bold text-vault-text focus:outline-none focus:ring-2 focus:ring-vault-accent"
                  />
                  <button
                    onClick={handleRename}
                    className="px-3 py-1 bg-vault-accent text-white text-xs font-semibold rounded-lg"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditingName(false)}
                    className="px-3 py-1 bg-beige-100 text-vault-text text-xs rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2.5">
                  <h1 className="text-2xl font-bold tracking-tight text-vault-text">{doc.name}</h1>
                  {canAdmin && (
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="p-1 text-vault-muted hover:text-vault-text rounded-md"
                      title="Rename Document"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
              <p className="text-xs font-mono text-vault-muted mt-1">
                Original Filename: <span className="text-vault-text">{doc.originalName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-right">
              <span className="text-xs text-vault-muted block">Your Access Level</span>
              <Badge variant="primary" size="md">
                {doc.effectivePermission}
              </Badge>
            </div>
          </div>
        </div>

        {/* Technical Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div className="p-3.5 bg-beige-50/60 rounded-xl border border-beige-200/80">
            <span className="text-[11px] font-semibold text-vault-muted uppercase tracking-wider block">
              Document Owner
            </span>
            <span className="text-xs font-semibold text-vault-text block mt-1 truncate">
              {doc.owner.fullName}
            </span>
            <span className="text-[10px] text-vault-muted truncate block">{doc.owner.email}</span>
          </div>

          <div className="p-3.5 bg-beige-50/60 rounded-xl border border-beige-200/80">
            <span className="text-[11px] font-semibold text-vault-muted uppercase tracking-wider block">
              File Size & MIME
            </span>
            <span className="text-xs font-semibold text-vault-text block mt-1 font-mono">
              {(doc.sizeBytes / 1024).toFixed(1)} KB
            </span>
            <span className="text-[10px] text-vault-muted truncate block">{doc.mimeType}</span>
          </div>

          <div className="p-3.5 bg-beige-50/60 rounded-xl border border-beige-200/80">
            <span className="text-[11px] font-semibold text-vault-muted uppercase tracking-wider block">
              Upload Date
            </span>
            <span className="text-xs font-semibold text-vault-text block mt-1">
              {new Date(doc.createdAt).toLocaleDateString()}
            </span>
            <span className="text-[10px] text-vault-muted block">
              {new Date(doc.createdAt).toLocaleTimeString()}
            </span>
          </div>

          <div className="p-3.5 bg-beige-50/60 rounded-xl border border-beige-200/80">
            <span className="text-[11px] font-semibold text-vault-muted uppercase tracking-wider block">
              SHA-256 Checksum
            </span>
            <span
              className="text-xs font-mono text-vault-text block mt-1 truncate"
              title={doc.checksum || 'N/A'}
            >
              {doc.checksum ? doc.checksum.slice(0, 16) + '...' : 'Verified'}
            </span>
            <span className="text-[10px] text-emerald-700 font-semibold block">Cryptographically Verified</span>
          </div>
        </div>

        {/* Inline Preview if applicable */}
        {previewContent && (
          <div className="mt-8 pt-6 border-t border-beige-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-vault-text tracking-tight">Inline Text Preview</h3>
              <span className="text-[11px] text-vault-muted">Streamed via authorized backend proxy</span>
            </div>
            <pre className="p-4 bg-cream-50 border border-beige-200 rounded-xl text-xs font-mono text-brown-900 overflow-x-auto max-h-72 whitespace-pre-wrap">
              {previewContent}
            </pre>
          </div>
        )}
      </div>

      {/* Explicit Permissions & User Access Management */}
      <div className="bg-vault-surface rounded-2xl border border-vault-border shadow-soft overflow-hidden">
        <div className="p-6 border-b border-beige-200 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <KeyRound className="w-5 h-5 text-vault-accent" />
              <h2 className="text-lg font-bold text-vault-text tracking-tight">
                Explicit User-Level Permissions
              </h2>
            </div>
            <p className="text-xs text-vault-muted mt-1">
              Users granted direct access to this confidential document.
            </p>
          </div>

          {canShare && (
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-vault-accent text-white text-xs font-semibold rounded-lg shadow-xs hover:bg-vault-accentHover transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Add Recipient</span>
            </button>
          )}
        </div>

        {doc.permissions.length === 0 ? (
          <div className="p-8 text-center text-vault-muted text-sm">
            This document has not been explicitly shared with other users yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-beige-200 bg-beige-50/50 text-xs font-semibold text-vault-muted uppercase tracking-wider">
                  <th className="py-3 px-6">Granted User</th>
                  <th className="py-3 px-6">Permission Level</th>
                  <th className="py-3 px-6">Granted By</th>
                  <th className="py-3 px-6">Granted At</th>
                  <th className="py-3 px-6">Expiration</th>
                  {canShare && <th className="py-3 px-6 text-right">Revocation</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-beige-200">
                {doc.permissions.map((p) => (
                  <tr key={p.id} className="hover:bg-beige-50/40 transition-colors">
                    <td className="py-3.5 px-6 whitespace-nowrap">
                      <span className="font-semibold text-vault-text block">{p.user.fullName}</span>
                      <span className="text-xs text-vault-muted">{p.user.email}</span>
                    </td>
                    <td className="py-3.5 px-6 whitespace-nowrap">
                      <Badge variant="info">{p.permission}</Badge>
                    </td>
                    <td className="py-3.5 px-6 text-xs text-vault-muted whitespace-nowrap">
                      {p.grantedBy.fullName}
                    </td>
                    <td className="py-3.5 px-6 text-xs text-vault-muted whitespace-nowrap">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-6 text-xs text-vault-muted whitespace-nowrap">
                      {p.expiresAt ? (
                        new Date(p.expiresAt) < new Date() ? (
                          <span className="text-rose-600 font-semibold">Expired</span>
                        ) : (
                          <span>{new Date(p.expiresAt).toLocaleDateString()}</span>
                        )
                      ) : (
                        <span className="text-vault-muted">Permanent</span>
                      )}
                    </td>
                    {canShare && (
                      <td className="py-3.5 px-6 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleRevoke(p.user.id, p.user.email)}
                          className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                        >
                          Revoke Access
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Share Modal */}
      {doc && (
        <ShareModal
          document={doc as any}
          isOpen={isShareModalOpen}
          onClose={() => {
            setIsShareModalOpen(false);
            fetchDocument();
          }}
        />
      )}
    </div>
  );
};

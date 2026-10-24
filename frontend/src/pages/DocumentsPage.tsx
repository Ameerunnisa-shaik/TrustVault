import React, { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import {
  FileText,
  Search,
  Download,
  Share2,
  Trash2,
  Eye,
  Plus,
  Shield,
  FileCheck,
  AlertCircle,
} from 'lucide-react';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { ShareModal } from './ShareModal';

export interface DocumentItem {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
  owner: { id: string; fullName: string; email: string };
  isOwner: boolean;
  effectivePermission: 'VIEW' | 'DOWNLOAD' | 'SHARE' | 'ADMIN';
  activeSharesCount: number;
}

export const DocumentsPage: React.FC = () => {
  const { activeCompany, user } = useAuth();
  const { openUploadModal } = useOutletContext<{ openUploadModal: () => void }>();

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'MINE' | 'SHARED'>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sharing modal state
  const [selectedDocForShare, setSelectedDocForShare] = useState<DocumentItem | null>(null);

  const fetchDocuments = async () => {
    if (!activeCompany) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await api.get('/documents');
      setDocuments(res.data);
    } catch (err: any) {
      console.error('Failed to fetch documents:', err);
      setErrorMessage(err.response?.data?.error || 'Failed to retrieve documents');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();

    const handleUploadEvent = () => fetchDocuments();
    window.addEventListener('trustvault_document_uploaded', handleUploadEvent);
    return () => window.removeEventListener('trustvault_document_uploaded', handleUploadEvent);
  }, [activeCompany?.companyId]);

  const handleDownload = async (doc: DocumentItem) => {
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
      alert(err.response?.data?.error || 'Download failed. Permission denied.');
    }
  };

  const handleDelete = async (doc: DocumentItem) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${doc.name}"? This action is audited.`)) {
      return;
    }

    try {
      await api.delete(`/documents/${doc.id}`);
      setDocuments(documents.filter((d) => d.id !== doc.id));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete document');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Filter documents
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.originalName.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterTab === 'MINE') return doc.isOwner;
    if (filterTab === 'SHARED') return !doc.isOwner;
    return true;
  });

  const isViewer = activeCompany?.role === 'VIEWER';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-vault-text">Authorized Documents</h1>
          <p className="text-sm text-vault-muted mt-1">
            Browse, preview, and securely manage documents scoped to {activeCompany?.companyName}.
          </p>
        </div>

        <button
          onClick={openUploadModal}
          disabled={isViewer}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-sm transition-all ${
            isViewer
              ? 'bg-beige-200 text-vault-muted cursor-not-allowed opacity-60'
              : 'bg-vault-accent hover:bg-vault-accentHover text-white'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-vault-surface rounded-2xl border border-vault-border p-4 shadow-soft flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-vault-muted">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title or filename..."
            className="w-full pl-9 pr-4 py-2 bg-beige-50/60 border border-beige-300 rounded-xl text-sm text-vault-text placeholder-vault-muted/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-vault-accent focus:border-transparent transition-all"
          />
        </div>

        {/* Tab Filters */}
        <div className="flex items-center space-x-1.5 p-1 bg-beige-100 rounded-xl border border-beige-300/80 w-full sm:w-auto">
          <button
            onClick={() => setFilterTab('ALL')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterTab === 'ALL'
                ? 'bg-vault-surface text-brown-900 shadow-xs'
                : 'text-vault-muted hover:text-vault-text'
            }`}
          >
            All Docs ({documents.length})
          </button>
          <button
            onClick={() => setFilterTab('MINE')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterTab === 'MINE'
                ? 'bg-vault-surface text-brown-900 shadow-xs'
                : 'text-vault-muted hover:text-vault-text'
            }`}
          >
            Uploaded by Me ({documents.filter((d) => d.isOwner).length})
          </button>
          <button
            onClick={() => setFilterTab('SHARED')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterTab === 'SHARED'
                ? 'bg-vault-surface text-brown-900 shadow-xs'
                : 'text-vault-muted hover:text-vault-text'
            }`}
          >
            Shared with Me ({documents.filter((d) => !d.isOwner).length})
          </button>
        </div>
      </div>

      {/* Main Content State */}
      {isLoading ? (
        <LoadingSpinner size="lg" text="Retrieving verified documents..." />
      ) : errorMessage ? (
        <div className="p-8 bg-rose-50 border border-rose-200 rounded-2xl text-center">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto mb-2" />
          <p className="text-sm text-rose-800">{errorMessage}</p>
          <button
            onClick={fetchDocuments}
            className="mt-3 px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-xl"
          >
            Try Again
          </button>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={searchQuery ? 'No matching documents' : 'No documents in workspace'}
          description={
            searchQuery
              ? `No document matched "${searchQuery}". Try adjusting your search query.`
              : 'Start by uploading confidential documents to your secure workspace.'
          }
          action={
            !searchQuery && !isViewer
              ? { label: 'Upload First Document', onClick: openUploadModal }
              : undefined
          }
        />
      ) : (
        <div className="bg-vault-surface rounded-2xl border border-vault-border shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-beige-200 bg-beige-50/50 text-xs font-semibold text-vault-muted uppercase tracking-wider">
                  <th className="py-3.5 px-6">Document Name</th>
                  <th className="py-3.5 px-6">Owner</th>
                  <th className="py-3.5 px-6">File Size</th>
                  <th className="py-3.5 px-6">Upload Date</th>
                  <th className="py-3.5 px-6">Your Permission</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-beige-200">
                {filteredDocuments.map((doc) => {
                  const canDownload =
                    doc.effectivePermission === 'DOWNLOAD' ||
                    doc.effectivePermission === 'SHARE' ||
                    doc.effectivePermission === 'ADMIN';

                  const canShare =
                    doc.effectivePermission === 'SHARE' || doc.effectivePermission === 'ADMIN';

                  const canDelete = doc.effectivePermission === 'ADMIN';

                  return (
                    <tr key={doc.id} className="hover:bg-beige-50/40 transition-colors">
                      {/* Name & Type */}
                      <td className="py-4 px-6">
                        <div className="flex items-start space-x-3">
                          <div className="w-9 h-9 rounded-xl bg-beige-100 flex items-center justify-center text-vault-accent shrink-0 border border-beige-200 mt-0.5">
                            <FileCheck className="w-4 h-4" />
                          </div>
                          <div>
                            <Link
                              to={`/documents/${doc.id}`}
                              className="font-semibold text-vault-text hover:text-vault-accent transition-colors tracking-tight line-clamp-1"
                            >
                              {doc.name}
                            </Link>
                            <span className="text-xs text-vault-muted block font-mono">
                              {doc.originalName}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Owner */}
                      <td className="py-4 px-6 text-xs text-vault-muted whitespace-nowrap">
                        <span className="font-medium text-vault-text block">
                          {doc.owner.fullName}
                        </span>
                        <span>{doc.owner.email}</span>
                      </td>

                      {/* File Size */}
                      <td className="py-4 px-6 text-xs text-vault-muted whitespace-nowrap font-mono">
                        {formatFileSize(doc.sizeBytes)}
                      </td>

                      {/* Upload Date */}
                      <td className="py-4 px-6 text-xs text-vault-muted whitespace-nowrap">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </td>

                      {/* Effective Permission */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <Badge
                          variant={
                            doc.effectivePermission === 'ADMIN'
                              ? 'primary'
                              : doc.effectivePermission === 'SHARE'
                              ? 'info'
                              : doc.effectivePermission === 'DOWNLOAD'
                              ? 'success'
                              : 'secondary'
                          }
                        >
                          {doc.effectivePermission}
                        </Badge>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* View details */}
                          <Link
                            to={`/documents/${doc.id}`}
                            className="p-1.5 rounded-lg text-vault-muted hover:text-vault-text hover:bg-beige-100 transition-colors"
                            title="View Document Details & Preview"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          {/* Download */}
                          {canDownload && (
                            <button
                              onClick={() => handleDownload(doc)}
                              className="p-1.5 rounded-lg text-vault-muted hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                              title="Download File"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          )}

                          {/* Share */}
                          {canShare && (
                            <button
                              onClick={() => setSelectedDocForShare(doc)}
                              className="p-1.5 rounded-lg text-vault-muted hover:text-vault-accent hover:bg-beige-100 transition-colors"
                              title="Share with Coworker"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Delete */}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(doc)}
                              className="p-1.5 rounded-lg text-vault-muted hover:text-rose-700 hover:bg-rose-50 transition-colors"
                              title="Delete Document"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {selectedDocForShare && (
        <ShareModal
          document={selectedDocForShare}
          isOpen={!!selectedDocForShare}
          onClose={() => {
            setSelectedDocForShare(null);
            fetchDocuments();
          }}
        />
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import {
  FileText,
  Share2,
  Users,
  ScrollText,
  Upload,
  ArrowUpRight,
  ShieldAlert,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Badge } from '../components/common/Badge';

interface DashboardStats {
  totalDocuments: number;
  totalMembers: number;
  sharedDocumentsCount: number;
}

interface ActivityLog {
  id: string;
  action: string;
  outcome: 'SUCCESS' | 'DENIED';
  createdAt: string;
  actor: { id: string; name: string; email: string } | null;
  document: { id: string; name: string } | null;
  metadata?: any;
}

export const DashboardPage: React.FC = () => {
  const { user, activeCompany } = useAuth();
  const { openUploadModal } = useOutletContext<{ openUploadModal: () => void }>();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    if (!activeCompany) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await api.get(`/workspaces/${activeCompany.companyId}`);
      setStats(res.data.stats);
      setActivities(res.data.recentActivities);
    } catch (err: any) {
      console.error('Failed to load dashboard:', err);
      setError(err.response?.data?.error || 'Failed to load workspace overview');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    const handleUploadEvent = () => fetchDashboardData();
    window.addEventListener('trustvault_document_uploaded', handleUploadEvent);
    return () => window.removeEventListener('trustvault_document_uploaded', handleUploadEvent);
  }, [activeCompany?.companyId]);

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Loading workspace telemetry..." />;
  }

  if (error) {
    return (
      <div className="p-8 bg-rose-50 border border-rose-200 rounded-2xl text-center">
        <ShieldAlert className="w-8 h-8 text-rose-600 mx-auto mb-2" />
        <h3 className="text-base font-semibold text-rose-900">Failed to load workspace data</h3>
        <p className="text-xs text-rose-700 mt-1">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="mt-4 px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-xl hover:bg-rose-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const isAdmin = activeCompany?.role === 'ADMIN';
  const isViewer = activeCompany?.role === 'VIEWER';

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Banner */}
      <div className="bg-vault-surface rounded-2xl border border-vault-border p-6 sm:p-8 shadow-soft flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-vault-text">
              Welcome back, {user?.fullName?.split(' ')[0]}
            </h1>
            <Badge variant="primary">{activeCompany?.role}</Badge>
          </div>
          <p className="text-sm text-vault-muted mt-1">
            Current organization workspace: <span className="font-semibold text-vault-text">{activeCompany?.companyName}</span>
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={openUploadModal}
            disabled={isViewer}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-sm transition-all ${
              isViewer
                ? 'bg-beige-200 text-vault-muted cursor-not-allowed opacity-60'
                : 'bg-vault-accent hover:bg-vault-accentHover text-white'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload File</span>
          </button>
          <Link
            to="/documents"
            className="flex items-center space-x-2 px-4 py-2.5 bg-vault-surface hover:bg-beige-50 border border-vault-border rounded-xl text-sm font-medium text-vault-text shadow-xs transition-colors"
          >
            <span>View All Docs</span>
            <ArrowUpRight className="w-4 h-4 text-vault-muted" />
          </Link>
        </div>
      </div>

      {/* Metrics Cards (Real backend data) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Total Documents */}
        <div className="bg-vault-surface p-6 rounded-2xl border border-vault-border shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-vault-muted uppercase tracking-wider">
              Total Documents
            </span>
            <div className="w-9 h-9 rounded-xl bg-beige-100 flex items-center justify-center text-vault-accent border border-beige-200">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-vault-text tracking-tight">
              {stats?.totalDocuments ?? 0}
            </span>
            <span className="text-xs text-vault-muted">stored securely</span>
          </div>
        </div>

        {/* Shared Documents */}
        <div className="bg-vault-surface p-6 rounded-2xl border border-vault-border shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-vault-muted uppercase tracking-wider">
              Shared Documents
            </span>
            <div className="w-9 h-9 rounded-xl bg-beige-100 flex items-center justify-center text-vault-accent border border-beige-200">
              <Share2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-vault-text tracking-tight">
              {stats?.sharedDocumentsCount ?? 0}
            </span>
            <span className="text-xs text-vault-muted">with explicit user grants</span>
          </div>
        </div>

        {/* Workspace Members */}
        <div className="bg-vault-surface p-6 rounded-2xl border border-vault-border shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-vault-muted uppercase tracking-wider">
              Workspace Members
            </span>
            <div className="w-9 h-9 rounded-xl bg-beige-100 flex items-center justify-center text-vault-accent border border-beige-200">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-vault-text tracking-tight">
              {stats?.totalMembers ?? 0}
            </span>
            <span className="text-xs text-vault-muted">active users in tenant</span>
          </div>
        </div>
      </div>

      {/* Recent Activity Audit Table */}
      <div className="bg-vault-surface rounded-2xl border border-vault-border shadow-soft overflow-hidden">
        <div className="p-6 border-b border-beige-200 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <ScrollText className="w-5 h-5 text-vault-accent" />
            <h2 className="text-lg font-bold text-vault-text tracking-tight">Recent Security & Activity Trail</h2>
          </div>
          {isAdmin && (
            <Link
              to="/audit-logs"
              className="text-xs font-semibold text-vault-accent hover:underline flex items-center space-x-1"
            >
              <span>View Full Audit Log</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {activities.length === 0 ? (
          <div className="p-8 text-center text-vault-muted text-sm">
            No recent activity recorded for this workspace.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-beige-200 bg-beige-50/50 text-xs font-semibold text-vault-muted uppercase tracking-wider">
                  <th className="py-3 px-6">Timestamp</th>
                  <th className="py-3 px-6">Actor</th>
                  <th className="py-3 px-6">Action</th>
                  <th className="py-3 px-6">Target Document</th>
                  <th className="py-3 px-6">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-beige-200">
                {activities.map((item) => (
                  <tr key={item.id} className="hover:bg-beige-50/50 transition-colors">
                    <td className="py-3.5 px-6 text-xs text-vault-muted whitespace-nowrap">
                      <div className="flex items-center space-x-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{new Date(item.createdAt).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-6 font-medium text-vault-text whitespace-nowrap">
                      {item.actor ? item.actor.name : 'System / Unauth'}
                    </td>
                    <td className="py-3.5 px-6 whitespace-nowrap">
                      <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-beige-100 text-brown-800 border border-beige-200">
                        {item.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-vault-muted max-w-xs truncate">
                      {item.document ? item.document.name : '—'}
                    </td>
                    <td className="py-3.5 px-6 whitespace-nowrap">
                      {item.outcome === 'SUCCESS' ? (
                        <span className="inline-flex items-center space-x-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Success</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Denied</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  ScrollText,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  Search,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Badge } from '../components/common/Badge';

interface AuditLogRecord {
  id: string;
  action: string;
  outcome: 'SUCCESS' | 'DENIED';
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  actor: { id: string; name: string; email: string } | null;
  document: { id: string; name: string; originalName: string } | null;
  metadata: Record<string, any> | null;
}

export const AuditLogsPage: React.FC = () => {
  const { activeCompany } = useAuth();

  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const fetchLogs = async () => {
    if (!activeCompany) return;
    setIsLoading(true);

    try {
      const params: any = { page, limit: 20 };
      if (actionFilter) params.action = actionFilter;
      if (outcomeFilter) params.outcome = outcomeFilter;

      const res = await api.get('/audit-logs', { params });
      setLogs(res.data.logs);
      setTotalCount(res.data.pagination.total);
      setTotalPages(res.data.pagination.totalPages);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [activeCompany?.companyId, page, actionFilter, outcomeFilter]);

  const toggleExpand = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  const isAdmin = activeCompany?.role === 'ADMIN';

  if (!isAdmin) {
    return (
      <div className="p-8 bg-rose-50 border border-rose-200 rounded-2xl text-center max-w-xl mx-auto mt-12">
        <ShieldAlert className="w-10 h-10 text-rose-600 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-rose-900">Restricted Administration View</h3>
        <p className="text-sm text-rose-700 mt-1">
          Access to workspace audit trails is strictly restricted to Company Administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-vault-text">
              Workspace Audit Trail
            </h1>
            <Badge variant="success">Tamper-Proof</Badge>
          </div>
          <p className="text-sm text-vault-muted mt-1">
            Immutable, server-verified security log for {activeCompany?.companyName}.
          </p>
        </div>

        <div className="text-xs text-vault-muted bg-vault-surface px-3 py-1.5 rounded-xl border border-vault-border">
          Total Recorded Events: <span className="font-bold text-vault-text">{totalCount}</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-vault-surface rounded-2xl border border-vault-border p-4 shadow-soft flex flex-wrap items-center gap-4">
        {/* Outcome Filter */}
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-vault-muted" />
          <span className="text-xs font-semibold text-vault-text">Outcome:</span>
          <select
            value={outcomeFilter}
            onChange={(e) => {
              setOutcomeFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 bg-beige-50 border border-beige-300 rounded-xl text-xs text-vault-text focus:outline-none focus:ring-2 focus:ring-vault-accent"
          >
            <option value="">All Outcomes</option>
            <option value="SUCCESS">SUCCESS only</option>
            <option value="DENIED">DENIED only</option>
          </select>
        </div>

        {/* Action Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-vault-text">Action:</span>
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 bg-beige-50 border border-beige-300 rounded-xl text-xs text-vault-text focus:outline-none focus:ring-2 focus:ring-vault-accent"
          >
            <option value="">All Actions</option>
            <option value="DOC_UPLOAD">DOC_UPLOAD</option>
            <option value="DOC_VIEW">DOC_VIEW</option>
            <option value="DOC_DOWNLOAD">DOC_DOWNLOAD</option>
            <option value="DOC_SHARE">DOC_SHARE</option>
            <option value="DOC_REVOKE">DOC_REVOKE</option>
            <option value="DOC_DELETE">DOC_DELETE</option>
            <option value="CROSS_TENANT_DOCUMENT_ACCESS">CROSS_TENANT_DOCUMENT_ACCESS</option>
            <option value="PRIVILEGE_ESCALATION_ATTEMPT">PRIVILEGE_ESCALATION_ATTEMPT</option>
            <option value="AUTH_LOGIN_SUCCESS">AUTH_LOGIN_SUCCESS</option>
            <option value="AUTH_LOGIN_FAILED">AUTH_LOGIN_FAILED</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      {isLoading ? (
        <LoadingSpinner size="lg" text="Querying immutable audit logs..." />
      ) : logs.length === 0 ? (
        <div className="p-12 text-center bg-vault-surface rounded-2xl border border-vault-border shadow-soft">
          <ScrollText className="w-8 h-8 text-vault-muted mx-auto mb-2" />
          <p className="text-sm font-semibold text-vault-text">No matching audit events found</p>
        </div>
      ) : (
        <div className="bg-vault-surface rounded-2xl border border-vault-border shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-beige-200 bg-beige-50/50 text-xs font-semibold text-vault-muted uppercase tracking-wider">
                  <th className="py-3.5 px-6">Timestamp</th>
                  <th className="py-3.5 px-6">Actor</th>
                  <th className="py-3.5 px-6">Security Action</th>
                  <th className="py-3.5 px-6">Target Resource</th>
                  <th className="py-3.5 px-6">Outcome</th>
                  <th className="py-3.5 px-6 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-beige-200">
                {logs.map((log) => {
                  const isExpanded = expandedLogId === log.id;

                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        onClick={() => toggleExpand(log.id)}
                        className="hover:bg-beige-50/40 cursor-pointer transition-colors"
                      >
                        {/* Timestamp */}
                        <td className="py-3.5 px-6 text-xs text-vault-muted whitespace-nowrap">
                          <div className="flex items-center space-x-1.5">
                            <Clock className="w-3.5 h-3.5 text-vault-muted" />
                            <span>{new Date(log.createdAt).toLocaleString()}</span>
                          </div>
                        </td>

                        {/* Actor */}
                        <td className="py-3.5 px-6 whitespace-nowrap">
                          {log.actor ? (
                            <div>
                              <span className="font-semibold text-vault-text block">
                                {log.actor.name}
                              </span>
                              <span className="text-[11px] text-vault-muted">{log.actor.email}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-vault-muted italic">Unauthenticated</span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-6 whitespace-nowrap">
                          <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-beige-100 text-brown-800 border border-beige-200 font-semibold">
                            {log.action}
                          </span>
                        </td>

                        {/* Resource */}
                        <td className="py-3.5 px-6 text-xs text-vault-muted max-w-xs truncate">
                          {log.document ? log.document.name : '—'}
                        </td>

                        {/* Outcome */}
                        <td className="py-3.5 px-6 whitespace-nowrap">
                          {log.outcome === 'SUCCESS' ? (
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

                        {/* Details Toggle */}
                        <td className="py-3.5 px-6 text-right whitespace-nowrap text-vault-muted">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 ml-auto" />
                          ) : (
                            <ChevronRight className="w-4 h-4 ml-auto" />
                          )}
                        </td>
                      </tr>

                      {/* Expanded Metadata JSON Row */}
                      {isExpanded && (
                        <tr className="bg-beige-50/70 border-b border-beige-200">
                          <td colSpan={6} className="p-4 px-6">
                            <div className="space-y-2 text-xs">
                              <div className="flex items-center space-x-4 text-vault-muted">
                                <span>
                                  <strong>Event ID:</strong> {log.id}
                                </span>
                                <span>
                                  <strong>IP Address:</strong> {log.ipAddress || '127.0.0.1'}
                                </span>
                              </div>
                              {log.metadata && (
                                <div>
                                  <span className="font-semibold text-vault-text block mb-1">
                                    Contextual Event Metadata:
                                  </span>
                                  <pre className="p-3 bg-white border border-beige-200 rounded-xl text-[11px] font-mono text-brown-900 overflow-x-auto whitespace-pre-wrap">
                                    {JSON.stringify(log.metadata, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-beige-200 flex items-center justify-between">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-beige-100 hover:bg-beige-200 disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              <span className="text-xs text-vault-muted">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-beige-100 hover:bg-beige-200 disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

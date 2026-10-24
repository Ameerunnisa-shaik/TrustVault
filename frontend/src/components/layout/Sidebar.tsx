import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  FileText,
  Users,
  ScrollText,
  User,
  Shield,
  Upload,
} from 'lucide-react';

interface SidebarProps {
  onOpenUpload?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenUpload }) => {
  const { activeCompany } = useAuth();
  const isAdmin = activeCompany?.role === 'ADMIN';
  const isViewer = activeCompany?.role === 'VIEWER';

  const navItems = [
    { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { name: 'Documents', to: '/documents', icon: FileText },
    { name: 'Members & Roles', to: '/members', icon: Users },
    { name: 'Audit Trail', to: '/audit-logs', icon: ScrollText, adminOnly: true },
    { name: 'Account Profile', to: '/profile', icon: User },
  ];

  return (
    <aside className="w-64 bg-vault-surface border-r border-vault-border flex flex-col shrink-0 min-h-[calc(100vh-4rem)]">
      {/* Upload Action Button */}
      <div className="p-4 border-b border-beige-200">
        <button
          onClick={onOpenUpload}
          disabled={isViewer}
          className={`w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl font-medium text-sm shadow-sm transition-all ${
            isViewer
              ? 'bg-beige-200 text-vault-muted cursor-not-allowed opacity-60'
              : 'bg-vault-accent hover:bg-vault-accentHover text-white'
          }`}
          title={isViewer ? 'Viewers cannot upload documents' : 'Upload new document'}
        >
          <Upload className="w-4 h-4" />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Nav Navigation Links */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          if (item.adminOnly && !isAdmin) return null;
          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-beige-100 text-brown-900 font-semibold border-l-4 border-vault-accent shadow-xs'
                    : 'text-vault-muted hover:text-vault-text hover:bg-beige-50'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Workspace Role Badge & Security Guarantee */}
      {activeCompany && (
        <div className="p-4 m-3 bg-cream-100 border border-beige-300 rounded-2xl">
          <div className="flex items-center space-x-2 text-xs font-semibold text-brown-800">
            <Shield className="w-4 h-4 text-vault-accent" />
            <span>Workspace Isolation</span>
          </div>
          <p className="text-[11px] text-vault-muted mt-1 leading-snug">
            Current role: <span className="font-semibold text-vault-text">{activeCompany.role}</span>
          </p>
          <div className="mt-2 text-[10px] text-vault-muted/80 bg-beige-200/50 p-1.5 rounded-lg border border-beige-300/60">
            Tenant ID: <span className="font-mono">{activeCompany.companyId.slice(0, 14)}...</span>
          </div>
        </div>
      )}
    </aside>
  );
};

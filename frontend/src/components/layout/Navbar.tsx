import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, ChevronDown, Building2, UserCircle, LogOut, Check } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, memberships, activeCompany, switchCompany, logout } = useAuth();
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-vault-surface/90 backdrop-blur-md border-b border-vault-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand & Active Workspace */}
        <div className="flex items-center space-x-6">
          <Link to="/dashboard" className="flex items-center space-x-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-vault-accent text-white flex items-center justify-center shadow-sm group-hover:bg-vault-accentHover transition-colors">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-vault-text">TrustVault</span>
              <span className="text-[10px] uppercase font-semibold text-vault-accent tracking-widest -mt-1">
                Zero Trust
              </span>
            </div>
          </Link>

          {/* Workspace Switcher */}
          {activeCompany && (
            <div className="relative">
              <button
                onClick={() => {
                  setIsCompanyDropdownOpen(!isCompanyDropdownOpen);
                  setIsUserMenuOpen(false);
                }}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-beige-100 hover:bg-beige-200/80 border border-beige-300 text-sm font-medium text-vault-text transition-all"
              >
                <Building2 className="w-4 h-4 text-vault-accent" />
                <span className="max-w-[140px] truncate">{activeCompany.companyName}</span>
                <ChevronDown className="w-3.5 h-3.5 text-vault-muted" />
              </button>

              {isCompanyDropdownOpen && (
                <div className="absolute left-0 mt-2 w-64 bg-vault-surface rounded-2xl shadow-card border border-vault-border p-2 z-50 animate-scale-up">
                  <div className="px-3 py-1.5 text-xs font-semibold text-vault-muted uppercase tracking-wider">
                    Workspaces ({memberships.length})
                  </div>
                  <div className="space-y-1 mt-1">
                    {memberships.map((m) => {
                      const isSelected = m.companyId === activeCompany.companyId;
                      return (
                        <button
                          key={m.companyId}
                          onClick={() => {
                            switchCompany(m.companyId);
                            setIsCompanyDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                            isSelected
                              ? 'bg-beige-200 text-brown-900 font-semibold'
                              : 'text-vault-text hover:bg-beige-100'
                          }`}
                        >
                          <div className="flex flex-col text-left truncate mr-2">
                            <span className="truncate">{m.companyName}</span>
                            <span className="text-[11px] text-vault-muted capitalize">Role: {m.role}</span>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-vault-accent shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: User Profile Menu */}
        <div className="relative">
          <button
            onClick={() => {
              setIsUserMenuOpen(!isUserMenuOpen);
              setIsCompanyDropdownOpen(false);
            }}
            className="flex items-center space-x-3 p-1.5 rounded-xl hover:bg-beige-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-beige-200 border border-beige-300 flex items-center justify-center text-brown-800 font-semibold text-sm">
              {user?.fullName ? user.fullName[0].toUpperCase() : 'U'}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-sm font-semibold text-vault-text leading-tight">{user?.fullName}</span>
              <span className="text-xs text-vault-muted leading-tight">{user?.email}</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-vault-muted hidden sm:block" />
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-vault-surface rounded-2xl shadow-card border border-vault-border p-2 z-50 animate-scale-up">
              <div className="px-3 py-2 border-b border-beige-200">
                <p className="text-xs text-vault-muted">Signed in as</p>
                <p className="text-sm font-semibold text-vault-text truncate">{user?.email}</p>
                {activeCompany && (
                  <span className="inline-block mt-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-beige-200 text-brown-800">
                    {activeCompany.role}
                  </span>
                )}
              </div>

              <div className="space-y-1 mt-1">
                <Link
                  to="/profile"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="flex items-center space-x-2.5 px-3 py-2 rounded-xl text-sm font-medium text-vault-text hover:bg-beige-100 transition-colors"
                >
                  <UserCircle className="w-4 h-4 text-vault-muted" />
                  <span>Account Profile</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-sm font-medium text-rose-700 hover:bg-rose-50 transition-colors"
                >
                  <LogOut className="w-4 h-4 text-rose-600" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

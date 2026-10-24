import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, ArrowLeft, Home } from 'lucide-react';

export const UnauthorizedPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-cream-100 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-3xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-700 mb-6 shadow-soft">
        <Lock className="w-8 h-8" />
      </div>

      <h1 className="text-4xl font-extrabold text-vault-text tracking-tight">403 — Access Denied</h1>
      <p className="mt-2 text-sm text-vault-muted max-w-md leading-relaxed">
        Your current workspace role or document grant does not authorize you to perform this action. This security event has been logged.
      </p>

      <div className="mt-8 flex items-center space-x-3">
        <Link
          to="/dashboard"
          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-vault-accent hover:bg-vault-accentHover text-white text-sm font-semibold rounded-xl shadow-sm transition-all"
        >
          <Home className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    </div>
  );
};

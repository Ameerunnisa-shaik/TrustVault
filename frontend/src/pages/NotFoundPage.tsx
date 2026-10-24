import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-cream-100 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-3xl bg-beige-200 border border-beige-300 flex items-center justify-center text-vault-accent mb-6 shadow-soft">
        <ShieldAlert className="w-8 h-8" />
      </div>

      <h1 className="text-4xl font-extrabold text-vault-text tracking-tight">404 — Page Not Found</h1>
      <p className="mt-2 text-sm text-vault-muted max-w-md leading-relaxed">
        The requested resource does not exist or has been relocated under a different workspace path.
      </p>

      <div className="mt-8 flex items-center space-x-3">
        <Link
          to="/dashboard"
          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-vault-accent hover:bg-vault-accentHover text-white text-sm font-semibold rounded-xl shadow-sm transition-all"
        >
          <Home className="w-4 h-4" />
          <span>Go to Dashboard</span>
        </Link>
        <Link
          to="/"
          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-vault-surface hover:bg-beige-50 border border-vault-border text-vault-text text-sm font-medium rounded-xl shadow-xs transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Home</span>
        </Link>
      </div>
    </div>
  );
};

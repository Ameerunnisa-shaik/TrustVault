import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  Layers,
  ScrollText,
  KeyRound,
  FileCheck,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-cream-100 flex flex-col text-vault-text selection:bg-beige-300">
      {/* Top Header */}
      <header className="border-b border-vault-border/80 bg-vault-surface/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-vault-accent text-white flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">TrustVault</span>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              to="/login"
              className="text-sm font-medium text-vault-muted hover:text-vault-text transition-colors px-3 py-1.5"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 bg-vault-accent hover:bg-vault-accentHover text-white text-sm font-medium rounded-xl shadow-sm transition-all"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-beige-200/80 border border-beige-300 text-brown-900 text-xs font-semibold tracking-wide mb-6">
          <Lock className="w-3.5 h-3.5 text-vault-accent" />
          <span>Zero-Trust Architecture & Multi-Tenant Isolation</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-vault-text leading-[1.15]">
          Confidential Document Sharing Built on <span className="text-vault-accent">Verifiable Trust</span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-vault-muted max-w-2xl mx-auto leading-relaxed">
          Enable enterprise teams to share classified files with cryptographically enforced tenant boundaries,
          explicit document-level permissions, and an immutable audit trail.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/register"
            className="w-full sm:w-auto px-6 py-3.5 bg-vault-accent hover:bg-vault-accentHover text-white font-medium rounded-xl shadow-card transition-all flex items-center justify-center space-x-2 group"
          >
            <span>Start Free Workspace</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link
            to="/login"
            className="w-full sm:w-auto px-6 py-3.5 bg-vault-surface hover:bg-beige-50 border border-vault-border text-vault-text font-medium rounded-xl shadow-soft transition-all"
          >
            Sign In with Demo Accounts
          </Link>
        </div>

        {/* Feature Badges */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs font-medium text-vault-muted">
          <span className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Strict Tenant Isolation</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Explicit User Grants & Revocation</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Private Storage Outside Web Root</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Immutable Security Audit Log</span>
          </span>
        </div>
      </section>

      {/* Architecture Highlights Grid */}
      <section className="py-16 bg-cream-50/70 border-y border-vault-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-vault-text">
              Four Pillars of TrustVault Security
            </h2>
            <p className="mt-3 text-sm text-vault-muted">
              Security is enforced at the database and backend authorization layers, not by relying on frontend route hiding.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Pillar 1 */}
            <div className="bg-vault-surface p-6 rounded-2xl border border-vault-border/80 shadow-soft">
              <div className="w-10 h-10 rounded-xl bg-beige-100 flex items-center justify-center text-vault-accent mb-4 border border-beige-200">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-vault-text">Multi-Tenant Isolation</h3>
              <p className="mt-2 text-xs text-vault-muted leading-relaxed">
                Every API call rigorously validates company membership. Cross-tenant tampering and IDOR attempts are rejected with 404/403 status codes.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="bg-vault-surface p-6 rounded-2xl border border-vault-border/80 shadow-soft">
              <div className="w-10 h-10 rounded-xl bg-beige-100 flex items-center justify-center text-vault-accent mb-4 border border-beige-200">
                <KeyRound className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-vault-text">Explicit Document Grants</h3>
              <p className="mt-2 text-xs text-vault-muted leading-relaxed">
                No automatic folder inheritances. Each user must have an active, unexpired, and unrevoked permission grant for each document they access.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="bg-vault-surface p-6 rounded-2xl border border-vault-border/80 shadow-soft">
              <div className="w-10 h-10 rounded-xl bg-beige-100 flex items-center justify-center text-vault-accent mb-4 border border-beige-200">
                <FileCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-vault-text">Private Storage Engine</h3>
              <p className="mt-2 text-xs text-vault-muted leading-relaxed">
                Confidential files are stored outside the web root with random UUID identifiers, SHA-256 integrity checksums, and path traversal protections.
              </p>
            </div>

            {/* Pillar 4 */}
            <div className="bg-vault-surface p-6 rounded-2xl border border-vault-border/80 shadow-soft">
              <div className="w-10 h-10 rounded-xl bg-beige-100 flex items-center justify-center text-vault-accent mb-4 border border-beige-200">
                <ScrollText className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-vault-text">Tamper-Proof Audit Trail</h3>
              <p className="mt-2 text-xs text-vault-muted leading-relaxed">
                All logins, uploads, shares, downloads, and denied access attempts are logged server-side with actor, timestamp, IP, and outcome.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 text-center text-xs text-vault-muted">
        <p>TrustVault © 2026. Secure Multi-Tenant Document Sharing Platform.</p>
      </footer>
    </div>
  );
};

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Lock, Mail, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || 'Authentication failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password123!');
  };

  return (
    <div className="min-h-screen bg-cream-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center space-x-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-vault-accent text-white flex items-center justify-center shadow-sm group-hover:bg-vault-accentHover transition-colors">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-vault-text">TrustVault</span>
        </Link>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-vault-text">
          Sign in to your Workspace
        </h2>
        <p className="mt-1.5 text-sm text-vault-muted">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-vault-accent hover:underline">
            Register here
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-vault-surface py-8 px-6 sm:px-10 rounded-2xl shadow-card border border-vault-border">
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-vault-text uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-vault-muted">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-beige-50/60 border border-beige-300 rounded-xl text-sm text-vault-text placeholder-vault-muted/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-vault-accent focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-vault-text uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-vault-muted">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-beige-50/60 border border-beige-300 rounded-xl text-sm text-vault-text placeholder-vault-muted/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-vault-accent focus:border-transparent transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 flex items-center justify-center space-x-2 py-2.5 px-4 bg-vault-accent hover:bg-vault-accentHover text-white text-sm font-semibold rounded-xl shadow-sm transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Accounts Switcher */}
          <div className="mt-8 pt-6 border-t border-beige-200">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-brown-900 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-vault-accent" />
              <span>Demo Accounts (Click to Fill):</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleDemoFill('alice@acme.com')}
                className="p-2 rounded-lg bg-beige-100 hover:bg-beige-200/80 text-left transition-colors border border-beige-300/80"
              >
                <div className="font-semibold text-vault-text">Alice Walker</div>
                <div className="text-[10px] text-vault-muted">Acme Admin</div>
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('bob@acme.com')}
                className="p-2 rounded-lg bg-beige-100 hover:bg-beige-200/80 text-left transition-colors border border-beige-300/80"
              >
                <div className="font-semibold text-vault-text">Bob Martinez</div>
                <div className="text-[10px] text-vault-muted">Acme Member</div>
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('carol@acme.com')}
                className="p-2 rounded-lg bg-beige-100 hover:bg-beige-200/80 text-left transition-colors border border-beige-300/80"
              >
                <div className="font-semibold text-vault-text">Carol Danvers</div>
                <div className="text-[10px] text-vault-muted">Acme Viewer</div>
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('david@cyberdyne.com')}
                className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-left transition-colors border border-rose-200"
              >
                <div className="font-semibold text-rose-900">David Vance</div>
                <div className="text-[10px] text-rose-700">CyberDyne Tenant</div>
              </button>
            </div>
            <p className="mt-2 text-[10px] text-vault-muted text-center">
              Password for all seeded accounts: <code className="font-mono bg-beige-100 px-1 py-0.5 rounded">Password123!</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

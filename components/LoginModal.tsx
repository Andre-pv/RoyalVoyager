'use client';

import { useState } from 'react';
import { X, Mail, Lock, Anchor, AlertCircle } from 'lucide-react';
import { signIn, getSession } from 'next-auth/react';

interface LoginModalProps {
  onClose: () => void;
}

export default function LoginModal({ onClose }: LoginModalProps) {
  const [email, setEmail]       = useState('admin@royalvoyager.com');
  const [password, setPassword] = useState('Admin@2026');
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else {
        const session = await getSession() as any;
        onClose();
        
        // Redirect based on role: Admins to /admin, others to / (Hero/Home page)
        if (session?.user?.role === 'admin') {
          window.location.href = '/admin';
        } else {
          window.location.href = '/';
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-slate-700/50 shadow-2xl p-8 flex flex-col gap-6 bg-slate-900/95 backdrop-blur-xl animate-in fade-in zoom-in duration-200"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.25)]">
            <Anchor size={22} className="text-blue-400" />
          </div>
          <div>
            <h2 className="text-white font-extrabold text-xl tracking-tight">Welcome Back</h2>
            <p className="text-slate-500 text-sm mt-1">Sign in to manage your royal voyages.</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl flex items-start gap-2.5 text-sm animate-in slide-in-from-top-1">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSignIn} className="flex flex-col gap-4">
          <div className="relative">
            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              required
              className="w-full bg-slate-800/60 border border-slate-700 text-slate-100 placeholder-slate-500 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
            />
          </div>

          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="w-full bg-slate-800/60 border border-slate-700 text-slate-100 placeholder-slate-500 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
            />
          </div>

          <div className="text-right">
            <button type="button" className="text-blue-400 text-xs font-semibold hover:text-blue-300 transition-colors">
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-extrabold py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] active:scale-[0.98]"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-800" />
          <span className="text-slate-600 text-xs font-bold uppercase tracking-widest">Demo Credentials</span>
          <div className="flex-1 h-px bg-slate-800" />
        </div>

        <div className="grid grid-cols-2 gap-2">
            <button 
                type="button"
                onClick={() => { setEmail('admin@royalvoyager.com'); setPassword('Admin@2026'); }}
                className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg font-bold border border-slate-700 transition-all text-center"
            >
                ADMIN DEMO
            </button>
            <button 
                type="button"
                onClick={() => { setEmail('guest@royalvoyager.com'); setPassword('Guest@2026'); }}
                className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg font-bold border border-slate-700 transition-all text-center"
            >
                GUEST DEMO
            </button>
        </div>
      </div>
    </div>
  );
}

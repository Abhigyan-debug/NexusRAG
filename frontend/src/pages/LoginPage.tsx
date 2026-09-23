import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Brain, Mail, Lock, AlertCircle, ShieldCheck, ArrowLeft } from 'lucide-react';
import { authApi } from '../lib/api';
import { useAuthStore } from '../store';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [needsCode, setNeedsCode] = useState(false);
  const [useRecovery, setUseRecovery] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await authApi.login({ email, password, ...(needsCode ? { otp } : {}) });
      if (data.two_factor_required) {
        setNeedsCode(true);
        return;
      }
      setAuth(data.user, data.token);
      navigate('/dashboard');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { error?: string } } };
      if (axiosErr.response?.status === 429) {
        setError('Too many attempts. Please wait a minute and try again.');
      } else {
        setError(axiosErr.response?.data?.error || 'Login failed');
      }
      if (needsCode) setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const backToPassword = () => {
    setNeedsCode(false);
    setUseRecovery(false);
    setOtp('');
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-lg bg-nexus-gradient flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-xl">NexusRAG</span>
          </Link>
          <h1 className="font-display text-2xl font-bold text-nexus-heading">
            {needsCode ? 'Two-factor authentication' : 'Welcome back'}
          </h1>
          <p className="text-nexus-muted mt-2">
            {needsCode
              ? useRecovery
                ? 'Enter one of your recovery codes'
                : 'Enter the 6-digit code from your authenticator app'
              : 'Sign in to your knowledge workspace'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="nexus-panel nexus-panel-static p-8 space-y-5">
          {error && (
            <div role="alert" className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <AnimatePresence mode="wait" initial={false}>
            {needsCode ? (
              <motion.div
                key="code"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div>
                  <label htmlFor="otp" className="block text-sm text-nexus-muted mb-1.5">
                    {useRecovery ? 'Recovery code' : 'Authentication code'}
                  </label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nexus-muted" />
                    {useRecovery ? (
                      <input
                        id="otp"
                        key="recovery"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        className="nexus-input pl-10 font-mono tracking-wider"
                        placeholder="xxxx-xxxx-xxxx"
                        autoComplete="off"
                        autoFocus
                        required
                      />
                    ) : (
                      <input
                        id="otp"
                        key="totp"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="nexus-input pl-10 font-mono text-lg tracking-[0.5em]"
                        placeholder="000000"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        pattern="\d{6}"
                        maxLength={6}
                        autoFocus
                        required
                      />
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || (!useRecovery && otp.length !== 6)}
                  className="nexus-btn-primary w-full py-3"
                >
                  {loading ? 'Verifying...' : 'Verify and sign in'}
                </button>

                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={backToPassword}
                    className="flex items-center gap-1 text-nexus-muted hover:text-nexus-heading transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUseRecovery((v) => !v);
                      setOtp('');
                      setError('');
                    }}
                    className="text-nexus-accent-light hover:underline"
                  >
                    {useRecovery ? 'Use authenticator app' : 'Use a recovery code'}
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="password"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-5"
              >
                <div>
                  <label htmlFor="email" className="block text-sm text-nexus-muted mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nexus-muted" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="nexus-input pl-10"
                      placeholder="you@company.com"
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm text-nexus-muted mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nexus-muted" />
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="nexus-input pl-10"
                      placeholder="••••••••"
                      autoComplete="current-password"
                      required
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="nexus-btn-primary w-full py-3">
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </form>

        {!needsCode && (
          <p className="text-center text-nexus-muted text-sm mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-nexus-accent-light hover:underline">
              Create one
            </Link>
          </p>
        )}
      </motion.div>
    </div>
  );
}

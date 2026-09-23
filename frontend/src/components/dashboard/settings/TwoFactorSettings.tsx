import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import {
  ShieldCheck, ShieldOff, Copy, Check, Download, KeyRound, Loader2, AlertCircle, RefreshCw,
} from 'lucide-react';
import { authApi } from '../../../lib/api';
import { useAuthStore } from '../../../store';

type Step = 'idle' | 'setup' | 'codes' | 'disable' | 'regenerate';

function errorMessage(err: unknown, fallback: string) {
  const e = err as { response?: { status?: number; data?: { error?: string } } };
  if (e.response?.status === 429) return 'Too many attempts. Please wait a while and try again.';
  return e.response?.data?.error || fallback;
}

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard unavailable */
        }
      }}
      className="flex items-center gap-1.5 text-xs text-nexus-muted hover:text-nexus-heading transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied' : label}
    </button>
  );
}

function CodeInput({ value, onChange, allowRecovery = false }: { value: string; onChange: (v: string) => void; allowRecovery?: boolean }) {
  return (
    <input
      value={value}
      onChange={(e) =>
        onChange(allowRecovery ? e.target.value : e.target.value.replace(/\D/g, '').slice(0, 6))
      }
      className={`nexus-input font-mono text-center ${allowRecovery ? 'tracking-wider' : 'text-lg tracking-[0.4em]'}`}
      placeholder={allowRecovery ? '6-digit or recovery code' : '000000'}
      inputMode={allowRecovery ? 'text' : 'numeric'}
      autoComplete="one-time-code"
      autoFocus
      required
    />
  );
}

function RecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const text = codes.join('\n');
  const download = () => {
    const blob = new Blob(
      [`NexusRAG recovery codes\nGenerated ${new Date().toLocaleString()}\n\nEach code can be used once.\n\n${text}\n`],
      { type: 'text/plain' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nexusrag-recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-400/10 border border-yellow-400/20 text-sm">
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-yellow-400" />
        <p className="text-nexus-text">
          Save these recovery codes somewhere safe. If you lose your phone, they are the only way back into your account.
          Each code works once, and <strong>they won't be shown again</strong>.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 p-4 rounded-lg bg-nexus-bg border border-nexus-border font-mono text-sm">
        {codes.map((c) => (
          <span key={c} className="text-nexus-heading tracking-wider text-center py-1">{c}</span>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <CopyButton text={text} label="Copy all" />
          <button
            type="button"
            onClick={download}
            className="flex items-center gap-1.5 text-xs text-nexus-muted hover:text-nexus-heading transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Download
          </button>
        </div>
        <button onClick={onDone} className="nexus-btn-primary py-2 px-5 text-sm">
          I've saved my codes
        </button>
      </div>
    </div>
  );
}

export default function TwoFactorSettings() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const enabled = !!user?.two_factor_enabled;

  const [step, setStep] = useState<Step>('idle');
  const [setup, setSetup] = useState<{ secret: string; otpauth_uri: string } | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setStep('idle');
    setSetup(null);
    setCode('');
    setPassword('');
    setError('');
  };

  const run = async (fn: () => Promise<void>, fallback: string) => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(errorMessage(err, fallback));
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  const startSetup = () =>
    run(async () => {
      const { data } = await authApi.twoFactorSetup();
      setSetup(data);
      setStep('setup');
    }, 'Could not start setup');

  const confirmSetup = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      const { data } = await authApi.twoFactorEnable(code);
      setUser(data.user);
      setRecoveryCodes(data.recovery_codes);
      setCode('');
      setStep('codes');
    }, 'That code is not valid');
  };

  const disable = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      const { data } = await authApi.twoFactorDisable(password, code);
      setUser(data.user);
      reset();
    }, 'Could not turn off two-factor authentication');
  };

  const regenerate = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      const { data } = await authApi.regenerateRecoveryCodes(code);
      setUser(data.user);
      setRecoveryCodes(data.recovery_codes);
      setCode('');
      setStep('codes');
    }, 'Could not generate new codes');
  };

  const errorBox = error && (
    <div role="alert" className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
      <AlertCircle className="w-4 h-4 shrink-0" />
      {error}
    </div>
  );

  return (
    <div className="nexus-panel nexus-panel-static p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
              enabled ? 'bg-green-500/10 text-green-400' : 'bg-nexus-accent/10 text-nexus-accent-light'
            }`}
          >
            {enabled ? <ShieldCheck className="w-5 h-5" /> : <KeyRound className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-nexus-heading">Two-factor authentication</h4>
              <span
                className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                  enabled ? 'bg-green-500/10 text-green-400' : 'bg-nexus-overlay/5 text-nexus-muted'
                }`}
              >
                {enabled ? 'On' : 'Off'}
              </span>
            </div>
            <p className="text-sm text-nexus-muted mt-1">
              {enabled
                ? `Signing in requires a code from your authenticator app. ${user?.recovery_codes_remaining ?? 0} recovery codes left.`
                : 'Protect your account with a code from an authenticator app such as Google Authenticator, 1Password or Authy.'}
            </p>
          </div>
        </div>
        {step === 'idle' && !enabled && (
          <button onClick={startSetup} disabled={busy} className="nexus-btn-primary py-2 px-4 text-sm shrink-0 flex items-center gap-2">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Set up
          </button>
        )}
      </div>

      {step === 'idle' && errorBox && <div className="mt-4">{errorBox}</div>}

      {step === 'idle' && enabled && (
        <div className="flex flex-wrap gap-3 mt-5 pt-5 border-t border-nexus-border">
          <button
            onClick={() => { setError(''); setStep('regenerate'); }}
            className="nexus-btn-secondary py-2 px-4 text-sm flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> New recovery codes
          </button>
          <button
            onClick={() => { setError(''); setStep('disable'); }}
            className="px-4 py-2 text-sm rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
          >
            <ShieldOff className="w-4 h-4" /> Turn off
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {step === 'setup' && setup && (
          <motion.form
            key="setup"
            onSubmit={confirmSetup}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-5 pt-5 border-t border-nexus-border grid md:grid-cols-[auto_1fr] gap-6">
              <div className="flex flex-col items-center gap-2">
                {/* Always dark-on-white so every phone camera can read it */}
                <div className="p-3 bg-white rounded-xl border border-nexus-border">
                  <QRCodeSVG value={setup.otpauth_uri} size={168} level="M" />
                </div>
                <span className="text-xs text-nexus-muted">Scan with your app</span>
              </div>
              <div className="space-y-4">
                <ol className="text-sm text-nexus-text space-y-1 list-decimal list-inside">
                  <li>Open your authenticator app and add an account.</li>
                  <li>Scan the QR code, or enter the key below.</li>
                  <li>Type the 6-digit code the app shows.</li>
                </ol>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-nexus-muted">Setup key</span>
                    <CopyButton text={setup.secret} />
                  </div>
                  <code className="block p-2.5 rounded-lg bg-nexus-bg border border-nexus-border font-mono text-xs text-nexus-heading break-all tracking-wider">
                    {setup.secret.match(/.{1,4}/g)?.join(' ')}
                  </code>
                </div>
                {errorBox}
                <div className="flex gap-3">
                  <CodeInput value={code} onChange={setCode} />
                  <button type="submit" disabled={busy || code.length !== 6} className="nexus-btn-primary px-5 shrink-0 flex items-center gap-2">
                    {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                    Verify
                  </button>
                </div>
                <button type="button" onClick={reset} className="text-sm text-nexus-muted hover:text-nexus-heading transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </motion.form>
        )}

        {step === 'codes' && (
          <motion.div
            key="codes"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-5 pt-5 border-t border-nexus-border">
              <RecoveryCodes codes={recoveryCodes} onDone={() => { setRecoveryCodes([]); reset(); }} />
            </div>
          </motion.div>
        )}

        {(step === 'disable' || step === 'regenerate') && (
          <motion.form
            key={step}
            onSubmit={step === 'disable' ? disable : regenerate}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-5 pt-5 border-t border-nexus-border space-y-4 max-w-md">
              <p className="text-sm text-nexus-text">
                {step === 'disable'
                  ? 'Confirm with your password and a code from your authenticator app (or a recovery code).'
                  : 'Enter a code from your authenticator app. Your old recovery codes will stop working.'}
              </p>
              {errorBox}
              {step === 'disable' && (
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="nexus-input"
                  placeholder="Password"
                  autoComplete="current-password"
                  required
                />
              )}
              <CodeInput value={code} onChange={setCode} allowRecovery={step === 'disable'} />
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={busy || !code}
                  className={
                    step === 'disable'
                      ? 'px-5 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-colors disabled:opacity-50 flex items-center gap-2'
                      : 'nexus-btn-primary flex items-center gap-2'
                  }
                >
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                  {step === 'disable' ? 'Turn off 2FA' : 'Generate codes'}
                </button>
                <button type="button" onClick={reset} className="nexus-btn-secondary">
                  Cancel
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

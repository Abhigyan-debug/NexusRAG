import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  User, Lock, Palette, Cpu, Key, Shield, Clock, Download, Trash2,
  AlertCircle, ChevronRight, Save
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore, useAppStore } from '../../store';
import { authApi } from '../../lib/api';
import AppearanceSettings from './settings/AppearanceSettings';
import TwoFactorSettings from './settings/TwoFactorSettings';
import SessionSettings from './settings/SessionSettings';

export default function SettingsPanel() {
  const { user, setUser, logout } = useAuthStore();
  const queryClient = useQueryClient();
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const { apiKey, setApiKey, aiModel, setAiModel } = useAppStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [name, setName] = useState(user?.name || '');
  const [tempApiKey, setTempApiKey] = useState(apiKey);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });

  const tabs = [
    { id: 'profile', icon: User, label: 'Profile Settings' },
    { id: 'password', icon: Lock, label: 'Change Password' },
    { id: 'theme', icon: Palette, label: 'Theme Preferences' },
    { id: 'ai', icon: Cpu, label: 'AI Model Selection' },
    { id: 'api', icon: Key, label: 'API Key Management' },
    { id: 'security', icon: Shield, label: 'Account Security' },
    { id: 'sessions', icon: Clock, label: 'Session Management' },
    { id: 'export', icon: Download, label: 'Data Export' },
    { id: 'delete', icon: Trash2, label: 'Delete Account', danger: true },
  ];

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authApi.updateProfile({ name });
      setUser({ ...user, ...data });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
      setMessage('Profile updated successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error(error);
      setMessage('Failed to update profile');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveApiKey = () => {
    setApiKey(tempApiKey);
    setMessage('API Key saved successfully');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new !== passwordForm.confirm) {
      setMessage('New passwords do not match');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    setLoading(true);
    try {
      const { data } = await authApi.changePassword({
        current_password: passwordForm.current,
        new_password: passwordForm.new,
      });
      setMessage(
        data.sessions_revoked
          ? `Password changed. ${data.sessions_revoked} other device${data.sessions_revoked === 1 ? ' was' : 's were'} signed out.`
          : 'Password changed successfully'
      );
      queryClient.invalidateQueries({ queryKey: ['activity'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setPasswordForm({ current: '', new: '', confirm: '' });
    } catch (error: any) {
      setMessage(error?.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.confirm('Permanently delete your account and all your data? This cannot be undone.')) return;
    setLoading(true);
    setDeleteError('');
    try {
      await authApi.deleteAccount(deletePassword);
      logout();
    } catch (error: any) {
      setDeleteError(error?.response?.data?.error || 'Failed to delete account');
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify({ user, preferences: { aiModel, apiKey: '***' } }, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `nexus-data-${new Date().toISOString().slice(0,10)}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="flex h-full">
      {/* Settings Sidebar */}
      <div className="w-64 border-r border-nexus-border/50 p-4 overflow-y-auto">
        <h2 className="text-sm font-semibold text-nexus-muted mb-4 px-2 uppercase tracking-wider">Settings</h2>
        <nav className="space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                  activeTab === tab.id
                    ? tab.danger 
                      ? 'bg-red-500/10 text-red-500' 
                      : 'bg-nexus-accent/10 text-nexus-accent-light'
                    : tab.danger
                      ? 'text-red-400 hover:bg-red-500/5'
                      : 'text-nexus-text hover:bg-nexus-overlay/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </div>
                <ChevronRight className={`w-4 h-4 ${activeTab === tab.id ? 'opacity-100' : 'opacity-0'}`} />
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-3xl">
          {activeTab === 'profile' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-nexus-heading mb-2">Profile Settings</h3>
                <p className="text-nexus-muted">Update your personal information and email preferences.</p>
              </div>
              
              <form onSubmit={handleUpdateProfile} className="nexus-panel nexus-panel-static p-6 space-y-6">
                {message && (
                  <div className="p-3 bg-nexus-accent/10 border border-nexus-accent/20 rounded-lg text-nexus-accent-light text-sm">
                    {message}
                  </div>
                )}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-nexus-muted mb-1.5">Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="nexus-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-nexus-muted mb-1.5">Email Address</label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="nexus-input w-full opacity-50 cursor-not-allowed"
                    />
                    <p className="text-xs text-nexus-muted mt-1">Email cannot be changed.</p>
                  </div>
                </div>
                <div className="flex justify-end pt-4 border-t border-nexus-border/50">
                  <button type="submit" disabled={loading} className="nexus-btn-primary flex items-center gap-2 py-2 px-6">
                    <Save className="w-4 h-4" />
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {activeTab === 'theme' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-nexus-heading mb-2">Theme Preferences</h3>
                <p className="text-nexus-muted">Choose how NexusRAG looks. Your choice is saved on this device.</p>
              </div>
              <AppearanceSettings />
            </motion.div>
          )}

          {activeTab === 'ai' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-nexus-heading mb-2">AI Model Selection</h3>
                <p className="text-nexus-muted">Choose the language model for your workspace. (Make sure you provide the corresponding API Key in the API Key Management tab)</p>
              </div>
              <div className="nexus-panel nexus-panel-static p-6 space-y-4">
                {[
                  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', tag: 'Recommended' },
                  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', tag: 'High Performance' },
                  { id: 'grok-2', name: 'Grok 2', tag: 'xAI' },
                  { id: 'grok-beta', name: 'Grok Beta', tag: 'xAI' }
                ].map((model) => (
                  <label key={model.id} className="flex items-center justify-between p-4 rounded-lg border border-nexus-border/50 hover:bg-nexus-overlay/5 cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      <input 
                        type="radio" 
                        name="model" 
                        checked={aiModel === model.id}
                        onChange={() => setAiModel(model.id)}
                        className="text-nexus-accent" 
                      />
                      <span className="font-medium text-nexus-heading">{model.name}</span>
                    </div>
                    {model.tag && <span className="text-xs bg-nexus-accent/20 text-nexus-accent-light px-2 py-1 rounded">{model.tag}</span>}
                  </label>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'api' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-nexus-heading mb-2">API Key Management</h3>
                <p className="text-nexus-muted">Manage your API keys for Gemini or Grok.</p>
              </div>
              <div className="nexus-panel nexus-panel-static p-6 space-y-6">
                {message && (
                  <div className="p-3 bg-nexus-accent/10 border border-nexus-accent/20 rounded-lg text-nexus-accent-light text-sm">
                    {message}
                  </div>
                )}
                <div>
                  <label className="block text-sm text-nexus-muted mb-1.5">Your API Key</label>
                  <input
                    type="password"
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                    placeholder="Enter your Gemini or Grok API Key"
                    className="nexus-input w-full font-mono"
                  />
                  <p className="text-xs text-nexus-muted mt-2">
                    Your key is stored locally in your browser and sent securely to your backend for generation.
                  </p>
                </div>
                <div className="flex justify-end pt-4 border-t border-nexus-border/50">
                  <button onClick={handleSaveApiKey} className="nexus-btn-primary flex items-center gap-2 py-2 px-6">
                    <Save className="w-4 h-4" />
                    Save API Key
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'password' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-nexus-heading mb-2">Change Password</h3>
                <p className="text-nexus-muted">Update your password to keep your account secure.</p>
              </div>
              <form onSubmit={handleChangePassword} className="nexus-panel nexus-panel-static p-6 space-y-6">
                {message && (
                  <div className="p-3 bg-nexus-accent/10 border border-nexus-accent/20 rounded-lg text-nexus-accent-light text-sm">
                    {message}
                  </div>
                )}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-nexus-muted mb-1.5">Current Password</label>
                    <input
                      type="password"
                      value={passwordForm.current}
                      onChange={(e) => setPasswordForm({...passwordForm, current: e.target.value})}
                      className="nexus-input w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-nexus-muted mb-1.5">New Password</label>
                    <input
                      type="password"
                      value={passwordForm.new}
                      onChange={(e) => setPasswordForm({...passwordForm, new: e.target.value})}
                      className="nexus-input w-full"
                      required
                      minLength={8}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-nexus-muted mb-1.5">Confirm New Password</label>
                    <input
                      type="password"
                      value={passwordForm.confirm}
                      onChange={(e) => setPasswordForm({...passwordForm, confirm: e.target.value})}
                      className="nexus-input w-full"
                      required
                      minLength={8}
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-4 border-t border-nexus-border/50">
                  <button type="submit" disabled={loading} className="nexus-btn-primary flex items-center gap-2 py-2 px-6">
                    <Save className="w-4 h-4" />
                    {loading ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {activeTab === 'security' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-nexus-heading mb-2">Account Security</h3>
                <p className="text-nexus-muted">Add a second step to sign-in so a stolen password is not enough to get in.</p>
              </div>
              <TwoFactorSettings />
            </motion.div>
          )}

          {activeTab === 'sessions' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-nexus-heading mb-2">Session Management</h3>
                <p className="text-nexus-muted">Devices currently signed in to your account. Revoke any you don&apos;t recognise.</p>
              </div>
              <SessionSettings />
            </motion.div>
          )}

          {activeTab === 'export' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-nexus-heading mb-2">Data Export</h3>
                <p className="text-nexus-muted">Download a copy of your personal data and preferences.</p>
              </div>
              <div className="nexus-panel nexus-panel-static p-6">
                <div className="flex items-start gap-4 mb-6">
                  <Download className="w-6 h-6 text-nexus-accent-light shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-nexus-heading mb-2">Export Workspace Data</h4>
                    <p className="text-sm text-nexus-muted leading-relaxed">
                      Download a JSON file containing your user profile, preferences, and settings. Document contents and vector embeddings are not included in this export.
                    </p>
                  </div>
                </div>
                <button onClick={handleExportData} className="w-full py-3 rounded-lg bg-nexus-accent/10 hover:bg-nexus-accent/20 text-nexus-accent-light border border-nexus-accent/20 font-medium transition-colors">
                  Generate & Download Export
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'delete' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-red-500 mb-2">Delete Account</h3>
                <p className="text-nexus-muted">Permanently remove your account and all associated data.</p>
              </div>
              <div className="nexus-panel nexus-panel-static p-6 border-red-500/20 bg-red-500/5">
                <div className="flex items-start gap-4 mb-6">
                  <AlertCircle className="w-6 h-6 text-red-500 shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-nexus-heading mb-2">Warning: Irreversible Action</h4>
                    <p className="text-sm text-nexus-muted leading-relaxed">
                      Deleting your account will permanently remove all your documents, chat history, settings, and personal data from our servers. This action cannot be undone.
                    </p>
                  </div>
                </div>
                <form onSubmit={handleDeleteAccount} className="space-y-4">
                  {deleteError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                      {deleteError}
                    </div>
                  )}
                  <div>
                    <label className="block text-sm text-nexus-muted mb-1.5">Confirm with your password</label>
                    <input
                      type="password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      className="nexus-input w-full"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !deletePassword}
                    className="w-full py-3 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Deleting...' : 'I understand, delete my account'}
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

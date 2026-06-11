import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  User, Lock, Palette, Cpu, Key, Shield, Clock, Download, Trash2,
  AlertCircle, ChevronRight, Save
} from 'lucide-react';
import { useAuthStore, useAppStore } from '../../store';
import { authApi } from '../../lib/api';

export default function SettingsPanel() {
  const { user, token, setAuth } = useAuthStore();
  const { apiKey, setApiKey, aiModel, setAiModel } = useAppStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [name, setName] = useState(user?.name || '');
  const [tempApiKey, setTempApiKey] = useState(apiKey);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [theme, setTheme] = useState('dark');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

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
      if (user && token) setAuth({ ...user, ...data }, token);
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
      // Mock password change API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setMessage('Password changed successfully');
      setPasswordForm({ current: '', new: '', confirm: '' });
    } catch (error) {
      setMessage('Failed to change password');
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 3000);
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
                      : 'text-nexus-text hover:bg-white/5'
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
                <h3 className="text-2xl font-bold text-white mb-2">Profile Settings</h3>
                <p className="text-nexus-muted">Update your personal information and email preferences.</p>
              </div>
              
              <form onSubmit={handleUpdateProfile} className="nexus-panel p-6 space-y-6">
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
                <h3 className="text-2xl font-bold text-white mb-2">Theme Preferences</h3>
                <p className="text-nexus-muted">Customize the appearance of your NexusRAG dashboard.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setTheme('dark')}
                  className={`nexus-panel p-6 flex flex-col items-center gap-4 hover:border-nexus-accent transition-colors ${theme === 'dark' ? 'border-2 border-nexus-accent' : ''}`}
                >
                  <div className="w-16 h-16 rounded-full bg-[#0B0C10] border border-gray-700 shadow-inner flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-nexus-accent/20" />
                  </div>
                  <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-nexus-muted'}`}>Dark Mode {theme === 'dark' ? '(Active)' : ''}</span>
                </button>
                <button 
                  onClick={() => setTheme('light')}
                  className={`nexus-panel p-6 flex flex-col items-center gap-4 hover:border-nexus-accent transition-colors ${theme === 'light' ? 'border-2 border-nexus-accent' : ''}`}
                >
                  <div className="w-16 h-16 rounded-full bg-gray-100 border border-gray-300 shadow-inner flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-nexus-accent/50" />
                  </div>
                  <span className={`font-medium ${theme === 'light' ? 'text-white' : 'text-nexus-muted'}`}>Light Mode {theme === 'light' ? '(Active)' : ''}</span>
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'ai' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">AI Model Selection</h3>
                <p className="text-nexus-muted">Choose the language model for your workspace. (Make sure you provide the corresponding API Key in the API Key Management tab)</p>
              </div>
              <div className="nexus-panel p-6 space-y-4">
                {[
                  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', tag: 'Recommended' },
                  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', tag: 'High Performance' },
                  { id: 'grok-2', name: 'Grok 2', tag: 'xAI' },
                  { id: 'grok-beta', name: 'Grok Beta', tag: 'xAI' }
                ].map((model) => (
                  <label key={model.id} className="flex items-center justify-between p-4 rounded-lg border border-nexus-border/50 hover:bg-white/5 cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      <input 
                        type="radio" 
                        name="model" 
                        checked={aiModel === model.id}
                        onChange={() => setAiModel(model.id)}
                        className="text-nexus-accent" 
                      />
                      <span className="font-medium text-white">{model.name}</span>
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
                <h3 className="text-2xl font-bold text-white mb-2">API Key Management</h3>
                <p className="text-nexus-muted">Manage your API keys for Gemini or Grok.</p>
              </div>
              <div className="nexus-panel p-6 space-y-6">
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
                <h3 className="text-2xl font-bold text-white mb-2">Change Password</h3>
                <p className="text-nexus-muted">Update your password to keep your account secure.</p>
              </div>
              <form onSubmit={handleChangePassword} className="nexus-panel p-6 space-y-6">
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
                <h3 className="text-2xl font-bold text-white mb-2">Account Security</h3>
                <p className="text-nexus-muted">Manage your security preferences and two-factor authentication.</p>
              </div>
              <div className="nexus-panel p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-white mb-1">Two-Factor Authentication (2FA)</h4>
                    <p className="text-sm text-nexus-muted">Add an extra layer of security to your account.</p>
                  </div>
                  <button 
                    onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      twoFactorEnabled ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'nexus-btn-primary'
                    }`}
                  >
                    {twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'sessions' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Session Management</h3>
                <p className="text-nexus-muted">View and manage your active sessions across different devices.</p>
              </div>
              <div className="nexus-panel p-6 space-y-4">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-nexus-accent/20">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-nexus-accent/20 flex items-center justify-center">
                      <Cpu className="w-5 h-5 text-nexus-accent-light" />
                    </div>
                    <div>
                      <p className="font-medium text-white">Windows PC • Chrome</p>
                      <p className="text-sm text-nexus-muted">Current Session • Last active: Just now</p>
                    </div>
                  </div>
                  <span className="text-xs bg-nexus-accent/20 text-nexus-accent-light px-2 py-1 rounded">Active</span>
                </div>
                <div className="flex justify-end pt-4 border-t border-nexus-border/50">
                  <button className="px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors border border-red-400/20">
                    Revoke All Other Sessions
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'export' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Data Export</h3>
                <p className="text-nexus-muted">Download a copy of your personal data and preferences.</p>
              </div>
              <div className="nexus-panel p-6">
                <div className="flex items-start gap-4 mb-6">
                  <Download className="w-6 h-6 text-nexus-accent-light shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-white mb-2">Export Workspace Data</h4>
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
              <div className="nexus-panel p-6 border-red-500/20 bg-red-500/5">
                <div className="flex items-start gap-4 mb-6">
                  <AlertCircle className="w-6 h-6 text-red-500 shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-white mb-2">Warning: Irreversible Action</h4>
                    <p className="text-sm text-nexus-muted leading-relaxed">
                      Deleting your account will permanently remove all your documents, chat history, settings, and personal data from our servers. This action cannot be undone.
                    </p>
                  </div>
                </div>
                <button className="w-full py-3 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-colors">
                  I understand, delete my account
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

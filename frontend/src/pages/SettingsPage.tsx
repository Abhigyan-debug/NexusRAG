import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  User, Lock, Palette, Cpu, Key, Shield, Clock, Download, Trash2,
  Bell, Save, AlertCircle, ChevronRight
} from 'lucide-react';
import { useAuthStore } from '../store';
import { authApi } from '../lib/api';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [name, setName] = useState(user?.name || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

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
      await authApi.updateProfile({ name });
      setMessage('Profile updated successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error(error);
      setMessage('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar */}
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
      <div className="flex-1 overflow-y-auto p-8 bg-nexus-bg/50">
        <div className="max-w-3xl mx-auto">
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
                  <button type="submit" disabled={loading} className="nexus-btn-primary py-2 px-6">
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
                <button className="nexus-panel p-6 flex flex-col items-center gap-4 hover:border-nexus-accent transition-colors border-2 border-nexus-accent">
                  <div className="w-16 h-16 rounded-full bg-gray-900 border border-gray-700 shadow-inner" />
                  <span className="font-medium text-white">Dark Mode (Active)</span>
                </button>
                <button className="nexus-panel p-6 flex flex-col items-center gap-4 hover:border-nexus-accent transition-colors">
                  <div className="w-16 h-16 rounded-full bg-gray-100 border border-gray-300 shadow-inner" />
                  <span className="font-medium text-nexus-muted">Light Mode</span>
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'ai' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">AI Model Selection</h3>
                <p className="text-nexus-muted">Choose the default language model for your workspace.</p>
              </div>
              <div className="nexus-panel p-6 space-y-4">
                {['GPT-4o', 'Claude 3.5 Sonnet', 'Gemini 1.5 Pro', 'Llama 3 (Local)'].map((model, idx) => (
                  <label key={model} className="flex items-center justify-between p-4 rounded-lg border border-nexus-border/50 hover:bg-white/5 cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      <input type="radio" name="model" defaultChecked={idx === 0} className="text-nexus-accent" />
                      <span className="font-medium text-white">{model}</span>
                    </div>
                    {idx === 0 && <span className="text-xs bg-nexus-accent/20 text-nexus-accent-light px-2 py-1 rounded">Recommended</span>}
                  </label>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'api' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">API Key Management</h3>
                <p className="text-nexus-muted">Manage your API keys for programmatic access.</p>
              </div>
              <div className="nexus-panel p-6 text-center py-12">
                <Key className="w-12 h-12 text-nexus-muted mx-auto mb-4 opacity-50" />
                <h4 className="text-lg font-medium text-white mb-2">No API keys generated</h4>
                <p className="text-nexus-muted mb-6">Create an API key to access NexusRAG programmatically.</p>
                <button className="nexus-btn-primary">Generate New Key</button>
              </div>
            </motion.div>
          )}

          {/* Placeholder for other tabs */}
          {['password', 'security', 'sessions', 'export'].includes(activeTab) && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2 capitalize">{activeTab.replace('-', ' ')}</h3>
                <p className="text-nexus-muted">This section is currently under development.</p>
              </div>
              <div className="nexus-panel p-6 flex items-center gap-3 text-yellow-400/80 bg-yellow-400/10 border-yellow-400/20">
                <AlertCircle className="w-5 h-5" />
                <span>Feature coming in the next update.</span>
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

import { motion } from 'framer-motion';
import {
  Brain, FileText, MessageSquare, Microscope, Network,
  BarChart3, Settings, LogOut, LayoutDashboard,
} from 'lucide-react';
import { useAuthStore, useAppStore } from "../../store";

const navItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'research', label: 'Research Assistant', icon: Microscope },
  { id: 'knowledge-graph', label: 'Knowledge Graph', icon: Network },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const activeSection = useAppStore((s) => s.activeSection);
  const setActiveSection = useAppStore((s) => s.setActiveSection);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <aside className="w-64 h-screen bg-nexus-surface border-r border-nexus-border flex flex-col shrink-0">
      <div className="p-5 border-b border-nexus-border">
        <button 
          onClick={() => setActiveSection('overview')} 
          className="flex items-center gap-3 w-full text-left"
        >
          <div className="w-9 h-9 rounded-lg bg-nexus-gradient flex items-center justify-center shrink-0">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-display font-bold">NexusRAG</span>
            <p className="text-[10px] text-nexus-muted uppercase tracking-wider">Knowledge OS</p>
          </div>
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
              activeSection === item.id
                ? 'bg-nexus-accent/15 text-nexus-accent-light border border-nexus-accent/20'
                : 'text-nexus-muted hover:text-nexus-text hover:bg-nexus-panel'
            }`}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-nexus-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-nexus-gradient flex items-center justify-center text-xs font-bold">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-nexus-muted truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-nexus-muted hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/5"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

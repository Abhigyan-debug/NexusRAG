import { motion } from 'framer-motion';
import {
  Brain, FileText, MessageSquare, Microscope, Network,
  BarChart3, Settings, LogOut, LayoutDashboard, Box
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
    <aside className="w-64 h-screen bg-nexus-surface border-r border-nexus-border flex flex-col shrink-0 relative z-20 shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
      <div className="p-5 border-b border-nexus-border">
        <button 
          onClick={() => setActiveSection('overview')} 
          className="flex items-center gap-3 w-full text-left group"
        >
          <div className="relative w-10 h-10 rounded-xl bg-nexus-gradient flex items-center justify-center shrink-0 shadow-[0_4px_12px_rgba(99,102,241,0.5),inset_0_2px_4px_rgba(255,255,255,0.4)] group-hover:rotate-12 group-hover:scale-105 transition-all duration-300">
            <Box className="w-5 h-5 text-white drop-shadow-md" />
            <div className="absolute inset-0 bg-white/10 rounded-xl animate-pulse" style={{ animationDuration: '3s' }} />
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
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-300 relative overflow-hidden ${
              activeSection === item.id
                ? 'text-white shadow-[0_4px_10px_rgba(99,102,241,0.2),inset_0_1px_1px_rgba(255,255,255,0.15)] bg-gradient-to-b from-nexus-accent/20 to-nexus-accent/5 border border-nexus-accent/30'
                : 'text-nexus-muted hover:text-nexus-text hover:bg-white/5 hover:shadow-[0_2px_8px_rgba(0,0,0,0.3)]'
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

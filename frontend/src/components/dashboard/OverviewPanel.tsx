import { motion } from 'framer-motion';
import { 
  Users, FileText, MessageSquare, Brain, Activity, Clock,
  ArrowUpRight, ArrowDownRight, BarChart3
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../../lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuthStore, useAppStore } from '../../store';

export default function OverviewPanel() {
  const user = useAuthStore((s) => s.user);
  const setActiveSection = useAppStore((s) => s.setActiveSection);

  const { data, isLoading } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: async () => {
      const res = await analyticsApi.get();
      return res.data;
    },
  });

  const overview = data?.overview || {};

  const stats = [
    { label: 'Total Documents', value: overview.total_documents?.toString() || '0', change: '+12%', icon: FileText, positive: true },
    { label: 'Chat Sessions', value: overview.total_chats?.toString() || '0', change: '+24%', icon: MessageSquare, positive: true },
    { label: 'Chunks Generated', value: overview.total_chunks?.toString() || '0', change: '+5%', icon: Brain, positive: true },
    { label: 'Total Pages', value: overview.total_pages?.toString() || '0', change: '+1%', icon: Activity, positive: true },
  ];

  const recentActivity = [
    { id: 1, action: 'Uploaded document', target: 'Q3_Financial_Report.pdf', time: '2 hours ago', icon: FileText },
    { id: 2, action: 'Chat query', target: 'Semantic Search capabilities', time: '5 hours ago', icon: MessageSquare },
    { id: 3, action: 'Generated summary', target: 'Meeting_Notes_Aug.docx', time: '1 day ago', icon: Brain },
    { id: 4, action: 'Updated settings', target: 'Profile preferences', time: '2 days ago', icon: Clock },
  ];

  return (
    <div className="p-8 h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl font-display font-bold text-white mb-2">Welcome back, {user?.name?.split(' ')[0]}!</h1>
            <p className="text-nexus-muted">Here's what's happening in your knowledge workspace today.</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex gap-3">
            <button 
              onClick={() => setActiveSection('chat')}
              className="nexus-btn-primary shadow-lg shadow-nexus-accent/20 transition-all hover:scale-105"
            >
              New Chat
            </button>
            <button 
              onClick={() => setActiveSection('documents')}
              className="nexus-panel px-4 py-2 hover:bg-white/5 transition-colors border border-nexus-border font-medium"
            >
              Upload Files
            </button>
          </motion.div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="nexus-panel p-6 group hover:-translate-y-1 transition-all duration-300"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-xl bg-nexus-accent/10 flex items-center justify-center text-nexus-accent-light group-hover:bg-nexus-accent group-hover:text-white transition-colors">
                  <stat.icon className="w-6 h-6" />
                </div>
                <div className={`flex items-center gap-1 text-sm font-medium ${stat.positive ? 'text-green-400' : 'text-red-400'}`}>
                  {stat.positive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  {stat.change}
                </div>
              </div>
              <h3 className="text-nexus-muted text-sm font-medium mb-1">{stat.label}</h3>
              <p className="text-3xl font-display font-bold text-white tracking-tight">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Chart/Area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2 nexus-panel p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-display font-bold text-white">Usage Analytics</h3>
              <select className="bg-nexus-bg border border-nexus-border text-sm rounded-lg px-3 py-1.5 outline-none">
                <option>Last 7 days</option>
                <option>Last 30 days</option>
                <option>This Year</option>
              </select>
            </div>
            <div className="h-[300px] mt-4">
              {data?.activity_timeline ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.activity_timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1a26', border: '1px solid #2a2a3a', borderRadius: '8px' }}
                      itemStyle={{ color: '#e2e8f0' }}
                      cursor={{fill: '#2a2a3a'}}
                    />
                    <Bar dataKey="queries" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="docs" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center border border-dashed border-nexus-border/50 rounded-xl bg-nexus-bg/30">
                  <div className="text-center text-nexus-muted">
                    {isLoading ? <Activity className="w-8 h-8 mx-auto mb-3 animate-spin opacity-50" /> : <BarChart3 className="w-8 h-8 mx-auto mb-3 opacity-50" />}
                    <p>{isLoading ? 'Loading analytics...' : 'No activity data yet'}</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="nexus-panel p-6"
          >
            <h3 className="text-xl font-display font-bold text-white mb-6">Recent Activity</h3>
            <div className="space-y-6">
              {recentActivity.map((activity, i) => (
                <div key={activity.id} className="flex gap-4 relative">
                  {i !== recentActivity.length - 1 && (
                    <div className="absolute left-4 top-10 bottom-[-24px] w-[1px] bg-nexus-border/50" />
                  )}
                  <div className="relative z-10 w-8 h-8 rounded-full bg-nexus-bg border border-nexus-border flex items-center justify-center shrink-0 text-nexus-muted">
                    <activity.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium">{activity.action}</p>
                    <p className="text-sm text-nexus-accent-light truncate w-[200px]">{activity.target}</p>
                    <p className="text-xs text-nexus-muted mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-6 py-2 text-sm text-nexus-muted hover:text-white transition-colors border-t border-nexus-border/50">
              View all activity
            </button>
          </motion.div>
        </div>
        
      </div>
    </div>
  );
}

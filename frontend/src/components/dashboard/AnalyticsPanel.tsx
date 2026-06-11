import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  FileText, MessageSquare, Layers, BookOpen,
  TrendingUp, Hash, Users, Loader2, BarChart2, PieChart as PieChartIcon
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { analyticsApi } from '../../lib/api';
import { useAppStore } from '../../store';

export default function AnalyticsPanel() {
  const setSidebarData = useAppStore((s) => s.setSidebarData);

  const { data, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      const res = await analyticsApi.get();
      const analytics = res.data;
      setSidebarData({
        keywords: analytics.top_keywords?.map((k: { keyword: string; count: number }) => ({
          keyword: k.keyword,
          score: k.count,
        })),
        entities: analytics.top_entities?.map((e: { entity: string; count: number }) => ({
          text: e.entity,
          type: 'ENTITY',
        })),
      });
      return analytics;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-nexus-muted" />
      </div>
    );
  }

  const overview = data?.overview;

  const statCards = [
    { label: 'Documents', value: overview?.total_documents || 0, icon: FileText, color: 'text-nexus-accent-light' },
    { label: 'Chunks', value: overview?.total_chunks || 0, icon: Layers, color: 'text-nexus-cyan' },
    { label: 'Pages', value: overview?.total_pages || 0, icon: BookOpen, color: 'text-nexus-purple' },
    { label: 'Conversations', value: overview?.total_chats || 0, icon: MessageSquare, color: 'text-green-400' },
  ];

  const COLORS = ['#6366f1', '#a855f7', '#22d3ee', '#10b981'];

  const activityData = data?.activity_timeline || [
    { name: 'Mon', queries: 12, docs: 2 },
    { name: 'Tue', queries: 24, docs: 5 },
    { name: 'Wed', queries: 18, docs: 1 },
    { name: 'Thu', queries: 35, docs: 8 },
    { name: 'Fri', queries: 42, docs: 3 },
    { name: 'Sat', queries: 15, docs: 0 },
    { name: 'Sun', queries: 20, docs: 1 },
  ];

  const docTypesData = data?.doc_types || [
    { name: 'PDF', value: 65 },
    { name: 'DOCX', value: 25 },
    { name: 'TXT', value: 10 },
  ];

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="mb-6">
        <h2 className="font-display text-xl font-semibold mb-1">NLP Analytics Dashboard</h2>
        <p className="text-nexus-muted text-sm">Insights extracted from your knowledge base</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="nexus-panel p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <p className="text-2xl font-display font-bold">{card.value}</p>
            <p className="text-xs text-nexus-muted">{card.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <div className="nexus-panel p-5">
          <div className="flex items-center gap-2 mb-4">
            <Hash className="w-4 h-4 text-nexus-accent-light" />
            <h3 className="font-semibold text-sm">Top Keywords</h3>
          </div>
          <div className="space-y-2">
            {(data?.top_keywords || []).slice(0, 10).map((kw: { keyword: string; count: number }, i: number) => (
              <div key={kw.keyword} className="flex items-center gap-3">
                <span className="text-xs text-nexus-muted w-4">{i + 1}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">{kw.keyword}</span>
                    <span className="text-xs text-nexus-muted">{kw.count.toFixed(2)}</span>
                  </div>
                  <div className="h-1 bg-nexus-bg rounded-full overflow-hidden">
                    <div
                      className="h-full bg-nexus-gradient rounded-full"
                      style={{
                        width: `${Math.min(100, (kw.count / (data?.top_keywords?.[0]?.count || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
            {!data?.top_keywords?.length && (
              <p className="text-nexus-muted text-sm">No keywords extracted yet</p>
            )}
          </div>
        </div>

        <div className="nexus-panel p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-nexus-purple" />
            <h3 className="font-semibold text-sm">Named Entities</h3>
          </div>
          <div className="space-y-2">
            {(data?.top_entities || []).slice(0, 10).map((ent: { entity: string; count: number }) => (
              <div key={ent.entity} className="flex items-center justify-between text-sm py-1.5 border-b border-nexus-border/50">
                <span>{ent.entity}</span>
                <span className="text-xs text-nexus-muted">{ent.count}x</span>
              </div>
            ))}
            {!data?.top_entities?.length && (
              <p className="text-nexus-muted text-sm">No entities extracted yet</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="nexus-panel p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-nexus-cyan" />
            <h3 className="font-semibold text-sm">Topic Distribution</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {(data?.topic_distribution || []).map((t: { topic: string; count: number }) => (
              <span
                key={t.topic}
                className="px-3 py-1.5 rounded-lg bg-nexus-bg border border-nexus-border text-sm"
              >
                {t.topic} <span className="text-nexus-muted text-xs">({t.count})</span>
              </span>
            ))}
            {!data?.topic_distribution?.length && (
              <p className="text-nexus-muted text-sm">No topics detected yet</p>
            )}
          </div>
        </div>

        <div className="nexus-panel p-5">
          <h3 className="font-semibold text-sm mb-4">Sentiment Overview</h3>
          <div className="flex items-center gap-4">
            <div className="text-3xl font-display font-bold gradient-text">
              {((overview?.avg_sentiment || 0.65) * 100).toFixed(0)}%
            </div>
            <div className="flex-1">
              <div className="h-2 bg-nexus-bg rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(10, Math.abs(overview?.avg_sentiment || 0.65) * 100)}%`,
                    background: (overview?.avg_sentiment || 0.65) >= 0
                      ? 'linear-gradient(90deg, #10b981, #22d3ee)'
                      : 'linear-gradient(90deg, #ef4444, #f59e0b)',
                  }}
                />
              </div>
              <p className="text-xs text-nexus-muted mt-1">
                {(overview?.avg_sentiment || 0.65) >= 0 ? 'Overall positive' : 'Overall negative'} sentiment
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <div className="nexus-panel p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <BarChart2 className="w-4 h-4 text-nexus-accent-light" />
            <h3 className="font-semibold text-sm">Activity Timeline</h3>
          </div>
          <div className="flex-1 min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorQueries" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1a1a26', border: '1px solid #2a2a3a', borderRadius: '8px' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Area type="monotone" dataKey="queries" stroke="#6366f1" fillOpacity={1} fill="url(#colorQueries)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="nexus-panel p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <PieChartIcon className="w-4 h-4 text-nexus-purple" />
            <h3 className="font-semibold text-sm">Document Distribution</h3>
          </div>
          <div className="flex-1 flex items-center justify-center min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={docTypesData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {docTypesData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1a1a26', border: '1px solid #2a2a3a', borderRadius: '8px' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col justify-center gap-4 ml-4">
              {docTypesData.map((entry: any, index: number) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-sm text-nexus-muted">{entry.name}</span>
                  <span className="text-sm font-medium">{entry.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

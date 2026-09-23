import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, MessageSquare, Brain, Activity,
  ArrowUpRight, ArrowDownRight, BarChart3, Minus, Sparkles, Loader2,
} from 'lucide-react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { analyticsApi } from '../../lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useAuthStore, useAppStore } from '../../store';
import { chartColors, tooltipStyle } from '../../lib/chartTheme';
import RangeSelect, { RANGE_LABELS, RANGE_COMPARE_LABELS } from '../common/RangeSelect';
import { ActivityList, ActivityModal } from './ActivityFeed';
import type { ActivityItem, AnalyticsRange, GrowthStat } from '../../types';

function GrowthBadge({ stat }: { stat?: GrowthStat }) {
  const change = stat?.change_pct;
  if (change === 'new') {
    return (
      <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full text-nexus-accent-light bg-nexus-accent/10">
        <Sparkles className="w-3 h-3" />
        New
      </span>
    );
  }
  if (change == null || change === 0) {
    return (
      <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full text-nexus-muted bg-nexus-overlay/5">
        <Minus className="w-3 h-3" />
        No change
      </span>
    );
  }
  const up = change > 0;
  return (
    <span
      className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
        up ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'
      }`}
    >
      {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {up ? '+' : ''}
      {Math.abs(change) >= 1000 ? `${Math.round(change / 100) / 10}k` : change}%
    </span>
  );
}

export default function OverviewPanel() {
  const user = useAuthStore((s) => s.user);
  const setActiveSection = useAppStore((s) => s.setActiveSection);
  const setCurrentChatId = useAppStore((s) => s.setCurrentChatId);
  const [range, setRange] = useState<AnalyticsRange>('7d');
  const [showAllActivity, setShowAllActivity] = useState(false);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['analytics', range],
    placeholderData: keepPreviousData,
    queryFn: async () => (await analyticsApi.get(range)).data,
  });

  const { data: activity, isLoading: activityLoading } = useQuery({
    queryKey: ['activity', 'recent'],
    queryFn: async () => (await analyticsApi.activity(5)).data as { items: ActivityItem[]; has_more: boolean },
    refetchInterval: 60000,
  });

  const overview = data?.overview || {};
  const growth = data?.growth || {};

  const stats = [
    { label: 'Total Documents', value: overview.total_documents, growth: growth.documents, icon: FileText },
    { label: 'Chat Sessions', value: overview.total_chats, growth: growth.chats, icon: MessageSquare },
    { label: 'Chunks Generated', value: overview.total_chunks, growth: growth.chunks, icon: Brain },
    { label: 'Total Pages', value: overview.total_pages, growth: growth.pages, icon: Activity },
  ];

  const timeline: { name: string; queries: number; docs: number }[] = data?.activity_timeline || [];
  const hasTimelineData = timeline.some((d) => d.queries > 0 || d.docs > 0);

  return (
    <div className="p-8 h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl font-display font-bold text-nexus-heading mb-2">
              Welcome back, {user?.name?.split(' ')[0]}!
            </h1>
            <p className="text-nexus-muted">Here's what's happening in your knowledge workspace.</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex gap-3">
            <button
              onClick={() => {
                setCurrentChatId(null);
                setActiveSection('chat');
              }}
              className="nexus-btn-primary"
            >
              New Chat
            </button>
            <button onClick={() => setActiveSection('documents')} className="nexus-btn-secondary">
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
              className="nexus-panel p-6 group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-xl bg-nexus-accent/10 flex items-center justify-center text-nexus-accent-light group-hover:bg-nexus-accent group-hover:text-white transition-colors">
                  <stat.icon className="w-6 h-6" />
                </div>
                {!isLoading && (
                  <span
                    title={`${stat.growth?.current ?? 0} in the ${RANGE_LABELS[range].toLowerCase()}, ${RANGE_COMPARE_LABELS[range].replace('vs ', '')}: ${stat.growth?.previous ?? 0}`}
                  >
                    <GrowthBadge stat={stat.growth} />
                  </span>
                )}
              </div>
              <h3 className="text-nexus-muted text-sm font-medium mb-1">{stat.label}</h3>
              <p className="text-3xl font-display font-bold text-nexus-heading tracking-tight">
                {isLoading ? <span className="inline-block w-12 h-8 rounded bg-nexus-overlay/5 animate-pulse" /> : (stat.value ?? 0).toLocaleString()}
              </p>
              {!isLoading && (
                <p className="text-xs text-nexus-muted mt-2">
                  +{(stat.growth?.current ?? 0).toLocaleString()} in the {RANGE_LABELS[range].toLowerCase()}
                </p>
              )}
            </motion.div>
          ))}
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Usage chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2 nexus-panel nexus-panel-static p-6"
          >
            <div className="flex items-center justify-between mb-6 gap-4">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-display font-bold text-nexus-heading">Usage Analytics</h3>
                {isFetching && !isLoading && <Loader2 className="w-4 h-4 animate-spin text-nexus-muted" />}
              </div>
              <RangeSelect value={range} onChange={setRange} />
            </div>
            <div className="h-[300px] mt-4 relative">
              {isLoading ? (
                <div className="h-full flex items-center justify-center border border-dashed border-nexus-border rounded-xl">
                  <div className="text-center text-nexus-muted">
                    <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin opacity-60" />
                    <p>Loading analytics...</p>
                  </div>
                </div>
              ) : (
                <>
                  {!hasTimelineData && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                      <div className="text-center text-nexus-muted">
                        <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No activity in the {RANGE_LABELS[range].toLowerCase()}</p>
                      </div>
                    </div>
                  )}
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" stroke={chartColors.axis} fontSize={12} tickLine={false} axisLine={false} minTickGap={12} />
                      <YAxis stroke={chartColors.axis} fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip {...tooltipStyle} cursor={{ fill: chartColors.cursor }} />
                      <Legend
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: 12, color: 'rgb(var(--nx-muted))', paddingTop: 8 }}
                      />
                      <Bar dataKey="queries" name="Queries" fill={chartColors.accent} radius={[4, 4, 0, 0]} maxBarSize={32} />
                      <Bar dataKey="docs" name="Documents" fill={chartColors.cyan} radius={[4, 4, 0, 0]} maxBarSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </>
              )}
            </div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="nexus-panel nexus-panel-static p-6 flex flex-col"
          >
            <h3 className="text-xl font-display font-bold text-nexus-heading mb-6">Recent Activity</h3>
            <div className="flex-1">
              {activityLoading ? (
                <div className="space-y-5">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-nexus-overlay/5 animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-2/3 rounded bg-nexus-overlay/5 animate-pulse" />
                        <div className="h-3 w-1/2 rounded bg-nexus-overlay/5 animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : activity?.items.length ? (
                <ActivityList items={activity.items} />
              ) : (
                <div className="text-center text-nexus-muted py-8">
                  <Activity className="w-8 h-8 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No activity yet. Upload a document to get started.</p>
                </div>
              )}
            </div>
            {activity?.has_more && (
              <button
                onClick={() => setShowAllActivity(true)}
                className="w-full mt-6 pt-4 text-sm text-nexus-muted hover:text-nexus-heading transition-colors border-t border-nexus-border"
              >
                View all activity
              </button>
            )}
          </motion.div>
        </div>
      </div>

      <ActivityModal open={showAllActivity} onClose={() => setShowAllActivity(false)} />
    </div>
  );
}

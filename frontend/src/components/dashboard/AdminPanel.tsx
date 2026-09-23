import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Users, Activity, LogIn, ShieldCheck, Search, Monitor, Smartphone, Tablet,
  LogOut, Loader2, ChevronLeft, ChevronRight, AlertCircle, RefreshCw, MapPin,
} from 'lucide-react';
import { adminApi } from '../../lib/api';
import { timeAgo, formatDateTime } from '../../lib/time';
import type { AdminOverview, AdminSession, SessionStatus } from '../../types';

const STATUS_TABS: { id: 'active' | 'all' | 'expired' | 'revoked'; label: string }[] = [
  { id: 'active', label: 'Active now' },
  { id: 'all', label: 'All sign-ins' },
  { id: 'expired', label: 'Expired' },
  { id: 'revoked', label: 'Revoked' },
];

const STATUS_STYLES: Record<SessionStatus, string> = {
  active: 'bg-green-500/10 text-green-400',
  expired: 'bg-nexus-overlay/5 text-nexus-muted',
  revoked: 'bg-red-500/10 text-red-400',
};

const DEVICE_ICONS = { desktop: Monitor, mobile: Smartphone, tablet: Tablet };
const PER_PAGE = 20;

export default function AdminPanel() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<(typeof STATUS_TABS)[number]['id']>('active');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  // Debounce the search box
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const overview = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: async () => (await adminApi.overview()).data as AdminOverview,
    refetchInterval: 30000,
  });

  const sessions = useQuery({
    queryKey: ['admin', 'sessions', status, q, page],
    placeholderData: keepPreviousData,
    queryFn: async () =>
      (await adminApi.sessions({ status, q: q || undefined, page, per_page: PER_PAGE })).data as {
        items: AdminSession[];
        pagination: { page: number; pages: number; total: number };
      },
    refetchInterval: 30000,
  });

  const revoke = useMutation({
    mutationFn: (id: string) => adminApi.revokeSession(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin'] }),
  });

  const forbidden = (overview.error as { response?: { status?: number } } | null)?.response?.status === 403;
  const stats = overview.data;
  const statCards = [
    { label: 'Total users', value: stats?.total_users, icon: Users },
    { label: 'Signed in now', value: stats?.active_users, hint: `${stats?.active_sessions ?? 0} active sessions`, icon: Activity },
    { label: 'Sign-ins (24h)', value: stats?.sign_ins_24h, icon: LogIn },
    { label: 'Users with 2FA', value: stats?.users_with_2fa, hint: stats?.total_users ? `${Math.round(((stats.users_with_2fa ?? 0) / stats.total_users) * 100)}% of users` : undefined, icon: ShieldCheck },
  ];

  if (forbidden) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center text-nexus-muted">
          <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>Admin access is required to view this page.</p>
        </div>
      </div>
    );
  }

  const items = sessions.data?.items ?? [];
  const pagination = sessions.data?.pagination;

  return (
    <div className="p-8 h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-nexus-heading mb-2">Admin</h1>
            <p className="text-nexus-muted">Who is signed in to NexusRAG, from where, and when.</p>
          </div>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['admin'] })}
            className="nexus-btn-secondary py-2 px-4 text-sm flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${sessions.isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="nexus-panel p-5"
            >
              <div className="w-10 h-10 rounded-xl bg-nexus-accent/10 flex items-center justify-center text-nexus-accent-light mb-3">
                <card.icon className="w-5 h-5" />
              </div>
              <p className="text-sm text-nexus-muted">{card.label}</p>
              <p className="text-3xl font-display font-bold text-nexus-heading">
                {overview.isLoading ? <span className="inline-block w-10 h-8 rounded bg-nexus-overlay/5 animate-pulse" /> : (card.value ?? 0).toLocaleString()}
              </p>
              {card.hint && <p className="text-xs text-nexus-muted mt-1">{card.hint}</p>}
            </motion.div>
          ))}
        </div>

        <div className="nexus-panel nexus-panel-static">
          <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-nexus-border">
            <div role="tablist" className="flex p-0.5 rounded-lg bg-nexus-bg border border-nexus-border self-start">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={status === tab.id}
                  onClick={() => {
                    setStatus(tab.id);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    status === tab.id
                      ? 'bg-nexus-panel text-nexus-heading shadow-sm ring-1 ring-nexus-border'
                      : 'text-nexus-muted hover:text-nexus-heading'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="relative md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nexus-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email or IP"
                className="nexus-input pl-9 py-2 text-sm"
              />
            </div>
          </div>

          {sessions.isError ? (
            <div className="m-5 flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" /> Couldn't load sessions.
            </div>
          ) : sessions.isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-nexus-muted" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-center text-nexus-muted text-sm py-16">
              {q ? `No sign-ins match "${q}"` : 'No sign-ins here yet'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-nexus-muted border-b border-nexus-border">
                    <th className="font-medium px-4 py-3">User</th>
                    <th className="font-medium px-4 py-3">Device &amp; IP</th>
                    <th className="font-medium px-4 py-3">Activity</th>
                    <th className="font-medium px-4 py-3">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((s) => {
                    const Icon = DEVICE_ICONS[s.device_type] || Monitor;
                    const revoking = revoke.isPending && revoke.variables === s.id;
                    return (
                      <tr key={s.id} className="border-b border-nexus-border last:border-0 hover:bg-nexus-overlay/[0.03] transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-nexus-gradient flex items-center justify-center text-xs font-bold text-white shrink-0">
                              {s.user.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-nexus-heading truncate flex items-center gap-1.5">
                                {s.user.name}
                                {s.current && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-nexus-accent/10 text-nexus-accent-light">You</span>}
                                {s.user.role === 'admin' && !s.current && (
                                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-nexus-accent/10 text-nexus-accent-light">Admin</span>
                                )}
                                {s.user.two_factor_enabled && (
                                  <span title="Two-factor authentication on">
                                    <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-nexus-muted truncate">{s.user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="flex items-center gap-2 text-nexus-text">
                            <Icon className="w-4 h-4 text-nexus-muted" />
                            {s.browser} on {s.os}
                          </span>
                          <span className="flex items-center gap-1 mt-0.5 font-mono text-xs text-nexus-muted">
                            <MapPin className="w-3 h-3" />
                            {s.ip_address || 'Unknown IP'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="text-nexus-text" title={formatDateTime(s.last_seen_at)}>
                            Active {timeAgo(s.last_seen_at)}
                          </p>
                          <p className="text-xs text-nexus-muted" title={formatDateTime(s.created_at)}>
                            Signed in {timeAgo(s.created_at)}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-[11px] font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[s.status]}`}
                            title={s.revoked_at ? `Revoked ${formatDateTime(s.revoked_at)}` : undefined}
                          >
                            {s.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {s.status === 'active' && !s.current && (
                            <button
                              onClick={() => {
                                if (window.confirm(`Sign ${s.user.name} out of ${s.browser} on ${s.os}?`)) revoke.mutate(s.id);
                              }}
                              disabled={revoking}
                              className="px-2.5 py-1 text-xs rounded-lg text-nexus-muted hover:text-red-400 hover:bg-red-500/10 transition-colors inline-flex items-center gap-1 disabled:opacity-50"
                            >
                              {revoking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                              Revoke
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {pagination && pagination.total > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-nexus-border text-sm text-nexus-muted">
              <span>
                {pagination.total.toLocaleString()} sign-in{pagination.total === 1 ? '' : 's'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg hover:bg-nexus-overlay/5 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span>
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                  disabled={page >= pagination.pages}
                  className="p-1.5 rounded-lg hover:bg-nexus-overlay/5 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

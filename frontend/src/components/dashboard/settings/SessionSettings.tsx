import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Monitor, Smartphone, Tablet, Loader2, LogOut, AlertCircle, MapPin } from 'lucide-react';
import { authApi } from '../../../lib/api';
import { useAuthStore } from '../../../store';
import { timeAgo, formatDateTime } from '../../../lib/time';
import type { UserSession } from '../../../types';

const DEVICE_ICONS = { desktop: Monitor, mobile: Smartphone, tablet: Tablet };

export default function SessionSettings() {
  const queryClient = useQueryClient();
  const logout = useAuthStore((s) => s.logout);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () =>
      (await authApi.sessions()).data as { sessions: UserSession[]; current_session_tracked: boolean },
    refetchInterval: 60000,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['sessions'] });
    queryClient.invalidateQueries({ queryKey: ['activity'] });
  };

  const revokeOne = useMutation({
    mutationFn: (id: string) => authApi.revokeSession(id),
    onSuccess: (res) => {
      if (res.data.current) logout();
      else refresh();
    },
  });

  const revokeOthers = useMutation({
    mutationFn: () => authApi.revokeOtherSessions(),
    onSuccess: refresh,
  });

  const sessions = data?.sessions ?? [];
  const others = sessions.filter((s) => !s.current);

  return (
    <div className="nexus-panel nexus-panel-static p-6 space-y-4">
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-nexus-muted" />
        </div>
      ) : isError ? (
        <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <span className="flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Couldn't load your sessions.</span>
          <button onClick={() => refetch()} className="underline">Retry</button>
        </div>
      ) : (
        <>
          {data && !data.current_session_tracked && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-nexus-accent/10 border border-nexus-accent/20 text-sm text-nexus-text">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-nexus-accent-light" />
              This device signed in before session tracking was added. Sign out and back in to see it here.
            </div>
          )}

          <ul className="space-y-3">
            {sessions.map((s) => {
              const Icon = DEVICE_ICONS[s.device_type] || Monitor;
              const revoking = revokeOne.isPending && revokeOne.variables === s.id;
              return (
                <li
                  key={s.id}
                  className={`flex items-center justify-between gap-4 p-4 rounded-lg border ${
                    s.current ? 'border-nexus-accent/30 bg-nexus-accent/5' : 'border-nexus-border bg-nexus-overlay/[0.02]'
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-nexus-accent/10 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-nexus-accent-light" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-nexus-heading flex items-center gap-2 flex-wrap">
                        {s.browser} on {s.os}
                        {s.current && (
                          <span className="text-[11px] font-medium bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full">
                            This device
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-nexus-muted truncate">
                        {s.ip_address && (
                          <span className="inline-flex items-center gap-1 mr-2">
                            <MapPin className="w-3 h-3" />
                            {s.ip_address}
                          </span>
                        )}
                        <span title={formatDateTime(s.last_seen_at)}>
                          {s.current ? 'Active now' : `Active ${timeAgo(s.last_seen_at)}`}
                        </span>
                        <span className="opacity-70" title={formatDateTime(s.created_at)}>
                          {' · '}Signed in {timeAgo(s.created_at)}
                        </span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (!s.current || window.confirm('Sign out of this device?')) revokeOne.mutate(s.id);
                    }}
                    disabled={revoking}
                    className="shrink-0 px-3 py-1.5 text-sm rounded-lg text-nexus-muted hover:text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {revoking ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                    {s.current ? 'Sign out' : 'Revoke'}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center justify-between gap-4 pt-4 border-t border-nexus-border">
            <p className="text-sm text-nexus-muted">
              {others.length
                ? `${others.length} other active session${others.length === 1 ? '' : 's'}`
                : 'No other devices are signed in.'}
            </p>
            <button
              onClick={() => {
                if (window.confirm('Sign out of all other devices?')) revokeOthers.mutate();
              }}
              disabled={!others.length || revokeOthers.isPending}
              className="px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-red-500/30 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {revokeOthers.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Revoke all other sessions
            </button>
          </div>
        </>
      )}
    </div>
  );
}

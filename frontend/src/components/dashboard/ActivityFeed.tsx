import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FileUp, CheckCircle2, AlertTriangle, Trash2, MessageSquare, Microscope, Brain,
  LogIn, UserPlus, UserCog, KeyRound, ShieldCheck, ShieldOff, LifeBuoy, RefreshCw,
  LogOut, Activity, X, Loader2,
} from 'lucide-react';
import { analyticsApi } from '../../lib/api';
import { timeAgo, formatDateTime } from '../../lib/time';
import type { ActivityItem } from '../../types';

type Tone = 'accent' | 'success' | 'danger' | 'muted';

const ACTIVITY_META: Record<string, { label: string; icon: typeof Activity; tone: Tone }> = {
  document_uploaded: { label: 'Uploaded document', icon: FileUp, tone: 'accent' },
  document_processed: { label: 'Document ready', icon: CheckCircle2, tone: 'success' },
  document_failed: { label: 'Processing failed', icon: AlertTriangle, tone: 'danger' },
  document_deleted: { label: 'Deleted document', icon: Trash2, tone: 'muted' },
  chat_started: { label: 'Started a chat', icon: MessageSquare, tone: 'accent' },
  research_run: { label: 'Ran research analysis', icon: Microscope, tone: 'accent' },
  summary_generated: { label: 'Generated summary', icon: Brain, tone: 'accent' },
  signed_in: { label: 'Signed in', icon: LogIn, tone: 'muted' },
  account_created: { label: 'Created account', icon: UserPlus, tone: 'success' },
  profile_updated: { label: 'Updated profile', icon: UserCog, tone: 'muted' },
  password_changed: { label: 'Changed password', icon: KeyRound, tone: 'accent' },
  '2fa_enabled': { label: 'Turned on two-factor authentication', icon: ShieldCheck, tone: 'success' },
  '2fa_disabled': { label: 'Turned off two-factor authentication', icon: ShieldOff, tone: 'danger' },
  recovery_code_used: { label: 'Signed in with a recovery code', icon: LifeBuoy, tone: 'danger' },
  recovery_codes_regenerated: { label: 'Generated new recovery codes', icon: RefreshCw, tone: 'muted' },
  session_revoked: { label: 'Signed out a device', icon: LogOut, tone: 'muted' },
  sessions_revoked: { label: 'Signed out other devices', icon: LogOut, tone: 'muted' },
  session_revoked_by_admin: { label: 'An admin signed out a device', icon: LogOut, tone: 'danger' },
};

const TONE_CLASSES: Record<Tone, string> = {
  accent: 'text-nexus-accent-light bg-nexus-accent/10 border-nexus-accent/20',
  success: 'text-green-400 bg-green-500/10 border-green-500/20',
  danger: 'text-red-400 bg-red-500/10 border-red-500/20',
  muted: 'text-nexus-muted bg-nexus-bg border-nexus-border',
};

function metaFor(type: string) {
  return ACTIVITY_META[type] || { label: type.replace(/_/g, ' '), icon: Activity, tone: 'muted' as Tone };
}

export function ActivityList({ items }: { items: ActivityItem[] }) {
  return (
    <ol className="space-y-5">
      {items.map((item, i) => {
        const meta = metaFor(item.type);
        const Icon = meta.icon;
        return (
          <li key={item.id} className="flex gap-4 relative">
            {i !== items.length - 1 && (
              <div className="absolute left-4 top-9 bottom-[-20px] w-px bg-nexus-border" aria-hidden />
            )}
            <div
              className={`relative z-10 w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ${TONE_CLASSES[meta.tone]}`}
            >
              <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-nexus-heading font-medium">{meta.label}</p>
              {item.target && (
                <p className="text-sm text-nexus-accent-light truncate" title={item.target}>
                  {item.target}
                </p>
              )}
              <time
                className="text-xs text-nexus-muted mt-0.5 block"
                dateTime={item.timestamp}
                title={formatDateTime(item.timestamp)}
              >
                {timeAgo(item.timestamp)}
              </time>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

const PAGE_SIZE = 20;

export function ActivityModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['activity', 'all'],
    enabled: open,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => (await analyticsApi.activity(PAGE_SIZE, pageParam)).data,
    getNextPageParam: (last, pages) => (last.has_more ? pages.length * PAGE_SIZE : undefined),
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const items: ActivityItem[] = data?.pages.flatMap((p) => p.items) ?? [];

  // Portal to <body> so transformed dashboard wrappers cannot offset the fixed overlay
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="activity-title"
            className="nexus-panel nexus-panel-static w-full max-w-lg max-h-[80vh] flex flex-col"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-nexus-border">
              <h2 id="activity-title" className="text-lg font-display font-bold text-nexus-heading">
                All activity
              </h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-nexus-muted hover:text-nexus-heading hover:bg-nexus-overlay/5 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto">
              {isLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-nexus-muted" />
                </div>
              ) : items.length === 0 ? (
                <p className="text-sm text-nexus-muted text-center py-10">No activity yet</p>
              ) : (
                <>
                  <ActivityList items={items} />
                  {hasNextPage && (
                    <button
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                      className="nexus-btn-secondary w-full mt-6 py-2 text-sm flex items-center justify-center gap-2"
                    >
                      {isFetchingNextPage && <Loader2 className="w-4 h-4 animate-spin" />}
                      {isFetchingNextPage ? 'Loading…' : 'Load more'}
                    </button>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

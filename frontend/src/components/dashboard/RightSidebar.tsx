import { motion } from 'framer-motion';
import { Hash, Users, Gauge, FileBarChart } from 'lucide-react';
import { useAppStore } from '../../store';

export default function RightSidebar() {
  const keywords = useAppStore((s) => s.sidebarKeywords);
  const entities = useAppStore((s) => s.sidebarEntities);
  const confidence = useAppStore((s) => s.sidebarConfidence);
  const citations = useAppStore((s) => s.latestCitations);
  const documents = useAppStore((s) => s.documents);

  return (
    <aside className="w-72 h-screen bg-nexus-surface border-l border-nexus-border overflow-y-auto shrink-0 hidden xl:block">
      <div className="p-4 space-y-5">
        {confidence > 0 && (
          <div className="nexus-panel p-4">
            <div className="flex items-center gap-2 mb-3">
              <Gauge className="w-4 h-4 text-nexus-cyan" />
              <h3 className="text-sm font-semibold">Confidence Score</h3>
            </div>
            <div className="relative h-2 bg-nexus-bg rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${confidence}%` }}
                className="absolute inset-y-0 left-0 bg-nexus-gradient rounded-full"
              />
            </div>
            <p className="text-2xl font-display font-bold mt-2 gradient-text">{confidence}%</p>
          </div>
        )}

        {keywords.length > 0 && (
          <div className="nexus-panel p-4">
            <div className="flex items-center gap-2 mb-3">
              <Hash className="w-4 h-4 text-nexus-accent-light" />
              <h3 className="text-sm font-semibold">Keywords</h3>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {keywords.slice(0, 12).map((kw) => (
                <span
                  key={kw.keyword}
                  className="px-2 py-0.5 text-xs rounded-md bg-nexus-accent/10 text-nexus-accent-light border border-nexus-accent/20"
                >
                  {kw.keyword}
                </span>
              ))}
            </div>
          </div>
        )}

        {entities.length > 0 && (
          <div className="nexus-panel p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-nexus-purple" />
              <h3 className="text-sm font-semibold">Entities</h3>
            </div>
            <div className="space-y-2">
              {entities.slice(0, 8).map((ent, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="truncate">{ent.text}</span>
                  <span className="text-nexus-muted shrink-0 ml-2">{ent.type}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {citations.length > 0 && (
          <div className="nexus-panel p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileBarChart className="w-4 h-4 text-nexus-cyan" />
              <h3 className="text-sm font-semibold">Citations</h3>
            </div>
            <div className="space-y-3">
              {citations.map((c, i) => (
                <div key={i} className="text-xs border-l-2 border-nexus-accent/40 pl-3">
                  <p className="font-medium truncate">{c.document_name}</p>
                  <p className="text-nexus-muted">Page {c.page_number} · {c.confidence}%</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="nexus-panel p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileBarChart className="w-4 h-4 text-nexus-muted" />
            <h3 className="text-sm font-semibold">Document Stats</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-2 rounded-lg bg-nexus-bg">
              <p className="text-lg font-display font-bold">{documents.length}</p>
              <p className="text-[10px] text-nexus-muted">Documents</p>
            </div>
            <div className="p-2 rounded-lg bg-nexus-bg">
              <p className="text-lg font-display font-bold">
                {documents.reduce((s, d) => s + (d.page_count || 0), 0)}
              </p>
              <p className="text-[10px] text-nexus-muted">Pages</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

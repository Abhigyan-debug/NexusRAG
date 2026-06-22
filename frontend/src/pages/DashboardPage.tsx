import Sidebar from '../components/dashboard/Sidebar';
import RightSidebar from '../components/dashboard/RightSidebar';
import ChatPanel from '../components/dashboard/ChatPanel';
import DocumentsPanel from '../components/dashboard/DocumentsPanel';
import ResearchPanel from '../components/dashboard/ResearchPanel';
import KnowledgeGraphPanel from '../components/dashboard/KnowledgeGraphPanel';
import AnalyticsPanel from '../components/dashboard/AnalyticsPanel';
import SettingsPanel from '../components/dashboard/SettingsPanel';
import OverviewPanel from '../components/dashboard/OverviewPanel';
import { useAppStore } from '../store';

const panels: Record<string, React.ComponentType> = {
  overview: OverviewPanel,
  chat: ChatPanel,
  documents: DocumentsPanel,
  research: ResearchPanel,
  'knowledge-graph': KnowledgeGraphPanel,
  analytics: AnalyticsPanel,
  settings: SettingsPanel,
};

import { AnimatePresence, motion } from 'framer-motion';

export default function DashboardPage() {
  const activeSection = useAppStore((s) => s.activeSection);
  const ActivePanel = panels[activeSection] || OverviewPanel;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 bg-nexus-bg perspective-[2000px] overflow-y-auto overflow-x-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, rotateX: 15, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, rotateX: 0, scale: 1, y: 0 }}
            exit={{ opacity: 0, rotateX: -15, scale: 0.95, y: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="flex-1 flex flex-col h-full transform-style-3d origin-top"
          >
            <ActivePanel />
          </motion.div>
        </AnimatePresence>
      </main>
      <RightSidebar />
    </div>
  );
}

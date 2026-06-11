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

export default function DashboardPage() {
  const activeSection = useAppStore((s) => s.activeSection);
  const ActivePanel = panels[activeSection] || OverviewPanel;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 bg-nexus-bg">
        <ActivePanel />
      </main>
      <RightSidebar />
    </div>
  );
}

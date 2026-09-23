import { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import ForceGraph2D from 'react-force-graph-2d';
import { Loader2, Network } from 'lucide-react';
import { knowledgeGraphApi } from '../../lib/api';
import { useResolvedTheme } from '../../lib/theme';

const NODE_COLORS: Record<string, string> = {
  Document: '#6366f1',
  PERSON: '#22d3ee',
  ORGANIZATION: '#a855f7',
  Topic: '#f59e0b',
  LOCATION: '#10b981',
  DATE: '#ef4444',
  MONEY: '#ec4899',
  default: '#94a3b8',
};

export default function KnowledgeGraphPanel() {
  const graphRef = useRef<any>();
  const theme = useResolvedTheme();
  // Canvas drawing cannot use CSS variables, so pick concrete colours per theme
  const labelColor = theme === 'light' ? '#1e293b' : '#e2e8f0';
  const linkColor = theme === 'light' ? 'rgba(79, 70, 229, 0.35)' : 'rgba(99, 102, 241, 0.3)';
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  // Size the canvas to its container instead of the whole window
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width: Math.floor(width), height: Math.floor(height) });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['knowledge-graph'],
    queryFn: async () => {
      const res = await knowledgeGraphApi.get();
      return res.data;
    },
  });

  // Memoized: a new object on every render would restart the force simulation
  const graphData = useMemo(() => {
    const nodes = (data?.nodes || []).map((n: { id: string; label: string; type: string }) => ({
      id: n.id,
      name: n.label,
      type: n.type,
    }));
    const ids = new Set(nodes.map((n: { id: string }) => n.id));
    // Links pointing at missing nodes make the force graph throw, so drop them
    const links = (data?.edges || [])
      .filter((e: { source: string; target: string }) => ids.has(e.source) && ids.has(e.target))
      .map((e: { source: string; target: string; relationship: string }) => ({
        source: e.source,
        target: e.target,
        label: e.relationship,
      }));
    return { nodes, links };
  }, [data]);

  useEffect(() => {
    if (graphRef.current && graphData.nodes.length) {
      graphRef.current.d3Force('charge')?.strength(-120);
    }
  }, [graphData.nodes.length]);

  const nodeColor = useCallback((node: { type: string }) => {
    return NODE_COLORS[node.type] || NODE_COLORS.default;
  }, []);

  const nodeLabel = useCallback((node: { name: string; type: string }) => {
    return `${node.name} (${node.type})`;
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 pb-0">
        <h2 className="font-display text-xl font-semibold mb-1">Knowledge Graph</h2>
        <p className="text-nexus-muted text-sm">
          Entity relationships across your documents
          {data?.stats && ` · ${data.stats.total_nodes} nodes, ${data.stats.total_edges} edges`}
        </p>
      </div>

      <div ref={containerRef} className="flex-1 relative m-4 rounded-xl border border-nexus-border bg-nexus-bg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-nexus-muted" />
          </div>
        ) : graphData.nodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-nexus-muted">
            <Network className="w-12 h-12 mb-3 opacity-50" />
            <p>Upload documents to generate the knowledge graph</p>
          </div>
        ) : (
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            nodeLabel={nodeLabel}
            nodeColor={nodeColor}
            nodeRelSize={6}
            linkColor={() => linkColor}
            linkWidth={1}
            backgroundColor="transparent"
            width={size.width || undefined}
            height={size.height || undefined}
            nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
              const label = node.name;
              const fontSize = 12 / globalScale;
              const color = nodeColor(node);
              ctx.beginPath();
              ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI);
              ctx.fillStyle = color;
              ctx.fill();
              ctx.font = `${fontSize}px Inter, sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'top';
              ctx.fillStyle = labelColor;
              ctx.fillText(label.length > 20 ? label.slice(0, 18) + '...' : label, node.x, node.y + 8);
            }}
          />
        )}
      </div>

      {data?.stats?.node_types && (
        <div className="px-6 pb-4 flex flex-wrap gap-3">
          {Object.entries(data.stats.node_types).map(([type, count]) => (
            <div key={type} className="flex items-center gap-2 text-xs">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: NODE_COLORS[type] || NODE_COLORS.default }}
              />
              <span className="text-nexus-muted">{type}: {count as number}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

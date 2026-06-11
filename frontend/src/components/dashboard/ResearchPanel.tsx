import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Microscope, GitCompare, TrendingUp, Lightbulb, AlertTriangle,
  Loader2, Sparkles,
} from 'lucide-react';
import { chatApi } from '../../lib/api';
import { useAppStore } from '../../store';

const analysisTypes = [
  { id: 'insights', label: 'Extract Insights', icon: Lightbulb, desc: 'Discover key findings and valuable insights' },
  { id: 'contradictions', label: 'Find Contradictions', icon: AlertTriangle, desc: 'Identify conflicting information across documents' },
  { id: 'trends', label: 'Detect Trends', icon: TrendingUp, desc: 'Uncover patterns and trends in your corpus' },
  { id: 'compare', label: 'Compare Documents', icon: GitCompare, desc: 'Systematic comparison of document content' },
  { id: 'findings', label: 'Highlight Findings', icon: Sparkles, desc: 'Surface the most important findings' },
];

export default function ResearchPanel() {
  const [result, setResult] = useState('');
  const [activeType, setActiveType] = useState('');
  const selectedDocuments = useAppStore((s) => s.selectedDocuments);

  const researchMutation = useMutation({
    mutationFn: (type: string) =>
      chatApi.research(type, selectedDocuments.length ? selectedDocuments : undefined),
    onSuccess: (res) => {
      setResult(res.data.analysis);
      setActiveType(res.data.type);
    },
  });

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="mb-6">
        <h2 className="font-display text-xl font-semibold mb-1">Research Assistant</h2>
        <p className="text-nexus-muted text-sm">
          Advanced analysis across your document corpus
          {selectedDocuments.length > 0 && ` (${selectedDocuments.length} selected)`}
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {analysisTypes.map((a) => (
          <motion.button
            key={a.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => researchMutation.mutate(a.id)}
            disabled={researchMutation.isPending}
            className={`nexus-panel p-5 text-left transition-all hover:border-nexus-accent/40 ${
              activeType === a.id ? 'border-nexus-accent/40 bg-nexus-accent/5' : ''
            }`}
          >
            <a.icon className="w-6 h-6 text-nexus-accent-light mb-3" />
            <h3 className="font-semibold text-sm mb-1">{a.label}</h3>
            <p className="text-nexus-muted text-xs">{a.desc}</p>
          </motion.button>
        ))}
      </div>

      {researchMutation.isPending && (
        <div className="flex items-center justify-center py-12 gap-3 text-nexus-muted">
          <Loader2 className="w-5 h-5 animate-spin" />
          Analyzing documents...
        </div>
      )}

      {result && !researchMutation.isPending && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="nexus-panel p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Microscope className="w-5 h-5 text-nexus-accent-light" />
            <h3 className="font-semibold capitalize">{activeType.replace('_', ' ')} Analysis</h3>
          </div>
          <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed">
            {result}
          </div>
        </motion.div>
      )}
    </div>
  );
}

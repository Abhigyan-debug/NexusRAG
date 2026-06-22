import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Brain, Search, Network, BarChart3, FileText, Sparkles,
  ArrowRight, Layers, Database, Cpu, Shield, Zap,
} from 'lucide-react';
import BrainScene from '../components/landing/BrainScene';

const features = [
  { icon: Brain, title: 'Advanced RAG Pipeline', desc: 'Multi-stage retrieval with semantic search, re-ranking, and context-aware generation.' },
  { icon: Search, title: 'Semantic Search', desc: 'Find information by meaning, not keywords. Powered by vector embeddings and FAISS.' },
  { icon: Network, title: 'Knowledge Graph', desc: 'Interactive entity relationship visualization across your entire document corpus.' },
  { icon: BarChart3, title: 'NLP Analytics', desc: 'Deep insights into keywords, entities, topics, and sentiment across documents.' },
  { icon: FileText, title: 'Citation Tracking', desc: 'Every answer backed by source documents with page numbers and confidence scores.' },
  { icon: Sparkles, title: 'Research Assistant', desc: 'Detect trends, find contradictions, compare documents, and extract insights.' },
];

const workflow = [
  { step: '01', title: 'Upload', desc: 'PDF, DOCX, TXT documents', icon: FileText },
  { step: '02', title: 'Process', desc: 'NLP extraction & chunking', icon: Cpu },
  { step: '03', title: 'Embed', desc: 'Vector generation with FAISS', icon: Database },
  { step: '04', title: 'Query', desc: 'Semantic retrieval & ranking', icon: Search },
  { step: '05', title: 'Reason', desc: 'Gemini LLM with citations', icon: Sparkles },
];

const useCases = [
  { title: 'Enterprise Knowledge', desc: 'Transform internal documents into searchable intelligence.' },
  { title: 'Research & Academia', desc: 'Analyze papers, find contradictions, and extract insights.' },
  { title: 'Legal & Compliance', desc: 'Cross-reference documents with precise citation tracking.' },
  { title: 'Healthcare & Science', desc: 'Process research papers with entity extraction and summarization.' },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <BrainScene />

      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-nexus-gradient flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-xl">NexusRAG</span>
        </div>
        <div className="flex items-center gap-6">
          <Link to="/about" className="text-sm font-medium text-nexus-muted hover:text-nexus-text transition-colors">
            About
          </Link>
          <Link to="/login" className="text-sm font-medium text-nexus-muted hover:text-nexus-text transition-colors">
            Sign In
          </Link>
          <Link to="/register" className="nexus-btn-primary text-sm">
            Get Started
          </Link>
        </div>
      </nav>

      <section className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-nexus-accent/30 bg-nexus-accent/10 text-nexus-accent-light text-sm mb-8">
            <Zap className="w-4 h-4" />
            AI Knowledge Operating System
          </div>
          <h1 className="font-display text-5xl md:text-7xl font-bold leading-tight mb-6">
            Transform Documents
            <br />
            <span className="gradient-text">Into Intelligence</span>
          </h1>
          <p className="text-lg md:text-xl text-nexus-muted max-w-2xl mx-auto mb-10">
            Enterprise AI Knowledge Assistant powered by NLP, Semantic Search,
            Vector Databases, and LLM Reasoning.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link to="/register" className="nexus-btn-primary flex items-center gap-2 text-lg px-8 py-3">
              Get Started <ArrowRight className="w-5 h-5" />
            </Link>
            <a href="#architecture" className="nexus-btn-secondary flex items-center gap-2 text-lg px-8 py-3">
              View Architecture
            </a>
          </div>
        </motion.div>
      </section>

      <section id="features" className="relative z-10 py-24 px-8 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Enterprise AI Capabilities
          </h2>
          <p className="text-nexus-muted max-w-xl mx-auto">
            A complete knowledge operating system built for organizations that demand precision.
          </p>
        </motion.div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="nexus-panel p-6 hover:border-nexus-accent/40 transition-all duration-300 group"
            >
              <div className="w-12 h-12 rounded-lg bg-nexus-accent/10 flex items-center justify-center mb-4 group-hover:bg-nexus-accent/20 transition-colors">
                <f.icon className="w-6 h-6 text-nexus-accent-light" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-nexus-muted text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="architecture" className="relative z-10 py-24 px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Architecture Workflow
            </h2>
            <p className="text-nexus-muted">From document upload to intelligent answers in five stages.</p>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {workflow.map((w, i) => (
              <motion.div
                key={w.step}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="flex flex-col items-center text-center flex-1"
              >
                <div className="w-16 h-16 rounded-2xl bg-nexus-panel border border-nexus-border flex items-center justify-center mb-3 relative">
                  <w.icon className="w-7 h-7 text-nexus-accent-light" />
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-nexus-gradient text-xs flex items-center justify-center font-mono">
                    {w.step}
                  </span>
                </div>
                <h4 className="font-display font-semibold">{w.title}</h4>
                <p className="text-nexus-muted text-xs mt-1">{w.desc}</p>
                {i < workflow.length - 1 && (
                  <ArrowRight className="w-5 h-5 text-nexus-border hidden md:block absolute" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 py-24 px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Use Cases</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {useCases.map((uc, i) => (
            <motion.div
              key={uc.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="nexus-panel p-6 text-center"
            >
              <Layers className="w-8 h-8 text-nexus-cyan mx-auto mb-4" />
              <h3 className="font-display font-semibold mb-2">{uc.title}</h3>
              <p className="text-nexus-muted text-sm">{uc.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="relative z-10 py-24 px-8">
        <div className="max-w-3xl mx-auto text-center nexus-panel p-12 border-nexus-accent/20">
          <Shield className="w-12 h-12 text-nexus-accent-light mx-auto mb-6" />
          <h2 className="font-display text-3xl font-bold mb-4">Ready to Build Your Knowledge OS?</h2>
          <p className="text-nexus-muted mb-8">
            Join enterprises transforming their documents into intelligent, searchable knowledge systems.
          </p>
          <Link to="/register" className="nexus-btn-primary inline-flex items-center gap-2 text-lg px-8 py-3">
            Start Free <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      <footer className="relative z-10 border-t border-nexus-border py-8 px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-nexus-accent" />
            <span className="font-display font-semibold">NexusRAG</span>
          </div>
          <div className="flex items-center gap-6 text-nexus-muted text-sm">
            <Link to="/about" className="hover:text-nexus-text transition-colors">About</Link>
            <p>&copy; {new Date().getFullYear()} NexusRAG. AI Knowledge Operating System.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

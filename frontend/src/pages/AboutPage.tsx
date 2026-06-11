import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Brain, ArrowLeft, Code, Database, Globe, Cpu } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-nexus-bg text-nexus-text selection:bg-nexus-accent/30 selection:text-white">
      {/* Navigation */}
      <nav className="border-b border-nexus-border/50 bg-nexus-bg/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-nexus-gradient flex items-center justify-center transform group-hover:scale-105 transition-all">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-lg">NexusRAG</span>
          </Link>
          <Link to="/" className="text-nexus-muted hover:text-nexus-text flex items-center gap-2 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-display font-bold mb-6 bg-nexus-gradient bg-clip-text text-transparent">
              About NexusRAG
            </h1>
            <p className="text-xl text-nexus-muted leading-relaxed max-w-2xl mx-auto">
              NexusRAG is an AI-powered Retrieval-Augmented Generation platform developed by <span className="text-nexus-accent-light font-semibold">Abhigyan Khare</span>, an AI Engineer passionate about building intelligent systems that make knowledge retrieval faster, more accurate, and accessible.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="nexus-panel p-8"
            >
              <h2 className="text-2xl font-display font-bold mb-4 text-white">Our Goal</h2>
              <p className="text-nexus-muted leading-relaxed">
                The goal of NexusRAG is to combine advanced document retrieval with powerful language models to provide context-aware, trustworthy, and efficient AI responses. We strive to eliminate hallucinations and ground AI answers in your verified data.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="nexus-panel p-8"
            >
              <h2 className="text-2xl font-display font-bold mb-4 text-white">Our Mission</h2>
              <p className="text-nexus-muted leading-relaxed">
                To create an intelligent knowledge assistant capable of transforming complex, scattered documents into actionable insights, enabling teams to work smarter and innovate faster.
              </p>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="text-3xl font-display font-bold mb-8 text-center text-white">Technologies Used</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {[
                { icon: <Code />, label: "Python", desc: "Core Backend Logic" },
                { icon: <Globe />, label: "Flask", desc: "API Infrastructure" },
                { icon: <Database />, label: "Vector Databases", desc: "Semantic Search" },
                { icon: <Brain />, label: "Generative AI", desc: "Advanced LLMs" },
                { icon: <Cpu />, label: "RAG", desc: "Retrieval-Augmented Gen" },
                { icon: <Code />, label: "Modern Web", desc: "React & TailwindCSS" },
              ].map((tech, idx) => (
                <div key={idx} className="nexus-panel p-6 flex flex-col items-center text-center group hover:border-nexus-accent/50 transition-all">
                  <div className="w-12 h-12 rounded-full bg-nexus-accent/10 flex items-center justify-center text-nexus-accent-light mb-4 group-hover:scale-110 transition-transform">
                    {tech.icon}
                  </div>
                  <h3 className="font-semibold text-lg text-white mb-1">{tech.label}</h3>
                  <p className="text-sm text-nexus-muted">{tech.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-nexus-border/50 py-12 mt-20 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Brain className="w-5 h-5 text-nexus-accent-light" />
          <span className="font-display font-bold text-lg text-white">NexusRAG</span>
        </div>
        <p className="text-nexus-muted">© {new Date().getFullYear()} NexusRAG. Built with precision and AI.</p>
      </footer>
    </div>
  );
}

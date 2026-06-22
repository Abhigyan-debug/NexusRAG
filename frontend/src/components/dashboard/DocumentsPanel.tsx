import { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Upload, FileText, Trash2, CheckCircle, AlertCircle,
  Loader2, File, Clock,
} from 'lucide-react';
import { documentsApi } from '../../lib/api';
import { useAppStore } from '../../store';
import type { Document } from '../../types';

const statusConfig: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
  ready: { icon: CheckCircle, color: 'text-green-400', label: 'Ready' },
  processing: { icon: Loader2, color: 'text-yellow-400', label: 'Processing' },
  chunking: { icon: Loader2, color: 'text-yellow-400', label: 'Chunking' },
  embedding: { icon: Loader2, color: 'text-yellow-400', label: 'Embedding' },
  pending: { icon: Clock, color: 'text-nexus-muted', label: 'Pending' },
  error: { icon: AlertCircle, color: 'text-red-400', label: 'Error' },
};

export default function DocumentsPanel() {
  const [uploadProgress, setUploadProgress] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const setDocuments = useAppStore((s) => s.setDocuments);
  const selectedDocuments = useAppStore((s) => s.selectedDocuments);
  const toggleDocument = useAppStore((s) => s.toggleDocument);
  const setSidebarData = useAppStore((s) => s.setSidebarData);

  const { data, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const res = await documentsApi.list();
      return res.data.documents as Document[];
    },
    refetchInterval: (query) => {
      const docs = query.state.data as Document[] | undefined;
      if (docs?.some((d) => ['pending', 'processing', 'chunking', 'embedding'].includes(d.status))) {
        return 10000;
      }
      return false;
    },
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 429) return false;
      return failureCount < 3;
    },
  });

  const documents = data || [];

  useEffect(() => {
    if (data) setDocuments(data);
  }, [data, setDocuments]);

  const uploadMutation = useMutation({
    mutationFn: (files: File[]) => documentsApi.upload(files),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setUploadProgress([]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => documentsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents'] }),
  });

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setUploadProgress(acceptedFiles.map((f) => f.name));
      uploadMutation.mutate(acceptedFiles);
    },
    [uploadMutation]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    multiple: true,
  });

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const handleSelectDoc = (doc: Document) => {
    toggleDocument(doc.id);
    if (doc.metadata) {
      setSidebarData({
        keywords: doc.metadata.keywords || [],
        entities: doc.metadata.entities || [],
      });
    }
  };

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="mb-6">
        <h2 className="font-display text-xl font-semibold mb-1">Document Explorer</h2>
        <p className="text-nexus-muted text-sm">Upload and manage your knowledge base documents</p>
      </div>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 mb-6 ${
          isDragActive
            ? 'border-nexus-accent bg-nexus-accent/5'
            : 'border-nexus-border hover:border-nexus-accent/40'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="w-10 h-10 text-nexus-muted mx-auto mb-3" />
        <p className="font-medium mb-1">
          {isDragActive ? 'Drop files here' : 'Drag & drop documents here'}
        </p>
        <p className="text-nexus-muted text-sm">PDF, DOCX, TXT — up to 50MB each</p>
      </div>

      {uploadMutation.isPending && uploadProgress.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="nexus-panel p-4 mb-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 h-1 bg-nexus-accent/20 w-full">
            <motion.div 
              className="h-full bg-nexus-gradient"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          <div className="flex items-center justify-between text-sm mt-2">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-nexus-accent" />
              <span className="font-medium">Uploading {uploadProgress.length} file(s)...</span>
            </div>
            <span className="text-nexus-muted text-xs">Processing chunks</span>
          </div>
        </motion.div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-nexus-muted" />
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-12 text-nexus-muted">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No documents uploaded yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc, i) => {
            const status = statusConfig[doc.status] || statusConfig.pending;
            const StatusIcon = status.icon;
            const isSelected = selectedDocuments.includes(doc.id);
            const isProcessing = ['processing', 'chunking', 'embedding', 'pending'].includes(doc.status);

            return (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => handleSelectDoc(doc)}
                className={`nexus-panel p-4 flex items-center gap-4 cursor-pointer transition-all ${
                  isSelected ? 'border-nexus-accent/40 bg-nexus-accent/5' : 'hover:border-nexus-border/80'
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-nexus-bg flex items-center justify-center shrink-0">
                  <File className="w-5 h-5 text-nexus-accent-light" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{doc.original_filename}</p>
                  <div className="flex items-center gap-3 text-xs text-nexus-muted mt-1">
                    <span>{doc.file_type.toUpperCase()}</span>
                    <span>{formatSize(doc.file_size)}</span>
                    {doc.page_count > 0 && <span>{doc.page_count} pages</span>}
                    {doc.metadata?.classification && (
                      <span className="px-1.5 py-0.5 rounded bg-nexus-accent/10 text-nexus-accent-light">
                        {doc.metadata.classification}
                      </span>
                    )}
                  </div>
                </div>
                <div className={`flex items-center gap-1.5 text-xs ${status.color}`}>
                  <StatusIcon className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                  {status.label}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteMutation.mutate(doc.id);
                  }}
                  className="p-2 text-nexus-muted hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/5"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

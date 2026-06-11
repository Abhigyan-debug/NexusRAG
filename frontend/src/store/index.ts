import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Document, Message, Citation } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  tokenExpiry: number | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  isTokenExpired: () => boolean;
  refreshToken: (newToken: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      tokenExpiry: null,
      setAuth: (user, token) => {
        localStorage.setItem('nexus_token', token);
        localStorage.setItem('nexus_user', JSON.stringify(user));
        // Token expires in 24 hours
        const expiry = Date.now() + 24 * 60 * 60 * 1000;
        localStorage.setItem('nexus_token_expiry', expiry.toString());
        set({ user, token, tokenExpiry: expiry });
      },
      logout: () => {
        localStorage.removeItem('nexus_token');
        localStorage.removeItem('nexus_user');
        localStorage.removeItem('nexus_token_expiry');
        set({ user: null, token: null, tokenExpiry: null });
      },
      isAuthenticated: () => !!get().token && !get().isTokenExpired(),
      isTokenExpired: () => {
        const expiry = get().tokenExpiry;
        if (!expiry) return true;
        // Refresh if expiring within 5 minutes
        return Date.now() > expiry - 5 * 60 * 1000;
      },
      refreshToken: (newToken: string) => {
        localStorage.setItem('nexus_token', newToken);
        const expiry = Date.now() + 24 * 60 * 60 * 1000;
        localStorage.setItem('nexus_token_expiry', expiry.toString());
        set({ token: newToken, tokenExpiry: expiry });
      },
    }),
    { name: 'nexus-auth' }
  )
);

interface AppState {
  activeSection: string;
  setActiveSection: (section: string) => void;
  selectedDocuments: number[];
  setSelectedDocuments: (ids: number[]) => void;
  toggleDocument: (id: number) => void;
  documents: Document[];
  setDocuments: (docs: Document[]) => void;
  currentChatId: number | null;
  setCurrentChatId: (id: number | null) => void;
  sidebarKeywords: { keyword: string; score: number }[];
  sidebarEntities: { text: string; type: string }[];
  sidebarConfidence: number;
  setSidebarData: (data: {
    keywords?: { keyword: string; score: number }[];
    entities?: { text: string; type: string }[];
    confidence?: number;
  }) => void;
  latestCitations: Citation[];
  setLatestCitations: (citations: Citation[]) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  aiModel: string;
  setAiModel: (model: string) => void;
}

export const useAppStore = create<AppState>()(persist((set, get) => ({
  activeSection: 'overview',
  setActiveSection: (section) => set({ activeSection: section }),
  selectedDocuments: [],
  setSelectedDocuments: (ids) => set({ selectedDocuments: ids }),
  toggleDocument: (id) => {
    const current = get().selectedDocuments;
    set({
      selectedDocuments: current.includes(id)
        ? current.filter((d) => d !== id)
        : [...current, id],
    });
  },
  documents: [],
  setDocuments: (docs) => set({ documents: docs }),
  currentChatId: null,
  setCurrentChatId: (id) => set({ currentChatId: id }),
  sidebarKeywords: [],
  sidebarEntities: [],
  sidebarConfidence: 0,
  setSidebarData: (data) =>
    set({
      sidebarKeywords: data.keywords ?? get().sidebarKeywords,
      sidebarEntities: data.entities ?? get().sidebarEntities,
      sidebarConfidence: data.confidence ?? get().sidebarConfidence,
    }),
  latestCitations: [],
  setLatestCitations: (citations) => set({ latestCitations: citations }),
  apiKey: '',
  setApiKey: (key) => set({ apiKey: key }),
  aiModel: 'gemini-2.5-flash',
  setAiModel: (model) => set({ aiModel: model }),
}), { name: 'nexus-app-settings', partialize: (state) => ({ apiKey: state.apiKey, aiModel: state.aiModel }) }));

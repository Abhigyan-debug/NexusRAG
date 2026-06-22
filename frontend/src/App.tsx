import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AboutPage from './pages/AboutPage';
import ProtectedRoute from './components/ProtectedRoute';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30000 },
  },
});

const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, rotateY: 15, scale: 0.95, z: -100 }}
    animate={{ opacity: 1, rotateY: 0, scale: 1, z: 0 }}
    exit={{ opacity: 0, rotateY: -15, scale: 0.95, z: -100 }}
    transition={{ type: "spring", stiffness: 200, damping: 20 }}
    className="min-h-screen w-full transform-style-3d origin-center"
  >
    {children}
  </motion.div>
);

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <div className="perspective-[2000px] min-h-screen w-full overflow-x-hidden">
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageWrapper><LandingPage /></PageWrapper>} />
          <Route path="/login" element={<PageWrapper><LoginPage /></PageWrapper>} />
          <Route path="/register" element={<PageWrapper><RegisterPage /></PageWrapper>} />
          <Route path="/about" element={<PageWrapper><AboutPage /></PageWrapper>} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <PageWrapper><DashboardPage /></PageWrapper>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AnimatedRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

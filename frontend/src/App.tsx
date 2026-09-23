import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AboutPage from './pages/AboutPage';
import ProtectedRoute, { GuestRoute } from './components/ProtectedRoute';
import { queryClient } from './lib/queryClient';
import { useApplyTheme } from './lib/theme';

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
          <Route path="/login" element={<GuestRoute><PageWrapper><LoginPage /></PageWrapper></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><PageWrapper><RegisterPage /></PageWrapper></GuestRoute>} />
          <Route path="/about" element={<PageWrapper><AboutPage /></PageWrapper>} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <PageWrapper><DashboardPage /></PageWrapper>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  useApplyTheme();

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AnimatedRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

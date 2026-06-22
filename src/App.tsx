import { useEffect, useState } from 'react';
import { Toaster } from "@/components/ui/toaster";
import PinLock from "./components/PinLock";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "./components/layout/DashboardLayout";
import { initializeIfNeeded } from "./data/store";
import { ensureAnonymousSession } from "./integrations/supabase/client";
import AgendaPage from "./pages/Agenda";
import CalendarioPage from "./pages/Calendario";
import FinanzasPage from "./pages/Finanzas";
import HabitosPage from "./pages/Habitos";
import LifeWheelPage from "./pages/LifeWheelPage";
import ProjectManagementPage from "./pages/ProjectManagement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [unlocked, setUnlocked] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    initializeIfNeeded();
    // Initialize anonymous auth session on mount
    ensureAnonymousSession().then(() => setAuthReady(true));
  }, []);

  const handleUnlock = async () => {
    await ensureAnonymousSession();
    setUnlocked(true);
  };

  if (!unlocked) return <PinLock onUnlock={handleUnlock} />;
  if (!authReady) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <DashboardLayout>
            <Routes>
              <Route path="/" element={<Navigate to="/calendario" replace />} />
              <Route path="/agenda" element={<AgendaPage />} />
              <Route path="/calendario" element={<CalendarioPage />} />
              <Route path="/finanzas" element={<FinanzasPage />} />
              <Route path="/rueda" element={<LifeWheelPage />} />
              <Route path="/habitos" element={<HabitosPage />} />
              <Route path="/pm" element={<ProjectManagementPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </DashboardLayout>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

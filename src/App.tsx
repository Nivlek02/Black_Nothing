import { useEffect, useState } from 'react';
import { Toaster } from "@/components/ui/toaster";
import PinLock from "./components/PinLock";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import DashboardLayout from "./components/layout/DashboardLayout";
import { initializeIfNeeded } from "./data/store";
import AgendaPage from "./pages/Agenda";
import CalendarioPage from "./pages/Calendario";
import FinanzasPage from "./pages/Finanzas";
import ProjectManagementPage from "./pages/ProjectManagement";
import NotFound from "./pages/NotFound";
import { Navigate } from "react-router-dom";

const queryClient = new QueryClient();

const App = () => {
  const [unlocked, setUnlocked] = useState(false);
  useEffect(() => { initializeIfNeeded(); }, []);

  if (!unlocked) return <PinLock onUnlock={() => setUnlocked(true)} />;

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <DashboardLayout>
            <Routes>
              <Route path="/" element={<Navigate to="/agenda" replace />} />
              <Route path="/agenda" element={<AgendaPage />} />
              <Route path="/calendario" element={<CalendarioPage />} />
              <Route path="/finanzas" element={<FinanzasPage />} />
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

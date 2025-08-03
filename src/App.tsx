import React, { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import { CreditProvider } from "@/contexts/CreditContext";
import { setupHashCleaner } from "@/utils/urlUtils";
import { authLog } from "@/utils/logger";
import LogLevelControl from "@/components/debug/LogLevelControl";

const queryClient = new QueryClient();

interface AppProps {
  children: React.ReactNode;
}

const App: React.FC<AppProps> = ({ children }) => {
  // 设置全局hash清理器
  useEffect(() => {
    authLog('设置全局OAuth hash清理器');
    const cleanup = setupHashCleaner();

    return cleanup;
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CreditProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            {children}
            <LogLevelControl />
          </TooltipProvider>
        </CreditProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;

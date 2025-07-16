import React, { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { setupHashCleaner } from "@/utils/urlUtils";

const queryClient = new QueryClient();

interface AppProps {
  children: React.ReactNode;
}

const App: React.FC<AppProps> = ({ children }) => {
  // 设置全局hash清理器
  useEffect(() => {
    console.log('🚀 设置全局OAuth hash清理器');
    const cleanup = setupHashCleaner();
    
    return cleanup;
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <AppLayout>
            <Toaster />
            <Sonner />
            {children}
          </AppLayout>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;

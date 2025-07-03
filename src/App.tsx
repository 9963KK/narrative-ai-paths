import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import AppMain from "./pages/AppMain";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";
import QuickStart from "./pages/QuickStart";
import Advanced from "./pages/Advanced";
import DocumentAnalysis from "./pages/DocumentAnalysis";
import Story from "./pages/Story";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* 根路径 - 智能重定向 */}
            <Route path="/" element={<Index />} />
            
            {/* 登录页面 - 公开访问 */}
            <Route path="/login" element={<Login />} />
            
            {/* 主应用功能页面 - 需要登录 */}
            <Route 
              path="/app" 
              element={
                <ProtectedRoute>
                  <AppMain />
                </ProtectedRoute>
              } 
            />
            
            {/* 快速开始页面 - 需要登录 */}
            <Route 
              path="/app/quick-start" 
              element={
                <ProtectedRoute>
                  <QuickStart />
                </ProtectedRoute>
              } 
            />
            
            {/* 专业模式页面 - 需要登录 */}
            <Route 
              path="/app/advanced" 
              element={
                <ProtectedRoute>
                  <Advanced />
                </ProtectedRoute>
              } 
            />
            
            {/* 文档分析页面 - 需要登录 */}
            <Route 
              path="/app/document" 
              element={
                <ProtectedRoute>
                  <DocumentAnalysis />
                </ProtectedRoute>
              } 
            />
            
            {/* 故事界面 - 需要登录 */}
            <Route 
              path="/app/story" 
              element={
                <ProtectedRoute>
                  <Story />
                </ProtectedRoute>
              } 
            />
            
            {/* 设置页面 - 需要登录 */}
            <Route 
              path="/settings" 
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } 
            />
            
            {/* 个人资料页面 - 需要登录 */}
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } 
            />
            
            {/* 管理员后台 - 需要登录 */}
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

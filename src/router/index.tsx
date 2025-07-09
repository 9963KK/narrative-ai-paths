import { createBrowserRouter } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { OAuthCallback } from "@/components/auth/OAuthCallback";

// 导入所有页面组件
import Index from "../pages/Index";
import Home from "../pages/Home";
import Login from "../pages/Login";
import AdminDashboard from "../pages/AdminDashboard";
import NotFound from "../pages/NotFound";
import QuickStart from "../pages/QuickStart";
import Advanced from "../pages/Advanced";
import DocumentAnalysis from "../pages/DocumentAnalysis";
import Story from "../pages/Story";
import StoryDetail from "../pages/StoryDetail";
import SaveArchive from "../pages/SaveArchive";
import Settings from "../pages/Settings";
import Profile from "../pages/Profile";

// 创建路由配置
export const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/auth/callback",
    element: <OAuthCallback />,
  },
  {
    path: "/app",
    element: (
      <ProtectedRoute>
        <Story />
      </ProtectedRoute>
    ),
  },
  {
    path: "/app/index",
    element: (
      <ProtectedRoute>
        <Index />
      </ProtectedRoute>
    ),
  },
  {
    path: "/app/quick-start",
    element: (
      <ProtectedRoute>
        <QuickStart />
      </ProtectedRoute>
    ),
  },
  {
    path: "/app/advanced",
    element: (
      <ProtectedRoute>
        <Advanced />
      </ProtectedRoute>
    ),
  },
  {
    path: "/app/document",
    element: (
      <ProtectedRoute>
        <DocumentAnalysis />
      </ProtectedRoute>
    ),
  },
  {
    path: "/app/story",
    element: (
      <ProtectedRoute>
        <StoryDetail />
      </ProtectedRoute>
    ),
  },
  {
    path: "/saves",
    element: (
      <ProtectedRoute>
        <SaveArchive />
      </ProtectedRoute>
    ),
  },
  {
    path: "/settings",
    element: (
      <ProtectedRoute>
        <Settings />
      </ProtectedRoute>
    ),
  },
  {
    path: "/profile",
    element: (
      <ProtectedRoute>
        <Profile />
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin",
    element: (
      <ProtectedRoute>
        <AdminDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);
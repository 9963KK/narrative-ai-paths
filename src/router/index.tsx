import { createBrowserRouter } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { OAuthCallback } from "@/components/auth/OAuthCallback";
import { AppLayout } from "@/components/layout/AppLayout";

// 导入所有页面组件
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
import StoryCreating from "../pages/StoryCreating";
import AuthCallbackTest from "../pages/AuthCallbackTest";
import DatabaseTest from "../pages/DatabaseTest";
import DebugApiKey from "../pages/DebugApiKey";
import CreditTest from "../pages/CreditTest";
import ModelConfigTest from "../pages/ModelConfigTest";
import ConfigDebugger from "../components/ConfigDebugger";

// 创建路由配置
export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: "login",
        element: <Login />,
      },
      {
        path: "auth/callback",
        element: <OAuthCallback />,
      },
      {
        path: "auth/test",
        element: <AuthCallbackTest />,
      },
      {
        path: "db/test",
        element: <DatabaseTest />,
      },
      {
        path: "debug/api-key",
        element: (
          <ProtectedRoute>
            <DebugApiKey />
          </ProtectedRoute>
        ),
      },
      {
        path: "debug/credit",
        element: (
          <ProtectedRoute>
            <CreditTest />
          </ProtectedRoute>
        ),
      },
      {
        path: "debug/model-config",
        element: (
          <ProtectedRoute>
            <ModelConfigTest />
          </ProtectedRoute>
        ),
      },
      {
        path: "debug/config-flow",
        element: (
          <ProtectedRoute>
            <ConfigDebugger />
          </ProtectedRoute>
        ),
      },
      {
        path: "app",
        element: (
          <ProtectedRoute>
            <Story />
          </ProtectedRoute>
        ),
      },
      {
        path: "app/quick",
        element: (
          <ProtectedRoute>
            <QuickStart />
          </ProtectedRoute>
        ),
      },
      {
        path: "app/advanced",
        element: (
          <ProtectedRoute>
            <Advanced />
          </ProtectedRoute>
        ),
      },
      {
        path: "app/filebase",
        element: (
          <ProtectedRoute>
            <DocumentAnalysis />
          </ProtectedRoute>
        ),
      },
      {
        path: "app/story",
        element: (
          <ProtectedRoute>
            <StoryDetail />
          </ProtectedRoute>
        ),
      },
      {
        path: "app/creating",
        element: (
          <ProtectedRoute>
            <StoryCreating />
          </ProtectedRoute>
        ),
      },
      {
        path: "saves",
        element: (
          <ProtectedRoute>
            <SaveArchive />
          </ProtectedRoute>
        ),
      },
      {
        path: "settings",
        element: (
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        ),
      },
      {
        path: "profile",
        element: (
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        ),
      },
      {
        path: "admin",
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
    ],
  },
]);
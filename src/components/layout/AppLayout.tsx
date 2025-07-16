import React, { memo } from 'react';
import { useLocation } from 'react-router-dom';
import { UserHeader } from '@/components/auth/UserHeader';

interface AppLayoutProps {
  children: React.ReactNode;
}

// 不需要显示UserHeader的路由
const PUBLIC_ROUTES = [
  '/',
  '/login', 
  '/auth/callback',
  '/auth/test',
  '/db/test'
];

// 检查是否需要显示UserHeader
const shouldShowUserHeader = (pathname: string): boolean => {
  return !PUBLIC_ROUTES.includes(pathname) && !pathname.includes('*');
};

export const AppLayout: React.FC<AppLayoutProps> = memo(({ children }) => {
  const location = useLocation();
  const showUserHeader = shouldShowUserHeader(location.pathname);

  return (
    <>
      {showUserHeader && <UserHeader />}
      {children}
    </>
  );
});

AppLayout.displayName = 'AppLayout';
import React, { memo } from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import { UserHeader } from '@/components/auth/UserHeader';

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

export const AppLayout: React.FC = memo(() => {
  const location = useLocation();
  const showUserHeader = shouldShowUserHeader(location.pathname);

  return (
    <>
      {showUserHeader && <UserHeader />}
      <Outlet />
    </>
  );
});

AppLayout.displayName = 'AppLayout';
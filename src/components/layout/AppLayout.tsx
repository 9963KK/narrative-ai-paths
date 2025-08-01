import React, { memo } from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import { UserHeader } from '@/components/auth/UserHeader';

// 不需要显示UserHeader的路由
const ROUTES_WITHOUT_HEADER = [
  '/',
  '/login',
  '/auth/callback',
  '/auth/test',
  '/db/test',
  '/admin'  // 管理员页面有自己的头部，不需要UserHeader
];

// 检查是否需要显示UserHeader
const shouldShowUserHeader = (pathname: string): boolean => {
  return !ROUTES_WITHOUT_HEADER.includes(pathname) && !pathname.includes('*');
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
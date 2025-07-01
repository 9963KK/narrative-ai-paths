
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import StoryManager from '@/components/StoryManager';
import { UserHeader } from '@/components/auth/UserHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Home } from 'lucide-react';

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showAdminRedirect, setShowAdminRedirect] = useState(false);

  useEffect(() => {
    // 如果是管理员且是首次访问首页（不是从/admin返回的），显示重定向选项
    if (user && user.role === 'admin' && !location.state?.fromAdmin) {
      setShowAdminRedirect(true);
    }
  }, [user, location.state]);

  const handleGoToAdmin = () => {
    navigate('/admin');
  };

  const handleStayOnHome = () => {
    setShowAdminRedirect(false);
  };

  // 如果是管理员且需要显示重定向选择
  if (user && user.role === 'admin' && showAdminRedirect) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Shield className="h-6 w-6" />
              管理员账户
            </CardTitle>
            <CardDescription>
              您是管理员用户，可以选择进入管理后台或继续使用普通功能
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleGoToAdmin} 
              className="w-full" 
              size="lg"
            >
              <Shield className="h-4 w-4 mr-2" />
              进入管理后台
            </Button>
            <Button 
              onClick={handleStayOnHome} 
              variant="outline" 
              className="w-full" 
              size="lg"
            >
              <Home className="h-4 w-4 mr-2" />
              继续使用首页
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <UserHeader />
      <div className="container mx-auto">
        <StoryManager />
      </div>
    </div>
  );
};

export default Index;

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, User, Mail, Lock, Github } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { unifiedAuthService } from '@/services/unifiedAuthService';
import type { OAuthProvider } from '@/lib/supabase';
// 移除同步通知，因为新系统不需要复杂的同步逻辑

const registerSchema = z.object({
  username: z.string().min(3, '用户名至少需要3个字符').max(20, '用户名不能超过20个字符'),
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(6, '密码至少需要6个字符').max(50, '密码不能超过50个字符'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "密码确认不匹配",
  path: ["confirmPassword"],
});

const loginSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(1, '请输入密码')
});

type RegisterForm = z.infer<typeof registerSchema>;
type LoginForm = z.infer<typeof loginSchema>;

interface AuthFormProps {
  onLogin: (email: string, password: string) => Promise<boolean>;
  onRegister: (username: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  onGuestLogin: () => Promise<boolean>;
  onOAuthLogin?: (provider: OAuthProvider) => Promise<boolean>;
}

export const AuthForm: React.FC<AuthFormProps> = ({ onLogin, onRegister, onGuestLogin, onOAuthLogin }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('login');
  const [oauthSupported, setOauthSupported] = useState(false);
  const navigate = useNavigate();

  const {
    register: registerForm,
    handleSubmit: handleRegisterSubmit,
    formState: { errors: registerErrors },
    reset: resetRegister
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema)
  });

  const {
    register: loginForm,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
    reset: resetLogin
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema)
  });

  // 检查OAuth支持
  useEffect(() => {
    const checkOAuthSupport = async () => {
      try {
        const status = await unifiedAuthService.getConnectionStatus();
        setOauthSupported(status.oauthSupported);
      } catch (error) {
        console.error('检查OAuth支持失败:', error);
        setOauthSupported(false);
      }
    };
    
    checkOAuthSupport();
  }, []);

  const handleLogin = async (data: LoginForm) => {
    setIsLoading(true);
    setError('');
    
    try {
      const success = await onLogin(data.email, data.password);
      if (success) {
        // 登录成功后，跳转到智能重定向页面
        navigate('/app/index');
      } else {
        setError('邮箱或密码错误');
      }
    } catch (err) {
      setError('登录失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (data: RegisterForm) => {
    setIsLoading(true);
    setError('');
    
    try {
      const result = await onRegister(data.username, data.email, data.password);
      if (result.success) {
        resetRegister();
        setActiveTab('login');
        setError('');
      } else {
        setError(result.error || '注册失败，请稍后重试');
      }
    } catch (err) {
      setError('注册失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setError('');
    resetLogin();
    resetRegister();
  };

  const handleGuestLogin = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const success = await onGuestLogin();
      if (!success) {
        setError('游客登录失败，请稍后重试');
      }
    } catch (err) {
      setError('游客登录失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: OAuthProvider) => {
    if (!onOAuthLogin) {
      setError('OAuth登录功能未配置');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      const success = await onOAuthLogin(provider);
      if (!success) {
        setError(`${provider}登录失败，请稍后重试`);
      }
    } catch (err: any) {
      setError(err.message || `${provider}登录失败，请稍后重试`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="w-full max-w-md">
        {/* 品牌标识 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-2">
            叙事AI路径
          </h1>
          <p className="text-gray-600">开启您的创作之旅</p>
        </div>
        
        <Card className="backdrop-blur-xl bg-white/70 border-0 shadow-2xl shadow-black/10">
          <CardContent className="p-8">
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-100/60 p-1 h-12 rounded-xl">
                <TabsTrigger 
                  value="login" 
                  className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 font-medium transition-all duration-300"
                >
                  登录
                </TabsTrigger>
                <TabsTrigger 
                  value="register" 
                  className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 font-medium transition-all duration-300"
                >
                  注册
                </TabsTrigger>
              </TabsList>
              
              {error && (
                <Alert className="mb-4" variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <TabsContent value="login" className="space-y-4 mt-0">
              <form onSubmit={handleLoginSubmit(handleLogin)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-sm font-medium text-gray-700">邮箱</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="请输入邮箱"
                      className="pl-9 h-11 bg-white/80 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      {...loginForm('email')}
                    />
                  </div>
                  {loginErrors.email && (
                    <p className="text-sm text-red-500">{loginErrors.email.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-sm font-medium text-gray-700">密码</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="请输入密码"
                      className="pl-9 pr-9 h-11 bg-white/80 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      {...loginForm('password')}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors" />
                      )}
                    </Button>
                  </div>
                  {loginErrors.password && (
                    <p className="text-sm text-red-500">{loginErrors.password.message}</p>
                  )}
                </div>
                
                <Button type="submit" className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed" disabled={isLoading}>
                  {isLoading ? '登录中...' : '登录'}
                </Button>
                </form>
              </TabsContent>

              <TabsContent value="register" className="space-y-4 mt-0">
              <form onSubmit={handleRegisterSubmit(handleRegister)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-username" className="text-sm font-medium text-gray-700">用户名</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="register-username"
                      type="text"
                      placeholder="请输入用户名"
                      className="pl-9 h-11 bg-white/80 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      {...registerForm('username')}
                    />
                  </div>
                  {registerErrors.username && (
                    <p className="text-sm text-red-500">{registerErrors.username.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-email" className="text-sm font-medium text-gray-700">邮箱</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="请输入邮箱"
                      className="pl-9 h-11 bg-white/80 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      {...registerForm('email')}
                    />
                  </div>
                  {registerErrors.email && (
                    <p className="text-sm text-red-500">{registerErrors.email.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="register-password" className="text-sm font-medium text-gray-700">密码</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="register-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="请输入密码"
                      className="pl-9 pr-9 h-11 bg-white/80 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      {...registerForm('password')}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors" />
                      )}
                    </Button>
                  </div>
                  {registerErrors.password && (
                    <p className="text-sm text-red-500">{registerErrors.password.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-confirm-password" className="text-sm font-medium text-gray-700">确认密码</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="register-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="请再次输入密码"
                      className="pl-9 pr-9 h-11 bg-white/80 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      {...registerForm('confirmPassword')}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors" />
                      )}
                    </Button>
                  </div>
                  {registerErrors.confirmPassword && (
                    <p className="text-sm text-red-500">{registerErrors.confirmPassword.message}</p>
                  )}
                </div>
                
                  <Button type="submit" className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed" disabled={isLoading}>
                    {isLoading ? '注册中...' : '注册'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
            
            {/* OAuth社交登录 - 仅在登录时显示 */}
            {oauthSupported && onOAuthLogin && activeTab === 'login' && (
              <div className="flex flex-col items-center space-y-4 pt-6 mt-6">
                <div className="relative w-full">
                  <hr className="border-gray-200" />
                  <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 bg-white px-4 text-sm text-gray-500">
                    或使用第三方账户登录
                  </span>
                </div>
                <div className="flex items-center justify-center space-x-4">
                  <Button 
                    variant="outline" 
                    size="icon"
                    className="w-12 h-12 rounded-full border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105" 
                    onClick={() => handleOAuthLogin('google')}
                    disabled={isLoading}
                    title="Google 登录"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="icon"
                    className="w-12 h-12 rounded-full border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105" 
                    onClick={() => handleOAuthLogin('github')}
                    disabled={isLoading}
                    title="GitHub 登录"
                  >
                    <Github className="w-5 h-5 text-gray-700" />
                  </Button>
                </div>
              </div>
            )}

            {/* 游客模式按钮 */}
            <div className={`flex flex-col items-center space-y-4 pt-6 mt-6 ${(oauthSupported && onOAuthLogin && activeTab === 'login') ? '' : 'relative'}`}>
              {!(oauthSupported && onOAuthLogin && activeTab === 'login') && (
                <div className="relative w-full">
                  <hr className="border-gray-200" />
                  <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 bg-white px-4 text-sm text-gray-500">
                    想要快速体验？
                  </span>
                </div>
              )}
              {(oauthSupported && onOAuthLogin && activeTab === 'login') && (
                <p className="text-sm text-gray-500 text-center">
                  想要快速体验？无需注册
                </p>
              )}
              <Button 
                variant="outline" 
                className="w-full h-11 border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02]" 
                onClick={handleGuestLogin}
                disabled={isLoading}
              >
                {isLoading ? '正在进入...' : '游客模式体验'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
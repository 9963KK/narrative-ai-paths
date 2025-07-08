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
        // 登录成功后，检查是否为管理员
        const currentUser = unifiedAuthService.getCurrentUser();
        if (currentUser && currentUser.role === 'admin') {
          navigate('/admin');
        }
        // 普通用户会由ProtectedRoute正常处理
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
      <div className="w-full max-w-md">
        {/* 主标题区域 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">叙事AI路径</h1>
          <p className="text-gray-600">创作属于你的故事世界</p>
        </div>

        <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-2xl shadow-blue-500/10">
          <CardHeader className="space-y-1 text-center pb-6">
            <CardTitle className="text-xl font-semibold text-gray-800">欢迎回来</CardTitle>
            <CardDescription className="text-gray-500">
              登录您的账户继续创作
            </CardDescription>
          </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-between">
          <div className="flex-1 flex flex-col">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-100/50 p-1 h-12">
                <TabsTrigger 
                  value="login" 
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium transition-all duration-200"
                >
                  登录
                </TabsTrigger>
                <TabsTrigger 
                  value="register" 
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium transition-all duration-200"
                >
                  注册
                </TabsTrigger>
              </TabsList>
              
              {error && (
                <Alert className="mb-4 animate-in slide-in-from-top-2 fade-in-0 duration-300" variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex-1 relative">
                <TabsContent 
                  value="login" 
                  className={`absolute inset-0 space-y-4 transition-all duration-300 ease-out ${
                    activeTab === 'login' 
                      ? 'opacity-100 translate-x-0 scale-100' 
                      : 'opacity-0 translate-x-4 scale-95 pointer-events-none'
                  }`}
                >
              <form onSubmit={handleLoginSubmit(handleLogin)} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-sm font-medium text-gray-700">邮箱地址</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="输入您的邮箱地址"
                      className="pl-10 h-12 bg-white/50 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      {...loginForm('email')}
                    />
                  </div>
                  {loginErrors.email && (
                    <p className="text-sm text-red-500 animate-in slide-in-from-left-1">{loginErrors.email.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-sm font-medium text-gray-700">密码</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="输入您的密码"
                      className="pl-10 pr-10 h-12 bg-white/50 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      {...loginForm('password')}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-1/2 -translate-y-1/2 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                  {loginErrors.password && (
                    <p className="text-sm text-red-500 animate-in slide-in-from-left-1">{loginErrors.password.message}</p>
                  )}
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>登录中...</span>
                    </div>
                  ) : (
                    '登录'
                  )}
                </Button>
                </form>
                </TabsContent>

                <TabsContent 
                  value="register" 
                  className={`absolute inset-0 space-y-4 transition-all duration-300 ease-out ${
                    activeTab === 'register' 
                      ? 'opacity-100 translate-x-0 scale-100' 
                      : 'opacity-0 -translate-x-4 scale-95 pointer-events-none'
                  }`}
                >
              <form onSubmit={handleRegisterSubmit(handleRegister)} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="register-username" className="text-sm font-medium text-gray-700">用户名</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="register-username"
                      type="text"
                      placeholder="输入您的用户名"
                      className="pl-10 h-12 bg-white/50 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      {...registerForm('username')}
                    />
                  </div>
                  {registerErrors.username && (
                    <p className="text-sm text-red-500 animate-in slide-in-from-left-1">{registerErrors.username.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-email" className="text-sm font-medium text-gray-700">邮箱地址</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="输入您的邮箱地址"
                      className="pl-10 h-12 bg-white/50 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      {...registerForm('email')}
                    />
                  </div>
                  {registerErrors.email && (
                    <p className="text-sm text-red-500 animate-in slide-in-from-left-1">{registerErrors.email.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="register-password" className="text-sm font-medium text-gray-700">密码</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="register-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="设置您的密码"
                      className="pl-10 pr-10 h-12 bg-white/50 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
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
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                  {registerErrors.password && (
                    <p className="text-sm text-red-500">{registerErrors.password.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-confirm-password">确认密码</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="register-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="请再次输入密码"
                      className="pl-9 pr-9"
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
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                  {registerErrors.confirmPassword && (
                    <p className="text-sm text-red-500">{registerErrors.confirmPassword.message}</p>
                  )}
                </div>
                
                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>注册中...</span>
                      </div>
                    ) : (
                      '创建账户'
                    )}
                  </Button>
                </form>
                </TabsContent>
              </div>
            </Tabs>
          </div>
          
          {/* OAuth社交登录 */}
          {oauthSupported && onOAuthLogin && (
            <div className="space-y-4 pt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-300"></span>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500 font-medium">或</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Google 登录 */}
                <Button 
                  variant="outline" 
                  className="h-11 border border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200"
                  onClick={() => handleOAuthLogin('google')}
                  disabled={isLoading}
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="text-sm font-medium">Google</span>
                </Button>
                
                {/* GitHub 登录 */}
                <Button 
                  variant="outline" 
                  className="h-11 border border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200"
                  onClick={() => handleOAuthLogin('github')}
                  disabled={isLoading}
                >
                  <Github className="w-5 h-5 mr-2" />
                  <span className="text-sm font-medium">GitHub</span>
                </Button>
              </div>
            </div>
          )}

          {/* 游客模式按钮 */}
          <div className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-3">
                想要快速体验？
              </p>
              <Button 
                variant="ghost" 
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-medium transition-all duration-200" 
                onClick={handleGuestLogin}
                disabled={isLoading}
              >
                {isLoading ? '正在进入...' : '游客模式体验 →'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};
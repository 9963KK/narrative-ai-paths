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
import { AnimatedCard, AnimatedHeader } from '@/components/AnimatedCard';
import { useAuth } from '@/contexts/AuthContext';
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
  onOAuthLogin?: (provider: OAuthProvider) => Promise<boolean>;
}

export const AuthForm: React.FC<AuthFormProps> = ({ onLogin, onRegister, onOAuthLogin }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('login');
  const [oauthSupported, setOauthSupported] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

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
        // 登录成功，跳转逻辑由Login页面的useEffect处理
        // 这里不需要做任何导航，让AuthContext和Login页面处理
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
        // 注册成功后直接登录
        const loginSuccess = await onLogin(data.email, data.password);
        if (loginSuccess) {
          // 登录成功，跳转到应用页面
          navigate('/app');
        } else {
          // 如果自动登录失败，切换到登录标签页
          resetRegister();
          setActiveTab('login');
          setError('注册成功！请使用您的账户登录。');
        }
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
    <div className="min-h-screen flex items-center justify-center bg-[#fdfbf9] p-4 font-serif relative overflow-hidden">
      {/* Paper texture background */}
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{ backgroundImage: `url(https://www.transparenttextures.com/patterns/cream-paper.png)` }}
      />

      {/* Decorative corner ornaments */}
      <div className="absolute top-0 left-0 w-32 h-32 border-t-2 border-l-2 border-[#c5a059]/30 rounded-tl-3xl" />
      <div className="absolute top-0 right-0 w-32 h-32 border-t-2 border-r-2 border-[#c5a059]/30 rounded-tr-3xl" />
      <div className="absolute bottom-0 left-0 w-32 h-32 border-b-2 border-l-2 border-[#c5a059]/30 rounded-bl-3xl" />
      <div className="absolute bottom-0 right-0 w-32 h-32 border-b-2 border-r-2 border-[#c5a059]/30 rounded-br-3xl" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Identity */}
        <AnimatedHeader>
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-[#2c241b] rounded-2xl mb-4 shadow-lg border-2 border-[#c5a059]">
              <svg className="w-10 h-10 text-[#c5a059]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-[#2c241b] mb-2 tracking-tight">
              织梦师
            </h1>
            <p className="text-[#5d554a] italic">开启您的创作之旅</p>
          </div>
        </AnimatedHeader>

        <AnimatedCard index={1}>
          <Card className="bg-white/80 backdrop-blur-sm border-2 border-[#e8e4d9] shadow-[0_8px_30px_rgba(197,160,89,0.15)] rounded-2xl overflow-hidden">
            <CardContent className="p-8">
              <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList className="grid w-full grid-cols-2 mb-6 bg-[#f2f0ea] p-1 h-12 rounded-xl border border-[#e8e4d9]">
                  <TabsTrigger
                    value="login"
                    className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[#2c241b] data-[state=active]:border data-[state=active]:border-[#c5a059] font-medium transition-all duration-300 font-serif"
                  >
                    登录
                  </TabsTrigger>
                  <TabsTrigger
                    value="register"
                    className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[#2c241b] data-[state=active]:border data-[state=active]:border-[#c5a059] font-medium transition-all duration-300 font-serif"
                  >
                    注册
                  </TabsTrigger>
                </TabsList>

                {error && (
                  <Alert className="mb-4 bg-[#fffdf9] border-[#8a4b38]/50 text-[#8a4b38]" variant="destructive">
                    <AlertDescription className="font-serif">{error}</AlertDescription>
                  </Alert>
                )}

                <TabsContent value="login" className="space-y-4 mt-0">
                  <form onSubmit={handleLoginSubmit(handleLogin)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-sm font-medium text-[#2c241b] font-serif">邮箱</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-[#8c7b6c]" />
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="请输入邮箱"
                          className="pl-9 h-11 bg-[#faf7f2] border-[#e8e4d9] rounded-lg focus:border-[#c5a059] focus:ring-2 focus:ring-[#c5a059]/20 transition-all duration-200 font-serif text-[#2c241b]"
                          {...loginForm('email')}
                        />
                      </div>
                      {loginErrors.email && (
                        <p className="text-sm text-[#8a4b38] font-serif">{loginErrors.email.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="text-sm font-medium text-[#2c241b] font-serif">密码</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-[#8c7b6c]" />
                        <Input
                          id="login-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="请输入密码"
                          className="pl-9 pr-9 h-11 bg-[#faf7f2] border-[#e8e4d9] rounded-lg focus:border-[#c5a059] focus:ring-2 focus:ring-[#c5a059]/20 transition-all duration-200 font-serif text-[#2c241b]"
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
                            <EyeOff className="h-4 w-4 text-[#8c7b6c] hover:text-[#2c241b] transition-colors" />
                          ) : (
                            <Eye className="h-4 w-4 text-[#8c7b6c] hover:text-[#2c241b] transition-colors" />
                          )}
                        </Button>
                      </div>
                      {loginErrors.password && (
                        <p className="text-sm text-[#8a4b38] font-serif">{loginErrors.password.message}</p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-11 bg-[#2c241b] hover:bg-[#c5a059] text-[#fdfbf9] font-medium rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-serif border border-[#c5a059]"
                      disabled={isLoading}
                    >
                      {isLoading ? '登录中...' : '登录'}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="register" className="space-y-4 mt-0">
                  <form onSubmit={handleRegisterSubmit(handleRegister)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-username" className="text-sm font-medium text-[#2c241b] font-serif">用户名</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-[#8c7b6c]" />
                        <Input
                          id="register-username"
                          type="text"
                          placeholder="请输入用户名"
                          className="pl-9 h-11 bg-[#faf7f2] border-[#e8e4d9] rounded-lg focus:border-[#c5a059] focus:ring-2 focus:ring-[#c5a059]/20 transition-all duration-200 font-serif text-[#2c241b]"
                          {...registerForm('username')}
                        />
                      </div>
                      {registerErrors.username && (
                        <p className="text-sm text-[#8a4b38] font-serif">{registerErrors.username.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-email" className="text-sm font-medium text-[#2c241b] font-serif">邮箱</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-[#8c7b6c]" />
                        <Input
                          id="register-email"
                          type="email"
                          placeholder="请输入邮箱"
                          className="pl-9 h-11 bg-[#faf7f2] border-[#e8e4d9] rounded-lg focus:border-[#c5a059] focus:ring-2 focus:ring-[#c5a059]/20 transition-all duration-200 font-serif text-[#2c241b]"
                          {...registerForm('email')}
                        />
                      </div>
                      {registerErrors.email && (
                        <p className="text-sm text-[#8a4b38] font-serif">{registerErrors.email.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-password" className="text-sm font-medium text-[#2c241b] font-serif">密码</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-[#8c7b6c]" />
                        <Input
                          id="register-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="请输入密码"
                          className="pl-9 pr-9 h-11 bg-[#faf7f2] border-[#e8e4d9] rounded-lg focus:border-[#c5a059] focus:ring-2 focus:ring-[#c5a059]/20 transition-all duration-200 font-serif text-[#2c241b]"
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
                            <EyeOff className="h-4 w-4 text-[#8c7b6c] hover:text-[#2c241b] transition-colors" />
                          ) : (
                            <Eye className="h-4 w-4 text-[#8c7b6c] hover:text-[#2c241b] transition-colors" />
                          )}
                        </Button>
                      </div>
                      {registerErrors.password && (
                        <p className="text-sm text-[#8a4b38] font-serif">{registerErrors.password.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-confirm-password" className="text-sm font-medium text-[#2c241b] font-serif">确认密码</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-[#8c7b6c]" />
                        <Input
                          id="register-confirm-password"
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="请再次输入密码"
                          className="pl-9 pr-9 h-11 bg-[#faf7f2] border-[#e8e4d9] rounded-lg focus:border-[#c5a059] focus:ring-2 focus:ring-[#c5a059]/20 transition-all duration-200 font-serif text-[#2c241b]"
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
                            <EyeOff className="h-4 w-4 text-[#8c7b6c] hover:text-[#2c241b] transition-colors" />
                          ) : (
                            <Eye className="h-4 w-4 text-[#8c7b6c] hover:text-[#2c241b] transition-colors" />
                          )}
                        </Button>
                      </div>
                      {registerErrors.confirmPassword && (
                        <p className="text-sm text-[#8a4b38] font-serif">{registerErrors.confirmPassword.message}</p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-11 bg-[#2c241b] hover:bg-[#c5a059] text-[#fdfbf9] font-medium rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-serif border border-[#c5a059]"
                      disabled={isLoading}
                    >
                      {isLoading ? '注册中...' : '注册并开始创作'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              {/* OAuth Social Login - Only show on login tab */}
              {oauthSupported && onOAuthLogin && activeTab === 'login' && (
                <div className="flex flex-col items-center space-y-4 pt-6 mt-6">
                  <div className="relative w-full">
                    <hr className="border-[#e8e4d9]" />
                    <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 bg-white px-4 text-sm text-[#8c7b6c] font-serif">
                      或使用第三方账户登录
                    </span>
                  </div>
                  <div className="flex items-center justify-center space-x-4">
                    <Button
                      variant="outline"
                      size="icon"
                      className="w-12 h-12 rounded-full border-[#e8e4d9] hover:border-[#c5a059] bg-white hover:bg-[#faf7f2] shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                      onClick={() => handleOAuthLogin('google')}
                      disabled={isLoading}
                      title="Google 登录"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                    </Button>

                    <Button
                      variant="outline"
                      size="icon"
                      className="w-12 h-12 rounded-full border-[#e8e4d9] hover:border-[#c5a059] bg-white hover:bg-[#faf7f2] shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                      onClick={() => handleOAuthLogin('github')}
                      disabled={isLoading}
                      title="GitHub 登录"
                    >
                      <Github className="w-5 h-5 text-[#2c241b]" />
                    </Button>
                  </div>
                </div>
              )}

            </CardContent>
          </Card>
        </AnimatedCard>
      </div>
    </div>
  );
};
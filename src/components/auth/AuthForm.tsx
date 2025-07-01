import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, User, Mail, Lock } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/services/authService';
import { SyncNotification } from '@/components/SyncNotification';

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
  emailOrUsername: z.string().min(1, '请输入邮箱或用户名'),
  password: z.string().min(1, '请输入密码')
});

type RegisterForm = z.infer<typeof registerSchema>;
type LoginForm = z.infer<typeof loginSchema>;

interface AuthFormProps {
  onLogin: (emailOrUsername: string, password: string) => Promise<boolean>;
  onRegister: (username: string, email: string, password: string) => Promise<boolean>;
  onGuestLogin: () => Promise<boolean>;
}

export const AuthForm: React.FC<AuthFormProps> = ({ onLogin, onRegister, onGuestLogin }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('login');
  const [syncKey, setSyncKey] = useState(0); // 用于强制刷新同步状态
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

  const handleLogin = async (data: LoginForm) => {
    setIsLoading(true);
    setError('');
    
    try {
      const success = await onLogin(data.emailOrUsername, data.password);
      if (success) {
        // 登录成功后，检查是否为管理员
        const currentUser = authService.getCurrentUser();
        if (currentUser && currentUser.role === 'admin') {
          navigate('/admin');
        }
        // 普通用户会由ProtectedRoute正常处理
      } else {
        setError('用户名/邮箱或密码错误');
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
      const success = await onRegister(data.username, data.email, data.password);
      if (success) {
        resetRegister();
        setActiveTab('login');
        setError('');
        // 注册成功后刷新同步状态，可能有新的待同步用户
        handleSyncCompleted();
      } else {
        setError('注册失败，邮箱可能已被使用');
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

  // 同步完成后的回调，刷新同步状态
  const handleSyncCompleted = () => {
    setSyncKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md space-y-4">
        {/* 同步状态通知 */}
        <SyncNotification key={syncKey} onSyncCompleted={handleSyncCompleted} />
        
        <Card className="min-h-[580px] flex flex-col">
          <CardHeader className="space-y-1 flex-shrink-0">
            <CardTitle className="text-2xl text-center">叙事AI路径</CardTitle>
            <CardDescription className="text-center">
              登录您的账户或创建新账户开始使用
            </CardDescription>
          </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-between">
          <div className="flex-1 flex flex-col">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-2 mb-4 transition-all duration-200">
                <TabsTrigger value="login" className="transition-all duration-200 ease-out">登录</TabsTrigger>
                <TabsTrigger value="register" className="transition-all duration-200 ease-out">注册</TabsTrigger>
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
              <form onSubmit={handleLoginSubmit(handleLogin)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-emailOrUsername">邮箱或用户名</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="login-emailOrUsername"
                      type="text"
                      placeholder="请输入邮箱或用户名"
                      className="pl-9"
                      {...loginForm('emailOrUsername')}
                    />
                  </div>
                  {loginErrors.emailOrUsername && (
                    <p className="text-sm text-red-500">{loginErrors.emailOrUsername.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="login-password">密码</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="请输入密码"
                      className="pl-9 pr-9"
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
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                  {loginErrors.password && (
                    <p className="text-sm text-red-500">{loginErrors.password.message}</p>
                  )}
                </div>
                
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? '登录中...' : '登录'}
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
              <form onSubmit={handleRegisterSubmit(handleRegister)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-username">用户名</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="register-username"
                      type="text"
                      placeholder="请输入用户名"
                      className="pl-9"
                      {...registerForm('username')}
                    />
                  </div>
                  {registerErrors.username && (
                    <p className="text-sm text-red-500">{registerErrors.username.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-email">邮箱</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="请输入邮箱"
                      className="pl-9"
                      {...registerForm('email')}
                    />
                  </div>
                  {registerErrors.email && (
                    <p className="text-sm text-red-500">{registerErrors.email.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="register-password">密码</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="register-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="请输入密码"
                      className="pl-9 pr-9"
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
                
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? '注册中...' : '注册'}
                  </Button>
                </form>
                </TabsContent>
              </div>
            </Tabs>
          </div>
          
          {/* 游客模式按钮 */}
          <div className="flex flex-col items-center space-y-3 pt-4 border-t">
            <p className="text-sm text-gray-500 text-center">
              想要快速体验？无需注册
            </p>
            <Button 
              variant="outline" 
              className="w-full" 
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
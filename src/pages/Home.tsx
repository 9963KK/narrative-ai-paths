import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  Sparkles, 
  Zap, 
  PenTool,
  ArrowRight,
  Star,
  Brain,
  Layers,
  FileText,
  Share2,
  CheckCircle,
  Settings,
  Target,
  Cpu,
  Users2,
  Palette
} from 'lucide-react';
import { AnimatedCard, AnimatedHeader, AnimatedGrid } from '@/components/AnimatedCard';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { loginAsGuest } = useAuth();


  // 快速开始游客体验
  const handleQuickStart = async () => {
    try {
      const success = await loginAsGuest();
      if (success) {
        navigate('/app/quick');
      }
    } catch (error) {
      console.error('游客登录失败:', error);
    }
  };

  const features = [
    {
      icon: <Brain className="w-7 h-7 text-white" />,
      title: "AI 智能创作",
      description: "基于先进AI技术，帮助您生成引人入胜的故事内容和创意灵感。",
      color: "from-blue-500 to-cyan-500",
      bgColor: "bg-gradient-to-br from-blue-500 to-cyan-500"
    },
    {
      icon: <Layers className="w-7 h-7 text-white" />,
      title: "故事路径设计",
      description: "创建多分支叙事路径，让读者参与到故事的发展中来。",
      color: "from-purple-500 to-pink-500",
      bgColor: "bg-gradient-to-br from-purple-500 to-pink-500"
    },
    {
      icon: <FileText className="w-7 h-7 text-white" />,
      title: "内容管理",
      description: "高效管理您的创作内容，支持多种格式和组织方式。",
      color: "from-green-500 to-emerald-500",
      bgColor: "bg-gradient-to-br from-green-500 to-emerald-500"
    },
    {
      icon: <Share2 className="w-7 h-7 text-white" />,
      title: "协作平台",
      description: "支持多用户协作，与团队成员共享创意和作品。",
      color: "from-orange-500 to-red-500",
      bgColor: "bg-gradient-to-br from-orange-500 to-red-500"
    }
  ];

  const platformFeatures = [
    {
      icon: <Users2 className="w-6 h-6 text-blue-600" />,
      title: "用户自主选择",
      description: "每个故事节点都提供多个选择分支，您的决定决定故事走向，真正的互动式阅读体验。"
    },
    {
      icon: <Target className="w-6 h-6 text-purple-600" />,
      title: "故事结局定制化",
      description: "根据您的选择路径和偏好，AI智能生成个性化结局，每次体验都独一无二。"
    },
    {
      icon: <Cpu className="w-6 h-6 text-green-600" />,
      title: "多模型适配",
      description: "支持多种AI模型无缝切换，从轻量快速到深度创作，满足不同场景需求。"
    },
    {
      icon: <Palette className="w-6 h-6 text-orange-600" />,
      title: "风格自适应",
      description: "AI学习您的阅读偏好，自动调整故事风格、语言特色和情节节奏。"
    },
    {
      icon: <Settings className="w-6 h-6 text-indigo-600" />,
      title: "深度定制化",
      description: "从角色设定到世界观构建，支持全方位个性化定制，打造专属故事宇宙。"
    },
    {
      icon: <CheckCircle className="w-6 h-6 text-emerald-600" />,
      title: "智能续写辅助",
      description: "AI实时分析故事脉络，提供续写建议和情节优化，让创作更加流畅自然。"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 will-change-scroll">
      {/* Header */}
      <header className="relative z-10 bg-white/80 backdrop-blur-md border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                织梦师
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/login">
                <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
                  登录
                </Button>
              </Link>
              <Link to="/login">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105">
                  开始创作
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>


      {/* Hero Section */}
      <section className="relative py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedHeader className="text-center">
            <Badge className="mb-6 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 border-0">
              <Sparkles className="w-4 h-4 mr-2" />
              AI 驱动的创作平台
            </Badge>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-8 leading-tight">
              释放您的
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                创作潜能
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-12 leading-relaxed">
              通过AI智能辅助，打造引人入胜的交互式故事。无论您是作家、教育工作者还是内容创作者，都能在这里找到无限可能。
            </p>
          </AnimatedHeader>
          <AnimatedCard index={1}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/login">
                <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 text-lg font-medium shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                  立即开始创作
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 px-8 py-4 text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300">
                <BookOpen className="mr-2 w-5 h-5" />
                查看示例
              </Button>
            </div>
          </AnimatedCard>
        </div>

        {/* 装饰性元素 - 优化性能 */}
        <div className="absolute top-20 left-4 w-72 h-72 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full mix-blend-multiply filter blur-lg opacity-15 will-change-transform"></div>
        <div className="absolute bottom-20 right-4 w-72 h-72 bg-gradient-to-r from-pink-400 to-red-400 rounded-full mix-blend-multiply filter blur-lg opacity-15 will-change-transform"></div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedCard index={2}>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                强大的功能特性
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                我们提供全方位的创作工具，帮助您轻松构建精彩的交互式故事体验
              </p>
            </div>
          </AnimatedCard>
          
          <AnimatedGrid startIndex={3} className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="group bg-white/80 border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] hover:-translate-y-1 will-change-transform">
                <CardHeader className="text-center pb-4">
                  <div className={`inline-flex items-center justify-center w-20 h-20 ${feature.bgColor} rounded-3xl mx-auto mb-6 shadow-lg group-hover:shadow-xl transform group-hover:scale-105 transition-all duration-300 will-change-transform`}>
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-300">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </AnimatedGrid>
        </div>
      </section>

      {/* Platform Features Section */}
      <section className="py-20 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedCard index={7}>
            <div className="text-center mb-16">
              <Badge className="mb-6 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 border-0">
                <Sparkles className="w-4 h-4 mr-2" />
                平台核心优势
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                为什么选择织梦师？
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                我们专注于打造最智能、最个性化的AI故事创作平台，让每一个故事都成为独特的艺术品
              </p>
            </div>
          </AnimatedCard>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {platformFeatures.map((feature, index) => (
              <AnimatedCard key={index} index={8 + index}>
                <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200/50 h-full">
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mr-4 shadow-sm">
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">{feature.title}</h3>
                  </div>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </AnimatedCard>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <AnimatedCard index={0} delay={100}>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              准备开始您的创作之旅了吗？
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              加入我们的创作者社区，体验AI辅助创作的无限可能
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/login">
                <Button size="lg" className="w-full sm:w-auto bg-white text-blue-600 hover:bg-gray-50 px-8 py-4 text-lg font-medium shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                  立即注册
                  <Star className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={handleQuickStart}
                className="w-full sm:w-auto border-white/80 text-white bg-white/10 hover:bg-white hover:text-blue-600 backdrop-blur-sm px-8 py-4 text-lg font-medium transition-all duration-300 hover:border-white shadow-xl hover:shadow-2xl"
              >
                游客体验
                <Zap className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </AnimatedCard>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedCard index={0} delay={200}>
            <div className="text-center">
              <div className="flex items-center justify-center space-x-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <span className="text-xl font-bold text-white">织梦师</span>
              </div>
              <p className="text-gray-400 mb-4">
                让AI成为您创作路上的最佳伙伴
              </p>
              <p className="text-sm text-gray-500">
                © 2025 织梦师. 保留所有权利.
              </p>
              <p className="text-xs text-gray-400 mt-2">
                官方邮箱: ai_novel_official@ai-novel.top
              </p>
            </div>
          </AnimatedCard>
        </div>
      </footer>
    </div>
  );
};

export default Home;
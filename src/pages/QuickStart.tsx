import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Settings, Wand2, Users, Target, MapPin, Sparkles } from 'lucide-react';
import { AnimatedCard, AnimatedHeader, AnimatedGrid } from '@/components/AnimatedCard';
import { ModelConfig as ModelConfigType } from '@/components/model-config/constants';
import { modelConfigAdapter } from '@/services/modelConfigAdapter';
import { storyAI } from '@/services/storyAI';

// 基础故事配置
interface BaseStoryConfig {
  genre: string;
  story_idea: string;
  main_goal?: string;
}

const QuickStart: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [hasValidConfig, setHasValidConfig] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  
  // 简单配置状态
  const [simpleConfig, setSimpleConfig] = useState<BaseStoryConfig>({
    genre: '',
    story_idea: '',
    main_goal: ''
  });

  const [modelConfig, setModelConfig] = useState<ModelConfigType>({
    provider: 'openai',
    model: 'gpt-4',
    apiKey: '',
    temperature: 0.8,
    maxTokens: 2000
  });

  // 故事梗概选择相关状态
  const [storyOutlines, setStoryOutlines] = useState<string[]>([]);
  const [isGeneratingOutlines, setIsGeneratingOutlines] = useState(false);
  const [showOutlineSelection, setShowOutlineSelection] = useState(false);
  const [originalSimpleConfig, setOriginalSimpleConfig] = useState<BaseStoryConfig | null>(null);

  // 组件加载时检查用户模型配置
  useEffect(() => {
    const loadUserConfig = async () => {
      try {
        // 检查用户是否有可用模型（基于等级）
        const hasModels = await modelConfigAdapter.hasAvailableModels();
        if (!hasModels) {
          setHasValidConfig(false);
          console.warn('用户没有可用的模型');
          return;
        }

        // 获取用户模型配置
        const userConfig = await modelConfigAdapter.getUserModelConfig();
        if (userConfig) {
          setModelConfig(userConfig);
          setHasValidConfig(true);
        } else {
          setHasValidConfig(false);
          console.warn('用户没有可用的模型配置');
        }
      } catch (error) {
        console.error('加载用户配置失败:', error);
        setHasValidConfig(false);
      } finally {
        setIsLoadingConfig(false);
      }
    };
    
    loadUserConfig();
  }, []);

  const genres = [
    { value: 'sci-fi', label: '🚀 科幻小说', desc: '探索未来科技与太空' },
    { value: 'fantasy', label: '🐉 奇幻小说', desc: '魔法与神话世界' },
    { value: 'mystery', label: '🔍 推理悬疑', desc: '解谜与侦探故事' },
    { value: 'romance', label: '💕 浪漫爱情', desc: '情感与关系发展' },
    { value: 'thriller', label: '⚡惊悚恐怖', desc: '紧张刺激的冒险' },
    { value: 'historical', label: '🏛️ 历史小说', desc: '重现过去的时代' },
    { value: 'slice-of-life', label: '🌸 日常生活', desc: '温馨的生活片段' },
    { value: 'adventure', label: '🗺️ 冒险探索', desc: '刺激的旅程体验' }
  ];

  const totalSteps = 3;
  const stepTitles = ["选择类型", "描述想法", "设定目标"];

  // 故事类型的图标和标题映射
  const genreIcons = {
    'sci-fi': '🚀',
    'fantasy': '🐉', 
    'mystery': '🔍',
    'romance': '💕',
    'thriller': '⚡',
    'historical': '🏛️',
    'slice-of-life': '🌸',
    'adventure': '🗺️'
  };

  const genreTitles = {
    'sci-fi': '科幻小说',
    'fantasy': '奇幻小说', 
    'mystery': '推理悬疑',
    'romance': '浪漫爱情',
    'thriller': '惊悚恐怖',
    'historical': '历史小说',
    'slice-of-life': '日常生活',
    'adventure': '冒险探索'
  };

  // 步骤导航函数
  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // 检查当前步骤是否可以继续
  const canProceedFromStep = (step: number) => {
    switch (step) {
      case 1:
        return simpleConfig.genre !== '';
      case 2:
        return simpleConfig.story_idea.trim() !== '';
      case 3:
        return simpleConfig.main_goal?.trim() !== '';
      default:
        return false;
    }
  };

  // 处理简单配置提交 - 生成故事梗概
  const handleSimpleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasApiKey = modelConfig.apiKey || hasValidConfig;
    if (simpleConfig.genre && simpleConfig.story_idea && hasApiKey) {
      setOriginalSimpleConfig(simpleConfig);
      setIsGeneratingOutlines(true);
      
      try {
        let configToUse = modelConfig;
        if (!modelConfig.apiKey && hasValidConfig) {
          const userConfig = await modelConfigAdapter.getUserModelConfig();
          if (userConfig) {
            configToUse = userConfig;
            setModelConfig(userConfig);
          }
        }
        
        // 模型配置现在由统一AI服务自动管理
        
        console.log('🎨 开始生成故事梗概...');
        const outlines = await storyAI.generateStoryOutlines(
          simpleConfig.story_idea,
          simpleConfig.genre,
          simpleConfig.main_goal
        );
        
        console.log('✅ 故事梗概生成完成:', outlines);
        setStoryOutlines(outlines);
        setShowOutlineSelection(true);
      } catch (error) {
        console.error('❌ 生成故事梗概失败:', error);
        alert('生成故事梗概失败，请检查网络连接或API配置');
      } finally {
        setIsGeneratingOutlines(false);
      }
    }
  };
  
  // 处理梗概选择
  const handleOutlineSelection = async (selectedOutline: string, index: number) => {
    if (!originalSimpleConfig) return;
    
    // 根据选择的梗概创建增强的配置
    const enhancedConfig = {
      ...originalSimpleConfig,
      story_idea: selectedOutline, // 使用选择的梗概作为故事想法
      protagonist: '主角',
      setting: `适合${originalSimpleConfig.genre}类型的世界`,
      special_requirements: `基于梗概：${selectedOutline}`,
      character_count: 3,
      preferred_ending: 'open',
      story_length: 'medium',
      tone: 'serious',
      story_goals: [
        {
          id: '1',
          description: originalSimpleConfig.main_goal || '完成主要任务',
          type: 'main',
          priority: 'high'
        }
      ]
    };
    
    let configToUse = modelConfig;
    if (!modelConfig.apiKey && hasValidConfig) {
      const userConfig = await modelConfigAdapter.getUserModelConfig();
      if (userConfig) {
        configToUse = userConfig;
        setModelConfig(userConfig);
      }
    }
    
    console.log('🚀 基于选择的梗概创建故事:', selectedOutline);
    
    // 保存配置到 localStorage
    localStorage.setItem('pendingStoryConfig', JSON.stringify({
      config: enhancedConfig,
      modelConfig: configToUse,
      isAdvanced: true
    }));
    
    // 重定向到故事创作页面
    navigate('/app/creating');
  };


  // 故事梗概选择界面
  if (showOutlineSelection) {
    return (
      <div className="min-h-screen bg-gray-50 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-50/20 via-gray-50 to-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-5xl mx-auto">
            {/* Return Button */}
            <div className="mb-6">
              <Button
                variant="ghost"
                onClick={() => setShowOutlineSelection(false)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100/80"
              >
                <ArrowLeft className="h-4 w-4" />
                返回修改配置
              </Button>
            </div>
            
            {/* Page Header */}
            <AnimatedHeader>
              <div className="text-center mb-12">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl mb-6 shadow-xl">
                  <Wand2 className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-4xl font-bold text-gray-800 mb-3">
                  选择您的故事方向
                </h1>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  AI已经基于您的灵感生成了 {storyOutlines.length} 个不同风格的故事梗概
                </p>
                
                {originalSimpleConfig && (
                  <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 max-w-3xl mx-auto">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mt-1">
                        <span className="text-white text-sm font-bold">💡</span>
                      </div>
                      <div className="text-left">
                        <p className="text-blue-800 font-medium mb-1">您的原始想法：</p>
                        <p className="text-blue-700">{originalSimpleConfig.story_idea}</p>
                        {originalSimpleConfig.main_goal && (
                          <>
                            <p className="text-blue-800 font-medium mt-3 mb-1">期望目标：</p>
                            <p className="text-blue-700">{originalSimpleConfig.main_goal}</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </AnimatedHeader>
            {/* Story Outlines Grid */}
            <AnimatedGrid startIndex={1} className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
              {storyOutlines.map((outline, index) => (
                <Card
                  key={index}
                  className="group cursor-pointer transition-all duration-300 border-0 shadow-lg hover:shadow-2xl bg-white/80 backdrop-blur-sm hover:bg-white"
                  onClick={() => handleOutlineSelection(outline, index)}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${
                            index === 0 ? 'bg-gradient-to-br from-emerald-500 to-teal-600' :
                            index === 1 ? 'bg-gradient-to-br from-purple-500 to-pink-600' :
                            index === 2 ? 'bg-gradient-to-br from-orange-500 to-red-600' :
                            'bg-gradient-to-br from-blue-500 to-indigo-600'
                          }`}>
                            <Sparkles className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex flex-col">
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                              index === 0 ? 'bg-emerald-100 text-emerald-700' :
                              index === 1 ? 'bg-purple-100 text-purple-700' :
                              index === 2 ? 'bg-orange-100 text-orange-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {simpleConfig.genre}
                            </span>
                          </div>
                        </div>
                        <CardTitle className="text-xl font-bold text-gray-800 group-hover:text-indigo-600 transition-colors mb-2">
                          故事方向 {index + 1}
                        </CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0 space-y-4">
                    <div className="bg-gray-50/80 p-4 rounded-xl">
                      <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        📖 <span>故事大纲</span>
                      </h4>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        {outline}
                      </p>
                    </div>
                    
                    <div className="pt-4">
                      <Button 
                        className={`w-full shadow-lg hover:shadow-xl transition-all duration-300 transform group-hover:scale-105 ${
                          index === 0 ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700' :
                          index === 1 ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700' :
                          index === 2 ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700' :
                          'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOutlineSelection(outline, index);
                        }}
                      >
                        选择这个故事方向
                        <Wand2 className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </AnimatedGrid>
            
            <div className="mt-12 text-center">
              <AnimatedCard index={5}>
                <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-200/50 max-w-2xl mx-auto">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                    <p className="text-gray-700 font-medium">
                      选择一个梗概后，AI将基于您的选择创建完整的故事开篇
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowOutlineSelection(false)}
                    className="text-gray-600 border-gray-300 hover:bg-gray-50"
                  >
                    不满意？重新生成梗概
                  </Button>
                </div>
              </AnimatedCard>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 主要的分步向导界面
  return (
    <div className="min-h-screen bg-gray-50 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-50/20 via-gray-50 to-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Page Header */}
          <AnimatedHeader>
            <div className="text-center mb-12">
              {/* 返回主页按钮 */}
              <div className="flex justify-start mb-6">
                <Button
                  onClick={() => navigate('/app')}
                  variant="outline"
                  className="px-6 py-3 bg-white border-gray-200 hover:border-gray-300 text-gray-700 hover:text-gray-900 font-medium shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 rounded-xl"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  返回主页
                </Button>
              </div>
              
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl mb-6 shadow-xl">
                <Wand2 className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-gray-800 mb-3">
                快速创作模式
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                跟随向导，一步步构建您的专属故事世界
              </p>
            </div>
          </AnimatedHeader>

          {/* Progress Steps */}
          <AnimatedCard index={1}>
            <div className="mb-8">
              <div className="flex items-center justify-center space-x-4 mb-4">
                {stepTitles.map((title, index) => (
                  <div key={index} className="flex flex-col items-center">
                    <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${
                      currentStep > index + 1 
                        ? 'bg-green-500 border-green-500 text-white shadow-lg' 
                        : currentStep === index + 1
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' 
                        : 'bg-white border-gray-300 text-gray-400'
                    }`}>
                      {currentStep > index + 1 ? (
                        <span className="text-sm font-bold">✓</span>
                      ) : (
                        <span className="text-sm font-bold">{index + 1}</span>
                      )}
                    </div>
                    <span className={`text-sm mt-2 transition-colors ${
                      currentStep >= index + 1 ? 'text-indigo-600 font-medium' : 'text-gray-500'
                    }`}>
                      {title}
                    </span>
                  </div>
                ))}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                ></div>
              </div>
            </div>
          </AnimatedCard>

          {/* Main Form */}
          {currentStep === 1 && (
            <AnimatedCard index={2}>
              <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-6">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl mb-4">
                      <span className="text-2xl">🎭</span>
                    </div>
                    <CardTitle className="text-2xl font-bold text-gray-800 mb-2">
                      选择故事类型
                    </CardTitle>
                    <p className="text-gray-600">
                      选择一个您感兴趣的故事类型，AI 将据此调整创作风格
                    </p>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {genres.map((genre) => (
                      <div
                        key={genre.value}
                        onClick={() => setSimpleConfig(prev => ({ ...prev, genre: genre.value }))}
                        className={`border-2 p-4 rounded-2xl text-center cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
                          simpleConfig.genre === genre.value
                            ? 'border-indigo-500 bg-gradient-to-br from-indigo-50 to-purple-50 shadow-lg transform scale-105'
                            : 'border-gray-200 hover:border-indigo-300 bg-white'
                        }`}
                      >
                        <div className="text-3xl mb-3">{genreIcons[genre.value as keyof typeof genreIcons]}</div>
                        <div className="font-semibold text-gray-800 text-sm mb-1">
                          {genreTitles[genre.value as keyof typeof genreTitles]}
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">{genre.desc}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button
                      onClick={nextStep}
                      disabled={!canProceedFromStep(1)}
                      className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
                    >
                      下一步：描述想法
                      <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </AnimatedCard>
          )}

          {/* Step 2: Story Idea */}
          {currentStep === 2 && (
            <AnimatedCard index={2}>
              <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-6">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-4">
                      <span className="text-2xl">💡</span>
                    </div>
                    <CardTitle className="text-2xl font-bold text-gray-800 mb-2">
                      分享您的故事想法
                    </CardTitle>
                    <p className="text-gray-600">
                      描述您脑海中的故事核心概念，可以是一个场景、角色或冲突
                    </p>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-2xl border border-blue-200">
                      <p className="text-blue-800 text-sm font-medium mb-2">💭 创作提示</p>
                      <p className="text-blue-700 text-sm leading-relaxed">
                        一句话即可，例如："一个失忆的赏金猎人在霓虹闪烁的未来都市里，寻找自己被盗走的记忆。"
                      </p>
                    </div>

                    <Textarea
                      value={simpleConfig.story_idea}
                      onChange={(e) => setSimpleConfig(prev => ({ ...prev, story_idea: e.target.value }))}
                      rows={6}
                      className="w-full p-4 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500/20 rounded-xl resize-none"
                      placeholder="请在此输入您的故事想法...&#10;&#10;可以描述：&#10;• 主要角色和背景&#10;• 核心冲突或挑战&#10;• 故事发生的世界或时代&#10;• 您想要探索的主题"
                    />

                    <div className="flex justify-between pt-4">
                      <Button
                        onClick={prevStep}
                        variant="outline"
                        className="px-8 py-3 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl"
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        上一步
                      </Button>
                      <Button
                        onClick={nextStep}
                        disabled={!canProceedFromStep(2)}
                        className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
                      >
                        下一步：设定目标
                        <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </AnimatedCard>
          )}

          {/* Step 3: Main Goal */}
          {currentStep === 3 && (
            <AnimatedCard index={2}>
              <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-6">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl mb-4">
                      <Target className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-gray-800 mb-2">
                      设定故事目标
                    </CardTitle>
                    <p className="text-gray-600">
                      定义故事的核心目标，这将指导整个故事的发展方向
                    </p>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-2xl border border-purple-200">
                      <p className="text-purple-800 text-sm font-medium mb-2">🎯 目标示例</p>
                      <p className="text-purple-700 text-sm leading-relaxed">
                        例如："找回记忆并复仇"、"拯救被邪恶公司控制的城市"、"找到真爱"、"揭开家族秘密"...
                      </p>
                    </div>

                    <Input
                      value={simpleConfig.main_goal || ''}
                      onChange={(e) => setSimpleConfig(prev => ({ ...prev, main_goal: e.target.value }))}
                      className="w-full p-4 border-gray-300 focus:border-purple-500 focus:ring-purple-500/20 rounded-xl text-lg"
                      placeholder="请描述故事的主要目标..."
                    />

                    {/* AI Features Preview */}
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-2xl border border-indigo-200">
                      <div className="flex items-center gap-3 mb-4">
                        <Sparkles className="w-6 h-6 text-indigo-600" />
                        <h4 className="text-lg font-semibold text-gray-800">AI将自动为您创建</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 p-3 bg-white/60 rounded-xl">
                          <Users className="h-5 w-5 text-indigo-600" />
                          <span className="text-sm font-medium text-gray-700">3-5个个性鲜明的角色</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-white/60 rounded-xl">
                          <MapPin className="h-5 w-5 text-purple-600" />
                          <span className="text-sm font-medium text-gray-700">详细的故事背景设定</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-white/60 rounded-xl">
                          <Target className="h-5 w-5 text-pink-600" />
                          <span className="text-sm font-medium text-gray-700">引人入胜的开场情节</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-white/60 rounded-xl">
                          <Sparkles className="h-5 w-5 text-indigo-600" />
                          <span className="text-sm font-medium text-gray-700">符合类型的故事氛围</span>
                        </div>
                      </div>
                    </div>


                    <div className="flex justify-between pt-4">
                      <Button
                        onClick={prevStep}
                        variant="outline"
                        className="px-8 py-3 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl"
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        上一步
                      </Button>
                      <Button
                        onClick={handleSimpleSubmit}
                        disabled={!canProceedFromStep(3) || (!modelConfig.apiKey && !hasValidConfig) || isGeneratingOutlines}
                        className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
                      >
                        {isGeneratingOutlines ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            AI正在生成梗概...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            完成配置，生成梗概
                            <Wand2 className="h-4 w-4" />
                          </div>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </AnimatedCard>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickStart;

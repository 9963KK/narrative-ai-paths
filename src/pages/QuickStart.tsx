import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Settings, Wand2, Users, Target, MapPin, Sparkles, PenTool, BookOpen, Feather } from 'lucide-react';
import { AnimatedCard, AnimatedHeader, AnimatedGrid } from '@/components/AnimatedCard';
import { ModelConfig as ModelConfigType } from '@/components/model-config/constants';
import { modelConfigAdapter } from '@/services/modelConfigAdapter';
import { storyAI } from '@/services/storyAI';
import { FadeIn } from '@/components/animations/FadeIn';

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
    { value: 'sci-fi', label: '科幻小说', desc: '探索未来科技与太空', icon: '🚀' },
    { value: 'fantasy', label: '奇幻小说', desc: '魔法与神话世界', icon: '🐉' },
    { value: 'mystery', label: '推理悬疑', desc: '解谜与侦探故事', icon: '🔍' },
    { value: 'romance', label: '浪漫爱情', desc: '情感与关系发展', icon: '💕' },
    { value: 'thriller', label: '惊悚恐怖', desc: '紧张刺激的冒险', icon: '⚡' },
    { value: 'historical', label: '历史小说', desc: '重现过去的时代', icon: '🏛️' },
    { value: 'slice-of-life', label: '日常生活', desc: '温馨的生活片段', icon: '🌸' },
    { value: 'adventure', label: '冒险探索', desc: '刺激的旅程体验', icon: '🗺️' }
  ];

  const totalSteps = 3;
  const stepTitles = ["选择类型", "描述想法", "设定目标"];

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
      <div className="min-h-screen font-serif text-[#2c241b] bg-[#fdfbf9] selection:bg-[#c5a059] selection:text-white pb-20">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            {/* Return Button */}
            <div className="mb-8">
              <Button
                variant="ghost"
                onClick={() => setShowOutlineSelection(false)}
                className="flex items-center gap-2 text-[#8c7b6c] hover:text-[#2c241b] hover:bg-[#c5a059]/10"
              >
                <ArrowLeft className="h-4 w-4" />
                返回修改配置
              </Button>
            </div>

            {/* Page Header */}
            <AnimatedHeader>
              <div className="text-center mb-12">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-[#c5a059]/10 rounded-2xl mb-6 border border-[#c5a059]/20">
                  <Wand2 className="w-8 h-8 text-[#c5a059]" />
                </div>
                <h1 className="text-3xl font-bold text-[#2c241b] mb-3 font-serif">
                  选择您的故事方向
                </h1>
                <p className="text-lg text-[#5d554a] max-w-2xl mx-auto font-serif">
                  AI已经基于您的灵感生成了 {storyOutlines.length} 个不同风格的故事梗概
                </p>

                {originalSimpleConfig && (
                  <div className="mt-8 p-6 bg-[#f0ebe0] rounded-xl border border-[#f2f0ea] max-w-3xl mx-auto text-left relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#c5a059]"></div>
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-1">
                        <Feather className="w-5 h-5 text-[#c5a059]" />
                      </div>
                      <div>
                        <p className="text-[#8c7b6c] text-xs font-bold uppercase tracking-wider mb-2">您的原始想法</p>
                        <p className="text-[#2c241b] font-medium leading-relaxed mb-4">{originalSimpleConfig.story_idea}</p>
                        {originalSimpleConfig.main_goal && (
                          <>
                            <p className="text-[#8c7b6c] text-xs font-bold uppercase tracking-wider mb-2">期望目标</p>
                            <p className="text-[#2c241b] font-medium leading-relaxed">{originalSimpleConfig.main_goal}</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </AnimatedHeader>

            {/* Story Outlines Grid */}
            <AnimatedGrid startIndex={1} className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {storyOutlines.map((outline, index) => (
                <Card
                  key={index}
                  className="group cursor-pointer transition-all duration-300 border border-[#f2f0ea] shadow-sm hover:shadow-xl hover:border-[#c5a059]/50 bg-white"
                  onClick={() => handleOutlineSelection(outline, index)}
                >
                  <CardHeader className="pb-4 border-b border-[#f5f2eb]">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-xl bg-[#fdfbf9] border border-[#f2f0ea] flex items-center justify-center text-[#c5a059] group-hover:bg-[#c5a059] group-hover:text-white transition-colors">
                            <Sparkles className="w-5 h-5" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-medium px-2 py-1 rounded-full bg-[#f0ebe0] text-[#5d554a] border border-[#f2f0ea]">
                              {genres.find(g => g.value === simpleConfig.genre)?.label || simpleConfig.genre}
                            </span>
                          </div>
                        </div>
                        <CardTitle className="text-lg font-bold text-[#2c241b] group-hover:text-[#c5a059] transition-colors font-serif">
                          故事方向 {index + 1}
                        </CardTitle>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-6 space-y-6">
                    <div className="relative">
                      <p className="text-[#5d554a] text-sm leading-relaxed font-serif line-clamp-6">
                        {outline}
                      </p>
                    </div>

                    <div className="pt-2">
                      <Button
                        className="w-full bg-[#2c241b] text-[#fdfbf9] hover:bg-[#c5a059] shadow-md transition-all duration-300"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOutlineSelection(outline, index);
                        }}
                      >
                        选择此方向
                        <Wand2 className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </AnimatedGrid>

            <div className="mt-12 text-center">
              <AnimatedCard index={5}>
                <div className="inline-block">
                  <Button
                    variant="outline"
                    onClick={() => setShowOutlineSelection(false)}
                    className="text-[#8c7b6c] border-[#f2f0ea] hover:border-[#c5a059] hover:text-[#c5a059] bg-transparent"
                  >
                    不满意？返回重新生成
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
    <div className="min-h-screen font-serif text-[#2c241b] bg-[#fdfbf9] selection:bg-[#c5a059] selection:text-white pb-20">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <AnimatedHeader>
            <div className="text-center mb-10">
              {/* 返回主页按钮 */}
              <div className="flex justify-start mb-6">
                <Button
                  onClick={() => navigate('/app')}
                  variant="ghost"
                  className="text-[#8c7b6c] hover:text-[#2c241b] hover:bg-[#c5a059]/10 gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  返回主页
                </Button>
              </div>

              <div className="inline-flex items-center justify-center w-16 h-16 bg-[#c5a059]/10 rounded-2xl mb-6 border border-[#c5a059]/20">
                <PenTool className="w-8 h-8 text-[#c5a059]" />
              </div>
              <h1 className="text-3xl font-bold text-[#2c241b] mb-3 font-serif">
                快速创作模式
              </h1>
              <p className="text-lg text-[#5d554a] max-w-2xl mx-auto font-serif">
                跟随向导，只需三步，为您编织专属的故事世界
              </p>
            </div>
          </AnimatedHeader>

          {/* Progress Steps */}
          <AnimatedCard index={1}>
            <div className="mb-10 max-w-2xl mx-auto">
              <div className="flex items-center justify-between relative z-10">
                {stepTitles.map((title, index) => (
                  <div key={index} className="flex flex-col items-center group cursor-default">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-500 ${currentStep > index + 1
                      ? 'bg-[#c5a059] border-[#c5a059] text-white'
                      : currentStep === index + 1
                        ? 'bg-[#2c241b] border-[#2c241b] text-[#c5a059]'
                        : 'bg-white border-[#f2f0ea] text-[#f2f0ea]'
                      }`}>
                      {currentStep > index + 1 ? (
                        <span className="text-xs font-bold">✓</span>
                      ) : (
                        <span className="text-sm font-bold font-serif">{index + 1}</span>
                      )}
                    </div>
                    <span className={`text-xs mt-3 font-medium tracking-widest uppercase transition-colors duration-300 ${currentStep >= index + 1 ? 'text-[#2c241b]' : 'text-[#f2f0ea]'
                      }`}>
                      {title}
                    </span>
                  </div>
                ))}

                {/* Progress Track Background */}
                <div className="absolute top-5 left-0 w-full h-[2px] bg-[#f2f0ea] -z-10"></div>

                {/* Active Progress Track */}
                <div
                  className="absolute top-5 left-0 h-[2px] bg-[#c5a059] transition-all duration-500 -z-10"
                  style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
                ></div>
              </div>
            </div>
          </AnimatedCard>

          {/* Main Form */}
          <div className="relative">
            {/* Step 1: Genre Selection */}
            {currentStep === 1 && (
              <FadeIn>
                <Card className="shadow-lg border border-[#f2f0ea] bg-white">
                  <CardHeader className="pb-6 border-b border-[#f5f2eb] text-center">
                    <CardTitle className="text-xl font-bold text-[#2c241b] font-serif">
                      第一章：选择故事类型
                    </CardTitle>
                    <p className="text-[#8c7b6c] text-sm mt-2">
                      每一个伟大的故事都始于一个基调
                    </p>
                  </CardHeader>

                  <CardContent className="p-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                      {genres.map((genre) => (
                        <div
                          key={genre.value}
                          onClick={() => setSimpleConfig(prev => ({ ...prev, genre: genre.value }))}
                          className={`relative p-4 rounded-xl text-center cursor-pointer transition-all duration-300 border-2 ${simpleConfig.genre === genre.value
                            ? 'border-[#c5a059] bg-[#fdfbf9]'
                            : 'border-[#f5f2eb] hover:border-[#f2f0ea] bg-white'
                            }`}
                        >
                          <div className="text-3xl mb-3">{genre.icon}</div>
                          <div className={`font-bold text-sm mb-1 ${simpleConfig.genre === genre.value ? 'text-[#2c241b]' : 'text-[#5d554a]'}`}>
                            {genre.label}
                          </div>
                          <p className="text-xs text-[#8c7b6c] leading-snug">{genre.desc}</p>

                          {simpleConfig.genre === genre.value && (
                            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#c5a059]"></div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-center">
                      <Button
                        onClick={nextStep}
                        disabled={!canProceedFromStep(1)}
                        className="px-10 py-6 bg-[#2c241b] text-[#fdfbf9] hover:bg-[#c5a059] rounded-xl shadow-md transition-all duration-300 text-lg font-serif disabled:opacity-50 disabled:hover:bg-[#2c241b]"
                      >
                        下一步：描述想法
                        <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </FadeIn>
            )}

            {/* Step 2: Story Idea */}
            {currentStep === 2 && (
              <FadeIn>
                <Card className="shadow-lg border border-[#f2f0ea] bg-white">
                  <CardHeader className="pb-6 border-b border-[#f5f2eb] text-center">
                    <CardTitle className="text-xl font-bold text-[#2c241b] font-serif">
                      第二章：勾勒故事雏形
                    </CardTitle>
                    <p className="text-[#8c7b6c] text-sm mt-2">
                      告诉我们您脑海中闪现的那个画面
                    </p>
                  </CardHeader>

                  <CardContent className="p-8">
                    <div className="space-y-6">
                      <div className="bg-[#f0ebe0] p-5 rounded-xl border border-[#f2f0ea] flex gap-4">
                        <div className="flex-shrink-0">
                          <BookOpen className="w-5 h-5 text-[#c5a059]" />
                        </div>
                        <div>
                          <p className="text-[#2c241b] text-sm font-bold mb-1 font-serif">灵感提示</p>
                          <p className="text-[#5d554a] text-sm leading-relaxed font-serif italic">
                            "一个失忆的赏金猎人在霓虹闪烁的未来都市里，寻找自己被盗走的记忆。"
                          </p>
                        </div>
                      </div>

                      <Textarea
                        value={simpleConfig.story_idea}
                        onChange={(e) => setSimpleConfig(prev => ({ ...prev, story_idea: e.target.value }))}
                        rows={6}
                        className="w-full p-5 border-[#f2f0ea] focus:border-[#c5a059] focus:ring-[#c5a059]/20 rounded-xl resize-none text-base bg-[#fdfbf9] placeholder:text-[#8c7b6c]/50 font-serif leading-relaxed"
                        placeholder="请在此输入您的故事想法...&#10;&#10;可以描述：&#10;• 主要角色和背景&#10;• 核心冲突或挑战&#10;• 故事发生的世界或时代"
                      />

                      <div className="flex justify-between items-center pt-4">
                        <Button
                          onClick={prevStep}
                          variant="ghost"
                          className="text-[#8c7b6c] hover:text-[#2c241b]"
                        >
                          <ArrowLeft className="mr-2 h-4 w-4" />
                          上一步
                        </Button>
                        <Button
                          onClick={nextStep}
                          disabled={!canProceedFromStep(2)}
                          className="px-8 py-6 bg-[#2c241b] text-[#fdfbf9] hover:bg-[#c5a059] rounded-xl shadow-md transition-all duration-300 text-lg font-serif disabled:opacity-50 disabled:hover:bg-[#2c241b]"
                        >
                          下一步：设定目标
                          <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </FadeIn>
            )}

            {/* Step 3: Main Goal */}
            {currentStep === 3 && (
              <FadeIn>
                <Card className="shadow-lg border border-[#f2f0ea] bg-white">
                  <CardHeader className="pb-6 border-b border-[#f5f2eb] text-center">
                    <CardTitle className="text-xl font-bold text-[#2c241b] font-serif">
                      终章：确立核心目标
                    </CardTitle>
                    <p className="text-[#8c7b6c] text-sm mt-2">
                      主角的终极使命是什么？这将指引故事的走向
                    </p>
                  </CardHeader>

                  <CardContent className="p-8">
                    <div className="space-y-6">
                      <div className="bg-[#f0ebe0] p-5 rounded-xl border border-[#f2f0ea] flex gap-4">
                        <div className="flex-shrink-0">
                          <Target className="w-5 h-5 text-[#c5a059]" />
                        </div>
                        <div>
                          <p className="text-[#2c241b] text-sm font-bold mb-1 font-serif">目标示例</p>
                          <p className="text-[#5d554a] text-sm leading-relaxed font-serif italic">
                            "找回记忆并复仇"、"拯救被邪恶公司控制的城市"、"找到真爱"
                          </p>
                        </div>
                      </div>

                      <Input
                        value={simpleConfig.main_goal || ''}
                        onChange={(e) => setSimpleConfig(prev => ({ ...prev, main_goal: e.target.value }))}
                        className="w-full p-6 border-[#f2f0ea] focus:border-[#c5a059] focus:ring-[#c5a059]/20 rounded-xl text-lg bg-[#fdfbf9] placeholder:text-[#8c7b6c]/50 font-serif"
                        placeholder="请描述故事的主要目标..."
                      />

                      {/* AI Features Preview */}
                      <div className="bg-white p-6 rounded-xl border border-[#f2f0ea] border-dashed">
                        <div className="flex items-center gap-3 mb-4">
                          <Sparkles className="w-5 h-5 text-[#c5a059]" />
                          <h4 className="text-base font-bold text-[#2c241b] font-serif">AI 将为您构建</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center gap-3 p-3 bg-[#fdfbf9] rounded-lg border border-[#f5f2eb]">
                            <Users className="h-4 w-4 text-[#8c7b6c]" />
                            <span className="text-sm text-[#5d554a]">鲜活的角色</span>
                          </div>
                          <div className="flex items-center gap-3 p-3 bg-[#fdfbf9] rounded-lg border border-[#f5f2eb]">
                            <MapPin className="h-4 w-4 text-[#8c7b6c]" />
                            <span className="text-sm text-[#5d554a]">宏大的世界观</span>
                          </div>
                          <div className="flex items-center gap-3 p-3 bg-[#fdfbf9] rounded-lg border border-[#f5f2eb]">
                            <Target className="h-4 w-4 text-[#8c7b6c]" />
                            <span className="text-sm text-[#5d554a]">引人入胜的开篇</span>
                          </div>
                          <div className="flex items-center gap-3 p-3 bg-[#fdfbf9] rounded-lg border border-[#f5f2eb]">
                            <Feather className="h-4 w-4 text-[#8c7b6c]" />
                            <span className="text-sm text-[#5d554a]">独特的叙事风格</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-4">
                        <Button
                          onClick={prevStep}
                          variant="ghost"
                          className="text-[#8c7b6c] hover:text-[#2c241b]"
                        >
                          <ArrowLeft className="mr-2 h-4 w-4" />
                          上一步
                        </Button>
                        <Button
                          onClick={handleSimpleSubmit}
                          disabled={!canProceedFromStep(3) || (!modelConfig.apiKey && !hasValidConfig) || isGeneratingOutlines}
                          className="px-8 py-6 bg-[#2c241b] text-[#fdfbf9] hover:bg-[#c5a059] rounded-xl shadow-md transition-all duration-300 text-lg font-serif disabled:opacity-50 disabled:hover:bg-[#2c241b]"
                        >
                          {isGeneratingOutlines ? (
                            <div className="flex items-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#fdfbf9]"></div>
                              正在编织梗概...
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
              </FadeIn>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickStart;

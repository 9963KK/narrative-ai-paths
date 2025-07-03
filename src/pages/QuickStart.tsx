import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Settings, Wand2, Users, Target, MapPin, Sparkles } from 'lucide-react';
import ModelConfig from '@/components/ModelConfig';
import { ModelConfig as ModelConfigType } from '@/components/model-config/constants';
import { loadModelConfig, hasSavedConfig } from '@/services/configStorage';
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
  const [showModelConfig, setShowModelConfig] = useState(false);
  const [hasValidConfig, setHasValidConfig] = useState(false);
  
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
  const [storyOutlines, setStoryOutlines] = useState<Array<{
    id: number;
    title: string;
    premise: string;
    genre: string;
    tone: string;
    characters: string[];
    setting: string;
    hook: string;
  }>>([]);
  const [isGeneratingOutlines, setIsGeneratingOutlines] = useState(false);
  const [showOutlineSelection, setShowOutlineSelection] = useState(false);
  const [originalSimpleConfig, setOriginalSimpleConfig] = useState<BaseStoryConfig | null>(null);

  // 组件加载时检查本地配置
  useEffect(() => {
    const savedConfig = loadModelConfig();
    if (savedConfig && savedConfig.apiKey) {
      setModelConfig(savedConfig);
      setHasValidConfig(true);
      console.log('📂 已从本地存储加载配置');
    } else {
      setHasValidConfig(hasSavedConfig());
    }
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
          const savedConfig = loadModelConfig();
          if (savedConfig) {
            configToUse = savedConfig;
            setModelConfig(savedConfig);
          }
        }
        
        storyAI.setModelConfig(configToUse);
        
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
  const handleOutlineSelection = (selectedOutline: {
    id: number;
    title: string;
    premise: string;
    genre: string;
    tone: string;
    characters: string[];
    setting: string;
    hook: string;
  }) => {
    if (!originalSimpleConfig) return;
    
    // 根据选择的梗概创建增强的配置
    const enhancedConfig = {
      ...originalSimpleConfig,
      protagonist: selectedOutline.characters[0] || '主角',
      setting: selectedOutline.setting,
      special_requirements: `故事风格：${selectedOutline.tone}。开场设定：${selectedOutline.hook}`,
      character_count: Math.min(selectedOutline.characters.length, 6),
      character_details: selectedOutline.characters.map((char, index) => ({
        name: char,
        role: index === 0 ? '主角' : '重要角色',
        traits: '待发展的角色特征',
        appearance: '',
        backstory: ''
      })),
      environment_details: selectedOutline.setting,
      preferred_ending: 'open',
      story_length: 'medium',
      tone: selectedOutline.tone.includes('轻松') ? 'light' : 
            selectedOutline.tone.includes('幽默') ? 'humorous' :
            selectedOutline.tone.includes('浪漫') ? 'romantic' :
            selectedOutline.tone.includes('黑暗') || selectedOutline.tone.includes('神秘') ? 'dark' : 'serious',
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
      const savedConfig = loadModelConfig();
      if (savedConfig) {
        configToUse = savedConfig;
        setModelConfig(savedConfig);
      }
    }
    
    console.log('🚀 基于选择的梗概创建故事:', selectedOutline.title);
    
    // 保存配置到 localStorage
    localStorage.setItem('pendingStoryConfig', JSON.stringify({
      config: enhancedConfig,
      modelConfig: configToUse,
      isAdvanced: true
    }));
    
    // 重定向到故事页面
    navigate('/app/story');
  };

  // 模型配置界面
  if (showModelConfig) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <ModelConfig
          config={modelConfig}
          onConfigChange={(config) => {
            setModelConfig(config);
            setHasValidConfig(!!config.apiKey);
          }}
          onClose={() => setShowModelConfig(false)}
        />
      </div>
    );
  }

  // 故事梗概选择界面
  if (showOutlineSelection) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <Card className="w-full max-w-6xl mx-auto bg-white shadow-xl border-slate-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={() => setShowOutlineSelection(false)}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-800"
              >
                <ArrowLeft className="h-4 w-4" />
                返回修改
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModelConfig(true)}
                className="flex items-center gap-2 border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                <Settings className="h-4 w-4" />
                模型配置
              </Button>
            </div>
            <div className="text-center pt-4">
              <CardTitle className="text-3xl font-bold text-slate-800 flex items-center justify-center gap-2">
                <Wand2 className="h-8 w-8 text-indigo-600" />
                选择您的故事方向
              </CardTitle>
              <p className="text-slate-600 mt-2">
                基于您的灵感，AI为您生成了 {storyOutlines.length} 个不同风格的故事梗概
              </p>
              {originalSimpleConfig && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>您的原始想法：</strong>{originalSimpleConfig.story_idea}
                  </p>
                  {originalSimpleConfig.main_goal && (
                    <p className="text-sm text-blue-700 mt-1">
                      <strong>期望目标：</strong>{originalSimpleConfig.main_goal}
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {storyOutlines.map((outline) => (
                <Card
                  key={outline.id}
                  className="border-2 border-slate-200 hover:border-indigo-300 cursor-pointer transition-all duration-300 group hover:shadow-lg"
                  onClick={() => handleOutlineSelection(outline)}
                >
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl text-slate-800 group-hover:text-indigo-700 transition-colors">
                      {outline.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-slate-700 mb-2">📖 故事概念</h4>
                      <p className="text-slate-600 text-sm leading-relaxed">
                        {outline.premise}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-slate-700 mb-2">🎭 主要角色</h4>
                      <div className="flex flex-wrap gap-1">
                        {outline.characters.map((character, index) => (
                          <span 
                            key={index}
                            className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs"
                          >
                            {character}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-slate-700 mb-2">🏛️ 背景设定</h4>
                      <p className="text-slate-600 text-sm">
                        {outline.setting}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-slate-700 mb-2">🎣 故事钩子</h4>
                      <p className="text-slate-600 text-sm italic">
                        "{outline.hook}"
                      </p>
                    </div>
                    
                    <div className="pt-2 border-t border-slate-200">
                      <Button 
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOutlineSelection(outline);
                        }}
                      >
                        选择这个故事方向 ✨
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <div className="mt-8 text-center">
              <p className="text-slate-500 text-sm mb-4">
                💡 选择一个梗概后，AI将基于您的选择创建完整的故事开篇
              </p>
              <Button
                variant="outline"
                onClick={() => setShowOutlineSelection(false)}
                className="text-slate-600 border-slate-300 hover:bg-slate-50"
              >
                不满意？重新生成梗概
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 主要的分步向导界面
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/app')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            返回
          </Button>
          <div className="text-center ui-text">
            <h1 className="text-3xl font-bold text-gray-800">快速开始</h1>
            <p className="text-gray-500 mt-2">跟随向导，一步步构建您的世界</p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowModelConfig(true)}
            className="flex items-center gap-2 border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            <Settings className="h-4 w-4" />
            模型配置
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="mb-10 ui-text">
          <div className="flex justify-between mb-1 text-sm font-medium text-gray-600">
            <span>第 {currentStep} / {totalSteps} 步</span>
            <span>{stepTitles[currentStep - 1]}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500 ease-in-out" 
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* API Key Warning */}
        {!modelConfig.apiKey && !hasValidConfig && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-amber-800 text-sm text-center">
              ⚠️ 请先配置AI模型才能开始创作故事
            </p>
          </div>
        )}

        {/* Step 1: Genre Selection */}
        {currentStep === 1 && (
          <div className="step-content ui-text" style={{ animation: 'fadeIn 0.5s ease-in-out' }}>
            <label className="text-xl font-semibold text-gray-700 mb-4 block">您想创作什么类型的故事？</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
              {genres.map((genre) => (
                <div
                  key={genre.value}
                  onClick={() => setSimpleConfig(prev => ({ ...prev, genre: genre.value }))}
                  className={`border-2 p-4 rounded-lg text-center cursor-pointer transition-all duration-300 hover:border-indigo-500 hover:shadow-lg ${
                    simpleConfig.genre === genre.value
                      ? 'border-indigo-500 bg-indigo-50 transform scale-105 shadow-lg'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="text-3xl mb-2">{genreIcons[genre.value as keyof typeof genreIcons]}</div>
                  <span className="font-medium">{genreTitles[genre.value as keyof typeof genreTitles]}</span>
                  <p className="text-xs text-gray-500 mt-1">{genre.desc}</p>
                </div>
              ))}
            </div>
            <div className="text-right">
              <Button
                onClick={nextStep}
                disabled={!canProceedFromStep(1)}
                className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-lg shadow-md hover:bg-indigo-700 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                下一步
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Story Idea */}
        {currentStep === 2 && (
          <div className="step-content ui-text" style={{ animation: 'fadeIn 0.5s ease-in-out' }}>
            <label className="text-xl font-semibold text-gray-700 mb-4 block">您的故事核心想法是什么？</label>
            <p className="text-sm text-gray-500 mb-4">
              一句话即可，例如："一个失忆的赏金猎人在霓虹闪烁的未来都市里，寻找自己被盗走的记忆。"
            </p>
            <Textarea
              value={simpleConfig.story_idea}
              onChange={(e) => setSimpleConfig(prev => ({ ...prev, story_idea: e.target.value }))}
              rows={5}
              className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition mb-8"
              placeholder="请在此输入您的故事想法..."
            />
            <div className="flex justify-between">
              <Button
                onClick={prevStep}
                className="bg-gray-200 text-gray-800 font-bold py-3 px-8 rounded-lg hover:bg-gray-300 transition-all"
              >
                上一步
              </Button>
              <Button
                onClick={nextStep}
                disabled={!canProceedFromStep(2)}
                className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-lg shadow-md hover:bg-indigo-700 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                下一步
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Main Goal */}
        {currentStep === 3 && (
          <div className="step-content ui-text" style={{ animation: 'fadeIn 0.5s ease-in-out' }}>
            <label className="text-xl font-semibold text-gray-700 mb-4 block">这个故事的主要目标是什么？</label>
            <p className="text-sm text-gray-500 mb-4">
              这将决定故事的结局。例如："找回记忆并复仇"、"拯救被邪恶公司控制的城市"、"找到真爱"...
            </p>
            <Input
              value={simpleConfig.main_goal || ''}
              onChange={(e) => setSimpleConfig(prev => ({ ...prev, main_goal: e.target.value }))}
              className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition mb-4"
              placeholder="请在此输入故事的主要目标..."
            />
            
            {/* AI Features Preview */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
              <h4 className="font-semibold text-blue-800 mb-2">AI将自动为您创建：</h4>
              <div className="grid grid-cols-2 gap-3 text-sm text-blue-700">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>3-5个个性鲜明的角色</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>详细的故事背景设定</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  <span>引人入胜的开场情节</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  <span>符合类型的故事氛围</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button
                onClick={prevStep}
                className="bg-gray-200 text-gray-800 font-bold py-3 px-8 rounded-lg hover:bg-gray-300 transition-all"
              >
                上一步
              </Button>
              <Button
                onClick={handleSimpleSubmit}
                disabled={!canProceedFromStep(3) || (!modelConfig.apiKey && !hasValidConfig) || isGeneratingOutlines}
                className="bg-green-500 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-green-600 transition-transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isGeneratingOutlines ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    生成中...
                  </div>
                ) : (
                  '完成配置，生成梗概'
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
      
      <style jsx>{`
        @keyframes fadeIn {
          from { 
            opacity: 0; 
            transform: translateY(10px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
      `}</style>
    </div>
  );
};

export default QuickStart;
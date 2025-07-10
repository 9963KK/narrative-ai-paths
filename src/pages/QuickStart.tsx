import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Settings, Wand2, Users, Target, MapPin, Sparkles, Lightbulb, Zap, Stars } from 'lucide-react';
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
  const [hasValidConfig, setHasValidConfig] = useState(false);
  
  // 简单配置状态
  const [simpleConfig, setSimpleConfig] = useState<BaseStoryConfig>({
    genre: '',
    story_idea: '',
    main_goal: ''
  });

  // 故事梗概相关状态
  const [showOutlineSelection, setShowOutlineSelection] = useState(false);
  const [storyOutlines, setStoryOutlines] = useState<Array<{
    id: string;
    title: string;
    description: string;
    outline: string;
    genre_tag: string;
    mood: string;
  }>>([]);
  const [originalSimpleConfig, setOriginalSimpleConfig] = useState<BaseStoryConfig | null>(null);
  const [isGeneratingOutlines, setIsGeneratingOutlines] = useState(false);
  const [modelConfig, setModelConfig] = useState<ModelConfigType>({
    provider: 'openai',
    model: 'gpt-4',
    apiKey: '',
    temperature: 0.8,
    maxTokens: 2000
  });

  // 检查模型配置
  useEffect(() => {
    const savedConfig = loadModelConfig();
    if (savedConfig) {
      setModelConfig(savedConfig);
      setHasValidConfig(true);
    } else {
      setHasValidConfig(hasSavedConfig());
    }
  }, []);

  // 生成故事梗概
  const generateStoryOutlines = async () => {
    if (!hasValidConfig) {
      alert('请先配置AI模型！');
      return;
    }

    if (!simpleConfig.story_idea.trim()) {
      alert('请输入您的故事想法！');
      return;
    }

    setIsGeneratingOutlines(true);
    setOriginalSimpleConfig(simpleConfig);

    try {
      const prompt = `
根据以下故事想法，生成3-4个不同风格的故事梗概：

故事想法：${simpleConfig.story_idea}
${simpleConfig.genre ? `偏好类型：${simpleConfig.genre}` : ''}
${simpleConfig.main_goal ? `期望目标：${simpleConfig.main_goal}` : ''}

请为每个梗概生成：
1. 吸引人的标题
2. 简短的描述（1-2句话）
3. 详细的故事梗概（2-3段）
4. 类型标签
5. 故事氛围

要求：
- 每个梗概风格不同（如冒险、悬疑、浪漫、奇幻等）
- 保持原始想法的核心元素
- 梗概要有完整的起承转合
- 语言生动有趣

返回JSON格式：
[
  {
    "id": "1",
    "title": "标题",
    "description": "简短描述",
    "outline": "详细梗概",
    "genre_tag": "类型",
    "mood": "氛围"
  }
]
`;

      const result = await storyAI.generateStoryOutline(prompt, modelConfig);
      
      try {
        // 尝试解析JSON
        const outlines = JSON.parse(result.story_outline);
        if (Array.isArray(outlines) && outlines.length > 0) {
          setStoryOutlines(outlines);
          setShowOutlineSelection(true);
        } else {
          throw new Error('生成的梗概格式不正确');
        }
      } catch (parseError) {
        // JSON解析失败，尝试手动解析
        console.warn('JSON解析失败，尝试手动处理', parseError);
        
        // 创建默认梗概
        const defaultOutlines = [
          {
            id: '1',
            title: '基于您想法的故事',
            description: '一个精彩的冒险故事即将开始',
            outline: result.story_outline,
            genre_tag: simpleConfig.genre || '通用',
            mood: '引人入胜'
          }
        ];
        setStoryOutlines(defaultOutlines);
        setShowOutlineSelection(true);
      }

    } catch (error) {
      console.error('生成故事梗概失败:', error);
      alert('生成故事梗概失败，请检查网络连接和模型配置！');
    } finally {
      setIsGeneratingOutlines(false);
    }
  };

  // 选择故事梗概
  const handleOutlineSelection = (selectedOutline: any) => {
    // 将选择的梗概转换为完整配置
    const fullConfig = {
      genre: selectedOutline.genre_tag || simpleConfig.genre || '通用',
      story_idea: selectedOutline.outline,
      main_goal: simpleConfig.main_goal || '完成一个精彩的故事'
    };

    // 保存配置到 localStorage
    localStorage.setItem('pendingStoryConfig', JSON.stringify({
      config: fullConfig,
      modelConfig: modelConfig,
      isAdvanced: false
    }));

    // 重定向到故事创作页面
    navigate('/app/creating');
  };

  // 故事梗概选择界面
  if (showOutlineSelection) {
    return (
      <div className="min-h-screen bg-gray-50 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-50/20 via-gray-50 to-gray-50">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200/50 shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={() => setShowOutlineSelection(false)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100/80"
              >
                <ArrowLeft className="h-4 w-4" />
                返回修改
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/settings?tab=model')}
                className="flex items-center gap-2 border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <Settings className="h-4 w-4" />
                模型配置
              </Button>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="max-w-5xl mx-auto">
            {/* Page Header */}
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
                      <Lightbulb className="w-4 h-4 text-white" />
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

            {/* Story Outlines Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
              {storyOutlines.map((outline, index) => (
                <Card
                  key={outline.id}
                  className="group cursor-pointer transition-all duration-300 border-0 shadow-lg hover:shadow-2xl bg-white/80 backdrop-blur-sm hover:bg-white"
                  onClick={() => handleOutlineSelection(outline)}
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
                              {outline.genre_tag}
                            </span>
                          </div>
                        </div>
                        <CardTitle className="text-xl font-bold text-gray-800 group-hover:text-indigo-600 transition-colors mb-2">
                          {outline.title}
                        </CardTitle>
                        <p className="text-gray-600 text-sm leading-relaxed mb-3">
                          {outline.description}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="bg-gray-50/80 p-4 rounded-xl mb-4">
                      <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
                        {outline.outline}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Stars className="w-3 h-3" />
                        <span>{outline.mood}</span>
                      </div>
                      <Button 
                        size="sm"
                        className={`shadow-lg hover:shadow-xl transition-all duration-300 transform group-hover:scale-105 ${
                          index === 0 ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700' :
                          index === 1 ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700' :
                          index === 2 ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700' :
                          'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                        }`}
                      >
                        选择这个故事
                        <Zap className="ml-1 h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <div className="mt-12 text-center">
              <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-200/50 max-w-2xl mx-auto">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <Lightbulb className="w-5 h-5 text-indigo-600" />
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
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 主要的分步向导界面
  return (
    <div className="min-h-screen bg-gray-50 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-50/20 via-gray-50 to-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200/50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate('/app')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100/80"
            >
              <ArrowLeft className="h-4 w-4" />
              返回首页
            </Button>
            
            <div className="flex items-center gap-3">
              {!hasValidConfig && (
                <div className="px-3 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                  未配置AI模型
                </div>
              )}
              <Button
                variant="outline"
                onClick={() => navigate('/settings?tab=model')}
                className="flex items-center gap-2 border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <Settings className="h-4 w-4" />
                模型配置
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Page Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl mb-6 shadow-xl">
              <Wand2 className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-800 mb-3">
              快速创作模式
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              只需要一个简单的想法，AI就能为您创造出完整的故事世界
            </p>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-4 mb-4">
              {[
                { step: 1, label: '故事想法', icon: Lightbulb },
                { step: 2, label: '生成梗概', icon: Sparkles },
                { step: 3, label: '开始创作', icon: Zap }
              ].map(({ step, label, icon: Icon }) => (
                <div key={step} className="flex flex-col items-center">
                  <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${
                    currentStep >= step 
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' 
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`text-sm mt-2 transition-colors ${
                    currentStep >= step ? 'text-indigo-600 font-medium' : 'text-gray-500'
                  }`}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-indigo-600 to-purple-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(currentStep / 3) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Main Form */}
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-4">
                  <Lightbulb className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold text-gray-800 mb-2">
                  分享您的故事想法
                </CardTitle>
                <p className="text-gray-600">
                  无论是一个场景、一个角色，还是一段对话，都可以成为精彩故事的开始
                </p>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">故事类型（可选）</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {['奇幻', '科幻', '言情', '悬疑', '冒险', '历史', '现代', '惊悚'].map((genre) => (
                    <Button
                      key={genre}
                      variant={simpleConfig.genre === genre ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSimpleConfig(prev => ({ 
                        ...prev, 
                        genre: prev.genre === genre ? '' : genre 
                      }))}
                      className={`text-xs transition-all duration-200 ${
                        simpleConfig.genre === genre 
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg' 
                          : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {genre}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="story_idea" className="text-sm font-medium text-gray-700">
                  您的故事想法 *
                </label>
                <Textarea
                  id="story_idea"
                  placeholder="例如：一个失忆的骑士发现自己身处陌生的魔法森林...&#10;或者：在2050年的上海，一个AI程序员发现了时间旅行的秘密...&#10;又或者：一封意外收到的匿名情书，改变了平凡女孩的整个人生..."
                  value={simpleConfig.story_idea}
                  onChange={(e) => setSimpleConfig(prev => ({ ...prev, story_idea: e.target.value }))}
                  className="min-h-32 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500/20 resize-none"
                />
                <p className="text-xs text-gray-500">
                  💡 提示：可以是角色、场景、冲突、或者任何激发您想象力的元素
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="main_goal" className="text-sm font-medium text-gray-700">
                  期望的故事发展（可选）
                </label>
                <Input
                  id="main_goal"
                  placeholder="例如：希望是一个关于成长和友谊的温暖故事..."
                  value={simpleConfig.main_goal}
                  onChange={(e) => setSimpleConfig(prev => ({ ...prev, main_goal: e.target.value }))}
                  className="border-gray-300 focus:border-indigo-500 focus:ring-indigo-500/20"
                />
              </div>

              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-2xl border border-indigo-200">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center mt-1">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">AI将为您做什么？</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• 基于您的想法生成多个不同风格的故事梗概</li>
                      <li>• 自动设计主要角色和世界观</li>
                      <li>• 创建引人入胜的开场情节</li>
                      <li>• 规划完整的故事发展框架</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  onClick={generateStoryOutlines}
                  disabled={!simpleConfig.story_idea.trim() || !hasValidConfig || isGeneratingOutlines}
                  className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
                >
                  {isGeneratingOutlines ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      AI正在生成故事梗概...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      生成故事梗概
                      <Sparkles className="w-4 h-4" />
                    </div>
                  )}
                </Button>
                
                {!hasValidConfig && (
                  <p className="text-sm text-red-600 mt-2 text-center">
                    请先配置AI模型才能开始创作
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default QuickStart;
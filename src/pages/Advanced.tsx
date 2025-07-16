import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Settings, ArrowLeft, Wrench, Users, Target, MapPin, Sparkles, FileText } from 'lucide-react';
import { AnimatedCard, AnimatedHeader } from '@/components/AnimatedCard';
import { ModelConfig as ModelConfigType } from '@/components/model-config/constants';
import { modelConfigAdapter } from '@/services/modelConfigAdapter';
import { DocumentAnalysisResult } from '@/services/documentAnalyzer';
import { UserHeader } from '@/components/auth/UserHeader';

// 高级故事配置
interface AdvancedStoryConfig {
  genre: string;
  story_idea: string;
  main_character: {
    name: string;
    role: string;
    traits: string;
    appearance?: string;
    backstory?: string;
  };
  supporting_characters: Array<{
    id: string;
    name: string;
    role: string;
    traits: string;
    appearance?: string;
    backstory?: string;
  }>;
  environment_details: string;
  preferred_ending: 'open' | 'success' | 'failure' | 'surprise' | 'romantic' | 'tragic';
  story_length: 'short' | 'medium' | 'long';
  tone: 'light' | 'serious' | 'humorous' | 'dark' | 'romantic';
  story_goals: Array<{
    id: string;
    description: string;
    type: 'main' | 'sub' | 'personal' | 'relationship';
    priority: 'high' | 'medium' | 'low';
  }>;
}

const Advanced: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { documentAnalysisResult?: DocumentAnalysisResult } | null;
  
  const [hasValidConfig, setHasValidConfig] = useState(false);
  const [modelConfig, setModelConfig] = useState<ModelConfigType>({
    provider: 'openai',
    model: 'gpt-4',
    apiKey: '',
    temperature: 0.8,
    maxTokens: 2000
  });

  // 高级配置状态
  const [advancedConfig, setAdvancedConfig] = useState<AdvancedStoryConfig>({
    genre: '',
    story_idea: '',
    main_character: {
      name: '',
      role: '',
      traits: '',
      appearance: '',
      backstory: ''
    },
    supporting_characters: [],
    environment_details: '',
    preferred_ending: 'open',
    story_length: 'medium',
    tone: 'light',
    story_goals: []
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [characterCount, setCharacterCount] = useState(1);

  // 检查用户模型配置
  useEffect(() => {
    const loadUserConfig = async () => {
      try {
        // 确保用户有可用模型
        await modelConfigAdapter.ensureUserHasModels();
        
        // 获取用户模型配置
        const userConfig = await modelConfigAdapter.getUserModelConfig();
        if (userConfig) {
          setModelConfig(userConfig);
          setHasValidConfig(true);
          console.log('📂 已加载用户模型配置');
        } else {
          setHasValidConfig(false);
          console.warn('用户没有可用的模型配置');
        }
      } catch (error) {
        console.error('加载用户配置失败:', error);
        setHasValidConfig(false);
      }
    };
    
    loadUserConfig();

    // 如果有文档分析结果，自动填充一些字段
    if (state?.documentAnalysisResult) {
      const result = state.documentAnalysisResult;
      setAdvancedConfig(prev => ({
        ...prev,
        genre: result.genre || '',
        story_idea: result.summary || '',
        main_character: {
          ...prev.main_character,
          name: result.characters?.[0]?.name || '',
          role: result.characters?.[0]?.role || '',
          traits: result.characters?.[0]?.traits || '',
          backstory: result.characters?.[0]?.backstory || ''
        },
        environment_details: result.setting || '',
        tone: (result.tone as any) || 'light'
      }));
    }
  }, [state]);

  // 添加配角
  const addSupportingCharacter = () => {
    const newCharacter = {
      id: Date.now().toString(),
      name: '',
      role: '',
      traits: '',
      appearance: '',
      backstory: ''
    };
    setAdvancedConfig(prev => ({
      ...prev,
      supporting_characters: [...prev.supporting_characters, newCharacter]
    }));
    setCharacterCount(prev => prev + 1);
  };

  // 移除配角
  const removeSupportingCharacter = (id: string) => {
    setAdvancedConfig(prev => ({
      ...prev,
      supporting_characters: prev.supporting_characters.filter(char => char.id !== id)
    }));
    setCharacterCount(prev => prev - 1);
  };

  // 添加故事目标
  const addStoryGoal = () => {
    const newGoal = {
      id: Date.now().toString(),
      description: '',
      type: 'main' as const,
      priority: 'medium' as const
    };
    setAdvancedConfig(prev => ({
      ...prev,
      story_goals: [...prev.story_goals, newGoal]
    }));
  };

  // 移除故事目标
  const removeStoryGoal = (id: string) => {
    setAdvancedConfig(prev => ({
      ...prev,
      story_goals: prev.story_goals.filter(goal => goal.id !== id)
    }));
  };

  // 完成配置
  const handleComplete = () => {

    // 验证必填字段
    if (!advancedConfig.genre || !advancedConfig.story_idea || !advancedConfig.main_character.name) {
      alert('请填写必要的故事信息！');
      return;
    }

    // 保存配置到 localStorage
    localStorage.setItem('pendingStoryConfig', JSON.stringify({
      config: advancedConfig,
      modelConfig: modelConfig,
      isAdvanced: true
    }));

    // 重定向到故事创作页面
    navigate('/app/creating');
  };

  return (
    <div className="min-h-screen bg-gray-50 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-50/20 via-gray-50 to-gray-50">
      <UserHeader />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <AnimatedHeader>
            <div className="text-center mb-12">
              {/* 返回按钮 */}
              <div className="flex justify-start mb-6">
                <Button
                  onClick={() => navigate('/')}
                  variant="outline"
                  className="px-4 py-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all duration-200"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  返回主页
                </Button>
              </div>
              
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-3xl mb-6 shadow-xl">
                <Wrench className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-gray-800 mb-3">
                专业创作模式
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                精确控制故事的每一个细节，全面定制角色、情节、世界观，打造您的完美作品
              </p>
            </div>
          </AnimatedHeader>

          {/* Progress Steps */}
          <AnimatedCard index={1}>
            <div className="mb-8">
              <div className="flex items-center justify-center space-x-4 mb-4">
                {[
                  { step: 1, label: '基础设定', icon: FileText },
                  { step: 2, label: '角色塑造', icon: Users },
                  { step: 3, label: '世界构建', icon: MapPin },
                  { step: 4, label: '目标设定', icon: Target }
                ].map(({ step, label, icon: Icon }) => (
                  <div key={step} className="flex flex-col items-center">
                    <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${
                      currentStep >= step 
                        ? 'bg-purple-600 border-purple-600 text-white shadow-lg' 
                        : 'bg-white border-gray-300 text-gray-400'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`text-sm mt-2 transition-colors ${
                      currentStep >= step ? 'text-purple-600 font-medium' : 'text-gray-500'
                    }`}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(currentStep / 4) * 100}%` }}
                ></div>
              </div>
            </div>
          </AnimatedCard>

          {/* Step 1: 基础设定 */}
          {currentStep === 1 && (
            <AnimatedCard index={2}>
              <Card className="p-8 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4">
                    <FileText className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">故事基础设定</h2>
                  <p className="text-gray-600">为您的故事奠定基础框架</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="genre" className="text-sm font-medium text-gray-700">故事类型 *</Label>
                    <Select value={advancedConfig.genre} onValueChange={(value) => setAdvancedConfig(prev => ({ ...prev, genre: value }))}>
                      <SelectTrigger className="h-12 border-gray-300 focus:border-purple-500 focus:ring-purple-500/20">
                        <SelectValue placeholder="选择故事类型" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fantasy">奇幻</SelectItem>
                        <SelectItem value="scifi">科幻</SelectItem>
                        <SelectItem value="romance">言情</SelectItem>
                        <SelectItem value="mystery">悬疑</SelectItem>
                        <SelectItem value="adventure">冒险</SelectItem>
                        <SelectItem value="historical">历史</SelectItem>
                        <SelectItem value="contemporary">现代</SelectItem>
                        <SelectItem value="thriller">惊悚</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tone" className="text-sm font-medium text-gray-700">故事基调</Label>
                    <Select value={advancedConfig.tone} onValueChange={(value) => setAdvancedConfig(prev => ({ ...prev, tone: value as any }))}>
                      <SelectTrigger className="h-12 border-gray-300 focus:border-purple-500 focus:ring-purple-500/20">
                        <SelectValue placeholder="选择故事基调" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">轻松愉快</SelectItem>
                        <SelectItem value="serious">严肃认真</SelectItem>
                        <SelectItem value="humorous">幽默风趣</SelectItem>
                        <SelectItem value="dark">黑暗深沉</SelectItem>
                        <SelectItem value="romantic">浪漫温馨</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="story_idea" className="text-sm font-medium text-gray-700">故事创意 *</Label>
                  <Textarea
                    id="story_idea"
                    placeholder="详细描述您的故事想法、背景设定、主要冲突等..."
                    value={advancedConfig.story_idea}
                    onChange={(e) => setAdvancedConfig(prev => ({ ...prev, story_idea: e.target.value }))}
                    className="min-h-32 border-gray-300 focus:border-purple-500 focus:ring-purple-500/20 resize-none"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="story_length" className="text-sm font-medium text-gray-700">故事长度</Label>
                    <Select value={advancedConfig.story_length} onValueChange={(value) => setAdvancedConfig(prev => ({ ...prev, story_length: value as any }))}>
                      <SelectTrigger className="h-12 border-gray-300 focus:border-purple-500 focus:ring-purple-500/20">
                        <SelectValue placeholder="选择故事长度" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="short">短篇 (5-10章)</SelectItem>
                        <SelectItem value="medium">中篇 (10-20章)</SelectItem>
                        <SelectItem value="long">长篇 (20+章)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="preferred_ending" className="text-sm font-medium text-gray-700">结局偏好</Label>
                    <Select value={advancedConfig.preferred_ending} onValueChange={(value) => setAdvancedConfig(prev => ({ ...prev, preferred_ending: value as any }))}>
                      <SelectTrigger className="h-12 border-gray-300 focus:border-purple-500 focus:ring-purple-500/20">
                        <SelectValue placeholder="选择结局类型" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">开放式结局</SelectItem>
                        <SelectItem value="success">圆满结局</SelectItem>
                        <SelectItem value="failure">悲剧结局</SelectItem>
                        <SelectItem value="surprise">意外转折</SelectItem>
                        <SelectItem value="romantic">浪漫结局</SelectItem>
                        <SelectItem value="tragic">悲壮结局</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end pt-6">
                  <Button 
                    onClick={() => setCurrentStep(2)}
                    disabled={!advancedConfig.genre || !advancedConfig.story_idea}
                    className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
                  >
                    下一步：角色塑造
                    <Sparkles className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
              </Card>
            </AnimatedCard>
          )}

          {/* Step 2: 角色塑造 */}
          {currentStep === 2 && (
            <AnimatedCard index={2}>
              <Card className="p-8 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl mb-4">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">角色塑造</h2>
                  <p className="text-gray-600">创造生动立体的角色形象</p>
                </div>

                {/* 主角设定 */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm font-bold">主</span>
                    </div>
                    主角设定
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">姓名 *</Label>
                      <Input
                        placeholder="主角姓名"
                        value={advancedConfig.main_character.name}
                        onChange={(e) => setAdvancedConfig(prev => ({
                          ...prev,
                          main_character: { ...prev.main_character, name: e.target.value }
                        }))}
                        className="border-gray-300 focus:border-blue-500 focus:ring-blue-500/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">身份/职业</Label>
                      <Input
                        placeholder="例如：年轻骑士、法师学徒、侦探..."
                        value={advancedConfig.main_character.role}
                        onChange={(e) => setAdvancedConfig(prev => ({
                          ...prev,
                          main_character: { ...prev.main_character, role: e.target.value }
                        }))}
                        className="border-gray-300 focus:border-blue-500 focus:ring-blue-500/20"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <Label className="text-sm font-medium text-gray-700">性格特征</Label>
                      <Textarea
                        placeholder="描述主角的性格特点、价值观、行为习惯等..."
                        value={advancedConfig.main_character.traits}
                        onChange={(e) => setAdvancedConfig(prev => ({
                          ...prev,
                          main_character: { ...prev.main_character, traits: e.target.value }
                        }))}
                        className="min-h-20 border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 resize-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">外貌描述</Label>
                      <Input
                        placeholder="身高、发色、特征等..."
                        value={advancedConfig.main_character.appearance}
                        onChange={(e) => setAdvancedConfig(prev => ({
                          ...prev,
                          main_character: { ...prev.main_character, appearance: e.target.value }
                        }))}
                        className="border-gray-300 focus:border-blue-500 focus:ring-blue-500/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">背景故事</Label>
                      <Input
                        placeholder="成长经历、重要事件..."
                        value={advancedConfig.main_character.backstory}
                        onChange={(e) => setAdvancedConfig(prev => ({
                          ...prev,
                          main_character: { ...prev.main_character, backstory: e.target.value }
                        }))}
                        className="border-gray-300 focus:border-blue-500 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>
                </div>

                {/* 配角设定 */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                      <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                        <span className="text-white text-sm font-bold">配</span>
                      </div>
                      配角设定 ({advancedConfig.supporting_characters.length})
                    </h3>
                    <Button
                      onClick={addSupportingCharacter}
                      variant="outline"
                      size="sm"
                      className="border-green-300 text-green-700 hover:bg-green-50"
                    >
                      + 添加配角
                    </Button>
                  </div>

                  {advancedConfig.supporting_characters.map((character, index) => (
                    <div key={character.id} className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-2xl border border-green-200">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-gray-800">配角 {index + 1}</h4>
                        <Button
                          onClick={() => removeSupportingCharacter(character.id)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          删除
                        </Button>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">姓名</Label>
                          <Input
                            placeholder="配角姓名"
                            value={character.name}
                            onChange={(e) => {
                              const updatedCharacters = [...advancedConfig.supporting_characters];
                              updatedCharacters[index] = { ...character, name: e.target.value };
                              setAdvancedConfig(prev => ({ ...prev, supporting_characters: updatedCharacters }));
                            }}
                            className="border-gray-300 focus:border-green-500 focus:ring-green-500/20"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">身份/关系</Label>
                          <Input
                            placeholder="与主角的关系或职业"
                            value={character.role}
                            onChange={(e) => {
                              const updatedCharacters = [...advancedConfig.supporting_characters];
                              updatedCharacters[index] = { ...character, role: e.target.value };
                              setAdvancedConfig(prev => ({ ...prev, supporting_characters: updatedCharacters }));
                            }}
                            className="border-gray-300 focus:border-green-500 focus:ring-green-500/20"
                          />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <Label className="text-sm font-medium text-gray-700">性格特征</Label>
                          <Textarea
                            placeholder="简要描述这个角色的性格和特点..."
                            value={character.traits}
                            onChange={(e) => {
                              const updatedCharacters = [...advancedConfig.supporting_characters];
                              updatedCharacters[index] = { ...character, traits: e.target.value };
                              setAdvancedConfig(prev => ({ ...prev, supporting_characters: updatedCharacters }));
                            }}
                            className="min-h-16 border-gray-300 focus:border-green-500 focus:ring-green-500/20 resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between pt-6">
                  <Button 
                    onClick={() => setCurrentStep(1)}
                    variant="outline"
                    className="px-6 py-3 border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    上一步
                  </Button>
                  <Button 
                    onClick={() => setCurrentStep(3)}
                    disabled={!advancedConfig.main_character.name}
                    className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
                  >
                    下一步：世界构建
                    <Sparkles className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
              </Card>
            </AnimatedCard>
          )}

          {/* Step 3: 世界构建 */}
          {currentStep === 3 && (
            <AnimatedCard index={2}>
              <Card className="p-8 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl mb-4">
                    <MapPin className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">世界构建</h2>
                  <p className="text-gray-600">构建丰富详实的故事世界</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="environment_details" className="text-sm font-medium text-gray-700">世界设定与环境描述</Label>
                  <Textarea
                    id="environment_details"
                    placeholder="详细描述故事发生的世界、时代背景、地理环境、社会结构、文化特色、魔法/科技水平等..."
                    value={advancedConfig.environment_details}
                    onChange={(e) => setAdvancedConfig(prev => ({ ...prev, environment_details: e.target.value }))}
                    className="min-h-40 border-gray-300 focus:border-orange-500 focus:ring-orange-500/20 resize-none"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    提示：可以描述政治制度、经济状况、宗教信仰、种族分布、重要城市、危险区域等
                  </p>
                </div>

                <div className="bg-gradient-to-r from-orange-50 to-red-50 p-6 rounded-2xl border border-orange-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">世界构建要素参考</h3>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">地理环境</h4>
                      <ul className="text-gray-600 space-y-1">
                        <li>• 大陆、岛屿、城市分布</li>
                        <li>• 气候、地形、自然资源</li>
                        <li>• 特殊地点、危险区域</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">社会文化</h4>
                      <ul className="text-gray-600 space-y-1">
                        <li>• 政治制度、统治者</li>
                        <li>• 社会阶层、职业体系</li>
                        <li>• 宗教信仰、价值观念</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">力量体系</h4>
                      <ul className="text-gray-600 space-y-1">
                        <li>• 魔法/科技水平</li>
                        <li>• 特殊能力、武器装备</li>
                        <li>• 修炼/学习体系</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">历史背景</h4>
                      <ul className="text-gray-600 space-y-1">
                        <li>• 重要历史事件</li>
                        <li>• 传说、预言、禁忌</li>
                        <li>• 当前时代特征</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-6">
                  <Button 
                    onClick={() => setCurrentStep(2)}
                    variant="outline"
                    className="px-6 py-3 border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    上一步
                  </Button>
                  <Button 
                    onClick={() => setCurrentStep(4)}
                    className="px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  >
                    下一步：目标设定
                    <Sparkles className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
              </Card>
            </AnimatedCard>
          )}

          {/* Step 4: 目标设定 */}
          {currentStep === 4 && (
            <AnimatedCard index={2}>
              <Card className="p-8 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-4">
                    <Target className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">故事目标设定</h2>
                  <p className="text-gray-600">设定驱动情节发展的关键目标</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-800">故事目标列表</h3>
                    <Button
                      onClick={addStoryGoal}
                      variant="outline"
                      size="sm"
                      className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                    >
                      + 添加目标
                    </Button>
                  </div>

                  {advancedConfig.story_goals.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Target className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>还没有设定任何故事目标</p>
                      <p className="text-sm">点击"添加目标"来创建第一个目标</p>
                    </div>
                  )}

                  {advancedConfig.story_goals.map((goal, index) => (
                    <div key={goal.id} className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-2xl border border-indigo-200">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-gray-800">目标 {index + 1}</h4>
                        <Button
                          onClick={() => removeStoryGoal(goal.id)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          删除
                        </Button>
                      </div>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="md:col-span-2 space-y-2">
                          <Label className="text-sm font-medium text-gray-700">目标描述</Label>
                          <Textarea
                            placeholder="描述这个故事目标，例如：拯救被困的公主、寻找失落的神器、揭露幕后阴谋..."
                            value={goal.description}
                            onChange={(e) => {
                              const updatedGoals = [...advancedConfig.story_goals];
                              updatedGoals[index] = { ...goal, description: e.target.value };
                              setAdvancedConfig(prev => ({ ...prev, story_goals: updatedGoals }));
                            }}
                            className="min-h-20 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500/20 resize-none"
                          />
                        </div>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700">目标类型</Label>
                            <Select 
                              value={goal.type} 
                              onValueChange={(value) => {
                                const updatedGoals = [...advancedConfig.story_goals];
                                updatedGoals[index] = { ...goal, type: value as any };
                                setAdvancedConfig(prev => ({ ...prev, story_goals: updatedGoals }));
                              }}
                            >
                              <SelectTrigger className="border-gray-300 focus:border-indigo-500 focus:ring-indigo-500/20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="main">主要目标</SelectItem>
                                <SelectItem value="sub">次要目标</SelectItem>
                                <SelectItem value="personal">个人目标</SelectItem>
                                <SelectItem value="relationship">关系目标</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700">优先级</Label>
                            <Select 
                              value={goal.priority} 
                              onValueChange={(value) => {
                                const updatedGoals = [...advancedConfig.story_goals];
                                updatedGoals[index] = { ...goal, priority: value as any };
                                setAdvancedConfig(prev => ({ ...prev, story_goals: updatedGoals }));
                              }}
                            >
                              <SelectTrigger className="border-gray-300 focus:border-indigo-500 focus:ring-indigo-500/20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="high">高</SelectItem>
                                <SelectItem value="medium">中</SelectItem>
                                <SelectItem value="low">低</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">目标设定指导</h3>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">主要目标</h4>
                      <p className="text-gray-600">推动整个故事发展的核心目标，通常在故事结局才能实现</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">次要目标</h4>
                      <p className="text-gray-600">支撑主要目标的阶段性目标，为主线剧情提供支持</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">个人目标</h4>
                      <p className="text-gray-600">角色的个人成长、内心转变、技能提升等目标</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">关系目标</h4>
                      <p className="text-gray-600">角色间的情感发展、友谊建立、冲突解决等目标</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-6">
                  <Button 
                    onClick={() => setCurrentStep(3)}
                    variant="outline"
                    className="px-6 py-3 border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    上一步
                  </Button>
                  <Button 
                    onClick={handleComplete}
                    disabled={!hasValidConfig}
                    className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
                  >
                    开始创作
                    <Sparkles className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
              </Card>
            </AnimatedCard>
          )}
        </div>
      </div>
    </div>
  );
};

export default Advanced;
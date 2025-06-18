import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Settings, Wand2, Wrench, ArrowLeft, Users, Target, MapPin, Sparkles, FolderOpen, BookOpen } from 'lucide-react';
import ModelConfig from './ModelConfig';
import SaveManager from './SaveManager';
import { ModelConfig as ModelConfigType } from './model-config/constants';
import { loadModelConfig, hasSavedConfig } from '@/services/configStorage';
import { getSavedContexts } from '@/services/contextManager';

// 基础故事配置
interface BaseStoryConfig {
  genre: string;
  story_idea: string; // 简单模式：用户的故事想法
  main_goal?: string; // 简单模式：主要目标
}

// 高级故事配置
interface AdvancedStoryConfig extends BaseStoryConfig {
  protagonist: string;
  setting: string;
  special_requirements: string;
  character_count: number;
  character_details: Array<{
    name: string;
    role: string;
    personality: string;
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

// 统一的故事配置类型
export type StoryConfig = BaseStoryConfig | AdvancedStoryConfig;

interface StoryInitializerProps {
  onInitializeStory: (config: StoryConfig, modelConfig: ModelConfigType, isAdvanced: boolean) => void;
  onLoadStory?: (contextId: string) => void;
}

const StoryInitializer: React.FC<StoryInitializerProps> = ({ onInitializeStory, onLoadStory }) => {
  const [configMode, setConfigMode] = useState<'select' | 'simple' | 'advanced' | 'saves'>('select');
  
  // 简单配置状态
  const [simpleConfig, setSimpleConfig] = useState<BaseStoryConfig>({
    genre: '',
    story_idea: '',
    main_goal: ''
  });

  // 高级配置状态
  const [advancedConfig, setAdvancedConfig] = useState<AdvancedStoryConfig>({
    genre: '',
    story_idea: '',
    protagonist: '',
    setting: '',
    special_requirements: '',
    character_count: 3,
    character_details: [
      { name: '', role: '主角', personality: '' },
      { name: '', role: '伙伴', personality: '' },
      { name: '', role: '反派', personality: '' }
    ],
    environment_details: '',
    preferred_ending: 'open',
    story_length: 'medium',
    tone: 'serious',
    story_goals: [
      { id: '1', description: '', type: 'main', priority: 'high' }
    ]
  });

  const [modelConfig, setModelConfig] = useState<ModelConfigType>({
    provider: 'openai',
    model: 'gpt-4',
    apiKey: '',
    temperature: 0.8,
    maxTokens: 2000
  });

  const [showModelConfig, setShowModelConfig] = useState(false);
  const [hasValidConfig, setHasValidConfig] = useState(false);
  const [savedContextsCount, setSavedContextsCount] = useState(0);

  // 组件加载时检查本地配置和存档
  useEffect(() => {
    const savedConfig = loadModelConfig();
    if (savedConfig && savedConfig.apiKey) {
      setModelConfig(savedConfig);
      setHasValidConfig(true);
      console.log('📂 已从本地存储加载配置');
    } else {
      setHasValidConfig(hasSavedConfig());
    }
    
    // 检查存档数量
    updateSavedContextsCount();
  }, []);

  // 更新存档数量的函数
  const updateSavedContextsCount = () => {
    const savedContexts = getSavedContexts();
    setSavedContextsCount(Object.keys(savedContexts).length);
  };

  // 当切换到select模式时，重新更新存档数量
  useEffect(() => {
    if (configMode === 'select') {
      updateSavedContextsCount();
    }
  }, [configMode]);

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

  const endingTypes = [
    { value: 'open', label: '开放结局', desc: '留给读者想象空间' },
    { value: 'success', label: '成功结局', desc: '主角达成目标' },
    { value: 'failure', label: '悲剧结局', desc: '深刻而感人' },
    { value: 'surprise', label: '意外结局', desc: '出人意料的转折' },
    { value: 'romantic', label: '浪漫结局', desc: '爱情修成正果' },
    { value: 'tragic', label: '悲壮结局', desc: '英雄式的牺牲' }
  ];

  const storyLengths = [
    { value: 'short', label: '短篇', desc: '5-8章，快速体验' },
    { value: 'medium', label: '中篇', desc: '8-12章，深度体验' },
    { value: 'long', label: '长篇', desc: '12-20章，史诗冒险' }
  ];

  const tones = [
    { value: 'light', label: '轻松', desc: '愉快轻松的氛围' },
    { value: 'serious', label: '严肃', desc: '深刻认真的主题' },
    { value: 'humorous', label: '幽默', desc: '诙谐有趣的风格' },
    { value: 'dark', label: '黑暗', desc: '深沉压抑的基调' },
    { value: 'romantic', label: '浪漫', desc: '温馨甜蜜的感觉' }
  ];

  // 处理角色数量变化
  const handleCharacterCountChange = (count: number) => {
    setAdvancedConfig(prev => {
      const newCharacters = [...prev.character_details];
      
      if (count > newCharacters.length) {
        // 添加新角色
        const roles = ['主角', '伙伴', '反派', '导师', '神秘人', '对手', '朋友', '敌人'];
        for (let i = newCharacters.length; i < count; i++) {
          newCharacters.push({
            name: '',
            role: roles[i] || '配角',
            personality: ''
          });
        }
      } else if (count < newCharacters.length) {
        // 删除多余角色
        newCharacters.splice(count);
      }
      
      return {
        ...prev,
        character_count: count,
        character_details: newCharacters
      };
    });
  };

  // 处理简单配置提交
  const handleSimpleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 检查当前配置或本地保存的配置
    const hasApiKey = modelConfig.apiKey || hasValidConfig;
    if (simpleConfig.genre && simpleConfig.story_idea && hasApiKey) {
      // 如果当前没有配置但有保存的配置，先加载它
      let configToUse = modelConfig;
      if (!modelConfig.apiKey && hasValidConfig) {
        const savedConfig = loadModelConfig();
        if (savedConfig) {
          configToUse = savedConfig;
          setModelConfig(savedConfig);
        }
      }
      onInitializeStory(simpleConfig, configToUse, false);
    }
  };

  // 处理高级配置提交
  const handleAdvancedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const hasValidGoal = advancedConfig.story_goals.some(goal => goal.description.trim() !== '');
    // 检查当前配置或本地保存的配置
    const hasApiKey = modelConfig.apiKey || hasValidConfig;
    if (advancedConfig.genre && advancedConfig.story_idea && hasValidGoal && hasApiKey) {
      // 如果当前没有配置但有保存的配置，先加载它
      let configToUse = modelConfig;
      if (!modelConfig.apiKey && hasValidConfig) {
        const savedConfig = loadModelConfig();
        if (savedConfig) {
          configToUse = savedConfig;
          setModelConfig(savedConfig);
        }
      }
      onInitializeStory(advancedConfig, configToUse, true);
    }
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

  // 选择配置模式界面
  if (configMode === 'select') {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-4xl bg-white shadow-xl border-slate-200">
          <CardHeader className="text-center pb-8">
            <CardTitle className="text-4xl font-bold text-slate-800 mb-4">
              🎭 AI故事创作平台
          </CardTitle>
            <p className="text-slate-600 text-lg">选择您的创作方式，开始一段独特的故事之旅</p>
        </CardHeader>
        <CardContent>
            <div className="flex justify-end mb-6">
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

            {!modelConfig.apiKey && !hasValidConfig && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <p className="text-amber-800 text-sm text-center">
                  ⚠️ 请先配置AI模型才能开始创作故事
                </p>
              </div>
            )}

            {/* 存档管理区域 - 置顶 */}
            {savedContextsCount > 0 && (
              <div className="mb-8">
                <div className="border-2 border-green-200 rounded-lg bg-green-50 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-green-100 rounded-full">
                        <FolderOpen className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-800">继续之前的冒险</h3>
                        <p className="text-sm text-slate-600">发现了 {savedContextsCount} 个已保存的故事</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => setConfigMode('saves')}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-2"
                    >
                      查看所有存档
                    </Button>
                  </div>
                  <div className="text-sm text-green-700">
                    📚 点击上方按钮查看详细进度，一键继续您的故事之旅
                  </div>
                </div>
              </div>
            )}

            {/* 分隔线 */}
            <div className="flex items-center gap-4 mb-8">
              <div className="flex-1 h-px bg-slate-200"></div>
              <span className="text-slate-500 font-medium px-4">
                {savedContextsCount > 0 ? '或者开始新的故事' : '开始您的故事之旅'}
              </span>
              <div className="flex-1 h-px bg-slate-200"></div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* 简单配置 */}
              <Card className="border-2 border-blue-200 hover:border-blue-300 transition-all duration-300 cursor-pointer group"
                    onClick={() => setConfigMode('simple')}>
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4 p-4 bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <Wand2 className="h-8 w-8 text-blue-600" />
                  </div>
                  <CardTitle className="text-xl text-slate-800">✨ 简单配置</CardTitle>
                  <p className="text-slate-600 text-sm">快速开始，AI自动补充细节</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-blue-500" />
                      您只需要：
                    </h4>
                    <ul className="text-sm text-slate-600 space-y-1 ml-6">
                      <li>• 选择故事类型</li>
                      <li>• 描述故事想法</li>
                      <li>• AI自动生成角色和背景</li>
                    </ul>
                  </div>
                  <div className="pt-2">
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                      推荐新手使用
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* 高级配置 */}
              <Card className="border-2 border-purple-200 hover:border-purple-300 transition-all duration-300 cursor-pointer group"
                    onClick={() => setConfigMode('advanced')}>
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4 p-4 bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                    <Wrench className="h-8 w-8 text-purple-600" />
                  </div>
                  <CardTitle className="text-xl text-slate-800">⚙️ 高级配置</CardTitle>
                  <p className="text-slate-600 text-sm">全面控制，打造完美故事</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                      <Target className="h-4 w-4 text-purple-500" />
                      精细控制：
                    </h4>
                    <ul className="text-sm text-slate-600 space-y-1 ml-6">
                      <li>• 自定义角色设定</li>
                      <li>• 详细环境描述</li>
                      <li>• 选择故事长度和结局类型</li>
                      <li>• 调节故事基调和氛围</li>
                    </ul>
                  </div>
                  <div className="pt-2">
                    <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">
                      适合有经验的用户
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 如果没有存档，提供存档管理入口 */}
            {savedContextsCount === 0 && (
              <div className="mt-8 text-center">
                <div className="inline-flex items-center gap-2 text-slate-500 text-sm">
                  <FolderOpen className="h-4 w-4" />
                  <span>还没有保存的故事？</span>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setConfigMode('saves')}
                    className="text-green-600 hover:text-green-700 p-0 h-auto"
                  >
                    查看存档管理
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // 简单配置界面
  if (configMode === 'simple') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl bg-white shadow-lg border-slate-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={() => setConfigMode('select')}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-800"
              >
                <ArrowLeft className="h-4 w-4" />
                返回
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
              <CardTitle className="text-2xl font-bold text-slate-800 flex items-center justify-center gap-2">
                <Wand2 className="h-6 w-6 text-blue-600" />
                简单配置
              </CardTitle>
              <p className="text-slate-600 mt-2">描述您的想法，AI将为您创造完整的故事世界</p>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSimpleSubmit} className="space-y-6">
              {!modelConfig.apiKey && !hasValidConfig && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-amber-800 text-sm">
                  ⚠️ 请先配置AI模型才能开始创作故事
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="genre" className="text-slate-700 font-medium">故事类型</Label>
                <Select value={simpleConfig.genre} onValueChange={(value) => setSimpleConfig(prev => ({ ...prev, genre: value }))}>
                <SelectTrigger className="mt-2 bg-white border-slate-300 text-slate-800">
                    <SelectValue placeholder="选择您喜欢的故事类型" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  {genres.map((genre) => (
                    <SelectItem key={genre.value} value={genre.value} className="text-slate-800 hover:bg-blue-50">
                        <div>
                          <div className="font-medium">{genre.label}</div>
                          <div className="text-xs text-slate-500">{genre.desc}</div>
                        </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
                <Label htmlFor="story-idea" className="text-slate-700 font-medium">故事想法</Label>
                <Textarea
                  id="story-idea"
                  value={simpleConfig.story_idea}
                  onChange={(e) => setSimpleConfig(prev => ({ ...prev, story_idea: e.target.value }))}
                  placeholder="描述您希望的故事发展，例如：
• 一个失去记忆的人在未来城市中寻找自己的身份
• 平凡学生获得魔法能力后的校园生活
• 侦探调查一起神秘失踪案件
• 两个来自不同世界的人相遇并相爱

AI将根据您的描述自动创建角色、背景和情节..."
                  className="mt-2 bg-white border-slate-300 text-slate-800 placeholder:text-slate-400 resize-none"
                  rows={6}
                />
                <p className="text-xs text-slate-500 mt-1">
                  💡 提示：越详细的描述，AI生成的故事越符合您的期望
                </p>
              </div>

              <div>
                <Label htmlFor="main-goal" className="text-slate-700 font-medium">主要目标 <span className="text-red-500">*</span></Label>
              <Input
                  id="main-goal"
                  value={simpleConfig.main_goal}
                  onChange={(e) => setSimpleConfig(prev => ({ ...prev, main_goal: e.target.value }))}
                  placeholder="例如：找回失去的记忆、拯救世界、找到真爱、解决谋杀案..."
                className="mt-2 bg-white border-slate-300 text-slate-800 placeholder:text-slate-400"
              />
                <p className="text-xs text-slate-500 mt-1">
                  🎯 这个目标将决定故事何时结束 - 当目标达成或失败时，故事将自然收尾
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">AI将自动为您创建：</h4>
                <div className="grid grid-cols-2 gap-2 text-sm text-blue-700">
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

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-all duration-300"
                disabled={!simpleConfig.genre || !simpleConfig.story_idea || !simpleConfig.main_goal || !modelConfig.apiKey}
              >
                🎭 开始创作我的故事
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 高级配置界面
  if (configMode === 'advanced') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-4xl bg-white shadow-lg border-slate-200 max-h-[90vh] overflow-y-auto">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={() => setConfigMode('select')}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-800"
              >
                <ArrowLeft className="h-4 w-4" />
                返回
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
              <CardTitle className="text-2xl font-bold text-slate-800 flex items-center justify-center gap-2">
                <Wrench className="h-6 w-6 text-purple-600" />
                高级配置
              </CardTitle>
              <p className="text-slate-600 mt-2">精确控制故事的每一个细节，打造您的完美作品</p>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdvancedSubmit} className="space-y-8">
              {!modelConfig.apiKey && !hasValidConfig && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-amber-800 text-sm">
                    ⚠️ 请先配置AI模型才能开始创作故事
                  </p>
                </div>
              )}

              {/* 基础设定 */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2">基础设定</h3>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="adv-genre" className="text-slate-700 font-medium">故事类型</Label>
                    <Select value={advancedConfig.genre} onValueChange={(value) => setAdvancedConfig(prev => ({ ...prev, genre: value }))}>
                      <SelectTrigger className="mt-2 bg-white border-slate-300 text-slate-800">
                        <SelectValue placeholder="选择故事类型" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        {genres.map((genre) => (
                          <SelectItem key={genre.value} value={genre.value} className="text-slate-800 hover:bg-purple-50">
                            <div>
                              <div className="font-medium">{genre.label}</div>
                              <div className="text-xs text-slate-500">{genre.desc}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="story-length" className="text-slate-700 font-medium">故事长度</Label>
                    <Select value={advancedConfig.story_length} onValueChange={(value: 'short' | 'medium' | 'long') => setAdvancedConfig(prev => ({ ...prev, story_length: value }))}>
                      <SelectTrigger className="mt-2 bg-white border-slate-300 text-slate-800">
                        <SelectValue placeholder="选择故事长度" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        {storyLengths.map((length) => (
                          <SelectItem key={length.value} value={length.value} className="text-slate-800 hover:bg-purple-50">
                            <div>
                              <div className="font-medium">{length.label}</div>
                              <div className="text-xs text-slate-500">{length.desc}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="adv-story-idea" className="text-slate-700 font-medium">核心故事想法</Label>
                  <Textarea
                    id="adv-story-idea"
                    value={advancedConfig.story_idea}
                    onChange={(e) => setAdvancedConfig(prev => ({ ...prev, story_idea: e.target.value }))}
                    placeholder="描述您故事的核心概念和主要情节..."
                    className="mt-2 bg-white border-slate-300 text-slate-800 placeholder:text-slate-400 resize-none"
                    rows={3}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="tone" className="text-slate-700 font-medium">故事基调</Label>
                    <Select value={advancedConfig.tone} onValueChange={(value: 'light' | 'serious' | 'humorous' | 'dark' | 'romantic') => setAdvancedConfig(prev => ({ ...prev, tone: value }))}>
                      <SelectTrigger className="mt-2 bg-white border-slate-300 text-slate-800">
                        <SelectValue placeholder="选择故事基调" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        {tones.map((tone) => (
                          <SelectItem key={tone.value} value={tone.value} className="text-slate-800 hover:bg-purple-50">
                            <div>
                              <div className="font-medium">{tone.label}</div>
                              <div className="text-xs text-slate-500">{tone.desc}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="ending" className="text-slate-700 font-medium">期望结局类型</Label>
                    <Select value={advancedConfig.preferred_ending} onValueChange={(value: any) => setAdvancedConfig(prev => ({ ...prev, preferred_ending: value }))}>
                      <SelectTrigger className="mt-2 bg-white border-slate-300 text-slate-800">
                        <SelectValue placeholder="选择结局类型" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        {endingTypes.map((ending) => (
                          <SelectItem key={ending.value} value={ending.value} className="text-slate-800 hover:bg-purple-50">
                            <div>
                              <div className="font-medium">{ending.label}</div>
                              <div className="text-xs text-slate-500">{ending.desc}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* 角色设定 */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2 flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  角色设定
                </h3>

                <div>
                  <Label className="text-slate-700 font-medium">角色数量</Label>
                  <Select value={advancedConfig.character_count.toString()} onValueChange={(value) => handleCharacterCountChange(parseInt(value))}>
                    <SelectTrigger className="mt-2 bg-white border-slate-300 text-slate-800 w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      {[2, 3, 4, 5, 6].map((count) => (
                        <SelectItem key={count} value={count.toString()} className="text-slate-800 hover:bg-purple-50">
                          {count} 个角色
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4">
                  {advancedConfig.character_details.map((character, index) => (
                    <Card key={index} className="p-4 border border-slate-200">
                      <h4 className="font-medium text-slate-800 mb-3">角色 {index + 1}</h4>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <Label className="text-sm text-slate-600">姓名</Label>
                          <Input
                            value={character.name}
                            onChange={(e) => {
                              const newCharacters = [...advancedConfig.character_details];
                              newCharacters[index].name = e.target.value;
                              setAdvancedConfig(prev => ({ ...prev, character_details: newCharacters }));
                            }}
                            placeholder="角色姓名"
                            className="mt-1 bg-white border-slate-300 text-slate-800"
                          />
                        </div>
                        <div>
                          <Label className="text-sm text-slate-600">角色定位</Label>
                          <Input
                            value={character.role}
                            onChange={(e) => {
                              const newCharacters = [...advancedConfig.character_details];
                              newCharacters[index].role = e.target.value;
                              setAdvancedConfig(prev => ({ ...prev, character_details: newCharacters }));
                            }}
                            placeholder="如：主角、伙伴、反派"
                            className="mt-1 bg-white border-slate-300 text-slate-800"
                          />
                        </div>
                        <div>
                          <Label className="text-sm text-slate-600">性格特征</Label>
                          <Input
                            value={character.personality}
                            onChange={(e) => {
                              const newCharacters = [...advancedConfig.character_details];
                              newCharacters[index].personality = e.target.value;
                              setAdvancedConfig(prev => ({ ...prev, character_details: newCharacters }));
                            }}
                            placeholder="性格描述"
                            className="mt-1 bg-white border-slate-300 text-slate-800"
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* 故事目标设定 */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2 flex items-center gap-2">
                  <Target className="h-5 w-5 text-purple-600" />
                  故事目标设定
                </h3>
                
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                  <p className="text-purple-800 text-sm">
                    🎯 设定明确的故事目标，AI将根据这些目标的完成情况决定故事何时自然结束
                  </p>
                </div>

                <div className="space-y-4">
                  {advancedConfig.story_goals.map((goal, index) => (
                    <Card key={goal.id} className="p-4 border border-slate-200">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-slate-800">目标 {index + 1}</h4>
                        {advancedConfig.story_goals.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newGoals = advancedConfig.story_goals.filter(g => g.id !== goal.id);
                              setAdvancedConfig(prev => ({ ...prev, story_goals: newGoals }));
                            }}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50"
                          >
                            删除
                          </Button>
                        )}
                      </div>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                          <Label className="text-sm text-slate-600">目标描述</Label>
                          <Input
                            value={goal.description}
                            onChange={(e) => {
                              const newGoals = [...advancedConfig.story_goals];
                              const goalIndex = newGoals.findIndex(g => g.id === goal.id);
                              newGoals[goalIndex].description = e.target.value;
                              setAdvancedConfig(prev => ({ ...prev, story_goals: newGoals }));
                            }}
                            placeholder="如：找到失踪的朋友、击败邪恶势力、学会控制魔法..."
                            className="mt-1 bg-white border-slate-300 text-slate-800"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-sm text-slate-600">类型</Label>
                            <Select 
                              value={goal.type} 
                              onValueChange={(value: 'main' | 'sub' | 'personal' | 'relationship') => {
                                const newGoals = [...advancedConfig.story_goals];
                                const goalIndex = newGoals.findIndex(g => g.id === goal.id);
                                newGoals[goalIndex].type = value;
                                setAdvancedConfig(prev => ({ ...prev, story_goals: newGoals }));
                              }}
                            >
                              <SelectTrigger className="mt-1 bg-white border-slate-300 text-slate-800">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-white border-slate-200">
                                <SelectItem value="main" className="text-slate-800">主要</SelectItem>
                                <SelectItem value="sub" className="text-slate-800">次要</SelectItem>
                                <SelectItem value="personal" className="text-slate-800">个人</SelectItem>
                                <SelectItem value="relationship" className="text-slate-800">关系</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-sm text-slate-600">优先级</Label>
                            <Select 
                              value={goal.priority} 
                              onValueChange={(value: 'high' | 'medium' | 'low') => {
                                const newGoals = [...advancedConfig.story_goals];
                                const goalIndex = newGoals.findIndex(g => g.id === goal.id);
                                newGoals[goalIndex].priority = value;
                                setAdvancedConfig(prev => ({ ...prev, story_goals: newGoals }));
                              }}
                            >
                              <SelectTrigger className="mt-1 bg-white border-slate-300 text-slate-800">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-white border-slate-200">
                                <SelectItem value="high" className="text-slate-800">高</SelectItem>
                                <SelectItem value="medium" className="text-slate-800">中</SelectItem>
                                <SelectItem value="low" className="text-slate-800">低</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const newGoal = {
                      id: Date.now().toString(),
                      description: '',
                      type: 'sub' as const,
                      priority: 'medium' as const
                    };
                    setAdvancedConfig(prev => ({ 
                      ...prev, 
                      story_goals: [...prev.story_goals, newGoal] 
                    }));
                  }}
                  className="w-full border-purple-300 text-purple-700 hover:bg-purple-50"
                >
                  + 添加目标
                </Button>
              </div>

              {/* 环境设定 */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-purple-600" />
                  环境设定
                </h3>
                
                <div>
                  <Label htmlFor="environment" className="text-slate-700 font-medium">详细环境描述</Label>
                  <Textarea
                    id="environment"
                    value={advancedConfig.environment_details}
                    onChange={(e) => setAdvancedConfig(prev => ({ ...prev, environment_details: e.target.value }))}
                    placeholder="描述故事发生的具体环境，包括：
• 时间设定（现代、未来、古代等）
• 地理位置（城市、乡村、其他星球等）
• 社会背景（政治制度、科技水平、文化特色等）
• 特殊环境因素（魔法世界、末日废土、太空站等）"
                    className="mt-2 bg-white border-slate-300 text-slate-800 placeholder:text-slate-400 resize-none"
                    rows={5}
              />
            </div>

            <div>
              <Label htmlFor="requirements" className="text-slate-700 font-medium">特殊要求（可选）</Label>
              <Textarea
                id="requirements"
                    value={advancedConfig.special_requirements}
                    onChange={(e) => setAdvancedConfig(prev => ({ ...prev, special_requirements: e.target.value }))}
                    placeholder="其他特殊要求，如：
• 特定的情节元素
• 想要避免的内容
• 特殊的叙述风格
• 文化背景考虑"
                className="mt-2 bg-white border-slate-300 text-slate-800 placeholder:text-slate-400 resize-none"
                rows={3}
              />
                </div>
            </div>

            <Button
              type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition-all duration-300"
                disabled={!advancedConfig.genre || !advancedConfig.story_idea || !advancedConfig.story_goals.some(goal => goal.description.trim() !== '') || !modelConfig.apiKey}
            >
                🎭 创建精心定制的故事
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
  }

  // 存档管理界面
  if (configMode === 'saves') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="ghost"
              onClick={() => setConfigMode('select')}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-800"
            >
              <ArrowLeft className="h-4 w-4" />
              返回主页
            </Button>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
              <FolderOpen className="h-8 w-8 text-green-600" />
              存档管理
            </h1>
            <div className="w-20"></div> {/* 占位符，保持标题居中 */}
          </div>
          
          <SaveManager
            onLoadStory={(contextId) => {
              if (onLoadStory) {
                onLoadStory(contextId);
              }
            }}
            onSaveStory={() => {}}
            currentStoryExists={false}
            onClose={() => setConfigMode('select')}
            showInHomePage={true}
            onContextCountChange={setSavedContextsCount}
          />
        </div>
      </div>
    );
  }

  return null;
};

export default StoryInitializer;

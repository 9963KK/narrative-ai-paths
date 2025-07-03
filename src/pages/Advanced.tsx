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
import ModelConfig from '@/components/ModelConfig';
import { ModelConfig as ModelConfigType } from '@/components/model-config/constants';
import { loadModelConfig, hasSavedConfig } from '@/services/configStorage';
import { DocumentAnalysisResult } from '@/services/documentAnalyzer';

// 高级故事配置
interface AdvancedStoryConfig {
  genre: string;
  story_idea: string;
  protagonist: string;
  setting: string;
  special_requirements: string;
  character_count: number;
  character_details: Array<{
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
  documentAnalysis?: DocumentAnalysisResult;
  useDocumentAnalysis?: boolean;
}

const Advanced: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const documentAnalysis = location.state?.documentAnalysis as DocumentAnalysisResult | undefined;
  const [showModelConfig, setShowModelConfig] = useState(false);
  const [hasValidConfig, setHasValidConfig] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState<string>('basic');

  // 高级配置状态
  const [advancedConfig, setAdvancedConfig] = useState<AdvancedStoryConfig>({
    genre: '',
    story_idea: '',
    protagonist: '',
    setting: '',
    special_requirements: '',
    character_count: 3,
    character_details: [
      { name: '', role: '主角', traits: '' },
      { name: '', role: '伙伴', traits: '' },
      { name: '', role: '反派', traits: '' }
    ],
    environment_details: '',
    preferred_ending: 'open',
    story_length: 'medium',
    tone: 'serious',
    story_goals: [
      { id: '1', description: '', type: 'main', priority: 'high' }
    ],
    documentAnalysis,
    useDocumentAnalysis: !!documentAnalysis
  });

  const [modelConfig, setModelConfig] = useState<ModelConfigType>({
    provider: 'openai',
    model: 'gpt-4',
    apiKey: '',
    temperature: 0.8,
    maxTokens: 2000
  });

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

  // 如果有文档分析数据，自动填充配置
  useEffect(() => {
    if (documentAnalysis?.success && documentAnalysis.data) {
      const analysisData = documentAnalysis.data;
      
      // 从写作风格推断文体类型
      let inferredGenre = 'fantasy';
      const genre = analysisData.writingStyle.genre.toLowerCase();
      if (genre.includes('科幻') || genre.includes('sci-fi')) {
        inferredGenre = 'sci-fi';
      } else if (genre.includes('奇幻') || genre.includes('fantasy')) {
        inferredGenre = 'fantasy';
      } else if (genre.includes('推理') || genre.includes('悬疑') || genre.includes('mystery')) {
        inferredGenre = 'mystery';
      } else if (genre.includes('爱情') || genre.includes('浪漫') || genre.includes('romance')) {
        inferredGenre = 'romance';
      } else if (genre.includes('惊悚') || genre.includes('恐怖')) {
        inferredGenre = 'thriller';
      } else if (genre.includes('历史')) {
        inferredGenre = 'historical';
      } else if (genre.includes('日常') || genre.includes('生活')) {
        inferredGenre = 'slice-of-life';
      } else if (genre.includes('冒险')) {
        inferredGenre = 'adventure';
      }

      // 从语调推断故事基调
      let inferredTone: 'light' | 'serious' | 'humorous' | 'dark' | 'romantic' = 'serious';
      const tone = analysisData.writingStyle.tone.toLowerCase();
      if (tone.includes('轻松') || tone.includes('轻快')) {
        inferredTone = 'light';
      } else if (tone.includes('幽默') || tone.includes('诙谐')) {
        inferredTone = 'humorous';
      } else if (tone.includes('黑暗') || tone.includes('沉重')) {
        inferredTone = 'dark';
      } else if (tone.includes('浪漫') || tone.includes('温馨')) {
        inferredTone = 'romantic';
      }

      setAdvancedConfig(prev => ({
        ...prev,
        genre: inferredGenre,
        story_idea: `基于文档分析的故事想法：${analysisData.themes.mainThemes.join('、')}`,
        protagonist: analysisData.characters[0]?.name || '主角',
        setting: `${analysisData.setting.time}，${analysisData.setting.place}`,
        environment_details: `${analysisData.setting.time}，${analysisData.setting.place}。${analysisData.setting.worldBackground}。整体氛围：${analysisData.setting.atmosphere}`,
        tone: inferredTone,
        character_count: Math.min(Math.max(analysisData.characters.length, 3), 6),
        character_details: analysisData.characters.slice(0, 6).map((char, index) => ({
          name: char.name || `角色${index + 1}`,
          role: char.role || (index === 0 ? '主角' : '配角'),
          traits: char.traits || '待定义',
          appearance: char.appearance || '',
          backstory: char.backstory || ''
        })),
        story_goals: analysisData.plotElements.keyEvents.slice(0, 3).map((event, index) => ({
          id: `goal_${index + 1}`,
          description: event,
          type: index === 0 ? 'main' as const : 'sub' as const,
          priority: index === 0 ? 'high' as const : 'medium' as const
        })),
        documentAnalysis,
        useDocumentAnalysis: true
      }));
    }
  }, [documentAnalysis]);

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
        const roles = ['主角', '伙伴', '反派', '导师', '神秘人', '对手', '朋友', '敌人'];
        for (let i = newCharacters.length; i < count; i++) {
          newCharacters.push({
            name: '',
            role: roles[i] || '配角',
            traits: ''
          });
        }
      } else if (count < newCharacters.length) {
        newCharacters.splice(count);
      }
      
      return {
        ...prev,
        character_count: count,
        character_details: newCharacters
      };
    });
  };

  // 检查手风琴部分的完成状态
  const checkSectionCompletion = (section: string): boolean => {
    switch (section) {
      case 'basic':
        return !!(advancedConfig.genre && advancedConfig.story_idea && advancedConfig.tone && advancedConfig.preferred_ending);
      case 'character':
        return advancedConfig.character_details.some(char => char.name.trim() !== '' && char.role.trim() !== '' && char.traits.trim() !== '');
      case 'goal':
        return advancedConfig.story_goals.some(goal => goal.description.trim() !== '');
      case 'environment':
        return !!(advancedConfig.environment_details.trim());
      default:
        return false;
    }
  };

  // 切换手风琴部分
  const toggleAccordion = (section: string) => {
    setActiveAccordion(activeAccordion === section ? '' : section);
  };

  // 处理高级配置提交
  const handleAdvancedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const hasValidGoal = advancedConfig.story_goals.some(goal => goal.description.trim() !== '');
    const hasApiKey = modelConfig.apiKey || hasValidConfig;
    if (advancedConfig.genre && advancedConfig.story_idea && hasValidGoal && hasApiKey) {
      let configToUse = modelConfig;
      if (!modelConfig.apiKey && hasValidConfig) {
        const savedConfig = loadModelConfig();
        if (savedConfig) {
          configToUse = savedConfig;
          setModelConfig(savedConfig);
        }
      }
      // 保存配置到 localStorage
      localStorage.setItem('pendingStoryConfig', JSON.stringify({
        config: advancedConfig,
        modelConfig: configToUse,
        isAdvanced: true
      }));
      
      // 重定向到故事页面
      navigate('/app/story');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="w-full max-w-4xl mx-auto bg-white shadow-lg border-slate-200 rounded-2xl">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/app')}
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
          <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-800 flex items-center justify-center gap-3 mb-2">
              <Wrench className="h-8 w-8 text-purple-600" />
              专业模式
            </h1>
            <p className="text-slate-600">精确控制故事的每一个细节，打造您的完美作品</p>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6">
          {/* 文档分析结果显示 */}
          {advancedConfig.useDocumentAnalysis && advancedConfig.documentAnalysis?.data && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-green-800 flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  基于文档分析自动填充
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/app/document')}
                  className="text-green-700 border-green-300 hover:bg-green-100"
                >
                  查看完整分析
                </Button>
              </div>
              <div className="text-sm text-green-700 mb-2">
                ✅ 已从上传的文档中自动提取了角色、背景、风格等信息，您可以在下方进一步调整
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  {advancedConfig.documentAnalysis.data.characters.length} 个角色
                </Badge>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  {advancedConfig.documentAnalysis.data.themes.mainThemes.length} 个主题
                </Badge>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  {advancedConfig.documentAnalysis.data.suggestedStorySeeds.length} 个创意种子
                </Badge>
              </div>
            </div>
          )}

          {!modelConfig.apiKey && !hasValidConfig && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <p className="text-amber-800 text-sm">
                ⚠️ 请先配置AI模型才能开始创作故事
              </p>
            </div>
          )}

          {/* 手风琴布局 */}
          <div className="accordion">
            {/* 基础设定 */}
            <div className={`accordion-item ${activeAccordion === 'basic' ? 'active' : ''} ${checkSectionCompletion('basic') ? 'completed' : ''}`}>
              <div className="accordion-header ui-text" onClick={() => toggleAccordion('basic')}>
                <h3 className="flex items-center gap-3 text-lg font-semibold text-slate-800 m-0">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-indigo-600" />
                  </div>
                  基础设定
                  <span className="accordion-status">✔</span>
                </h3>
                <div className="accordion-icon">+</div>
              </div>
              <div className="accordion-content">
                <div className="accordion-content-inner">
                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <Label className="text-slate-700 font-medium">故事类型</Label>
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
                      <Label className="text-slate-700 font-medium">故事长度</Label>
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
                  <div className="mb-6">
                    <Label className="text-slate-700 font-medium">核心故事想法</Label>
                    <Textarea
                      value={advancedConfig.story_idea}
                      onChange={(e) => setAdvancedConfig(prev => ({ ...prev, story_idea: e.target.value }))}
                      placeholder="描述您故事的核心概念和主要情节..."
                      className="mt-2 bg-white border-slate-300 text-slate-800 placeholder:text-slate-400 resize-none"
                      rows={3}
                    />
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Label className="text-slate-700 font-medium">故事基调</Label>
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
                      <Label className="text-slate-700 font-medium">期望结局类型</Label>
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
              </div>
            </div>

            {/* 角色设定 */}
            <div className={`accordion-item ${activeAccordion === 'character' ? 'active' : ''} ${checkSectionCompletion('character') ? 'completed' : ''}`}>
              <div className="accordion-header ui-text" onClick={() => toggleAccordion('character')}>
                <h3 className="flex items-center gap-3 text-lg font-semibold text-slate-800 m-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  角色设定
                  <span className="accordion-status">✔</span>
                </h3>
                <div className="accordion-icon">+</div>
              </div>
              <div className="accordion-content">
                <div className="accordion-content-inner">
                  <div className="mb-6" style={{maxWidth: '250px'}}>
                    <Label className="text-slate-700 font-medium">角色数量</Label>
                    <Select value={advancedConfig.character_count.toString()} onValueChange={(value) => handleCharacterCountChange(parseInt(value))}>
                      <SelectTrigger className="mt-2 bg-white border-slate-300 text-slate-800">
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
                  <div className="space-y-4">
                    {advancedConfig.character_details.map((character, index) => (
                      <Card key={index} className="p-4 border border-slate-200">
                        <h4 className="font-medium text-slate-800 mb-3">角色 {index + 1}</h4>
                        <div className="grid md:grid-cols-2 gap-4">
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
                          <div className="md:col-span-2">
                            <Label className="text-sm text-slate-600">性格特征</Label>
                            <Input
                              value={character.traits}
                              onChange={(e) => {
                                const newCharacters = [...advancedConfig.character_details];
                                newCharacters[index].traits = e.target.value;
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
              </div>
            </div>

            {/* 故事目标设定 */}
            <div className={`accordion-item ${activeAccordion === 'goal' ? 'active' : ''} ${checkSectionCompletion('goal') ? 'completed' : ''}`}>
              <div className="accordion-header ui-text" onClick={() => toggleAccordion('goal')}>
                <h3 className="flex items-center gap-3 text-lg font-semibold text-slate-800 m-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Target className="h-5 w-5 text-emerald-600" />
                  </div>
                  故事目标设定
                  <span className="accordion-status">✔</span>
                </h3>
                <div className="accordion-icon">+</div>
              </div>
              <div className="accordion-content">
                <div className="accordion-content-inner">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                    <p className="text-purple-800 text-sm">
                      💡 设定明确的故事目标，AI将根据这些目标的完成情况决定故事何时自然结束
                    </p>
                  </div>
                  <div className="space-y-4 mb-4">
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
                              className="text-slate-400 hover:text-red-600 hover:bg-red-50 w-6 h-6 rounded-full flex items-center justify-center"
                            >
                              ×
                            </Button>
                          )}
                        </div>
                        <div className="grid gap-4">
                          <div>
                            <Label className="text-sm text-slate-600">目标描述</Label>
                            <Input
                              value={goal.description}
                              onChange={(e) => {
                                const newGoals = [...advancedConfig.story_goals];
                                const goalIndex = newGoals.findIndex(g => g.id === goal.id);
                                newGoals[goalIndex].description = e.target.value;
                                setAdvancedConfig(prev => ({ ...prev, story_goals: newGoals }));
                              }}
                              placeholder="如：找到失踪的朋友..."
                              className="mt-1 bg-white border-slate-300 text-slate-800"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
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
                    className="w-full border-2 border-dashed border-indigo-300 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-400 transition-all duration-200 py-3 rounded-lg flex items-center justify-center gap-2 font-medium"
                  >
                    + 添加目标
                  </Button>
                </div>
              </div>
            </div>

            {/* 环境与特殊要求 */}
            <div className={`accordion-item ${activeAccordion === 'environment' ? 'active' : ''} ${checkSectionCompletion('environment') ? 'completed' : ''}`}>
              <div className="accordion-header ui-text" onClick={() => toggleAccordion('environment')}>
                <h3 className="flex items-center gap-3 text-lg font-semibold text-slate-800 m-0">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-orange-600" />
                  </div>
                  环境与特殊要求
                  <span className="accordion-status">✔</span>
                </h3>
                <div className="accordion-icon">+</div>
              </div>
              <div className="accordion-content">
                <div className="accordion-content-inner">
                  <div className="mb-6">
                    <Label className="text-slate-700 font-medium">详细环境描述</Label>
                    <Textarea
                      value={advancedConfig.environment_details}
                      onChange={(e) => setAdvancedConfig(prev => ({ ...prev, environment_details: e.target.value }))}
                      placeholder="描述故事发生的具体环境..."
                      className="mt-2 bg-white border-slate-300 text-slate-800 placeholder:text-slate-400 resize-none"
                      rows={4}
                    />
                  </div>
                  <div>
                    <Label className="text-slate-700 font-medium">特殊要求（可选）</Label>
                    <Textarea
                      value={advancedConfig.special_requirements}
                      onChange={(e) => setAdvancedConfig(prev => ({ ...prev, special_requirements: e.target.value }))}
                      placeholder="其他特殊要求..."
                      className="mt-2 bg-white border-slate-300 text-slate-800 placeholder:text-slate-400 resize-none"
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 提交按钮 */}
          <div className="mt-8">
            <Button
              onClick={handleAdvancedSubmit}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold py-4 rounded-xl transition-all duration-300 text-lg shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
              disabled={!advancedConfig.genre || !advancedConfig.story_idea || !advancedConfig.story_goals.some(goal => goal.description.trim() !== '') || (!modelConfig.apiKey && !hasValidConfig)}
            >
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                <Sparkles className="h-4 w-4" />
              </div>
              创建精心定制的故事
            </Button>
          </div>
        </div>
      </div>

      {/* 添加手风琴样式 */}
      <style jsx>{`
        .accordion-item {
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          margin-bottom: 1rem;
          overflow: hidden;
        }
        
        .accordion-item.completed {
          border-color: #10b981;
          background-color: #f0fdf4;
        }
        
        .accordion-header {
          padding: 1rem;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background-color: #f8fafc;
          transition: background-color 0.2s;
        }
        
        .accordion-header:hover {
          background-color: #f1f5f9;
        }
        
        .accordion-item.active .accordion-header {
          background-color: #e0e7ff;
        }
        
        .accordion-item.completed .accordion-header {
          background-color: #dcfce7;
        }
        
        .accordion-status {
          color: #10b981;
          font-weight: bold;
          opacity: 0;
        }
        
        .accordion-item.completed .accordion-status {
          opacity: 1;
        }
        
        .accordion-icon {
          font-weight: bold;
          font-size: 1.5rem;
          color: #64748b;
          transition: transform 0.2s;
        }
        
        .accordion-item.active .accordion-icon {
          transform: rotate(45deg);
        }
        
        .accordion-content {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s ease-out;
        }
        
        .accordion-item.active .accordion-content {
          max-height: 2000px;
        }
        
        .accordion-content-inner {
          padding: 1.5rem;
        }
      `}</style>
    </div>
  );
};

export default Advanced;
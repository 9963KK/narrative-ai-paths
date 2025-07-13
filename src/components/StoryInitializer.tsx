import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Settings, Wand2, Wrench, ArrowLeft, Users, Target, MapPin, Sparkles, FolderOpen, BookOpen, FileText, Upload } from 'lucide-react';
import SaveManager from './SaveManager';
import DocumentAnalyzer from './DocumentAnalyzer';
import DocumentAnalysisResultView from './DocumentAnalysisResultView';
import { ModelConfig as ModelConfigType } from './model-config/constants';
import { modelConfigAdapter } from '@/services/modelConfigAdapter';
import { getSavedContexts, SavedStoryContext } from '@/services/contextManager';
import { DocumentAnalysisResult } from '@/services/documentAnalyzer';
import { storyAI } from '@/services/storyAI';

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
  // 文档分析相关字段
  documentAnalysis?: DocumentAnalysisResult;
  useDocumentAnalysis?: boolean;
}

// 统一的故事配置类型
export type StoryConfig = BaseStoryConfig | AdvancedStoryConfig;

interface StoryInitializerProps {
  onInitializeStory: (config: StoryConfig, modelConfig: ModelConfigType, isAdvanced: boolean) => void;
  onLoadStory?: (contextId: string) => void;
  onNavigate?: (path: string) => void;
}

const StoryInitializer: React.FC<StoryInitializerProps> = ({ onInitializeStory, onLoadStory, onNavigate }) => {
  const [configMode, setConfigMode] = useState<'select' | 'simple' | 'advanced' | 'saves' | 'document' | 'analysis-result' | 'outline-selection'>('select');
  
  // 分步向导状态 - 必须在组件顶层定义
  const [currentStep, setCurrentStep] = useState(1);
  
  // 手风琴状态管理
  const [activeAccordion, setActiveAccordion] = useState<string>('basic');
  
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
    ]
  });

  const [modelConfig, setModelConfig] = useState<ModelConfigType>({
    provider: 'openai',
    model: 'gpt-4',
    apiKey: '',
    temperature: 0.8,
    maxTokens: 2000
  });

  const [hasValidConfig, setHasValidConfig] = useState(false);
  const [savedContextsCount, setSavedContextsCount] = useState(0);
  const [documentAnalysisResult, setDocumentAnalysisResult] = useState<DocumentAnalysisResult | null>(null);
  const [recentStories, setRecentStories] = useState<Array<{
    id: string;
    title: string;
    lastPlayTime: Date;
    progress: number;
    genre: string;
  }>>([]);
  
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
  const [originalSimpleConfig, setOriginalSimpleConfig] = useState<BaseStoryConfig | null>(null);

  // 组件加载时检查用户模型配置和存档
  useEffect(() => {
    const loadUserConfig = async () => {
      try {
        // 确保用户有可用模型
        await modelConfigAdapter.ensureUserHasModels();
        
        // 加载用户的模型配置
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
    
    // 检查存档数量
    updateSavedContextsCount();
  }, []);

  // 时间格式化函数
  const formatLastPlayTime = (date: Date): string => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return '刚刚';
    if (diffInHours < 24) return `${diffInHours}小时前`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return '昨天';
    if (diffInDays < 7) return `${diffInDays}天前`;
    
    // 超过一周显示具体日期
    return date.toLocaleDateString('zh-CN', { 
      month: 'short', 
      day: 'numeric'
    }) + ' ' + date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 确保有有效的模型配置
  const ensureValidConfig = async (): Promise<ModelConfigType> => {
    // 如果当前配置无效，尝试加载用户配置
    if (!modelConfig.apiKey && hasValidConfig) {
      try {
        const userConfig = await modelConfigAdapter.getUserModelConfig();
        if (userConfig) {
          setModelConfig(userConfig);
          return userConfig;
        }
      } catch (error) {
        console.error('加载用户配置失败:', error);
      }
    }
    
    // 如果还是没有有效配置，使用当前配置
    return modelConfig;
  };

  // 更新存档数量和获取最近故事的函数
  const updateSavedContextsCount = () => {
    const savedContexts = getSavedContexts();
    const contextArray = Object.values(savedContexts);
    setSavedContextsCount(contextArray.length);
    
    // 获取最近的两个故事
    const recentStoriesData = contextArray
      .sort((a, b) => new Date(b.lastPlayTime).getTime() - new Date(a.lastPlayTime).getTime())
      .slice(0, 2)
      .map(context => ({
        id: context.id,
        title: context.title,
        lastPlayTime: new Date(context.lastPlayTime),
        progress: context.storyState.story_progress || Math.min(75, context.storyState.chapter * 12.5), // 根据章节估算进度
        genre: context.genre || context.storyState.genre || '未知类型'
      }));
    
    setRecentStories(recentStoriesData);
  };

  // 当切换到select模式时，重新更新存档数量
  useEffect(() => {
    if (configMode === 'select') {
      updateSavedContextsCount();
    }
  }, [configMode]);

  // 当切换模式时重置步骤
  useEffect(() => {
    if (configMode !== 'simple') {
      setCurrentStep(1); // 重置到第一步
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
            traits: ''
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

  // 处理简单配置提交 - 生成故事梗概
  const handleSimpleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // 检查当前配置或本地保存的配置
    const hasApiKey = modelConfig.apiKey || hasValidConfig;
    if (simpleConfig.genre && simpleConfig.story_idea && hasApiKey) {
      // 保存原始配置
      setOriginalSimpleConfig(simpleConfig);
      setIsGeneratingOutlines(true);
      
      try {
        // 确保有有效的模型配置
        const configToUse = await ensureValidConfig();
        
        // 模型配置现在由统一AI服务自动管理
        
        // 生成故事梗概
        console.log('🎨 开始生成故事梗概...');
        const outlines = await storyAI.generateStoryOutlines(
          simpleConfig.story_idea,
          simpleConfig.genre,
          simpleConfig.main_goal
        );
        
        console.log('✅ 故事梗概生成完成:', outlines);
        setStoryOutlines(outlines);
        setConfigMode('outline-selection');
      } catch (error) {
        console.error('❌ 生成故事梗概失败:', error);
        alert('生成故事梗概失败，请检查网络连接或API配置');
      } finally {
        setIsGeneratingOutlines(false);
      }
    }
  };
  
  // 处理梗概选择
  const handleOutlineSelection = async (selectedOutline: {
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
    const enhancedConfig: AdvancedStoryConfig = {
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
    
    // 使用增强配置创建故事
    const configToUse = await ensureValidConfig();
    
    console.log('🚀 基于选择的梗概创建故事:', selectedOutline.title);
    onInitializeStory(enhancedConfig, configToUse, true);
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
  const handleAdvancedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasValidGoal = advancedConfig.story_goals.some(goal => goal.description.trim() !== '');
    // 检查当前配置或本地保存的配置
    const hasApiKey = modelConfig.apiKey || hasValidConfig;
    if (advancedConfig.genre && advancedConfig.story_idea && hasValidGoal && hasApiKey) {
      // 确保有有效的模型配置
      const configToUse = await ensureValidConfig();
      onInitializeStory(advancedConfig, configToUse, true);
    }
  };

  // 处理文档分析完成
  const handleDocumentAnalysisComplete = (result: DocumentAnalysisResult) => {
    setDocumentAnalysisResult(result);
    console.log('📄 文档分析完成，切换到结果展示界面', result);
    
    if (result.success && result.data) {
      // 直接跳转到分析结果展示界面
      setConfigMode('analysis-result');
    }
  };

  // 基于文档分析创建故事
  const handleCreateFromAnalysis = async (selectedSeed?: any) => {
    if (!documentAnalysisResult?.success || !documentAnalysisResult.data) return;
    

    // 使用文档分析结果创建配置
    const analysisData = documentAnalysisResult.data;
    
    // 从写作风格推断文体类型
    let inferredGenre = 'fantasy'; // 默认
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

    // 使用选中的创意种子，或者默认使用第一个
    const seedToUse = selectedSeed || analysisData.suggestedStorySeeds[0];
    const baseStoryIdea = seedToUse 
      ? `基于《${seedToUse.title}》的创意：${seedToUse.premise}`
      : '继承原作精神的全新故事';

    // 如果有选中的创意种子，优先使用其角色和背景
    const charactersToUse = seedToUse?.characters 
      ? seedToUse.characters.map((charName: string, index: number) => {
          // 尝试从分析的角色中找到匹配的角色，如果没有则创建新角色
          const matchedChar = analysisData.characters.find(char => 
            char.name && char.name.includes(charName) || charName.includes(char.name || '')
          );
          return {
            name: charName,
            role: index === 0 ? '主角' : '配角',
            traits: matchedChar?.traits || '待定义的角色特征',
            appearance: matchedChar?.appearance || '待描述',
            backstory: matchedChar?.backstory || '待补充的背景故事'
          };
        })
      : analysisData.characters.slice(0, 6).map((char, index) => ({
          name: char.name || `角色${index + 1}`,
          role: char.role || '配角',
          traits: char.traits || '待定义',
          appearance: char.appearance || '',
          backstory: char.backstory || ''
        }));

    // 如果有选中的创意种子，优先使用其背景设定
    const settingToUse = seedToUse?.setting 
      ? `${seedToUse.setting}。${analysisData.setting.worldBackground}`
      : `${analysisData.setting.time}，${analysisData.setting.place}。${analysisData.setting.worldBackground}`;

    const documentBasedConfig: AdvancedStoryConfig = {
      genre: inferredGenre,
      story_idea: baseStoryIdea,
      protagonist: charactersToUse[0]?.name || '新主角',
      setting: settingToUse,
      special_requirements: seedToUse ? `特别注重创意种子"${seedToUse.title}"中的核心元素和角色关系` : '',
      character_count: Math.min(Math.max(charactersToUse.length, 3), 6),
      character_details: charactersToUse.slice(0, 6),
      environment_details: `${settingToUse}。整体氛围：${analysisData.setting.atmosphere}`,
      preferred_ending: 'open',
      story_length: 'medium',
      tone: inferredTone,
      story_goals: analysisData.plotElements.keyEvents.slice(0, 3).map((event, index) => ({
        id: `goal_${index + 1}`,
        description: event,
        type: index === 0 ? 'main' as const : 'sub' as const,
        priority: index === 0 ? 'high' as const : 'medium' as const
      })),
      documentAnalysis: documentAnalysisResult,
      useDocumentAnalysis: true
    };

    const configToUse = await ensureValidConfig();

    onInitializeStory(documentBasedConfig, configToUse, true);
  };

  // 导出分析结果
  const handleExportAnalysisResult = () => {
    if (!documentAnalysisResult?.success || !documentAnalysisResult.data) return;
    
    const dataStr = JSON.stringify(documentAnalysisResult.data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `document-analysis-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 处理文档分析结果变更
  const handleAnalysisResultChange = (updatedResult: DocumentAnalysisResult) => {
    setDocumentAnalysisResult(updatedResult);
    
    // 如果当前在advanced模式，更新高级配置中的文档分析数据
    if (configMode === 'advanced' && advancedConfig.documentAnalysis) {
      setAdvancedConfig(prev => ({
        ...prev,
        documentAnalysis: updatedResult
      }));
    }
    
    console.log('文档分析结果已更新:', updatedResult);
  };

  // 文档分析界面
  if (configMode === 'document') {
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
          </div>

          <DocumentAnalyzer
            modelConfig={modelConfig}
            onAnalysisComplete={handleDocumentAnalysisComplete}
            onClose={() => setConfigMode('select')}
          />
        </div>
      </div>
    );
  }

  // 文档分析结果展示界面
  if (configMode === 'analysis-result') {
    if (!documentAnalysisResult) {
      // 如果没有分析结果，返回文档分析界面
      setConfigMode('document');
      return null;
    }

    return (
      <DocumentAnalysisResultView
        result={documentAnalysisResult}
        onBack={() => setConfigMode('document')}
        onCreateStory={handleCreateFromAnalysis}
        onExportResult={handleExportAnalysisResult}
        onSaveChanges={handleAnalysisResultChange}
      />
    );
  }

  // 选择配置模式界面
  if (configMode === 'select') {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header with Model Config Button */}
          <div className="relative mb-12">
            <header className="text-center ui-text">
              <h1 className="text-4xl font-black text-gray-800">AI 故事创作平台</h1>
              <p className="mt-3 text-lg text-gray-500">选择您的创作方式，开启一段独一无二的故事之旅</p>
            </header>
          </div>

          {/* API Key Warning */}

          {/* Continue Section */}
          {savedContextsCount > 0 && (
            <section className="mb-12">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-2xl font-bold text-gray-700">继续您的冒险</h2>
                <Button
                  onClick={() => setConfigMode('saves')}
                  className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-800 transition-colors duration-200"
                >
                  <FolderOpen className="w-5 h-5" />
                  <span className="font-medium text-sm">管理所有存档</span>
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 显示最近的故事 */}
                {recentStories && recentStories.slice(0, 2).map((story, index) => (
                  <div 
                    key={story.id}
                    className="bg-white p-6 rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-300 flex items-center space-x-5 cursor-pointer"
                    onClick={() => {
                      if (onLoadStory) {
                        onLoadStory(story.id);
                      }
                    }}
                  >
                    <div className={`p-3 rounded-lg ${index === 0 ? 'bg-green-100' : 'bg-blue-100'}`}>
                      <BookOpen className={`w-6 h-6 ${index === 0 ? 'text-green-600' : 'text-blue-600'}`} />
                    </div>
                    <div className="flex-grow ui-text">
                      <h3 className="font-bold text-gray-800">{story.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">上次编辑：{formatLastPlayTime(story.lastPlayTime)}</p>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 mt-3">
                        <div 
                          className={`h-2.5 rounded-full ${index === 0 ? 'bg-green-500' : 'bg-blue-500'}`} 
                          style={{width: `${Math.min(100, Math.max(5, story.progress))}%`}}
                        ></div>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-gray-500">{story.genre}</span>
                        <span className="text-xs font-medium text-gray-600">
                          {Math.round(Math.min(100, Math.max(5, story.progress)))}%
                        </span>
                      </div>
                    </div>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onLoadStory) {
                          onLoadStory(story.id);
                        }
                      }}
                      className={`transition-all duration-200 p-3 rounded-full ${
                        index === 0 
                          ? 'bg-green-100 text-green-600 hover:bg-green-200 hover:text-green-700' 
                          : 'bg-blue-100 text-blue-600 hover:bg-blue-200 hover:text-blue-700'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                      </svg>
                    </Button>
                  </div>
                ))}
                
                {/* 如果只有一个故事，显示占位符 */}
                {recentStories && recentStories.length === 1 && (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-6 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group"
                       onClick={() => setConfigMode('simple')}>
                    <div className="flex items-center space-x-4">
                      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-3 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <Sparkles className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-grow">
                        <h3 className="font-bold text-gray-800 text-lg mb-1">开启全新冒险</h3>
                        <p className="text-sm text-gray-600 mb-3">无限可能等你探索</p>
                        <div className="flex items-center space-x-2 text-blue-600">
                          <span className="text-xs font-medium">点击开始创作</span>
                          <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                          </svg>
                        </div>
                      </div>
                    </div>
                    
                    {/* 装饰性元素 */}
                    <div className="mt-4 flex justify-between items-center opacity-60">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-blue-300 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-indigo-300 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                        <div className="w-2 h-2 bg-purple-300 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                      </div>
                      <span className="text-xs text-gray-500 font-medium">准备就绪</span>
                    </div>
                  </div>
                )}

                {/* 如果没有故事，显示两个引导卡片 */}
                {(!recentStories || recentStories.length === 0) && (
                  <>
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-100 p-6 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group"
                         onClick={() => setConfigMode('simple')}>
                      <div className="flex items-center space-x-4">
                        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-3 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                          <Wand2 className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-grow">
                          <h3 className="font-bold text-gray-800 text-lg mb-1">快速开始</h3>
                          <p className="text-sm text-gray-600 mb-3">简单配置，即刻冒险</p>
                          <div className="flex items-center space-x-2 text-emerald-600">
                            <span className="text-xs font-medium">3分钟开始故事</span>
                            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                            </svg>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 bg-white/50 rounded-lg p-2">
                        <div className="text-xs text-gray-600 flex items-center space-x-2">
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                          <span>AI智能生成故事梗概</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-violet-50 to-purple-100 p-6 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group"
                         onClick={() => setConfigMode('advanced')}>
                      <div className="flex items-center space-x-4">
                        <div className="bg-gradient-to-r from-violet-500 to-purple-600 p-3 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                          <Settings className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-grow">
                          <h3 className="font-bold text-gray-800 text-lg mb-1">深度定制</h3>
                          <p className="text-sm text-gray-600 mb-3">详细配置，精心雕琢</p>
                          <div className="flex items-center space-x-2 text-violet-600">
                            <span className="text-xs font-medium">高级设定模式</span>
                            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                            </svg>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 bg-white/50 rounded-lg p-2">
                        <div className="text-xs text-gray-600 flex items-center space-x-2">
                          <div className="w-1.5 h-1.5 bg-violet-500 rounded-full"></div>
                          <span>多角色复杂故事构建</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </section>
          )}

          {/* Divider */}
          <div className="text-center my-8">
            <span className="text-sm text-gray-400 font-medium">
              {savedContextsCount > 0 ? '或者，开启一段全新的故事' : '开启您的故事之旅'}
            </span>
          </div>

          {/* New Story Section */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Card 1: Simple */}
            <div 
              className="bg-white p-8 rounded-2xl shadow-lg text-center cursor-pointer transition-all duration-300 border border-transparent hover:transform hover:-translate-y-2 hover:shadow-2xl hover:border-indigo-500 ui-text"
              onClick={() => setConfigMode('simple')}
            >
              <div className="mx-auto w-20 h-20 flex items-center justify-center bg-indigo-100 rounded-full mb-6">
                <Wand2 className="w-10 h-10 text-indigo-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">快速开始</h3>
              <p className="text-gray-500 mt-2 mb-6">提供一个想法，AI补全所有细节。最适合寻找灵感的你。</p>
              <span className="inline-block bg-indigo-500 text-white font-semibold py-2 px-5 rounded-lg">推荐新手使用</span>
            </div>

            {/* Card 2: Advanced */}
            <div 
              className="bg-white p-8 rounded-2xl shadow-lg text-center cursor-pointer transition-all duration-300 border border-transparent hover:transform hover:-translate-y-2 hover:shadow-2xl hover:border-purple-500 ui-text"
              onClick={() => setConfigMode('advanced')}
            >
              <div className="mx-auto w-20 h-20 flex items-center justify-center bg-purple-100 rounded-full mb-6">
                <Wrench className="w-10 h-10 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">专业模式</h3>
              <p className="text-gray-500 mt-2 mb-6">全面掌控故事的每个细节，精雕细琢，打造完美篇章。</p>
              <span className="inline-block bg-purple-500 text-white font-semibold py-2 px-5 rounded-lg">适合有经验的用户</span>
            </div>

            {/* Card 3: Document */}
            <div 
              className="bg-white p-8 rounded-2xl shadow-lg text-center cursor-pointer transition-all duration-300 border border-transparent hover:transform hover:-translate-y-2 hover:shadow-2xl hover:border-teal-500 ui-text"
              onClick={() => setConfigMode('document')}
            >
              <div className="mx-auto w-20 h-20 flex items-center justify-center bg-teal-100 rounded-full mb-6">
                <Upload className="w-10 h-10 text-teal-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">文档分析</h3>
              <p className="text-gray-500 mt-2 mb-6">上传您的小说草稿，AI 提取核心元素，激发续写灵感。</p>
              <span className="inline-block bg-teal-500 text-white font-semibold py-2 px-5 rounded-lg">创新功能</span>
            </div>
          </section>
        </div>
      </div>
    );
  }

  // 简单配置界面
  if (configMode === 'simple') {
    // 分步向导配置 - 使用组件顶层的state
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

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto w-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <Button
              variant="ghost"
              onClick={() => setConfigMode('select')}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-800"
            >
              <ArrowLeft className="h-4 w-4" />
              返回
            </Button>
            <div className="text-center ui-text">
              <h1 className="text-3xl font-bold text-gray-800">开启您的故事之旅</h1>
              <p className="text-gray-500 mt-2">跟随向导，一步步构建您的世界</p>
            </div>
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
  }

  // 故事梗概选择界面
  if (configMode === 'outline-selection') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <Card className="w-full max-w-6xl mx-auto bg-white shadow-xl border-slate-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={() => setConfigMode('simple')}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-800"
              >
                <ArrowLeft className="h-4 w-4" />
                返回修改
              </Button>
            </div>
            <div className="text-center pt-4">
              <CardTitle className="text-3xl font-bold text-slate-800 flex items-center justify-center gap-2">
                <BookOpen className="h-8 w-8 text-blue-600" />
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
                  className="border-2 border-slate-200 hover:border-blue-300 cursor-pointer transition-all duration-300 group hover:shadow-lg"
                  onClick={() => handleOutlineSelection(outline)}
                >
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl text-slate-800 group-hover:text-blue-700 transition-colors">
                      {outline.title}
                    </CardTitle>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        {outline.genre}
                      </Badge>
                      <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                        {outline.tone}
                      </Badge>
                    </div>
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
                          <Badge 
                            key={index}
                            variant="outline" 
                            className="text-xs border-slate-300 text-slate-600"
                          >
                            {character}
                          </Badge>
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
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
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
                onClick={() => setConfigMode('simple')}
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

  // 高级配置界面
  if (configMode === 'advanced') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <div className="w-full max-w-4xl mx-auto bg-white shadow-lg border-slate-200 rounded-2xl">
          {/* Header */}
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="ghost"
                onClick={() => setConfigMode('select')}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-800"
              >
                <ArrowLeft className="h-4 w-4" />
                返回
              </Button>
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-bold text-slate-800 flex items-center justify-center gap-3 mb-2">
                <Wrench className="h-8 w-8 text-purple-600" />
                高级配置
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
                    onClick={() => setConfigMode('document')}
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

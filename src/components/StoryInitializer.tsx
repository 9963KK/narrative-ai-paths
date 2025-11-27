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
import { useAuth } from '@/contexts/AuthContext';
import { contextManager, SavedStoryContext } from '../services/contextManager';
import { ModelConfig as ModelConfigType } from './model-config/constants';
import { modelConfigAdapter } from '../services/modelConfigAdapter';
import { getSavedContexts } from '@/services/contextManager';
import { DocumentAnalysisResult } from '@/services/documentAnalyzer';
import { storyAI } from '@/services/storyAI';

const PAPER_TEXTURE_URL = "https://www.transparenttextures.com/patterns/cream-paper.png";

// 基础故事配置
interface BaseStoryConfig {
  genre: string;
  story_idea: string; // 简单模式：用户的故事想法
  main_goal?: string; // 简单模式：主要目标
  setting?: string; // 故事背景设定
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
        // 检查用户是否有可用模型（基于等级）
        const hasModels = await modelConfigAdapter.hasAvailableModels();
        if (!hasModels) {
          setHasValidConfig(false);
          console.warn('用户没有可用的模型');
          return;
        }

        // 加载用户的模型配置
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
    const savedContexts = getSavedContexts() as unknown as Record<string, SavedStoryContext>;
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
        const outlineStrings = await storyAI.generateStoryOutlines(
          simpleConfig.story_idea,
          simpleConfig.genre,
          simpleConfig.main_goal
        );

        console.log('✅ 故事梗概生成完成:', outlineStrings);

        // 将字符串大纲转换为对象格式
        const structuredOutlines = outlineStrings.map((outline, index) => ({
          id: index,
          title: `故事构想 ${index + 1}`,
          premise: outline,
          genre: simpleConfig.genre,
          tone: '未指定',
          characters: [],
          setting: '未知设定',
          hook: outline.length > 50 ? outline.substring(0, 50) + '...' : outline
        }));

        setStoryOutlines(structuredOutlines);
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
      <div className="min-h-screen bg-[#fdfbf9] p-4 font-serif relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{ backgroundImage: `url(${PAPER_TEXTURE_URL})` }}
        />
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="ghost"
              onClick={() => setConfigMode('select')}
              className="flex items-center gap-2 text-[#5d554a] hover:text-[#2c241b] hover:bg-[#c5a059]/10"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="font-serif">返回主页</span>
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
      <div className="min-h-screen bg-[#fdfbf9] p-4 sm:p-8 relative overflow-hidden font-serif">
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{ backgroundImage: `url(${PAPER_TEXTURE_URL})` }}
        />

        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-[#c5a059] to-transparent opacity-30" />
        <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-[#c5a059] to-transparent opacity-30" />

        <div className="max-w-5xl mx-auto relative z-10">
          {/* Header */}
          <div className="text-center mb-16 pt-8">
            <div className="inline-flex items-center justify-center p-4 mb-6 rounded-full bg-[#2c241b] text-[#c5a059] shadow-lg border-2 border-[#c5a059]">
              <Sparkles className="w-8 h-8" />
            </div>
            <h1 className="text-5xl font-bold text-[#2c241b] mb-4 tracking-tight">
              故事创作工坊
            </h1>
            <p className="text-xl text-[#5d554a] max-w-2xl mx-auto italic">
              "每一个伟大的故事，都始于一个微小的灵感。"
            </p>
            <div className="mt-8 flex justify-center">
              <div className="h-px w-32 bg-gradient-to-r from-transparent via-[#c5a059] to-transparent" />
            </div>
          </div>

          {/* Continue Section */}
          {savedContextsCount > 0 && (
            <section className="mb-16">
              <div className="flex justify-between items-center mb-6 px-2">
                <h2 className="text-2xl font-bold text-[#2c241b] flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-[#c5a059] rounded-full"></span>
                  继续您的冒险
                </h2>
                <Button
                  onClick={() => setConfigMode('saves')}
                  variant="ghost"
                  className="flex items-center space-x-2 text-[#5d554a] hover:text-[#2c241b] hover:bg-[#c5a059]/10 transition-colors duration-200"
                >
                  <FolderOpen className="w-5 h-5" />
                  <span className="font-medium">管理所有存档</span>
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 显示最近的故事 */}
                {recentStories && recentStories.slice(0, 2).map((story, index) => (
                  <div
                    key={story.id}
                    className="group relative bg-[#fdfbf9] p-6 rounded-xl border-2 border-[#f2f0ea] hover:border-[#c5a059] transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md"
                    onClick={() => {
                      if (onLoadStory) {
                        onLoadStory(story.id);
                      }
                    }}
                  >
                    <div className="absolute inset-0 bg-[#c5a059]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />

                    <div className="relative flex items-center space-x-5">
                      <div className={`p-4 rounded-lg border border-[#f2f0ea] bg-white shadow-sm group-hover:scale-105 transition-transform duration-300`}>
                        <BookOpen className="w-6 h-6 text-[#c5a059]" />
                      </div>
                      <div className="flex-grow">
                        <h3 className="font-bold text-lg text-[#2c241b] group-hover:text-[#c5a059] transition-colors">{story.title}</h3>
                        <p className="text-sm text-[#8c7b6c] mt-1 italic">上次编辑：{formatLastPlayTime(story.lastPlayTime)}</p>

                        <div className="flex justify-between items-center mt-3">
                          <span className="text-xs px-2 py-1 rounded-full bg-[#2c241b]/5 text-[#5d554a] border border-[#2c241b]/10">
                            {story.genre}
                          </span>
                          <span className="text-xs font-serif text-[#c5a059]">
                            {Math.round(Math.min(100, Math.max(5, story.progress)))}% 完成
                          </span>
                        </div>

                        <div className="w-full bg-[#f2f0ea] rounded-full h-1.5 mt-2">
                          <div
                            className="h-1.5 rounded-full bg-[#c5a059]"
                            style={{ width: `${Math.min(100, Math.max(5, story.progress))}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Divider */}
          <div className="text-center my-12 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#f2f0ea]"></div>
            </div>
            <span className="relative px-4 bg-[#fdfbf9] text-[#8c7b6c] font-serif italic text-lg">
              {savedContextsCount > 0 ? '或者，开启一段全新的故事' : '开启您的故事之旅'}
            </span>
          </div>

          {/* New Story Section */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
            {/* Card 1: Simple */}
            <div
              className="group relative bg-[#fdfbf9] p-8 rounded-2xl border-2 border-[#f2f0ea] hover:border-[#c5a059] transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-xl"
              onClick={() => setConfigMode('simple')}
            >
              <div className="absolute inset-0 bg-[#c5a059]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
              <div className="relative text-center">
                <div className="mx-auto w-20 h-20 flex items-center justify-center bg-white border-2 border-[#f2f0ea] rounded-full mb-6 group-hover:border-[#c5a059] group-hover:scale-110 transition-all duration-300 shadow-sm">
                  <Wand2 className="w-10 h-10 text-[#c5a059]" />
                </div>
                <h3 className="text-2xl font-bold text-[#2c241b] mb-3">快速开始</h3>
                <p className="text-[#5d554a] mb-6 leading-relaxed">
                  提供一个简单的想法，让 AI 为您编织出完整的世界。最适合寻找灵感的您。
                </p>
                <span className="inline-block border border-[#c5a059] text-[#c5a059] font-medium py-2 px-6 rounded-full text-sm group-hover:bg-[#c5a059] group-hover:text-white transition-colors">
                  推荐新手使用
                </span>
              </div>
            </div>

            {/* Card 2: Advanced */}
            <div
              className="group relative bg-[#fdfbf9] p-8 rounded-2xl border-2 border-[#f2f0ea] hover:border-[#c5a059] transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-xl"
              onClick={() => setConfigMode('advanced')}
            >
              <div className="absolute inset-0 bg-[#c5a059]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
              <div className="relative text-center">
                <div className="mx-auto w-20 h-20 flex items-center justify-center bg-white border-2 border-[#f2f0ea] rounded-full mb-6 group-hover:border-[#c5a059] group-hover:scale-110 transition-all duration-300 shadow-sm">
                  <Wrench className="w-10 h-10 text-[#c5a059]" />
                </div>
                <h3 className="text-2xl font-bold text-[#2c241b] mb-3">专业模式</h3>
                <p className="text-[#5d554a] mb-6 leading-relaxed">
                  全面掌控故事的每一个细节，从角色到世界观，精雕细琢，打造完美篇章。
                </p>
                <span className="inline-block border border-[#c5a059] text-[#c5a059] font-medium py-2 px-6 rounded-full text-sm group-hover:bg-[#c5a059] group-hover:text-white transition-colors">
                  适合资深作家
                </span>
              </div>
            </div>

            {/* Card 3: Document */}
            <div
              className="group relative bg-[#fdfbf9] p-8 rounded-2xl border-2 border-[#f2f0ea] hover:border-[#c5a059] transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-xl"
              onClick={() => setConfigMode('document')}
            >
              <div className="absolute inset-0 bg-[#c5a059]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
              <div className="relative text-center">
                <div className="mx-auto w-20 h-20 flex items-center justify-center bg-white border-2 border-[#f2f0ea] rounded-full mb-6 group-hover:border-[#c5a059] group-hover:scale-110 transition-all duration-300 shadow-sm">
                  <Upload className="w-10 h-10 text-[#c5a059]" />
                </div>
                <h3 className="text-2xl font-bold text-[#2c241b] mb-3">文档分析</h3>
                <p className="text-[#5d554a] mb-6 leading-relaxed">
                  上传您的小说草稿，AI 将提取核心元素，为您延续未完的精彩故事。
                </p>
                <span className="inline-block border border-[#c5a059] text-[#c5a059] font-medium py-2 px-6 rounded-full text-sm group-hover:bg-[#c5a059] group-hover:text-white transition-colors">
                  特色功能
                </span>
              </div>
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
      <div className="min-h-screen bg-[#fdfbf9] flex items-center justify-center p-4 font-serif relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{ backgroundImage: `url(${PAPER_TEXTURE_URL})` }}
        />

        <div className="bg-[#fdfbf9] rounded-2xl shadow-[0_4px_20px_-4px_rgba(44,36,27,0.1)] border border-[#f2f0ea] p-8 max-w-2xl mx-auto w-full relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <Button
              variant="ghost"
              onClick={() => setConfigMode('select')}
              className="flex items-center gap-2 text-[#5d554a] hover:text-[#2c241b] hover:bg-[#c5a059]/10"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="font-serif">返回</span>
            </Button>
            <div className="text-center">
              <h1 className="text-3xl font-bold text-[#2c241b]">开启您的故事之旅</h1>
              <p className="text-[#8c7b6c] mt-2 italic">跟随向导，一步步构建您的世界</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-10">
            <div className="flex justify-between mb-2 text-sm font-medium text-[#5d554a]">
              <span>第 {currentStep} / {totalSteps} 步</span>
              <span className="text-[#c5a059]">{stepTitles[currentStep - 1]}</span>
            </div>
            <div className="w-full bg-[#f2f0ea] rounded-full h-2">
              <div
                className="bg-[#c5a059] h-2 rounded-full transition-all duration-500 ease-in-out shadow-[0_0_10px_rgba(197,160,89,0.5)]"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Step 1: Genre Selection */}
          {currentStep === 1 && (
            <div className="step-content" style={{ animation: 'fadeIn 0.5s ease-in-out' }}>
              <label className="text-xl font-semibold text-[#2c241b] mb-6 block text-center">您想创作什么类型的故事？</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
                {genres.map((genre) => (
                  <div
                    key={genre.value}
                    onClick={() => setSimpleConfig(prev => ({ ...prev, genre: genre.value }))}
                    className={`p-4 rounded-lg text-center cursor-pointer transition-all duration-300 border-2 ${simpleConfig.genre === genre.value
                      ? 'border-[#c5a059] bg-[#c5a059]/10 transform scale-105 shadow-md'
                      : 'border-[#f2f0ea] hover:border-[#c5a059]/50 hover:bg-[#fdfbf9]'
                      }`}
                  >
                    <div className="text-3xl mb-2">{genreIcons[genre.value as keyof typeof genreIcons]}</div>
                    <span className="font-bold text-[#2c241b] block mb-1">{genreTitles[genre.value as keyof typeof genreTitles]}</span>
                    <p className="text-xs text-[#8c7b6c]">{genre.desc}</p>
                  </div>
                ))}
              </div>
              <div className="text-right">
                <Button
                  onClick={nextStep}
                  disabled={!canProceedFromStep(1)}
                  className="bg-[#c5a059] text-white font-bold py-3 px-8 rounded-lg shadow-md hover:bg-[#b08d4b] transition-all disabled:bg-[#f2f0ea] disabled:text-[#8c7b6c] disabled:cursor-not-allowed font-serif"
                >
                  下一步
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Story Idea */}
          {currentStep === 2 && (
            <div className="step-content" style={{ animation: 'fadeIn 0.5s ease-in-out' }}>
              <label className="text-xl font-semibold text-[#2c241b] mb-4 block">您的故事核心想法是什么？</label>
              <p className="text-sm text-[#8c7b6c] mb-4 italic">
                一句话即可，例如："一个失忆的赏金猎人在霓虹闪烁的未来都市里，寻找自己被盗走的记忆。"
              </p>
              <Textarea
                value={simpleConfig.story_idea}
                onChange={(e) => setSimpleConfig(prev => ({ ...prev, story_idea: e.target.value }))}
                rows={5}
                className="w-full p-4 bg-[#fdfbf9] border-2 border-[#f2f0ea] rounded-lg focus:ring-2 focus:ring-[#c5a059] focus:border-[#c5a059] transition mb-8 text-[#2c241b] placeholder-[#8c7b6c] font-serif"
                placeholder="请在此输入您的故事想法..."
              />
              <div className="flex justify-between">
                <Button
                  onClick={prevStep}
                  className="bg-[#f2f0ea] text-[#5d554a] font-bold py-3 px-8 rounded-lg hover:bg-[#dcd8cc] transition-all font-serif"
                >
                  上一步
                </Button>
                <Button
                  onClick={nextStep}
                  disabled={!canProceedFromStep(2)}
                  className="bg-[#c5a059] text-white font-bold py-3 px-8 rounded-lg shadow-md hover:bg-[#b08d4b] transition-all disabled:bg-[#f2f0ea] disabled:text-[#8c7b6c] disabled:cursor-not-allowed font-serif"
                >
                  下一步
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Main Goal */}
          {currentStep === 3 && (
            <div className="step-content" style={{ animation: 'fadeIn 0.5s ease-in-out' }}>
              <label className="text-xl font-semibold text-[#2c241b] mb-4 block">这个故事的主要目标是什么？</label>
              <p className="text-sm text-[#8c7b6c] mb-4 italic">
                这将决定故事的结局。例如："找回记忆并复仇"、"拯救被邪恶公司控制的城市"、"找到真爱"...
              </p>
              <Input
                value={simpleConfig.main_goal || ''}
                onChange={(e) => setSimpleConfig(prev => ({ ...prev, main_goal: e.target.value }))}
                className="w-full p-4 bg-[#fdfbf9] border-2 border-[#f2f0ea] rounded-lg focus:ring-2 focus:ring-[#c5a059] focus:border-[#c5a059] transition mb-6 text-[#2c241b] placeholder-[#8c7b6c] font-serif h-12"
                placeholder="请在此输入故事的主要目标..."
              />

              {/* AI Features Preview */}
              <div className="bg-[#c5a059]/10 border border-[#c5a059]/30 rounded-lg p-5 mb-8">
                <h4 className="font-semibold text-[#2c241b] mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#c5a059]" />
                  AI 将自动为您创建：
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm text-[#5d554a]">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-[#c5a059]" />
                    <span>3-5个个性鲜明的角色</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[#c5a059]" />
                    <span>详细的故事背景设定</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-[#c5a059]" />
                    <span>引人入胜的开场情节</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-[#c5a059]" />
                    <span>符合类型的故事氛围</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <Button
                  onClick={prevStep}
                  className="bg-[#f2f0ea] text-[#5d554a] font-bold py-3 px-8 rounded-lg hover:bg-[#dcd8cc] transition-all font-serif"
                >
                  上一步
                </Button>
                <Button
                  onClick={handleSimpleSubmit}
                  disabled={!canProceedFromStep(3) || (!modelConfig.apiKey && !hasValidConfig) || isGeneratingOutlines}
                  className="bg-[#c5a059] text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-[#b08d4b] transition-transform hover:scale-105 disabled:bg-[#f2f0ea] disabled:text-[#8c7b6c] disabled:cursor-not-allowed disabled:transform-none font-serif"
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

        <style>{`
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
      <div className="min-h-screen bg-[#fdfbf9] p-4 font-serif relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{ backgroundImage: `url(${PAPER_TEXTURE_URL})` }}
        />

        <div className="w-full max-w-6xl mx-auto relative z-10">
          <Card className="bg-[#fdfbf9] shadow-[0_4px_20px_-4px_rgba(44,36,27,0.1)] border border-[#f2f0ea]">
            <CardHeader className="border-b border-[#f2f0ea] pb-6">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={() => setConfigMode('simple')}
                  className="flex items-center gap-2 text-[#5d554a] hover:text-[#2c241b] hover:bg-[#c5a059]/10"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="font-serif">返回修改</span>
                </Button>
              </div>
              <div className="text-center pt-4">
                <CardTitle className="text-3xl font-bold text-[#2c241b] flex items-center justify-center gap-2 font-serif">
                  <BookOpen className="h-8 w-8 text-[#c5a059]" />
                  选择您的故事方向
                </CardTitle>
                <p className="text-[#8c7b6c] mt-2 italic font-serif">
                  基于您的灵感，AI为您生成了 {storyOutlines.length} 个不同风格的故事梗概
                </p>
                {originalSimpleConfig && (
                  <div className="mt-6 p-6 bg-[#c5a059]/5 border border-[#c5a059]/20 rounded-lg max-w-3xl mx-auto">
                    <p className="text-sm text-[#5d554a] font-serif">
                      <strong className="text-[#2c241b]">您的原始想法：</strong>{originalSimpleConfig.story_idea}
                    </p>
                    {originalSimpleConfig.main_goal && (
                      <p className="text-sm text-[#5d554a] mt-2 font-serif">
                        <strong className="text-[#2c241b]">期望目标：</strong>{originalSimpleConfig.main_goal}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-8 pb-8 bg-[#fdfbf9]">
              <div className="grid gap-6 md:grid-cols-2">
                {storyOutlines.map((outline) => (
                  <Card
                    key={outline.id}
                    className="border-2 border-[#f2f0ea] hover:border-[#c5a059] cursor-pointer transition-all duration-300 group hover:shadow-lg bg-white relative overflow-hidden"
                    onClick={() => handleOutlineSelection(outline)}
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-[#f2f0ea] group-hover:bg-[#c5a059] transition-colors" />
                    <CardHeader className="pb-4">
                      <CardTitle className="text-xl text-[#2c241b] group-hover:text-[#c5a059] transition-colors font-serif font-bold">
                        {outline.title}
                      </CardTitle>
                      <div className="flex gap-2 flex-wrap mt-2">
                        <Badge variant="secondary" className="bg-[#c5a059]/10 text-[#8c7b6c] border border-[#c5a059]/20 font-serif">
                          {outline.genre}
                        </Badge>
                        <Badge variant="secondary" className="bg-[#2c241b]/5 text-[#5d554a] border border-[#2c241b]/10 font-serif">
                          {outline.tone}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-bold text-[#2c241b] mb-2 text-sm uppercase tracking-wider border-b border-[#f2f0ea] pb-1 inline-block">故事概念</h4>
                        <p className="text-[#5d554a] text-sm leading-relaxed font-serif">
                          {outline.premise}
                        </p>
                      </div>

                      <div>
                        <h4 className="font-bold text-[#2c241b] mb-2 text-sm uppercase tracking-wider border-b border-[#f2f0ea] pb-1 inline-block">主要角色</h4>
                        <div className="flex flex-wrap gap-1">
                          {outline.characters.map((character, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="text-xs border-[#f2f0ea] text-[#8c7b6c] font-serif"
                            >
                              {character}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-bold text-[#2c241b] mb-2 text-sm uppercase tracking-wider border-b border-[#f2f0ea] pb-1 inline-block">背景设定</h4>
                        <p className="text-[#5d554a] text-sm font-serif">
                          {outline.setting}
                        </p>
                      </div>

                      <div>
                        <h4 className="font-bold text-[#2c241b] mb-2 text-sm uppercase tracking-wider border-b border-[#f2f0ea] pb-1 inline-block">故事钩子</h4>
                        <p className="text-[#5d554a] text-sm italic font-serif border-l-2 border-[#c5a059] pl-3 py-1 bg-[#c5a059]/5">
                          "{outline.hook}"
                        </p>
                      </div>

                      <div className="pt-4 mt-2 border-t border-[#f2f0ea]">
                        <Button
                          className="w-full bg-[#c5a059] hover:bg-[#b08d4b] text-white font-serif font-bold shadow-md transition-all group-hover:translate-y-[-2px]"
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

              <div className="mt-12 text-center">
                <p className="text-[#8c7b6c] text-sm mb-4 font-serif italic">
                  💡 选择一个梗概后，AI将基于您的选择创建完整的故事开篇
                </p>
                <Button
                  variant="outline"
                  onClick={() => setConfigMode('simple')}
                  className="text-[#5d554a] border-[#f2f0ea] hover:bg-[#fdfbf9] hover:text-[#2c241b] font-serif"
                >
                  不满意？重新生成梗概
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // 高级配置界面
  if (configMode === 'advanced') {
    return (
      <div className="min-h-screen bg-[#fdfbf9] p-4 font-serif relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{ backgroundImage: `url(${PAPER_TEXTURE_URL})` }}
        />

        <div className="w-full max-w-4xl mx-auto bg-[#fdfbf9] shadow-[0_4px_20px_-4px_rgba(44,36,27,0.1)] border border-[#f2f0ea] rounded-2xl relative z-10">
          {/* Header */}
          <div className="p-8 border-b border-[#f2f0ea]">
            <div className="flex items-center justify-between mb-6">
              <Button
                variant="ghost"
                onClick={() => setConfigMode('select')}
                className="flex items-center gap-2 text-[#5d554a] hover:text-[#2c241b] hover:bg-[#c5a059]/10"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="font-serif">返回</span>
              </Button>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center p-3 mb-4 rounded-full bg-[#2c241b] text-[#c5a059] shadow-md border border-[#c5a059]">
                <Wrench className="h-6 w-6" />
              </div>
              <h1 className="text-3xl font-bold text-[#2c241b] mb-2 font-serif">
                高级配置
              </h1>
              <p className="text-[#8c7b6c] font-serif italic">精确控制故事的每一个细节，打造您的完美作品</p>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* 文档分析结果显示 */}
            {advancedConfig.useDocumentAnalysis && advancedConfig.documentAnalysis?.data && (
              <div className="mb-8 p-6 bg-[#c5a059]/10 border border-[#c5a059]/30 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-[#2c241b] flex items-center gap-2 font-serif">
                    <FileText className="h-5 w-5 text-[#c5a059]" />
                    基于文档分析自动填充
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setConfigMode('document')}
                    className="text-[#c5a059] border-[#c5a059] hover:bg-[#c5a059] hover:text-white font-serif"
                  >
                    查看完整分析
                  </Button>
                </div>
                <div className="text-sm text-[#5d554a] mb-3 font-serif">
                  ✅ 已从上传的文档中自动提取了角色、背景、风格等信息，您可以在下方进一步调整
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="bg-[#fdfbf9] text-[#5d554a] border border-[#c5a059]/30 font-serif">
                    {advancedConfig.documentAnalysis.data.characters.length} 个角色
                  </Badge>
                  <Badge variant="secondary" className="bg-[#fdfbf9] text-[#5d554a] border border-[#c5a059]/30 font-serif">
                    {advancedConfig.documentAnalysis.data.themes.mainThemes.length} 个主题
                  </Badge>
                  <Badge variant="secondary" className="bg-[#fdfbf9] text-[#5d554a] border border-[#c5a059]/30 font-serif">
                    {advancedConfig.documentAnalysis.data.suggestedStorySeeds.length} 个创意种子
                  </Badge>
                </div>
              </div>
            )}


            {/* 手风琴布局 */}
            <div className="space-y-4">
              {/* 基础设定 */}
              <div className={`border rounded-lg overflow-hidden transition-all duration-300 ${activeAccordion === 'basic' ? 'border-[#c5a059] shadow-md' : 'border-[#f2f0ea]'}`}>
                <div
                  className={`p-4 cursor-pointer flex items-center justify-between transition-colors ${activeAccordion === 'basic' ? 'bg-[#c5a059]/10' : 'bg-[#fdfbf9] hover:bg-[#c5a059]/5'}`}
                  onClick={() => toggleAccordion('basic')}
                >
                  <h3 className="flex items-center gap-3 text-lg font-bold text-[#2c241b] m-0 font-serif">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeAccordion === 'basic' ? 'bg-[#c5a059] text-white' : 'bg-[#f2f0ea] text-[#5d554a]'}`}>
                      <Sparkles className="h-5 w-5" />
                    </div>
                    基础设定
                    {checkSectionCompletion('basic') && <span className="text-[#c5a059] text-sm ml-2">✔</span>}
                  </h3>
                  <div className={`text-[#c5a059] transition-transform duration-300 ${activeAccordion === 'basic' ? 'rotate-180' : ''}`}>
                    ▼
                  </div>
                </div>

                {activeAccordion === 'basic' && (
                  <div className="p-6 bg-[#fdfbf9] border-t border-[#c5a059]/20 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <Label className="text-[#5d554a] font-bold font-serif mb-2 block">故事类型</Label>
                        <Select value={advancedConfig.genre} onValueChange={(value) => setAdvancedConfig(prev => ({ ...prev, genre: value }))}>
                          <SelectTrigger className="mt-2 bg-white border-[#f2f0ea] text-[#2c241b] focus:ring-[#c5a059] font-serif h-12">
                            <SelectValue placeholder="选择故事类型" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#fdfbf9] border-[#f2f0ea]">
                            {genres.map((genre) => (
                              <SelectItem key={genre.value} value={genre.value} className="text-[#2c241b] hover:bg-[#c5a059]/10 focus:bg-[#c5a059]/10 font-serif cursor-pointer">
                                <div>
                                  <div className="font-medium">{genre.label}</div>
                                  <div className="text-xs text-[#8c7b6c]">{genre.desc}</div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-[#5d554a] font-bold font-serif mb-2 block">故事长度</Label>
                        <Select value={advancedConfig.story_length} onValueChange={(value: 'short' | 'medium' | 'long') => setAdvancedConfig(prev => ({ ...prev, story_length: value }))}>
                          <SelectTrigger className="mt-2 bg-white border-[#f2f0ea] text-[#2c241b] focus:ring-[#c5a059] font-serif h-12">
                            <SelectValue placeholder="选择故事长度" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#fdfbf9] border-[#f2f0ea]">
                            {storyLengths.map((length) => (
                              <SelectItem key={length.value} value={length.value} className="text-[#2c241b] hover:bg-[#c5a059]/10 focus:bg-[#c5a059]/10 font-serif cursor-pointer">
                                <div>
                                  <div className="font-medium">{length.label}</div>
                                  <div className="text-xs text-[#8c7b6c]">{length.desc}</div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="mb-6">
                      <Label className="text-[#5d554a] font-bold font-serif mb-2 block">核心故事想法</Label>
                      <Textarea
                        value={advancedConfig.story_idea}
                        onChange={(e) => setAdvancedConfig(prev => ({ ...prev, story_idea: e.target.value }))}
                        placeholder="描述您故事的核心概念和主要情节..."
                        className="mt-2 bg-white border-[#f2f0ea] text-[#2c241b] placeholder:text-[#8c7b6c] resize-none focus:border-[#c5a059] focus:ring-[#c5a059] font-serif"
                        rows={3}
                      />
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <Label className="text-[#5d554a] font-bold font-serif mb-2 block">故事基调</Label>
                        <Select value={advancedConfig.tone} onValueChange={(value: 'light' | 'serious' | 'humorous' | 'dark' | 'romantic') => setAdvancedConfig(prev => ({ ...prev, tone: value }))}>
                          <SelectTrigger className="mt-2 bg-white border-[#f2f0ea] text-[#2c241b] focus:ring-[#c5a059] font-serif h-12">
                            <SelectValue placeholder="选择故事基调" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#fdfbf9] border-[#f2f0ea]">
                            {tones.map((tone) => (
                              <SelectItem key={tone.value} value={tone.value} className="text-[#2c241b] hover:bg-[#c5a059]/10 focus:bg-[#c5a059]/10 font-serif cursor-pointer">
                                <div>
                                  <div className="font-medium">{tone.label}</div>
                                  <div className="text-xs text-[#8c7b6c]">{tone.desc}</div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-[#5d554a] font-bold font-serif mb-2 block">期望结局类型</Label>
                        <Select value={advancedConfig.preferred_ending} onValueChange={(value: any) => setAdvancedConfig(prev => ({ ...prev, preferred_ending: value }))}>
                          <SelectTrigger className="mt-2 bg-white border-[#f2f0ea] text-[#2c241b] focus:ring-[#c5a059] font-serif h-12">
                            <SelectValue placeholder="选择结局类型" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#fdfbf9] border-[#f2f0ea]">
                            {endingTypes.map((ending) => (
                              <SelectItem key={ending.value} value={ending.value} className="text-[#2c241b] hover:bg-[#c5a059]/10 focus:bg-[#c5a059]/10 font-serif cursor-pointer">
                                <div>
                                  <div className="font-medium">{ending.label}</div>
                                  <div className="text-xs text-[#8c7b6c]">{ending.desc}</div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 角色设定 */}
              <div className={`border rounded-lg overflow-hidden transition-all duration-300 ${activeAccordion === 'character' ? 'border-[#c5a059] shadow-md' : 'border-[#f2f0ea]'}`}>
                <div
                  className={`p-4 cursor-pointer flex items-center justify-between transition-colors ${activeAccordion === 'character' ? 'bg-[#c5a059]/10' : 'bg-[#fdfbf9] hover:bg-[#c5a059]/5'}`}
                  onClick={() => toggleAccordion('character')}
                >
                  <h3 className="flex items-center gap-3 text-lg font-bold text-[#2c241b] m-0 font-serif">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeAccordion === 'character' ? 'bg-[#c5a059] text-white' : 'bg-[#f2f0ea] text-[#5d554a]'}`}>
                      <Users className="h-5 w-5" />
                    </div>
                    角色设定
                    {checkSectionCompletion('character') && <span className="text-[#c5a059] text-sm ml-2">✔</span>}
                  </h3>
                  <div className={`text-[#c5a059] transition-transform duration-300 ${activeAccordion === 'character' ? 'rotate-180' : ''}`}>
                    ▼
                  </div>
                </div>

                {activeAccordion === 'character' && (
                  <div className="p-6 bg-[#fdfbf9] border-t border-[#c5a059]/20 animate-in slide-in-from-top-2 duration-200">
                    <div className="mb-6" style={{ maxWidth: '250px' }}>
                      <Label className="text-[#5d554a] font-bold font-serif mb-2 block">角色数量</Label>
                      <Select value={advancedConfig.character_count.toString()} onValueChange={(value) => handleCharacterCountChange(parseInt(value))}>
                        <SelectTrigger className="mt-2 bg-white border-[#f2f0ea] text-[#2c241b] focus:ring-[#c5a059] font-serif h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#fdfbf9] border-[#f2f0ea]">
                          {[2, 3, 4, 5, 6].map((count) => (
                            <SelectItem key={count} value={count.toString()} className="text-[#2c241b] hover:bg-[#c5a059]/10 focus:bg-[#c5a059]/10 font-serif cursor-pointer">
                              {count} 个角色
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-4">
                      {advancedConfig.character_details.map((character, index) => (
                        <Card key={index} className="p-4 border border-[#f2f0ea] bg-white">
                          <h4 className="font-bold text-[#2c241b] mb-3 font-serif border-b border-[#f2f0ea] pb-2">角色 {index + 1}</h4>
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm text-[#5d554a] font-serif">姓名</Label>
                              <Input
                                value={character.name}
                                onChange={(e) => {
                                  const newCharacters = [...advancedConfig.character_details];
                                  newCharacters[index].name = e.target.value;
                                  setAdvancedConfig(prev => ({ ...prev, character_details: newCharacters }));
                                }}
                                placeholder="角色姓名"
                                className="mt-1 bg-[#fdfbf9] border-[#f2f0ea] text-[#2c241b] focus:border-[#c5a059] focus:ring-[#c5a059] font-serif"
                              />
                            </div>
                            <div>
                              <Label className="text-sm text-[#5d554a] font-serif">角色定位</Label>
                              <Input
                                value={character.role}
                                onChange={(e) => {
                                  const newCharacters = [...advancedConfig.character_details];
                                  newCharacters[index].role = e.target.value;
                                  setAdvancedConfig(prev => ({ ...prev, character_details: newCharacters }));
                                }}
                                placeholder="如：主角、伙伴、反派"
                                className="mt-1 bg-[#fdfbf9] border-[#f2f0ea] text-[#2c241b] focus:border-[#c5a059] focus:ring-[#c5a059] font-serif"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <Label className="text-sm text-[#5d554a] font-serif">性格特征</Label>
                              <Input
                                value={character.traits}
                                onChange={(e) => {
                                  const newCharacters = [...advancedConfig.character_details];
                                  newCharacters[index].traits = e.target.value;
                                  setAdvancedConfig(prev => ({ ...prev, character_details: newCharacters }));
                                }}
                                placeholder="性格描述"
                                className="mt-1 bg-[#fdfbf9] border-[#f2f0ea] text-[#2c241b] focus:border-[#c5a059] focus:ring-[#c5a059] font-serif"
                              />
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 故事目标设定 */}
              <div className={`border rounded-lg overflow-hidden transition-all duration-300 ${activeAccordion === 'goal' ? 'border-[#c5a059] shadow-md' : 'border-[#f2f0ea]'}`}>
                <div
                  className={`p-4 cursor-pointer flex items-center justify-between transition-colors ${activeAccordion === 'goal' ? 'bg-[#c5a059]/10' : 'bg-[#fdfbf9] hover:bg-[#c5a059]/5'}`}
                  onClick={() => toggleAccordion('goal')}
                >
                  <h3 className="flex items-center gap-3 text-lg font-bold text-[#2c241b] m-0 font-serif">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeAccordion === 'goal' ? 'bg-[#c5a059] text-white' : 'bg-[#f2f0ea] text-[#5d554a]'}`}>
                      <Target className="h-5 w-5" />
                    </div>
                    故事目标设定
                    {checkSectionCompletion('goal') && <span className="text-[#c5a059] text-sm ml-2">✔</span>}
                  </h3>
                  <div className={`text-[#c5a059] transition-transform duration-300 ${activeAccordion === 'goal' ? 'rotate-180' : ''}`}>
                    ▼
                  </div>
                </div>

                {activeAccordion === 'goal' && (
                  <div className="p-6 bg-[#fdfbf9] border-t border-[#c5a059]/20 animate-in slide-in-from-top-2 duration-200">
                    <div className="bg-[#c5a059]/10 border border-[#c5a059]/30 rounded-lg p-4 mb-6">
                      <p className="text-[#2c241b] text-sm font-serif">
                        💡 设定明确的故事目标，AI将根据这些目标的完成情况决定故事何时自然结束
                      </p>
                    </div>
                    <div className="space-y-4 mb-4">
                      {advancedConfig.story_goals.map((goal, index) => (
                        <Card key={goal.id} className="p-4 border border-[#f2f0ea] bg-white">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-bold text-[#2c241b] font-serif">目标 {index + 1}</h4>
                            {advancedConfig.story_goals.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const newGoals = advancedConfig.story_goals.filter(g => g.id !== goal.id);
                                  setAdvancedConfig(prev => ({ ...prev, story_goals: newGoals }));
                                }}
                                className="text-[#8c7b6c] hover:text-red-600 hover:bg-red-50 w-6 h-6 rounded-full flex items-center justify-center"
                              >
                                ×
                              </Button>
                            )}
                          </div>
                          <div className="grid gap-4">
                            <div>
                              <Label className="text-sm text-[#5d554a] font-serif">目标描述</Label>
                              <Input
                                value={goal.description}
                                onChange={(e) => {
                                  const newGoals = [...advancedConfig.story_goals];
                                  const goalIndex = newGoals.findIndex(g => g.id === goal.id);
                                  newGoals[goalIndex].description = e.target.value;
                                  setAdvancedConfig(prev => ({ ...prev, story_goals: newGoals }));
                                }}
                                placeholder="如：找到失踪的朋友..."
                                className="mt-1 bg-[#fdfbf9] border-[#f2f0ea] text-[#2c241b] focus:border-[#c5a059] focus:ring-[#c5a059] font-serif"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-sm text-[#5d554a] font-serif">类型</Label>
                                <Select
                                  value={goal.type}
                                  onValueChange={(value: 'main' | 'sub' | 'personal' | 'relationship') => {
                                    const newGoals = [...advancedConfig.story_goals];
                                    const goalIndex = newGoals.findIndex(g => g.id === goal.id);
                                    newGoals[goalIndex].type = value;
                                    setAdvancedConfig(prev => ({ ...prev, story_goals: newGoals }));
                                  }}
                                >
                                  <SelectTrigger className="mt-1 bg-[#fdfbf9] border-[#f2f0ea] text-[#2c241b] focus:ring-[#c5a059] font-serif">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-[#fdfbf9] border-[#f2f0ea]">
                                    <SelectItem value="main" className="text-[#2c241b] hover:bg-[#c5a059]/10 cursor-pointer font-serif">主要</SelectItem>
                                    <SelectItem value="sub" className="text-[#2c241b] hover:bg-[#c5a059]/10 cursor-pointer font-serif">次要</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-sm text-[#5d554a] font-serif">优先级</Label>
                                <Select
                                  value={goal.priority}
                                  onValueChange={(value: 'high' | 'medium' | 'low') => {
                                    const newGoals = [...advancedConfig.story_goals];
                                    const goalIndex = newGoals.findIndex(g => g.id === goal.id);
                                    newGoals[goalIndex].priority = value;
                                    setAdvancedConfig(prev => ({ ...prev, story_goals: newGoals }));
                                  }}
                                >
                                  <SelectTrigger className="mt-1 bg-[#fdfbf9] border-[#f2f0ea] text-[#2c241b] focus:ring-[#c5a059] font-serif">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-[#fdfbf9] border-[#f2f0ea]">
                                    <SelectItem value="high" className="text-[#2c241b] hover:bg-[#c5a059]/10 cursor-pointer font-serif">高</SelectItem>
                                    <SelectItem value="medium" className="text-[#2c241b] hover:bg-[#c5a059]/10 cursor-pointer font-serif">中</SelectItem>
                                    <SelectItem value="low" className="text-[#2c241b] hover:bg-[#c5a059]/10 cursor-pointer font-serif">低</SelectItem>
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
                      className="w-full border-2 border-dashed border-[#c5a059]/50 text-[#c5a059] hover:bg-[#c5a059]/10 hover:border-[#c5a059] transition-all duration-200 py-3 rounded-lg flex items-center justify-center gap-2 font-medium font-serif"
                    >
                      + 添加目标
                    </Button>
                  </div>
                )}
              </div>

              {/* 环境与特殊要求 */}
              <div className={`border rounded-lg overflow-hidden transition-all duration-300 ${activeAccordion === 'environment' ? 'border-[#c5a059] shadow-md' : 'border-[#f2f0ea]'}`}>
                <div
                  className={`p-4 cursor-pointer flex items-center justify-between transition-colors ${activeAccordion === 'environment' ? 'bg-[#c5a059]/10' : 'bg-[#fdfbf9] hover:bg-[#c5a059]/5'}`}
                  onClick={() => toggleAccordion('environment')}
                >
                  <h3 className="flex items-center gap-3 text-lg font-bold text-[#2c241b] m-0 font-serif">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeAccordion === 'environment' ? 'bg-[#c5a059] text-white' : 'bg-[#f2f0ea] text-[#5d554a]'}`}>
                      <MapPin className="h-5 w-5" />
                    </div>
                    环境与特殊要求
                    {checkSectionCompletion('environment') && <span className="text-[#c5a059] text-sm ml-2">✔</span>}
                  </h3>
                  <div className={`text-[#c5a059] transition-transform duration-300 ${activeAccordion === 'environment' ? 'rotate-180' : ''}`}>
                    ▼
                  </div>
                </div>

                {activeAccordion === 'environment' && (
                  <div className="p-6 bg-[#fdfbf9] border-t border-[#c5a059]/20 animate-in slide-in-from-top-2 duration-200">
                    <div className="mb-6">
                      <Label className="text-[#5d554a] font-bold font-serif mb-2 block">详细环境描述</Label>
                      <Textarea
                        value={advancedConfig.environment_details}
                        onChange={(e) => setAdvancedConfig(prev => ({ ...prev, environment_details: e.target.value }))}
                        placeholder="描述故事发生的具体环境..."
                        className="mt-2 bg-white border-[#f2f0ea] text-[#2c241b] placeholder:text-[#8c7b6c] resize-none focus:border-[#c5a059] focus:ring-[#c5a059] font-serif"
                        rows={4}
                      />
                    </div>
                    <div>
                      <Label className="text-[#5d554a] font-bold font-serif mb-2 block">特殊要求（可选）</Label>
                      <Textarea
                        value={advancedConfig.special_requirements}
                        onChange={(e) => setAdvancedConfig(prev => ({ ...prev, special_requirements: e.target.value }))}
                        placeholder="其他特殊要求..."
                        className="mt-2 bg-white border-[#f2f0ea] text-[#2c241b] placeholder:text-[#8c7b6c] resize-none focus:border-[#c5a059] focus:ring-[#c5a059] font-serif"
                        rows={3}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 提交按钮 */}
            <div className="mt-8">
              <Button
                onClick={handleAdvancedSubmit}
                className="w-full bg-[#2c241b] hover:bg-[#4a3b2a] text-[#c5a059] font-bold py-4 rounded-xl transition-all duration-300 text-lg shadow-lg hover:shadow-xl flex items-center justify-center gap-3 border border-[#c5a059] font-serif"
                disabled={!advancedConfig.genre || !advancedConfig.story_idea || !advancedConfig.story_goals.some(goal => goal.description.trim() !== '') || (!modelConfig.apiKey && !hasValidConfig)}
              >
                <div className="w-6 h-6 rounded-full bg-[#c5a059]/20 flex items-center justify-center">
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
      <div className="min-h-screen bg-[#fdfbf9] p-4 font-serif relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{ backgroundImage: `url(${PAPER_TEXTURE_URL})` }}
        />

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex items-center justify-between mb-8">
            <Button
              variant="ghost"
              onClick={() => setConfigMode('select')}
              className="flex items-center gap-2 text-[#5d554a] hover:text-[#2c241b] hover:bg-[#c5a059]/10"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="font-serif">返回主页</span>
            </Button>
            <h1 className="text-3xl font-bold text-[#2c241b] flex items-center gap-3 font-serif">
              <FolderOpen className="h-8 w-8 text-[#c5a059]" />
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
            onSaveStory={() => { }}
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

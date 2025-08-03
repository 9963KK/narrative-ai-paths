import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import StageProgressIndicator from '@/components/ui/StageProgressIndicator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Dice1, Dice2, Dice3, Dice4, Dice5, Save, FolderOpen, Home, Settings, User, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { storyAI } from '@/services/storyAI';
import { devLog, devError, stateLog } from '@/utils/logger';

// 辅助函数：根据性能等级获取模型描述
const getModelLevelDescription = (performanceLevel?: string, action: string = '正在思考中'): string => {
  switch (performanceLevel) {
    case 'basic':
      return `基础模型${action}...`;
    case 'advanced':
      return `高级模型${action}...`;
    case 'premium':
      return `顶级模型${action}...`;
    default:
      return `基础模型${action}...`; // 默认为基础模型
  }
};

const getModelLevelName = (performanceLevel?: string): string => {
  switch (performanceLevel) {
    case 'basic':
      return '基础模型';
    case 'advanced':
      return '高级模型';
    case 'premium':
      return '顶级模型';
    default:
      return '基础模型'; // 默认为基础模型
  }
};

interface StoryState {
  story_id: string;
  current_scene: string;
  characters: Array<{ name: string; role: string; traits: string; appearance?: string; backstory?: string }>;
  setting: string;
  chapter: number;
  chapter_title?: string; // 章节标题
  choices_made: string[];

  mood?: string;
  tension_level?: number;
  needs_choice?: boolean; // 是否需要显示选择项
  scene_type?: 'action' | 'dialogue' | 'exploration' | 'reflection' | 'climax'; // 场景类型
  is_completed?: boolean; // 故事是否已完成
  completion_type?: 'success' | 'failure' | 'neutral' | 'cliffhanger'; // 结束类型
  story_progress?: number; // 故事进度 0-100
  main_goal_status?: 'pending' | 'in_progress' | 'completed' | 'failed'; // 主要目标状态
  story_goals?: Array<{
    id: string;
    description: string;
    type: 'main' | 'sub' | 'personal' | 'relationship';
    priority: 'high' | 'medium' | 'low';
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    completion_chapter?: number;
  }>; // 故事目标列表
}

interface Choice {
  id: number;
  text: string;
  description: string;
  difficulty?: number;
  consequences?: string;
}

interface StoryReaderProps {
  initialStory: StoryState;
  onMakeChoice: (choiceId: number, choiceText: string) => void;
  onRestart: () => void;
  onContinue?: () => void; // 继续故事的回调
  modelConfig?: any; // AI模型配置
  aiError?: string | null; // AI错误信息
  isProcessingChoice?: boolean; // 是否正在处理选择
  onSaveStory?: (title?: string, currentChoices?: Choice[]) => void; // 保存故事回调
  onShowSaveManager?: () => void; // 显示存档管理器
  onReturnHome?: () => void; // 返回主页回调
  autoSaveEnabled?: boolean; // 自动保存是否启用
  onToggleAutoSave?: (enabled: boolean) => void; // 切换自动保存状态
  hasSavedProgress?: boolean; // 当前是否有已保存的进度
  savedChoices?: Choice[]; // 从存档中加载的选项
  onChoicesUpdate?: (choices: Choice[]) => void; // 选项更新回调
}

const StoryReader: React.FC<StoryReaderProps> = ({ 
  initialStory, 
  onMakeChoice, 
  onRestart, 
  onContinue, 
  modelConfig,
  aiError,
  isProcessingChoice = false,
  onSaveStory,
  onShowSaveManager,
  onReturnHome,
  autoSaveEnabled,
  onToggleAutoSave,
  hasSavedProgress,
  savedChoices,
  onChoicesUpdate
}) => {
  const [story, setStory] = useState<StoryState>(initialStory);
  const [currentText, setCurrentText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [choices, setChoices] = useState<Choice[]>([]);
  const [showChoices, setShowChoices] = useState(false);
  const [isGeneratingChoices, setIsGeneratingChoices] = useState(false);
  const [selectedChoiceText, setSelectedChoiceText] = useState<string>('');
  const [isStoryStuck, setIsStoryStuck] = useState(false); // 故事是否真的卡住了

  // 解析性格特征为标签数组
  const parseTraitsToTags = (traits: string): string[] => {
    if (!traits) return [];
    return traits
      .split(/[，、,]/) // 按中文逗号、顿号、英文逗号分割
      .map(trait => trait.trim()) // 去除空格
      .filter(trait => trait.length > 0); // 过滤空字符串
  };

  // 计算所有章节的累积字数
  const calculateTotalWordCount = (): number => {
    try {
      const conversationHistory = storyAI.getConversationHistory();
      let totalWords = 0;
      
      // 计算所有AI生成的助手回复的字数
      conversationHistory.forEach(msg => {
        if (msg.role === 'assistant') {
          totalWords += msg.content.length;
        }
      });
      
      // 在打字机效果期间，使用完整的场景文本长度而不是当前显示的文本
      if (isTyping && story.current_scene) {
        // 打字机效果期间，检查当前场景是否已经在历史记录中
        const lastAssistantMsg = conversationHistory.filter(msg => msg.role === 'assistant').pop();
        if (!lastAssistantMsg || story.current_scene !== lastAssistantMsg.content) {
          totalWords += story.current_scene.length;
        }
      } else {
        // 打字机效果完成后，使用标准逻辑
        const lastAssistantMsg = conversationHistory.filter(msg => msg.role === 'assistant').pop();
        if (!lastAssistantMsg || currentText !== lastAssistantMsg.content) {
          totalWords += currentText.length;
        }
      }
      
      return totalWords;
    } catch (error) {
      console.warn('计算总字数失败，使用当前章节字数:', error);
      // 降级为当前章节字数
      return story.current_scene?.length || 0;
    }
  };
  const [hasUnsavedProgress, setHasUnsavedProgress] = useState(true); // 是否有未保存的进度
  const [isSaving, setIsSaving] = useState(false); // 是否正在保存
  
  // 新增：选项预生成状态管理
  const [pendingChoices, setPendingChoices] = useState<Choice[] | null>(null); // 预生成的选项
  
  // 监控isProcessingChoice状态变化
  useEffect(() => {
    // 已移除状态变化调试输出
  }, [isProcessingChoice]);

  // 监控选择生成超时
  useEffect(() => {
    if (isGeneratingChoices) {
      const timeoutId = setTimeout(() => {
        console.error('⏰ 选择生成超时，故事可能卡住了');
        setIsStoryStuck(true);
        setIsGeneratingChoices(false);
      }, 45000); // 45秒超时

      return () => clearTimeout(timeoutId);
    }
  }, [isGeneratingChoices]);

  // 当外部story更新时，同步本地state
  useEffect(() => {
    setStory(initialStory);
  }, [initialStory]);
  
  // 调试：监控savedChoices变化
  useEffect(() => {
    stateLog('savedChoices状态变化:', {
      savedChoices: savedChoices,
      length: savedChoices?.length || 0,
      timestamp: new Date().toISOString()
    });
  }, [savedChoices]);

  // 当故事发生变化时，标记为有未保存的进度
  useEffect(() => {
    setHasUnsavedProgress(true);
  }, [story.chapter, story.current_scene, story.choices_made]);

  // 处理保存故事
  const handleSaveStory = async () => {
    if (!onSaveStory || isSaving) return; // 防止重复调用
    
    setIsSaving(true);
    try {
      await onSaveStory(undefined, choices.length > 0 ? choices : undefined);
      setHasUnsavedProgress(false);
      toast({
        title: "保存成功",
        description: "故事进度已保存",
        duration: 2000,
      });
    } catch (error) {
      toast({
        title: "保存失败",
        description: "保存故事时出现错误，请重试",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 监控AI错误状态 - 优化：只有严重错误才认为故事卡住
  useEffect(() => {
    if (aiError) {
      console.error('❌ AI错误detected:', aiError);
      // 只有在JSON重试逻辑都失败后才认为故事卡住
      // AI服务内部已经实现了3次重试机制，所以这里的错误是严重错误
      if (aiError.includes('JSON') || aiError.includes('重试') || aiError.includes('解析')) {
        console.warn('⚠️ JSON解析相关错误，但不立即设为卡住状态（AI内部会重试）');
        // 不立即设置为卡住，给重试机制一些时间
      } else {
      setIsStoryStuck(true);
      }
    } else {
      // AI错误清除时，重置卡住状态（除非其他原因导致卡住）
      if (isStoryStuck && !isGeneratingChoices) {
        setIsStoryStuck(false);
      }
    }
  }, [aiError]);

  // 根据故事类型生成动态选择项
  const generateDynamicChoices = (scene: string, characters: any[], storyData: any): Choice[] => {
    const storyPatterns = {
      scifi: [
        { text: "分析数据", description: "使用高科技设备深入分析", difficulty: 3 },
        { text: "联系总部", description: "向指挥中心请求支援", difficulty: 2 },
        { text: "启动应急协议", description: "执行紧急行动计划", difficulty: 4 },
        { text: "探索未知区域", description: "勇敢进入陌生领域", difficulty: 5 }
      ],
      mystery: [
        { text: "寻找线索", description: "仔细搜索现场证据", difficulty: 2 },
        { text: "询问目击者", description: "与相关人员交谈", difficulty: 3 },
        { text: "分析动机", description: "推理案件背后的原因", difficulty: 4 },
        { text: "设置陷阱", description: "引诱嫌疑人现身", difficulty: 5 }
      ],
      fantasy: [
        { text: "施展魔法", description: "运用神秘的魔法力量", difficulty: 4 },
        { text: "寻求智者帮助", description: "向长者请教智慧", difficulty: 2 },
        { text: "探索古遗迹", description: "进入危险的远古建筑", difficulty: 5 },
        { text: "与精灵交涉", description: "尝试和其他种族合作", difficulty: 3 }
      ],
      romance: [
        { text: "坦诚表达", description: "直接说出内心想法", difficulty: 4 },
        { text: "制造浪漫", description: "精心安排特别时刻", difficulty: 3 },
        { text: "保持距离", description: "给彼此一些空间", difficulty: 2 },
        { text: "深入了解", description: "花时间真正认识对方", difficulty: 3 }
      ],
      thriller: [
        { text: "正面对抗", description: "直接面对威胁", difficulty: 5 },
        { text: "智慧脱困", description: "运用机智逃脱", difficulty: 4 },
        { text: "寻找帮助", description: "试图联系外界", difficulty: 3 },
        { text: "暗中观察", description: "保持警惕，静观其变", difficulty: 2 }
      ],
      historical: [
        { text: "遵循传统", description: "按照时代规范行事", difficulty: 2 },
        { text: "勇敢革新", description: "尝试改变现状", difficulty: 5 },
        { text: "寻求盟友", description: "与有识之士合作", difficulty: 3 },
        { text: "秘密行动", description: "在暗中推进计划", difficulty: 4 }
      ]
    };

    // 根据场景内容智能选择类型
    let choiceType = 'mystery'; // 默认
    if (scene.includes('科技') || scene.includes('机器') || scene.includes('数据') || scene.includes('全息')) {
      choiceType = 'scifi';
    } else if (scene.includes('魔法') || scene.includes('精灵') || scene.includes('法术') || scene.includes('龙')) {
      choiceType = 'fantasy';
    } else if (scene.includes('恐怖') || scene.includes('危险') || scene.includes('威胁') || scene.includes('困')) {
      choiceType = 'thriller';
    } else if (scene.includes('爱情') || scene.includes('心动') || scene.includes('浪漫') || scene.includes('情')) {
      choiceType = 'romance';
    } else if (scene.includes('古代') || scene.includes('朝廷') || scene.includes('历史') || scene.includes('传统')) {
      choiceType = 'historical';
    }

    const availableChoices = storyPatterns[choiceType as keyof typeof storyPatterns] || storyPatterns.mystery;
    
    // 动态调整选择数量  
    const choiceCount = determineLocalChoiceCount(storyData);
    devLog(`动态选择数量计算 (类型: ${choiceType}):`, choiceCount);
    
    const selectedChoices = availableChoices
      .sort(() => Math.random() - 0.5) // 随机排序
      .slice(0, choiceCount)
      .map((choice, index) => ({
        id: index + 1,
        ...choice,
        // 根据角色特征调整选择可用性
        available: Array.isArray(characters) && characters.length > 0 ? characters.some(char => 
          choice.difficulty <= 3 || 
          (char.traits && typeof char.traits === 'string' && (
            char.traits.includes('强') || 
            char.traits.includes('能力') ||
            char.traits.includes('技能')
          ))
        ) : choice.difficulty <= 3
      }));

    return selectedChoices;
  };

  // 动态决定本地选择数量
  const determineLocalChoiceCount = (story: any): number => {
    const { chapter, tension_level = 5, mood = '神秘', choices_made = [] } = story;
    
    // 基础选择数量（2-5个）
    let baseCount = 3;
    
    // 根据章节调整
    if (chapter <= 2) {
      baseCount = Math.floor(Math.random() * 2) + 2; // 2-3个
    } else if (chapter <= 5) {
      baseCount = Math.floor(Math.random() * 3) + 2; // 2-4个  
    } else {
      baseCount = Math.floor(Math.random() * 4) + 2; // 2-5个
    }
    
    // 根据紧张度调整
    if (tension_level >= 8) {
      baseCount = Math.min(5, baseCount + 1);
    } else if (tension_level >= 6) {
      baseCount = Math.min(4, baseCount + Math.floor(Math.random() * 2));
    } else if (tension_level <= 3) {
      baseCount = Math.max(2, baseCount - 1);
    }
    
    // 根据氛围调整
    if (mood === '紧张' || mood === '激烈' || mood === '悬疑') {
      baseCount = Math.min(5, baseCount + 1);
    } else if (mood === '平静' || mood === '和谐') {
      baseCount = Math.max(2, baseCount - 1);
    }
    
    // 随机因素
    if (Math.random() < 0.15) {
      baseCount = Math.max(2, baseCount - 1);
    } else if (Math.random() < 0.15) {
      baseCount = Math.min(5, baseCount + 1);
    }
    
    return baseCount;
  };

  // 基于故事内容的上下文选择生成
  const generateContextualChoices = (scene: string, characters: any[], story: any): Choice[] => {
    // 安全检查 scene 参数
    if (!scene || typeof scene !== 'string') {
      console.warn('⚠️ generateContextualChoices 收到无效的 scene 参数:', scene);
      return generateDynamicChoices('', characters, story); // 回退到动态选择生成
    }
    
    const sceneText = scene.toLowerCase();
    
    // 分析场景中的关键元素
    const hasLocation = /在|来到|面前|门前|遗迹|建筑|房间/.test(sceneText);
    const hasMagic = /魔法|符文|法术|咒语|力量|魔力|闪光|发光/.test(sceneText);
    const hasCharacters = /伊森|莉娜|两人|决定|说/.test(sceneText);
    const hasDanger = /危险|威胁|敌人|警告|恐怖|陷阱/.test(sceneText);
    const hasExploration = /探索|调查|搜索|发现|寻找|观察/.test(sceneText);
    const hasMystery = /神秘|秘密|谜团|未知|隐藏/.test(sceneText);
    
    // 动态决定选择数量
    const targetChoiceCount = determineLocalChoiceCount(story);
    devLog(`本地生成目标选择数量:`, targetChoiceCount);
    
    let choices: Choice[] = [];
    
    // 根据当前场景内容生成相关选择
    if (sceneText.includes('符文') && sceneText.includes('发光')) {
      choices = [
        { 
          id: 1, 
          text: "触碰符文", 
          description: "伸手去触摸那些发光的古老符文", 
          difficulty: 4,
          consequences: "可能激活魔法力量，但也有未知风险"
        },
        { 
          id: 2, 
          text: "仔细研究符文", 
          description: "先观察符文的图案和含义", 
          difficulty: 2,
          consequences: "更安全的方式，可能获得有用信息"
        },
        { 
          id: 3, 
          text: "让莉娜检查", 
          description: "请魔法导师莉娜来分析这些符文", 
          difficulty: 3,
          consequences: "利用专业知识，但可能错过直接体验"
        }
      ];
    } else if (sceneText.includes('古遗迹') || sceneText.includes('石门')) {
      choices = [
        { 
          id: 1, 
          text: "推开石门", 
          description: "直接尝试进入古遗迹", 
          difficulty: 4,
          consequences: "可能触发陷阱或警报"
        },
        { 
          id: 2, 
          text: "寻找另一个入口", 
          description: "绕着建筑寻找其他进入方式", 
          difficulty: 3,
          consequences: "更安全但可能耗费时间"
        },
        { 
          id: 3, 
          text: "先做准备", 
          description: "检查装备，制定进入计划", 
          difficulty: 2,
          consequences: "降低风险，提高成功率"
        }
      ];
    } else if (hasMagic && hasCharacters) {
      choices = [
        { 
          id: 1, 
          text: "尝试施法", 
          description: "运用魔法力量应对当前情况", 
          difficulty: 4,
          consequences: "效果强大但消耗较大"
        },
        { 
          id: 2, 
          text: "合作施法", 
          description: "与伙伴联合使用魔法", 
          difficulty: 3,
          consequences: "风险分担，效果稳定"
        },
        { 
          id: 3, 
          text: "暂时观望", 
          description: "先观察情况再做决定", 
          difficulty: 2,
          consequences: "保存实力，但可能错过时机"
        }
      ];
    } else if (hasExploration || hasMystery) {
      choices = [
        { 
          id: 1, 
          text: "深入探索", 
          description: "继续深入调查未知区域", 
          difficulty: 4,
          consequences: "可能发现重要线索，但风险较高"
        },
        { 
          id: 2, 
          text: "小心前进", 
          description: "谨慎地一步步探索", 
          difficulty: 3,
          consequences: "平衡风险与收益"
        },
        { 
          id: 3, 
          text: "收集信息", 
          description: "先搜集更多线索再行动", 
          difficulty: 2,
          consequences: "增加成功率，但可能错过机会"
        }
      ];
    } else {
      // 通用选择，但也尽量与场景相关
      choices = [
        { 
          id: 1, 
          text: "积极行动", 
          description: "主动应对当前状况", 
          difficulty: 3,
          consequences: "快速推进但存在风险"
        },
        { 
          id: 2, 
          text: "谨慎应对", 
          description: "仔细考虑后再行动", 
          difficulty: 2,
          consequences: "降低风险，稳步前进"
        },
        { 
          id: 3, 
          text: "寻求帮助", 
          description: "与同伴商讨最佳方案", 
          difficulty: 2,
          consequences: "集思广益，但可能耗费时间"
        }
      ];
    }
    
    // 根据目标选择数量调整选项
    const extraChoices = [
      {
        text: "观察等待",
        description: "静观其变，寻找更好的时机",
        difficulty: 1,
        consequences: "降低风险，但可能错过机会"
      },
      {
        text: "冒险一试",
        description: "采取高风险高回报的行动",
        difficulty: 5,
        consequences: "可能带来意外突破或严重后果"
      },
      {
        text: "另辟蹊径",
        description: "寻找不同寻常的解决方案",
        difficulty: 4,
        consequences: "创新方法可能带来惊喜"
      },
      {
        text: "退避思考",
        description: "暂时撤退，重新制定策略",
        difficulty: 2,
        consequences: "保存实力，但失去主动权"
      },
      {
        text: "直面挑战",
        description: "正面应对所有困难",
        difficulty: 4,
        consequences: "展现勇气，但风险较高"
      }
    ];

    // 根据目标数量调整选择
    if (choices.length < targetChoiceCount) {
      const needMore = targetChoiceCount - choices.length;
      
      // 随机添加额外选择
      const shuffledExtra = extraChoices.sort(() => Math.random() - 0.5);
      for (let i = 0; i < needMore && i < shuffledExtra.length; i++) {
        choices.push({
          id: choices.length + 1,
          ...shuffledExtra[i]
        });
      }
    } else if (choices.length > targetChoiceCount) {
      // 如果选择太多，随机保留目标数量
      choices = choices.sort(() => Math.random() - 0.5).slice(0, targetChoiceCount);
      
      // 重新分配ID
      choices = choices.map((choice, index) => ({
        ...choice,
        id: index + 1
      }));
    }
    
    // 当进度达到80%且低于95%时，添加直通结局选项
    // 也可以基于章节数作为后备条件
    const currentProgress = story.story_progress || 0;
    const calculatedProgress = Math.min((story.chapter / 18) * 85, 85);
    const effectiveProgress = Math.max(currentProgress, calculatedProgress);
    
    console.log('🎬 检查直通结局选项条件:', {
      currentProgress,
      calculatedProgress: Math.round(calculatedProgress),
      effectiveProgress: Math.round(effectiveProgress),
      chapter: story.chapter,
      shouldShowEndingOption: effectiveProgress >= 80 && effectiveProgress < 95,
      chapterBasedFallback: story.chapter >= 15 && story.chapter < 20
    });
    
    // 进度条件或章节条件满足时显示直通结局选项
    if ((effectiveProgress >= 80 && effectiveProgress < 95) || (story.chapter >= 15 && story.chapter < 20)) {
      devLog('添加直通结局选项');
      choices.push({
        id: -999, // 特殊ID标识直通结局选项
        text: "寻找故事结局",
        description: "故事已经发展得相当充分，可以开始寻找一个合适的结局",
        difficulty: 1,
        consequences: "将开始结局流程，结束当前的冒险故事"
      });
    } else {
      console.log('❌ 不满足直通结局选项条件');
    }
    
    console.log(`🎲 最终生成选择数量: ${choices.length}/${targetChoiceCount}`);
    
    return choices;
  };

  // 模拟AI生成选择（可以后续替换为真实AI调用）
  const generateAIChoices = async (scene: string, characters: any[]): Promise<Choice[]> => {
    setIsGeneratingChoices(true);
    setIsStoryStuck(false); // 重置卡住状态
    
    // 直接开始生成，不添加人工延时
    
    try {
      // 优先使用AI生成选择
      if (modelConfig && modelConfig.apiKey) {
        try {
          // 导入storyAI服务
          const { storyAI } = await import('../services/storyAI');
          // 模型配置现在由统一AI服务自动管理
          
          const aiChoices = await storyAI.generateChoices(scene, characters, story.setting || '未知世界');
          if (aiChoices && aiChoices.length > 0) {
            devLog('AI选择生成成功');
            return aiChoices;
          } else {
            console.warn('⚠️ AI选择生成返回空数组');
          }
        } catch (aiError) {
          console.warn('❌ AI选择生成经过重试后仍然失败，使用智能回退:', aiError);
          // AI内部已经重试了3次都失败了，这是一个严重问题
          // 但我们还有智能回退方案，所以暂时不设为卡住
        }
      }
      
      // 回退到基于场景内容的智能生成
      const contextualChoices = generateContextualChoices(scene, characters, story);
      if (contextualChoices && contextualChoices.length > 0) {
        devLog('智能回退选择生成成功');
        return contextualChoices;
      } else {
        // 连回退都失败了，这才是真正的问题
        // 此时AI已经重试了3次，智能回退也失败了
        console.error('❌ AI重试3次失败 + 智能回退也失败，故事可能真的卡住了');
        setIsStoryStuck(true);
        
        // 通用选择，适应当前故事内容
        const baseChoices = [
          { id: 1, text: "继续前进", description: "勇敢地向前迈进", difficulty: 3 },
          { id: 2, text: "停下思考", description: "冷静分析当前情况", difficulty: 2 },
          { id: 3, text: "与同伴交流", description: "和伙伴讨论下一步行动", difficulty: 2 }
        ];
        
        // 根据故事设定稍作调整
        if (story.setting.toLowerCase().includes('科幻')) {
          baseChoices.push({ id: 4, text: "检查科技设备", description: "查看身边的科技装备", difficulty: 2 });
        } else if (story.setting.toLowerCase().includes('奇幻')) {
          baseChoices.push({ id: 4, text: "感知魔法", description: "尝试感知周围的魔法力量", difficulty: 2 });
        } else if (story.setting.toLowerCase().includes('现代') || story.setting.toLowerCase().includes('当代')) {
          baseChoices.push({ id: 4, text: "查看手机", description: "检查是否有新的信息", difficulty: 1 });
        }
        
        return baseChoices;
      }
    } catch (error) {
      console.error('❌ 生成选择发生严重错误（包含AI重试3次失败）:', error);
      // 这是最严重的错误，连try-catch都捕获了
      setIsStoryStuck(true);
      
      // 错误回退 - 最后的保险，保证总是有选择
      return [
        { id: 1, text: "继续前进", description: "勇敢地向前迈进", difficulty: 3 },
        { id: 2, text: "停下思考", description: "冷静分析当前情况", difficulty: 2 },
        { id: 3, text: "寻求帮助", description: "向同伴求助", difficulty: 2 }
      ];
    } finally {
      setIsGeneratingChoices(false);
    }
  };

  // 检查是否应该显示选项的条件
  const shouldShowChoices = useCallback(() => {
    const hasReachedEndingCondition = (story.story_progress || 0) >= 95 || story.chapter >= 20;
    return story.needs_choice !== false &&
           !story.is_completed &&
           !initialStory.is_completed &&
           !hasReachedEndingCondition;
  }, [story.needs_choice, story.is_completed, initialStory.is_completed, story.story_progress, story.chapter]);

  // 统一的选项生成函数
  const generateChoicesIfNeeded = async (scene: string, characters: any[], reason: string = '选项生成') => {
    if (!shouldShowChoices()) {
      devLog(`${reason}: 不满足生成条件，跳过`);
      return false;
    }

    // 检查是否已经在生成中
    if (isGeneratingChoices) {
      devLog(`${reason}: 已在生成中，跳过`);
      return false;
    }

    setIsGeneratingChoices(true);
    devLog(`${reason}: 开始生成选项...`);

    try {
      const newChoices = await generateAIChoices(scene, characters);
      if (newChoices && newChoices.length > 0) {
        setPendingChoices(newChoices);
        devLog(`${reason}: 选项生成完成`, newChoices);
        return true;
      } else {
        console.warn(`⚠️ ${reason}: 选项生成失败`);
        setPendingChoices(null);
        return false;
      }
    } catch (error) {
      console.error(`❌ ${reason}: 选项生成遇到错误:`, error);
      setPendingChoices(null);
      return false;
    } finally {
      setIsGeneratingChoices(false);
    }
  };

  // 优化的打字机效果 - 并行处理
  useEffect(() => {
    if (story.current_scene && story.current_scene !== currentText) {
      setIsTyping(true);
      setCurrentText('');
      setShowChoices(false);
      setChoices([]);
      
      // 检查是否需要生成选项
      const needsChoices = shouldShowChoices();
      
      devLog('检查是否需要生成选项:', {
        needs_choice: story.needs_choice,
        is_completed: story.is_completed,
        initialStory_is_completed: initialStory.is_completed,
        story_progress: story.story_progress,
        shouldShowChoices: needsChoices,
        scene_length: story.current_scene?.length,
        chapter: story.chapter,
        hasSavedChoices: savedChoices?.length || 0
      });
      
      // 智能处理存档选项：首次读档使用存档选项，后续重新生成
      if (needsChoices) {
        if (savedChoices && savedChoices.length > 0) {
          devLog('发现存档选项，直接使用（首次读档）:', savedChoices);
          // 立即设置存档选项
          setPendingChoices(savedChoices);
          setIsGeneratingChoices(false);
        } else {
          devLog('没有存档选项或非首次读档，重新生成选项...');
          // 清空状态并重新生成选项
          setPendingChoices(null);
          setIsGeneratingChoices(false);
          generateChoicesIfNeeded(story.current_scene, story.characters, '预生成选项');
        }
      } else {
        // 不需要选项时才清空
        setPendingChoices(null);
        setIsGeneratingChoices(false);
      }
      
      // 打字机效果（与选项生成并行）
      let index = 0;
      const interval = setInterval(() => {
        if (index < story.current_scene.length) {
          setCurrentText(story.current_scene.slice(0, index + 1));
          index++;
        } else {
          setIsTyping(false);
          devLog('打字机效果完成，检查选项状态...');
          
          // 打字完成，触发选项显示检查
          devLog('打字机完成，触发选项显示检查');
          
          clearInterval(interval);
        }
      }, 30); // 稍微加快打字速度

      return () => clearInterval(interval);
    }
  }, [story.current_scene]);
  
  // 统一的选项显示状态机
  useEffect(() => {
    // 显示条件：有待显示选项 + 打字机完成 + 当前没有显示选项 + 应该显示选项
    if (pendingChoices &&
        pendingChoices.length > 0 &&
        !isTyping &&
        !showChoices &&
        choices.length === 0 &&
        shouldShowChoices()) {

      devLog('选项显示条件满足，准备显示选项!');

      // 稍微延迟以确保打字机完全结束
      setTimeout(() => {
        // 再次检查条件，确保状态没有变化
        if (!isTyping &&
            pendingChoices &&
            pendingChoices.length > 0 &&
            !showChoices &&
            choices.length === 0 &&
            shouldShowChoices()) {

          setChoices(pendingChoices);
          setShowChoices(true);
          onChoicesUpdate?.(pendingChoices);
          setPendingChoices(null);
          setIsGeneratingChoices(false);
          devLog('选项已显示，所有状态已清除');
        }
      }, 100); // 增加延迟确保状态稳定
    }
  }, [pendingChoices, isTyping, showChoices, choices.length, shouldShowChoices]);

  // 添加重试计数状态
  const [choiceGenerationRetryCount, setChoiceGenerationRetryCount] = useState(0);
  const MAX_RETRY_COUNT = 3;

  // 本地处理状态 - 立即阻止重新生成，避免React异步状态更新的时序问题
  const [localProcessingChoice, setLocalProcessingChoice] = useState(false);

  // 专门处理选项重新生成的useEffect - 基于存储变量状态而非显示状态
  useEffect(() => {
    // 核心逻辑：检测存储变量是否为空（说明选项被消费了）
    // 条件：打字机完成 + 存储变量都为空 + 没有正在生成 + 没有正在处理选择(本地+外部) + 重试次数未超限
    if (!isTyping &&
        choices.length === 0 &&
        !pendingChoices &&
        !isGeneratingChoices &&
        !isProcessingChoice &&
        !localProcessingChoice &&
        choiceGenerationRetryCount < MAX_RETRY_COUNT) {

      stateLog(`检测到选项存储变量为空，开始重新生成... (重试次数: ${choiceGenerationRetryCount + 1}/${MAX_RETRY_COUNT})`);

      // 添加延迟，确保状态稳定
      const timeoutId = setTimeout(async () => {
        // 再次检查条件，确保状态没有变化
        if (!isTyping &&
            choices.length === 0 &&
            !pendingChoices &&
            !isGeneratingChoices &&
            !isProcessingChoice &&
            !localProcessingChoice &&
            choiceGenerationRetryCount < MAX_RETRY_COUNT) {

          console.log(`⚠️ 确认需要重新生成选项... (第${choiceGenerationRetryCount + 1}次尝试)`);
          setChoiceGenerationRetryCount(prev => prev + 1);

          const success = await generateChoicesIfNeeded(
            story.current_scene,
            story.characters,
            `重新生成选项(第${choiceGenerationRetryCount + 1}次)`
          );

          if (success) {
            onChoicesUpdate?.(pendingChoices || []);
            setChoiceGenerationRetryCount(0); // 成功后重置计数
          } else if (choiceGenerationRetryCount >= MAX_RETRY_COUNT) {
            console.error('❌ 达到最大重试次数，使用回退选项');
            setIsStoryStuck(true);
            const fallbackChoices = [
              { id: 1, text: "继续前进", description: "勇敢地向前迈进", difficulty: 3 },
              { id: 2, text: "停下思考", description: "冷静分析当前情况", difficulty: 2 },
              { id: 3, text: "与同伴交流", description: "和伙伴讨论下一步行动", difficulty: 2 }
            ];
            setPendingChoices(fallbackChoices);
            onChoicesUpdate?.(fallbackChoices);
            setChoiceGenerationRetryCount(0);
          }
        } else {
          devLog('状态已变化，取消重新生成');
        }
      }, 500); // 增加延迟到500ms，确保用户操作完成

      return () => clearTimeout(timeoutId);
    }
  }, [isTyping, choices.length, pendingChoices, isGeneratingChoices, isProcessingChoice, localProcessingChoice, choiceGenerationRetryCount, story.needs_choice, story.is_completed, initialStory.is_completed, story.story_progress, story.chapter, story.current_scene, story.characters]);

  // 当外部故事更新时，重置选择处理状态
  useEffect(() => {
    setStory(initialStory);
  }, [initialStory]);

  // 当外部故事变化时（AI处理完成），重置选择处理状态
  useEffect(() => {
    if (initialStory.current_scene !== story.current_scene && isProcessingChoice) {
      stateLog('AI处理完成，重置选择处理状态');
      setSelectedChoiceText('');
      setLocalProcessingChoice(false);
    }
  }, [initialStory.current_scene, isProcessingChoice]);

  const handleChoice = (choiceId: number) => {
    const selectedChoice = choices.find(c => c.id === choiceId);

    // 立即显示选择处理状态并清理所有相关状态
    setSelectedChoiceText(selectedChoice?.text || '');
    setShowChoices(false);
    setChoices([]);
    setPendingChoices(null);
    setIsGeneratingChoices(false);
    setChoiceGenerationRetryCount(0); // 重置重试计数
    setLocalProcessingChoice(true); // 立即设置本地处理状态，阻止重新生成

    stateLog('选择处理开始:', {
      choiceId,
      selectedText: selectedChoice?.text,
      isProcessingChoice: true
    });
    
    // 调用父组件的选择处理方法
    onMakeChoice(choiceId, selectedChoice?.text || '');
    
    // 根据选择生成更丰富的后续内容
    const getNextScene = (choice: Choice | undefined) => {
      if (!choice) return "故事继续发展...";
      
      const difficulty = choice.difficulty || 3;
      const outcomes = {
        1: "你的行动虽然简单，但效果显著。",
        2: "经过一番努力，情况朝着好的方向发展。",
        3: "这个决定带来了意想不到的转折。",
        4: "勇敢的选择让你面临新的挑战，但也带来了机会。",
        5: "极具挑战性的行动产生了戏剧性的后果。"
      };
      
      const baseOutcome = outcomes[difficulty as keyof typeof outcomes] || outcomes[3];
      
      // 根据故事内容生成相应的后续情节
      const storyType = story.setting.toLowerCase();
      if (storyType.includes('科幻') || storyType.includes('未来')) {
        return `${baseOutcome} 全息屏幕突然亮起，显示出一连串神秘的数据流。你意识到这可能是解开谜团的关键...`;
      } else if (storyType.includes('奇幻') || storyType.includes('魔法')) {
        return `${baseOutcome} 空气中魔法粒子开始聚集，远处传来古老咒语的回响。看来你的行动唤醒了沉睡的力量...`;
      } else if (storyType.includes('推理')) {
        return `${baseOutcome} 突然，一个新的线索出现在你面前。这个发现可能完全改变你对整个案件的看法...`;
      } else {
        return `${baseOutcome} 周围的环境发生了微妙的变化，你感觉到故事正在朝着一个全新的方向发展...`;
      }
    };
    
    // 移除这个本地的故事更新逻辑，因为现在由StoryManager处理
  };

  // 难度图标组件
  const DifficultyIcon = ({ level }: { level: number }) => {
    const icons = [Dice1, Dice2, Dice3, Dice4, Dice5];
    const Icon = icons[Math.min(level - 1, 4)] || Dice3;
    const colors = ['text-green-600', 'text-yellow-600', 'text-orange-600', 'text-red-600', 'text-purple-600'];
    return <Icon className={`w-4 h-4 ${colors[Math.min(level - 1, 4)]}`} />;
  };

  // 获取故事阶段描述
  const getStoryStageDescription = (chapter: number) => {
    if (chapter <= 2) return '故事开篇阶段';
    if (chapter <= 5) return '故事发展阶段';
    if (chapter <= 8) return '故事深入阶段';
    if (chapter <= 12) return '故事高潮阶段';
    return '故事结局阶段';
  };

  // 获取进度标签
  const getProgressLabel = (chapter: number) => {
    if (chapter <= 3) return '开始';
    if (chapter <= 8) return '发展';
    if (chapter <= 12) return '高潮';
    return '尾声';
  };

  // 获取结局提示
  const getEndingHint = (chapter: number, progress: number) => {
    if (chapter >= 10) {
      return '故事已经充分发展，可能很快就会迎来结局';
    } else if (chapter >= 8) {
      if (progress >= 70) {
        return '故事进度良好，正朝着成功结局发展';
      } else if (progress >= 50) {
        return '取得一些进展，故事可能会有不错的结局';
      } else {
        return '还需要更多发展来达成理想的结局';
      }
    } else if (chapter >= 6) {
      return '故事进入中期，重要的转折点可能即将到来';
    } else {
      return '故事还在初期阶段，有很多可能性等待探索';
    }
  };

  // 智能判断是否应该建议结束故事
  const shouldSuggestEnding = (story: StoryState): { suggest: boolean; reason: string; confidence: number } => {
    const { 
      chapter, 
      story_progress = 0, 
      choices_made = [], 
      tension_level = 5, 
      current_scene,
      story_goals = [],
      mood = '神秘'
    } = story;

    let reasons: string[] = [];
    let confidenceScore = 0;

    // 1. 章节长度考虑（基础条件）
    if (chapter < 5) {
      return { suggest: false, reason: '故事还在发展初期', confidence: 0 };
    }

    // 2. 故事完成度分析
    if (story_progress >= 70) {
      reasons.push('故事进度已相当完整');
      confidenceScore += 30;
    }

    // 3. 故事发展质量分析
    if (story_progress >= 60 && chapter >= 6) {
      reasons.push('故事发展充实有意义');
      confidenceScore += 25;
    }

    // 4. 故事节奏分析 - 检查是否刚经历高潮
    const recentScene = current_scene.toLowerCase();
    const hasRecentClimax = recentScene.includes('成功') || 
                           recentScene.includes('完成') || 
                           recentScene.includes('解决') ||
                           recentScene.includes('胜利') ||
                           recentScene.includes('实现');
    
    if (hasRecentClimax && tension_level <= 6) {
      reasons.push('刚刚经历了重要情节高潮');
      confidenceScore += 20;
    }

    // 5. 目标完成度分析
    if (story_goals.length > 0) {
      const mainGoals = story_goals.filter(g => g.type === 'main');
      const completedMainGoals = mainGoals.filter(g => g.status === 'completed');
      const failedMainGoals = mainGoals.filter(g => g.status === 'failed');
      
      if (completedMainGoals.length > 0 && completedMainGoals.length >= mainGoals.length * 0.6) {
        reasons.push('主要目标基本完成');
        confidenceScore += 25;
      }
      
      // 如果有目标失败，但故事仍在继续，可能是好的结束点
      if (failedMainGoals.length > 0 && chapter >= 7) {
        reasons.push('经历挫折后到达转折点');
        confidenceScore += 15;
      }
    }

    // 6. 用户参与度和选择质量分析
    const recentChoices = choices_made.slice(-3);
    const hasThoughtfulChoices = recentChoices.some(choice => 
      choice.length > 10 && (
        choice.includes('深入') || 
        choice.includes('仔细') || 
        choice.includes('认真') ||
        choice.includes('考虑')
      )
    );
    
    if (hasThoughtfulChoices) {
      reasons.push('做出了深思熟虑的重要选择');
      confidenceScore += 15;
    }

    // 7. 故事结构完整性 - 检查角色发展
    const hasCharacterDevelopment = current_scene.includes('成长') || 
      current_scene.includes('理解') || 
      current_scene.includes('友谊') ||
      current_scene.includes('领悟') ||
      choices_made.some(choice => 
        choice.includes('帮助') || 
        choice.includes('合作') || 
        choice.includes('理解')
      );
    
    if (hasCharacterDevelopment) {
      reasons.push('角色已有明显成长');
      confidenceScore += 15;
    }

    // 8. 氛围适宜度 - 平和的氛围适合结束
    if ((mood === '平静' || mood === '满足' || mood === '希望') && tension_level <= 5) {
      reasons.push('当前氛围适合作为结局');
      confidenceScore += 20;
    }

    // 9. 避免在紧张时刻建议结束
    if (tension_level >= 8 || mood === '紧张' || mood === '危险') {
      confidenceScore = Math.max(0, confidenceScore - 30);
      if (confidenceScore < 50) {
        return { suggest: false, reason: '当前正处在紧张时刻，不适合结束', confidence: confidenceScore };
      }
    }

    // 10. 章节过长的强制建议
    if (chapter >= 12) {
      reasons.push('故事已经相当长，可以考虑结束');
      confidenceScore += Math.min(30, (chapter - 12) * 5);
    }

    // 综合判断
    const shouldSuggest = confidenceScore >= 60 && reasons.length >= 2;
    const mainReason = reasons.length > 0 ? reasons.join('，') : '故事发展到了合适的节点';

    return {
      suggest: shouldSuggest,
      reason: mainReason,
      confidence: confidenceScore
    };
  };

  // 获取结局建议的详细信息
  const getEndingSuggestion = (story: StoryState) => {
    const suggestion = shouldSuggestEnding(story);
    
    if (!suggestion.suggest) return null;
    
    // 根据故事状态推荐结局类型
    let recommendedTypes: { type: 'natural' | 'satisfying' | 'open' | 'dramatic', label: string, description: string }[] = [];
    
    if (story.story_progress >= 80) {
      recommendedTypes.push({
        type: 'satisfying',
        label: '🎉 圆满结局',
        description: '解决主要冲突，给角色完美归宿'
      });
    }
    
    if (story.tension_level <= 5 && (story.mood === '平静' || story.mood === '希望')) {
      recommendedTypes.push({
        type: 'natural',
        label: '🌅 自然结局',
        description: '顺应故事发展，自然而然地结束'
      });
    }
    
    if (story.story_progress < 80 || story.story_goals?.some(g => g.status === 'pending')) {
      recommendedTypes.push({
        type: 'open',
        label: '🌟 开放结局',
        description: '留有想象空间，暗示未来可能性'
      });
    }
    
    if (story.tension_level >= 6) {
      recommendedTypes.push({
        type: 'dramatic',
        label: '⚡ 戏剧结局',
        description: '情感冲击强烈，留下深刻印象'
      });
    }
    
    // 如果没有特别推荐，提供默认选项
    if (recommendedTypes.length === 0) {
      recommendedTypes.push({
        type: 'natural',
        label: '🌅 自然结局',
        description: '顺应故事发展，自然而然地结束'
      });
    }
    
    return {
      ...suggestion,
      recommendedTypes
    };
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* 主要布局：左右分栏 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-screen">
          
          {/* 左侧：故事内容区域 (主要区域) */}
          <div className="lg:col-span-2 flex flex-col space-y-4 min-h-0">
            
            {/* 移动端顶部状态栏 - 包含操作按钮 */}
            <div className="lg:hidden">
              <Card className="bg-white/95 backdrop-blur-sm shadow-xl border border-white/50 rounded-2xl overflow-hidden">
                <CardContent className="py-3 sm:py-4">
                  {/* 第一行：章节和进度信息 */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg font-bold text-slate-800">第 {story.chapter} 章</span>
                      {story.chapter_title && !story.chapter_title.startsWith('第') && (
                        <span className="text-sm text-slate-600">{story.chapter_title}</span>
                      )}
                    </div>
                    <div className="w-24">
                      <StageProgressIndicator
                        progress={story.story_progress || (story.chapter / 12) * 100}
                        totalStages={5}
                        showPercentage={false}
                        size="sm"
                        className="w-full"
                      />
                    </div>
                  </div>
                  
                  {/* 第二行：操作按钮 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {onSaveStory && (
                        <Button
                          onClick={handleSaveStory}
                          disabled={isSaving}
                          variant="outline"
                          size="sm"
                          className={`flex items-center gap-1 text-xs ${hasUnsavedProgress ? 'border-orange-300 text-orange-600 hover:bg-orange-50' : 'border-green-300 text-green-600 hover:bg-green-50'} ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {isSaving ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Save className="h-3 w-3" />
                          )}
                          {isSaving ? '保存中' : hasUnsavedProgress ? '保存' : '已保存'}
                        </Button>
                      )}
                      
                      {onReturnHome && (
                        <Button
                          onClick={onReturnHome}
                          variant="outline"
                          size="sm"
                          disabled={!hasSavedProgress}
                          className={`flex items-center gap-1 text-xs ${!hasSavedProgress ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-50 border-blue-300'}`}
                          title={!hasSavedProgress ? "当前游戏还没有存档，请先保存后再返回主页" : "返回主页"}
                        >
                          <Home className="h-3 w-3" />
                          返回
                        </Button>
                      )}
                    </div>
                    
                    {/* 右侧信息：字数统计和角色数量 */}
                    <div className="flex items-center space-x-2 text-xs text-slate-500">
                      <span>字数: {(() => {
                        // 计算所有章节的累积字数
                        const totalWordCount = calculateTotalWordCount();
                        return totalWordCount > 1000 ? `${(totalWordCount / 1000).toFixed(1)}K` : totalWordCount;
                      })()}</span>
                      <span>角色: {story.characters?.length || 0}</span>
                      {story.mood && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                          {story.mood}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 主要故事内容 - 移到最前面 */}
            <Card className={`bg-white/95 backdrop-blur-sm shadow-xl border border-white/50 rounded-2xl overflow-hidden ${
              isTyping || isProcessingChoice 
                ? 'flex-shrink-0 shadow-lg processing-choice-card' 
                : 'flex-1 shadow-xl'
            }`}>
              <CardContent className="py-3 sm:py-4">
                <div className="max-w-none">
                  <div className={`text-slate-800 text-lg leading-relaxed whitespace-pre-wrap ${
                    isTyping || isProcessingChoice
                      ? 'opacity-95 content-fit-height' 
                      : 'opacity-100'
                  }`}>
                    <div className="transform">
                      {currentText}
                      {isTyping && (
                        <span className="inline-block ml-1 text-blue-500 font-normal animate-pulse">
                          |
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 选择处理中 - 优化版 */}
            {isProcessingChoice && (
              <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 backdrop-blur-sm shadow-xl border border-indigo-200/50 rounded-2xl overflow-hidden animate-in slide-in-from-bottom-4">
                <CardContent className="py-3 sm:py-4">
                  <div className="text-center space-y-3">
                    <div className="flex items-center justify-center space-x-3">
                      <div className="relative">
                        <div className="w-8 h-8 border-2 border-indigo-200 rounded-full"></div>
                        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                      </div>
                      <span className="text-slate-700 font-medium">正在创作后续剧情...</span>
                    </div>
                    
                    <div className="bg-white/80 border border-indigo-100 rounded-lg p-3">
                      <div className="flex items-center justify-center space-x-2">
                        <span className="text-indigo-600 font-medium text-sm">您的选择：</span>
                        <span className="text-slate-700 font-semibold text-sm">"{selectedChoiceText}"</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-center space-x-1">
                      <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse"></div>
                      <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse delay-150"></div>
                      <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse delay-300"></div>
                      <span className="ml-3 text-xs text-slate-500">
                        {modelConfig?.apiKey ?
                          getModelLevelDescription(modelConfig.performance_level, '正在思考中')
                          : '内容生成中...'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 选择项生成中 - 新增 */}
            {isGeneratingChoices && !isProcessingChoice && !showChoices && (
              <Card className="bg-gradient-to-br from-blue-50/90 to-indigo-50/90 backdrop-blur-sm shadow-xl border border-blue-200/50 rounded-2xl overflow-hidden animate-in slide-in-from-bottom-4">
                <CardContent className="py-3 sm:py-4">
                  <div className="text-center space-y-3">
                    <div className="flex items-center justify-center space-x-3">
                      <div className="relative">
                        <div className="w-6 h-6 border-2 border-blue-200 rounded-full"></div>
                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                      </div>
                      <span className="text-slate-700 font-medium">
                        {isTyping ? '正在准备选项...' : '正在生成选择项...'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-center space-x-1">
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse delay-150"></div>
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse delay-300"></div>
                      <span className="ml-3 text-xs text-slate-500">
                        {modelConfig?.apiKey ?
                          getModelLevelDescription(modelConfig.performance_level, '正在生成中')
                          : '选项生成中...'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* 选项已预生成完成，等待打字机结束 */}
            {pendingChoices && pendingChoices.length > 0 && isTyping && !showChoices && (
              <Card className="bg-gradient-to-br from-green-50/90 to-emerald-50/90 backdrop-blur-sm shadow-xl border border-green-200/50 rounded-2xl overflow-hidden animate-in slide-in-from-bottom-4">
                <CardContent className="py-3 sm:py-4">
                  <div className="text-center space-y-3">
                    <div className="flex items-center justify-center space-x-3">
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-slate-700 font-medium">选项已准备完成</span>
                    </div>
                    
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-green-700 text-sm">
                        ✨ 选项已准备完成
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 故事结束状态 */}
            {story.is_completed && (
              <Card className="bg-gradient-to-br from-purple-50/90 to-indigo-50/90 backdrop-blur-sm shadow-2xl border-2 border-purple-300/50 rounded-3xl overflow-hidden animate-in slide-in-from-bottom-4">
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl text-purple-800 mb-2">
                    {story.completion_type === 'success' && '🎉 完美结局'}
                    {story.completion_type === 'failure' && '💔 悲壮结局'}
                    {story.completion_type === 'neutral' && '🌅 开放结局'}
                    {story.completion_type === 'cliffhanger' && '🎬 待续...'}
                  </CardTitle>
                  <div className="text-sm text-purple-600">
                    故事在第 {story.chapter} 章结束
                    {story.story_progress && (
                      <span className="ml-2">• 完成度: {Math.round(story.story_progress)}%</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  
                  {/* 故事目标状态 */}
                  {story.story_goals && story.story_goals.length > 0 && (
                    <div className="bg-white bg-opacity-50 rounded-lg p-3 border border-purple-200">
                      <h4 className="font-semibold text-purple-800 mb-2">故事目标</h4>
                      <div className="space-y-2">
                        {story.story_goals.map((goal, index) => (
                          <div key={goal.id} className="flex items-center justify-between text-sm">
                            <div className="flex-1">
                              <span className={`font-medium ${
                                goal.status === 'completed' ? 'text-green-700' :
                                goal.status === 'failed' ? 'text-red-700' :
                                goal.status === 'in_progress' ? 'text-yellow-700' : 'text-gray-700'
                              }`}>
                                {goal.description}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1 ml-2">
                              {goal.type === 'main' && (
                                <Badge variant="outline" className="text-xs border-purple-300 text-purple-600">
                                  主要
                                </Badge>
                              )}
                              <Badge 
                                className={`text-xs ${
                                  goal.status === 'completed' ? 'bg-green-600' :
                                  goal.status === 'failed' ? 'bg-red-600' :
                                  goal.status === 'in_progress' ? 'bg-yellow-600' : 'bg-gray-600'
                                } text-white`}
                              >
                                {goal.status === 'completed' && '✅'}
                                {goal.status === 'failed' && '❌'}
                                {goal.status === 'in_progress' && '🔄'}
                                {goal.status === 'pending' && '⏳'}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 justify-center pt-4">
                    <Badge className="bg-purple-600 text-white">
                      {story.completion_type === 'success' ? '英雄凯旋' : 
                       story.completion_type === 'failure' ? '悲剧英雄' :
                       story.completion_type === 'neutral' ? '人生如戏' : '未完待续'}
                    </Badge>
                    <Badge variant="outline" className="border-purple-300 text-purple-600">
                      总章节: {story.chapter}
                    </Badge>
                    <Badge variant="outline" className="border-purple-300 text-purple-600">
                      故事进度: {story.story_progress || 0}%
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 故事卡住时的继续按钮 */}
            {!story.is_completed && isStoryStuck && onContinue && (
              <Card className="bg-red-50/90 backdrop-blur-sm shadow-xl border border-red-200/50 rounded-2xl overflow-hidden animate-in slide-in-from-bottom-4">
                <CardHeader>
                  <CardTitle className="text-lg text-red-800 flex items-center gap-2">
                    ⚠️ 故事卡住了
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-red-700 mb-4">
                    AI生成选择时遇到了问题，或者网络连接超时。您可以手动推进故事继续。
                  </p>
                  {aiError && (
                    <p className="text-sm text-red-600 mb-4 bg-red-100 p-2 rounded">
                      错误详情: {aiError}
                    </p>
                  )}
                  <Button
                    onClick={() => {
                      setIsStoryStuck(false);
                      if (onContinue) onContinue();
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    手动继续故事
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* 进度 >= 95% 或章节 >= 20 时的结局类型选择 */}
            {!story.is_completed && ((story.story_progress || 0) >= 95 || story.chapter >= 20) && !isProcessingChoice && (
              <Card className="bg-purple-50/90 backdrop-blur-sm shadow-xl border border-purple-300/50 rounded-2xl overflow-hidden animate-in slide-in-from-bottom-4">
                <CardHeader>
                  <CardTitle className="text-lg text-purple-800 flex items-center gap-2">
                    🎬 选择故事结局类型
                    <Badge className="bg-purple-600 text-white text-xs">
                      完成度: {Math.round(story.story_progress || 0)}%
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-purple-100 border border-purple-300 rounded-lg p-4">
                    <p className="text-sm text-purple-700 mb-2">
                      经过 {story.chapter} 章的精彩冒险，故事已经非常完整了！现在是时候为这个故事选择一个合适的结局了。
                    </p>
                    <p className="text-xs text-purple-600">
                      选择您喜欢的结局类型，AI将生成相应的完整结局场景。
                    </p>
                  </div>
                  
                  {/* 结局类型选择 */}
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      onClick={() => {
                        if (onMakeChoice) {
                          setSelectedChoiceText('🎉 圆满结局');
                          onMakeChoice(-1, '选择圆满结局：给所有角色一个完美的归宿');
                        }
                      }}
                      className="h-auto p-5 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white flex flex-col items-start rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                    >
                      <div className="font-medium mb-1">🎉 圆满结局</div>
                      <div className="text-xs text-green-100 text-left">解决所有冲突，给角色完美归宿</div>
                    </Button>
                    
                    <Button
                      onClick={() => {
                        if (onMakeChoice) {
                          setSelectedChoiceText('🌟 开放结局');
                          onMakeChoice(-1, '选择开放结局：留有想象空间和未来可能性');
                        }
                      }}
                      className="h-auto p-5 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white flex flex-col items-start rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                    >
                      <div className="font-medium mb-1">🌟 开放结局</div>
                      <div className="text-xs text-blue-100 text-left">留有想象空间，暗示未来可能</div>
                    </Button>
                    
                    <Button
                      onClick={() => {
                        if (onMakeChoice) {
                          setSelectedChoiceText('⚡ 戏剧结局');
                          onMakeChoice(-1, '选择戏剧结局：创造情感冲击和深刻印象');
                        }
                      }}
                      className="h-auto p-5 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white flex flex-col items-start rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                    >
                      <div className="font-medium mb-1">⚡ 戏剧结局</div>
                      <div className="text-xs text-red-100 text-left">情感冲击强烈，留下深刻印象</div>
                    </Button>
                    
                    <Button
                      onClick={() => {
                        if (onMakeChoice) {
                          setSelectedChoiceText('🎲 意外结局');
                          onMakeChoice(-1, '选择意外结局：出人意料的转折和惊喜');
                        }
                      }}
                      className="h-auto p-5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white flex flex-col items-start rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                    >
                      <div className="font-medium mb-1">🎲 意外结局</div>
                      <div className="text-xs text-orange-100 text-left">出人意料的转折和惊喜</div>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 选择项 */}
            {!story.is_completed && showChoices && choices.length > 0 && !isProcessingChoice && (story.story_progress || 0) < 95 && story.chapter < 20 && (
              <Card className="bg-white/90 backdrop-blur-sm shadow-xl border border-white/50 rounded-2xl overflow-hidden animate-in slide-in-from-bottom-4">
                <CardHeader>
                  <CardTitle className="text-lg text-slate-800">选择你的行动</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {choices.map((choice, index) => (
                      <Button
                        key={choice.id}
                        variant="outline"
                        onClick={() => handleChoice(choice.id)}
                        disabled={isProcessingChoice}
                        className={`w-full text-left h-auto p-5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm hover:shadow-md animate-in slide-in-from-bottom-4 ${
                          choice.id === -999
                            ? "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300/50 hover:from-amber-100 hover:to-orange-100 hover:border-amber-400/60 hover:scale-[1.02]"
                            : "bg-white/80 border-gray-200/50 hover:bg-indigo-50/80 hover:border-indigo-300/60 hover:scale-[1.02]"
                        }`}
                        style={{ animationDelay: `${index * 150}ms` }}
                      >
                        <div className="w-full">
                          <div className="flex items-center justify-between mb-1">
                            <div className={`font-semibold ${
                              choice.id === -999 ? "text-orange-800" : "text-slate-800"
                            }`}>
                              {choice.id === -999 && "🎬 "}
                              {choice.text}
                            </div>
                            {choice.difficulty && (
                              <div className="flex items-center space-x-1">
                                <DifficultyIcon level={choice.difficulty} />
                                <span className="text-xs text-slate-500">难度{choice.difficulty}</span>
                              </div>
                            )}
                            {choice.id === -999 && (
                              <Badge className="bg-orange-500 text-white text-xs">
                                直通结局
                              </Badge>
                            )}
                          </div>
                          <div className={`text-sm mb-2 ${
                            choice.id === -999 ? "text-orange-700" : "text-slate-600"
                          }`}>
                            {choice.description}
                          </div>
                          <div className={`text-xs italic ${
                            choice.id === -999 ? "text-orange-600" : "text-slate-500"
                          }`}>
                            可能后果: {choice.consequences || "未知的影响，需要谨慎考虑"}
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 移动端角色信息 - 在底部操作按钮之前 */}
            <div className="lg:hidden">
              {story.characters && story.characters.length > 0 && (
                <Card className="bg-white/95 backdrop-blur-sm shadow-xl border border-white/50 rounded-2xl overflow-hidden">
                  <CardContent className="py-3 sm:py-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-slate-800">角色信息</h3>
                      <span className="text-xs text-slate-500">{story.characters.length}个角色</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      {story.characters.filter(character => character.name && character.name.trim() !== '').slice(0, 4).map((character, index) => (
                        <Dialog key={index}>
                          <DialogTrigger asChild>
                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 hover:bg-slate-100 hover:border-slate-300 cursor-pointer transition-all duration-200">
                              <div className="flex items-center space-x-2 mb-1">
                                <User className="w-3 h-3 text-slate-500" />
                                <h4 className="font-medium text-slate-800 text-xs truncate">{character.name}</h4>
                              </div>
                              <p className="text-xs text-slate-500 truncate">{character.role || '角色'}</p>
                            </div>
                          </DialogTrigger>
                          <DialogContent className="max-w-lg shadow-2xl">
                            <DialogHeader className="sr-only">
                              <DialogTitle>{character.name} - 角色详情</DialogTitle>
                            </DialogHeader>
                            <div className="p-8">
                              <header className="flex items-center space-x-4 mb-6 pb-6 border-b border-gray-200">
                                <div className="flex-shrink-0 w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                                  <User className="w-10 h-10 text-indigo-500" />
                                </div>
                                <div>
                                  <h1 className="text-3xl font-bold text-gray-900">{character.name}</h1>
                                  <p className="text-indigo-500 font-semibold text-md">{character.role || '未知角色'}</p>
                                </div>
                              </header>
                              <div className="space-y-6">
                                <div>
                                  <h2 className="text-sm font-semibold uppercase text-gray-500 tracking-wider mb-3">性格特征</h2>
                                  <div className="flex flex-wrap gap-2">
                                    {parseTraitsToTags(character.traits || '神秘的角色').map((trait, traitIndex) => (
                                      <span key={traitIndex} className="bg-gray-100 text-gray-800 text-sm font-medium px-3 py-1 rounded-full">
                                        {trait}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                {character.appearance && (
                                  <div>
                                    <h2 className="text-sm font-semibold uppercase text-gray-500 tracking-wider mb-3">外貌描述</h2>
                                    <p className="text-gray-700 leading-relaxed">{character.appearance}</p>
                                  </div>
                                )}
                                {character.backstory && (
                                  <div>
                                    <h2 className="text-sm font-semibold uppercase text-gray-500 tracking-wider mb-3">背景故事</h2>
                                    <p className="text-gray-700 leading-relaxed">{character.backstory}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      ))}
                    </div>
                    
                    {story.characters.length > 4 && (
                      <div className="text-xs text-slate-500 text-center mt-2">
                        还有 {story.characters.length - 4} 个角色...
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* 底部操作按钮 */}
            <div className="flex justify-center space-x-4 pt-4 pb-4">
              {story.is_completed ? (
                <>
                  <Button
                    onClick={onRestart}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                  >
                    开启新冒险
                  </Button>
                  <Button
                    onClick={() => {
                      devLog('分享故事功能待实现');
                    }}
                    variant="outline"
                    className="border-purple-300/50 text-purple-700 hover:bg-purple-50/80 px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
                  >
                    分享故事
                  </Button>
                </>
              ) : (
                <Button
                  onClick={onRestart}
                  variant="outline"
                  className="border-slate-300/50 text-slate-700 hover:bg-slate-50/80 px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
                >
                  重新开始
                </Button>
              )}
            </div>
          </div>

          {/* 右侧：辅助信息边栏 */}
          <div className="hidden lg:flex lg:col-span-1 flex-col space-y-4 h-fit max-h-screen overflow-y-auto px-1"
               style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}>
            
            {/* 头部信息 - 紧凑型 */}
            <Card className="bg-white/90 backdrop-blur-sm shadow-xl border border-white/50 rounded-xl overflow-hidden">
              <CardContent className="pt-4 pb-4">
                {/* 章节信息 */}
                <div className="mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-slate-800">第 {story.chapter} 章</span>
                    {story.chapter_title && !story.chapter_title.startsWith('第') && !story.chapter_title.includes('章') && (
                      <span className="text-sm text-slate-600 font-medium truncate ml-2">
                        {story.chapter_title}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* 操作按钮组 */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {onSaveStory && (
                    <Button
                      onClick={handleSaveStory}
                      disabled={isSaving}
                      variant="outline"
                      size="sm"
                      className={`flex items-center gap-1 justify-center text-xs ${
                        hasUnsavedProgress 
                          ? 'border-orange-300 text-orange-600 hover:bg-orange-50' 
                          : 'border-green-300 text-green-600 hover:bg-green-50'
                      } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isSaving ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Save className="h-3 w-3" />
                      )}
                      {isSaving ? '保存' : hasUnsavedProgress ? '保存' : '已保存'}
                    </Button>
                  )}
                  
                  {onReturnHome && (
                    <Button
                      onClick={onReturnHome}
                      variant="outline"
                      size="sm"
                      disabled={!hasSavedProgress}
                      className={`flex items-center gap-1 justify-center text-xs ${
                        !hasSavedProgress 
                          ? 'opacity-50 cursor-not-allowed' 
                          : 'hover:bg-blue-50 border-blue-300'
                      }`}
                      title={!hasSavedProgress ? "当前游戏还没有存档，请先保存后再返回主页" : "返回主页"}
                    >
                      <Home className="h-3 w-3" />
                      返回
                    </Button>
                  )}
                </div>

                {/* 自动保存控制 */}
                {onToggleAutoSave && (
                  <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg mb-3">
                    <span className="text-xs font-medium text-slate-700">自动保存</span>
                    <div 
                      className={`relative inline-flex h-4 w-7 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        autoSaveEnabled ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                      onClick={() => onToggleAutoSave(!autoSaveEnabled)}
                      role="switch"
                      aria-checked={autoSaveEnabled}
                    >
                      <span 
                        className={`inline-block h-3 w-3 transform rounded-full bg-white shadow-lg transition duration-200 ease-in-out ${
                          autoSaveEnabled ? 'translate-x-3' : 'translate-x-0'
                        }`}
                      />
                    </div>
                  </div>
                )}
                
                {/* 简化统计信息 */}
                <div className="text-xs text-gray-500 bg-slate-50 p-2 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span>字数: {(() => {
                      // 计算所有章节的累积字数
                      const totalWordCount = calculateTotalWordCount();
                      return totalWordCount > 1000 ? `${(totalWordCount / 1000).toFixed(1)}K` : totalWordCount;
                    })()}</span>
                    <span>角色: {story.characters?.length || 0}</span>
                    {story.mood && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                        {story.mood}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 角色信息 - 紧凑版 */}
            {story.characters && story.characters.length > 0 && (
              <Card className="bg-white/90 backdrop-blur-sm shadow-xl border border-white/50 rounded-xl overflow-hidden">
                <CardHeader className="pb-2 pt-3">
                  <CardTitle className="text-base text-slate-800">角色信息</CardTitle>
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="space-y-2">
                    {story.characters.filter(character => character.name && character.name.trim() !== '').slice(0, 3).map((character, index) => (
                      <Dialog key={index}>
                        <DialogTrigger asChild>
                          <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 hover:bg-slate-100 hover:border-slate-300 cursor-pointer transition-all duration-200 group">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center space-x-2">
                                <User className="w-3 h-3 text-slate-500 group-hover:text-slate-600" />
                                <h4 className="font-medium text-slate-800 group-hover:text-slate-900 text-sm">{character.name}</h4>
                              </div>
                              <span className="text-xs text-slate-600">{character.role || '未知角色'}</span>
                            </div>
                            <p className="text-xs text-slate-500 line-clamp-1">{character.traits || '神秘的角色'}</p>
                          </div>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg shadow-2xl">
                          <DialogHeader className="sr-only">
                            <DialogTitle>{character.name} - 角色详情</DialogTitle>
                          </DialogHeader>

                          <div className="p-8">
                            <header className="flex items-center space-x-4 mb-6 pb-6 border-b border-gray-200">
                              <div className="flex-shrink-0 w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                                <User className="w-10 h-10 text-indigo-500" />
                              </div>
                              <div>
                                <h1 className="text-3xl font-bold text-gray-900">{character.name}</h1>
                                <p className="text-indigo-500 font-semibold text-md">{character.role || '未知角色'}</p>
                              </div>
                            </header>

                            <div className="space-y-6">
                              <div>
                                <h2 className="text-sm font-semibold uppercase text-gray-500 tracking-wider mb-3">性格特征</h2>
                                <div className="flex flex-wrap gap-2">
                                  {parseTraitsToTags(character.traits || '神秘的角色').map((trait, traitIndex) => (
                                    <span key={traitIndex} className="bg-gray-100 text-gray-800 text-sm font-medium px-3 py-1 rounded-full">
                                      {trait}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              {character.appearance && (
                                <div>
                                  <h2 className="text-sm font-semibold uppercase text-gray-500 tracking-wider mb-3">外貌描述</h2>
                                  <p className="text-gray-700 leading-relaxed">{character.appearance}</p>
                                </div>
                              )}

                              {character.backstory && (
                                <div>
                                  <h2 className="text-sm font-semibold uppercase text-gray-500 tracking-wider mb-3">背景故事</h2>
                                  <p className="text-gray-700 leading-relaxed">{character.backstory}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    ))}
                    {story.characters.length > 3 && (
                      <div className="text-xs text-slate-500 text-center py-1">
                        还有 {story.characters.length - 3} 个角色...
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 故事目标 - 紧凑版 */}
            {!story.is_completed && story.story_goals && story.story_goals.length > 0 && (
              <Card className="bg-white/90 backdrop-blur-sm shadow-xl border border-white/50 rounded-xl overflow-hidden">
                <CardHeader className="pb-2 pt-3">
                  <CardTitle className="text-base text-slate-800 flex items-center gap-2">
                    🎯 故事目标
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="space-y-2">
                    {story.story_goals.slice(0, 3).map((goal, index) => (
                      <div key={goal.id} className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-medium ${
                                goal.status === 'completed' ? 'text-green-700' :
                                goal.status === 'failed' ? 'text-red-700' :
                                goal.status === 'in_progress' ? 'text-yellow-700' : 'text-slate-700'
                              }`}>
                                {goal.description}
                              </span>
                              {goal.type === 'main' && (
                                <span className="text-xs px-1 py-0 bg-purple-100 text-purple-600 rounded">主</span>
                              )}
                            </div>
                          </div>
                          <span className="text-xs ml-2">
                            {goal.status === 'completed' && '✅'}
                            {goal.status === 'failed' && '❌'}
                            {goal.status === 'in_progress' && '🔄'}
                            {goal.status === 'pending' && '⏳'}
                          </span>
                        </div>
                      </div>
                    ))}
                    {story.story_goals.length > 3 && (
                      <div className="text-xs text-slate-500 text-center py-1">
                        还有 {story.story_goals.length - 3} 个目标...
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 故事进度提示 - 极简版 */}
            {!story.is_completed && (
              <Card className="bg-gradient-to-r from-blue-50/90 to-purple-50/90 backdrop-blur-sm shadow-xl border border-blue-200/50 rounded-xl overflow-hidden">
                <CardContent className="pt-3 pb-3">
                  <div className="space-y-3">
                    <StageProgressIndicator
                      progress={story.story_progress || Math.min((story.chapter / 20) * 100, 100)}
                      totalStages={5}
                      stageDescription={getStoryStageDescription(story.chapter)}
                      showPercentage={false}
                      size="md"
                      className="mb-1"
                    />
                    
                    {story.chapter >= 5 && (
                      <div className="text-xs text-slate-500 bg-white bg-opacity-70 rounded px-2 py-1 border border-slate-200">
                        💡 {getEndingHint(story.chapter, story.story_progress || 0)}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI状态信息 */}
            {(modelConfig || aiError) && (
              <Card className="bg-slate-50/90 backdrop-blur-sm shadow-lg border border-slate-200/50 rounded-xl overflow-hidden">
                <CardContent className="pt-4">
                  {modelConfig && (
                    <p className="text-xs text-slate-500 text-center">
                      AI模型: {getModelLevelName(modelConfig.performance_level)}
                    </p>
                  )}
                  {aiError && (
                    <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700 text-center">
                      ⚠️ {aiError}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryReader;

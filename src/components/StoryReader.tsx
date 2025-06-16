import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Dice1, Dice2, Dice3, Dice4, Dice5 } from 'lucide-react';

interface StoryState {
  story_id: string;
  current_scene: string;
  characters: Array<{ name: string; role: string; traits: string; appearance?: string; backstory?: string }>;
  setting: string;
  chapter: number;
  choices_made: string[];
  achievements: string[];
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
}

const StoryReader: React.FC<StoryReaderProps> = ({ 
  initialStory, 
  onMakeChoice, 
  onRestart,
  onContinue,
  modelConfig,
  aiError 
}) => {
  const [story, setStory] = useState<StoryState>(initialStory);
  const [currentText, setCurrentText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [choices, setChoices] = useState<Choice[]>([]);
  const [showChoices, setShowChoices] = useState(false);
  const [isGeneratingChoices, setIsGeneratingChoices] = useState(false);
  const [isProcessingChoice, setIsProcessingChoice] = useState(false);
  const [selectedChoiceText, setSelectedChoiceText] = useState<string>('');
  const [choiceStartTime, setChoiceStartTime] = useState<number>(0);
  const [isStoryStuck, setIsStoryStuck] = useState(false); // 故事是否真的卡住了
  const [choiceGenerationStartTime, setChoiceGenerationStartTime] = useState<number>(0);
  
  // 调试：监控isProcessingChoice状态变化
  useEffect(() => {
    console.log('🎯 isProcessingChoice状态变化:', isProcessingChoice);
  }, [isProcessingChoice]);

  // 监控选择生成超时
  useEffect(() => {
    if (choiceGenerationStartTime > 0) {
      const timeoutId = setTimeout(() => {
        const currentTime = Date.now();
        const elapsedTime = currentTime - choiceGenerationStartTime;
        
        if (elapsedTime >= 30000) { // 30秒超时
          console.error('⏰ 选择生成超时，故事可能卡住了');
          setIsStoryStuck(true);
          setIsGeneratingChoices(false);
          setChoiceGenerationStartTime(0);
        }
      }, 30000);

      return () => clearTimeout(timeoutId);
    }
  }, [choiceGenerationStartTime]);

  // 当外部story更新时，同步本地state
  useEffect(() => {
    setStory(initialStory);
  }, [initialStory]);

  // 监控AI错误状态
  useEffect(() => {
    if (aiError) {
      console.error('❌ AI错误detected:', aiError);
      setIsStoryStuck(true);
    } else {
      // AI错误清除时，重置卡住状态（除非其他原因导致卡住）
      if (isStoryStuck && !choiceGenerationStartTime) {
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
    console.log(`🎯 动态选择数量计算 (类型: ${choiceType}):`, choiceCount);
    
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
    console.log(`🎯 本地生成目标选择数量:`, targetChoiceCount);
    
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
    
    console.log(`🎲 最终生成选择数量: ${choices.length}/${targetChoiceCount}`);
    
    return choices;
  };

  // 模拟AI生成选择（可以后续替换为真实AI调用）
  const generateAIChoices = async (scene: string, characters: any[]): Promise<Choice[]> => {
    setIsGeneratingChoices(true);
    setChoiceGenerationStartTime(Date.now());
    setIsStoryStuck(false); // 重置卡住状态
    
    // 模拟AI思考时间
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    try {
      // 优先使用AI生成选择
      if (modelConfig && modelConfig.apiKey) {
        try {
          // 导入storyAI服务
          const { storyAI } = await import('../services/storyAI');
          storyAI.setModelConfig(modelConfig);
          
          const aiChoices = await storyAI.generateChoices(scene, characters, story);
          if (aiChoices && aiChoices.length > 0) {
            console.log('✅ AI选择生成成功');
            return aiChoices;
          } else {
            console.warn('⚠️ AI选择生成返回空数组');
          }
        } catch (aiError) {
          console.warn('❌ AI选择生成失败，使用智能回退:', aiError);
          // AI调用失败，但还有回退方案，不算真正卡住
        }
      }
      
      // 回退到基于场景内容的智能生成
      const contextualChoices = generateContextualChoices(scene, characters, story);
      if (contextualChoices && contextualChoices.length > 0) {
        console.log('✅ 智能回退选择生成成功');
        return contextualChoices;
      } else {
        // 连回退都失败了，故事真的卡住了，但还是提供最基本的选择
        console.error('❌ 所有选择生成方案都失败了，使用紧急回退选择');
        setIsStoryStuck(true);
        
        // 紧急回退选择
        return [
          { id: 1, text: "继续前进", description: "勇敢地向前迈进", difficulty: 3 },
          { id: 2, text: "停下思考", description: "冷静分析当前情况", difficulty: 2 },
          { id: 3, text: "与同伴交流", description: "和伙伴讨论下一步行动", difficulty: 2 }
        ];
      }
    } catch (error) {
      console.error('❌ 生成选择发生严重错误:', error);
      setIsStoryStuck(true);
      
      // 错误回退 - 最后的保险
      return [
        { id: 1, text: "继续前进", description: "勇敢地向前迈进", difficulty: 3 },
        { id: 2, text: "停下思考", description: "冷静分析当前情况", difficulty: 2 },
        { id: 3, text: "寻求帮助", description: "向同伴求助", difficulty: 2 }
      ];
    } finally {
      setIsGeneratingChoices(false);
      setChoiceGenerationStartTime(0);
    }
  };

  // 模拟打字机效果
  useEffect(() => {
    if (story.current_scene && story.current_scene !== currentText) {
      setIsTyping(true);
      setCurrentText('');
      setShowChoices(false);
      setChoices([]);
      
      let index = 0;
      const interval = setInterval(() => {
        if (index < story.current_scene.length) {
          setCurrentText(story.current_scene.slice(0, index + 1));
          index++;
        } else {
          setIsTyping(false);
          // 打字完成后根据需要显示选择项
          setTimeout(async () => {
            // 检查是否需要显示选择项 - 修复逻辑，默认显示选择
            const shouldShowChoices = story.needs_choice !== false && !story.is_completed;
            
            console.log('🎯 检查是否需要显示选择项:', {
              needs_choice: story.needs_choice,
              is_completed: story.is_completed,
              shouldShowChoices,
              scene_length: story.current_scene?.length,
              chapter: story.chapter
            });
            
                         if (shouldShowChoices) {
               console.log('✅ 开始生成选择项...');
               const newChoices = await generateAIChoices(story.current_scene, story.characters);
               console.log('🎯 生成的选择项:', newChoices);
               
               if (newChoices && newChoices.length > 0) {
                 setChoices(newChoices);
                 setShowChoices(true);
                 console.log('✅ 选择项已设置并显示');
               } else {
                 console.warn('⚠️ 选择项生成完全失败');
                 // 如果连默认选择都没有返回，说明真的卡住了
                 // generateAIChoices内部已经设置了isStoryStuck状态
               }
             } else {
               console.log('❌ 不需要显示选择项，或故事已完成');
             }
          }, 800);
          clearInterval(interval);
        }
      }, 30); // 稍微加快打字速度

      return () => clearInterval(interval);
    }
  }, [story.current_scene]);

  // 当外部故事更新时，重置选择处理状态
  useEffect(() => {
    setStory(initialStory);
  }, [initialStory]);

  // 当外部故事变化时（AI处理完成），智能重置选择处理状态
  useEffect(() => {
    if (initialStory.current_scene !== story.current_scene && isProcessingChoice && choiceStartTime > 0) {
      const elapsedTime = Date.now() - choiceStartTime;
      const minDisplayTime = 1500; // 最少显示1.5秒
      
      console.log('🎯 AI处理完成，检查是否可以重置加载状态:', {
        elapsedTime,
        minDisplayTime,
        aiFinished: true,
        shouldWait: elapsedTime < minDisplayTime
      });
      
      if (elapsedTime < minDisplayTime) {
        // AI完成了，但还没达到最小显示时间，等待剩余时间
        const remainingTime = minDisplayTime - elapsedTime;
        console.log('⏳ AI已完成，但需等待最小显示时间:', remainingTime + 'ms');
        
        setTimeout(() => {
          console.log('✅ AI完成 + 最小显示时间达到，重置加载状态');
          setIsProcessingChoice(false);
          setSelectedChoiceText('');
          setChoiceStartTime(0);
        }, remainingTime);
      } else {
        // AI完成且已经显示足够时间，立即重置
        console.log('✅ AI完成且已达到最小显示时间，立即重置加载状态');
        setIsProcessingChoice(false);
        setSelectedChoiceText('');
        setChoiceStartTime(0);
      }
    }
  }, [initialStory.current_scene]);

  const handleChoice = (choiceId: number) => {
    const selectedChoice = choices.find(c => c.id === choiceId);
    
    // 记录选择开始时间，确保加载状态至少显示1.5秒
    const startTime = Date.now();
    setChoiceStartTime(startTime);
    
    // 立即显示选择处理状态
    setSelectedChoiceText(selectedChoice?.text || '');
    setIsProcessingChoice(true);
    setShowChoices(false);
    setChoices([]);
    
    console.log('🔄 选择处理开始:', {
      choiceId,
      selectedText: selectedChoice?.text,
      isProcessingChoice: true,
      startTime
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 头部信息 */}
        <Card className="bg-white shadow-lg border-slate-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl text-slate-800">
                第 {story.chapter} 章
              </CardTitle>
              <div className="flex items-center space-x-4">
                <Badge variant="outline" className="border-slate-300 text-slate-600">
                  ID: {story.story_id}
                </Badge>
                {story.mood && (
                  <Badge variant="outline" className="border-blue-300 text-blue-600">
                    氛围: {story.mood}
                  </Badge>
                )}
                {story.tension_level && (
                  <Badge variant="outline" className="border-orange-300 text-orange-600">
                    紧张度: {story.tension_level}/10
                  </Badge>
                )}
                {story.scene_type && (
                  <Badge variant="outline" className="border-purple-300 text-purple-600">
                    {story.scene_type === 'action' && '行动'}
                    {story.scene_type === 'dialogue' && '对话'}
                    {story.scene_type === 'exploration' && '探索'}
                    {story.scene_type === 'reflection' && '思考'}
                    {story.scene_type === 'climax' && '高潮'}
                  </Badge>
                )}
                <Progress 
                  value={story.story_progress || (story.chapter / 12) * 100} 
                  className="w-32" 
                />
                {story.story_progress && (
                  <span className="text-xs text-slate-500 ml-1">
                    {Math.round(story.story_progress)}%
                  </span>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* 角色信息 */}
        <Card className="bg-white shadow-lg border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-slate-800">角色信息</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {story.characters.map((character, index) => (
                <div key={index} className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <h4 className="font-semibold text-slate-800">{character.name}</h4>
                  <p className="text-sm text-slate-600 mb-1">{character.role}</p>
                  <p className="text-xs text-slate-500">{character.traits}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 故事目标状态 - 在故事进行中显示 */}
        {!story.is_completed && story.story_goals && story.story_goals.length > 0 && (
          <Card className="bg-white shadow-lg border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                🎯 故事目标
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {story.story_goals.map((goal, index) => (
                  <div key={goal.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`font-medium ${
                            goal.status === 'completed' ? 'text-green-700' :
                            goal.status === 'failed' ? 'text-red-700' :
                            goal.status === 'in_progress' ? 'text-yellow-700' : 'text-slate-700'
                          }`}>
                            {goal.description}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline"
                            className={`text-xs ${
                              goal.type === 'main' ? 'border-purple-300 text-purple-600' :
                              goal.type === 'sub' ? 'border-blue-300 text-blue-600' :
                              goal.type === 'personal' ? 'border-green-300 text-green-600' :
                              'border-pink-300 text-pink-600'
                            }`}
                          >
                            {goal.type === 'main' ? '主要目标' :
                             goal.type === 'sub' ? '次要目标' :
                             goal.type === 'personal' ? '个人目标' : '关系目标'}
                          </Badge>
                          <Badge 
                            variant="outline"
                            className={`text-xs ${
                              goal.priority === 'high' ? 'border-red-300 text-red-600' :
                              goal.priority === 'medium' ? 'border-yellow-300 text-yellow-600' :
                              'border-gray-300 text-gray-600'
                            }`}
                          >
                            {goal.priority === 'high' ? '高优先级' :
                             goal.priority === 'medium' ? '中优先级' : '低优先级'}
                          </Badge>
                          {goal.completion_chapter && (
                            <span className="text-xs text-slate-500">
                              第{goal.completion_chapter}章完成
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge 
                        className={`ml-3 ${
                          goal.status === 'completed' ? 'bg-green-600' :
                          goal.status === 'failed' ? 'bg-red-600' :
                          goal.status === 'in_progress' ? 'bg-yellow-600' : 'bg-gray-600'
                        } text-white`}
                      >
                        {goal.status === 'completed' && '✅ 已完成'}
                        {goal.status === 'failed' && '❌ 已失败'}
                        {goal.status === 'in_progress' && '🔄 进行中'}
                        {goal.status === 'pending' && '⏳ 待开始'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 主要故事内容 */}
        <Card className="bg-white shadow-lg border-slate-200">
          <CardContent className="pt-6">
            <div className="prose prose-slate max-w-none">
              <div className="text-slate-800 text-lg leading-relaxed whitespace-pre-wrap">
                {currentText}
                {isTyping && <span className="animate-pulse text-blue-600">|</span>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 选择处理中 - 移动到故事内容后面 */}
        {isProcessingChoice && (
          <Card className="bg-white shadow-lg border-slate-200 animate-in slide-in-from-bottom-4 border-green-300">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center space-x-3">
                  <Loader2 className="w-6 h-6 animate-spin text-green-600" />
                  <span className="text-slate-700 font-medium text-lg">正在处理您的选择...</span>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 animate-pulse">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-green-700 font-medium">您选择了：</span>
                  </div>
                  <p className="text-green-600 mt-2 font-semibold text-lg">"{selectedChoiceText}"</p>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center justify-center space-x-2 text-blue-600 text-sm">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-200"></div>
                    <span className="ml-2 font-medium">
                      {modelConfig?.apiKey ? 'AI正在创作后续剧情...' : '正在生成后续剧情...'}
                    </span>
                  </div>
                  
                  {modelConfig?.apiKey && (
                    <div className="text-xs text-blue-500 mt-2">
                      模型: {modelConfig.provider} - {modelConfig.model}
                    </div>
                  )}
                </div>
                
                <div className="text-xs text-slate-400 italic">
                  正在分析您的选择并创造精彩后续...
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 选择项生成中 */}
        {isGeneratingChoices && (
          <Card className="bg-white shadow-lg border-slate-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center space-x-3">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span className="text-slate-600">AI正在为您生成个性化选择...</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 故事结束状态 */}
        {story.is_completed && (
          <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 shadow-xl border-2 border-purple-300 animate-in slide-in-from-bottom-4">
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
              <div className="bg-white bg-opacity-50 rounded-lg p-4 border border-purple-200">
                <h4 className="font-semibold text-purple-800 mb-2">故事总结</h4>
                <p className="text-purple-700 text-sm">
                  经过 {story.choices_made.length} 个重要选择和 {story.chapter} 章的精彩冒险，
                  {story.characters[0]?.name || '主角'}的故事画下了
                  {story.completion_type === 'success' ? '完美的句号' : 
                   story.completion_type === 'failure' ? '悲壮的终章' :
                   story.completion_type === 'neutral' ? '意味深长的省略号' : '引人遐想的破折号'}。
                </p>
              </div>
              
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
                          {goal.completion_chapter && (
                            <span className="text-xs text-purple-600 ml-2">
                              (第{goal.completion_chapter}章)
                            </span>
                          )}
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
                  获得成就: {story.achievements.length}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 故事卡住时的继续按钮 - 只在真正出现问题时显示 */}
        {!story.is_completed && isStoryStuck && onContinue && (
          <Card className="bg-red-50 shadow-lg border-red-200 animate-in slide-in-from-bottom-4">
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
                  setIsStoryStuck(false); // 重置卡住状态
                  if (onContinue) onContinue();
                }}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                手动继续故事
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 选择项 - 只在故事未结束时显示 */}
        {!story.is_completed && showChoices && choices.length > 0 && !isProcessingChoice && (
          <Card className="bg-white shadow-lg border-slate-200 animate-in slide-in-from-bottom-4">
            <CardHeader>
              <CardTitle className="text-lg text-slate-800">选择你的行动</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {choices.map((choice) => (
                  <Button
                    key={choice.id}
                    variant="outline"
                    onClick={() => handleChoice(choice.id)}
                    disabled={isProcessingChoice}
                    className="w-full text-left h-auto p-4 bg-slate-50 border-slate-300 hover:bg-blue-50 hover:border-blue-300 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="w-full">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-semibold text-slate-800">{choice.text}</div>
                        {choice.difficulty && (
                          <div className="flex items-center space-x-1">
                            <DifficultyIcon level={choice.difficulty} />
                            <span className="text-xs text-slate-500">难度{choice.difficulty}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-slate-600">{choice.description}</div>
                      {choice.consequences && (
                        <div className="text-xs text-slate-500 mt-1 italic">
                          可能后果: {choice.consequences}
                        </div>
                      )}
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 成就系统 */}
        {story.achievements.length > 0 && (
          <Card className="bg-white shadow-lg border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg text-slate-800">已解锁成就</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {story.achievements.map((achievement, index) => (
                  <Badge key={index} className="bg-blue-600 text-white">
                    {achievement}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI状态信息 */}
        {(modelConfig || aiError) && (
          <Card className="bg-slate-50 shadow border-slate-200">
            <CardContent className="pt-4">
              {modelConfig && (
                <p className="text-xs text-slate-500 text-center">
                  AI模型: {modelConfig.provider} - {modelConfig.model}
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

        {/* 操作按钮 */}
        <div className="flex justify-center space-x-4">
          {story.is_completed ? (
            <>
              {onContinue && (
                <Button
                  onClick={onContinue}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  继续冒险
                </Button>
              )}
              <Button
                onClick={onRestart}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                开启新冒险
              </Button>
              <Button
                onClick={() => {
                  // 分享故事功能（后续可以实现）
                  console.log('分享故事功能待实现');
                }}
                variant="outline"
                className="border-purple-300 text-purple-700 hover:bg-purple-50"
              >
                分享故事
              </Button>
            </>
          ) : (
            <Button
              onClick={onRestart}
              variant="outline"
              className="border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              重新开始
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoryReader;

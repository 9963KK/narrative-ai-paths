import React, { useState, useEffect } from 'react';
import StoryInitializer from './StoryInitializer';
import StoryReader from './StoryReader';
import SaveManager from './SaveManager';
import DebugSaveManager from './DebugSaveManager';
import { ModelConfig } from './model-config/constants';
import { storyAI, StoryGenerationResponse } from '../services/storyAI';
import { modelConfigAdapter } from '@/services/modelConfigAdapter';
import { 
  contextManager, 
  SavedStoryContext, 
  ConversationMessage,
  autoSaveContext,
  saveStoryProgress,
  Choice
} from '../services/contextManager';

// 导入新的配置类型
import { StoryConfig } from './StoryInitializer';

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

interface StoryManagerProps {
  preloadedContext?: SavedStoryContext | null;
  onReturnToHome?: () => void;
  onNavigate?: (path: string) => void;
  userId?: string;
}

const StoryManager: React.FC<StoryManagerProps> = ({ preloadedContext, onReturnToHome, onNavigate, userId }) => {
  const [currentStory, setCurrentStory] = useState<StoryState | null>(null);
  const [currentModelConfig, setCurrentModelConfig] = useState<ModelConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isProcessingChoice, setIsProcessingChoice] = useState(false);
  const [currentContextId, setCurrentContextId] = useState<string | null>(null);
  const [showSaveManager, setShowSaveManager] = useState(false);
  const [showDebugManager, setShowDebugManager] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true); // 自动保存状态
  const [hasSavedProgress, setHasSavedProgress] = useState(false); // 是否有存档
  const [currentChoices, setCurrentChoices] = useState<Choice[]>([]); // 当前选项

  // 处理选项更新
  const handleChoicesUpdate = (choices: Choice[]) => {
    setCurrentChoices(choices);
  };

  // 标准化角色数据，确保所有字段都有值
  const normalizeCharacters = (characters: any[]): any[] => {
    return characters.map(character => ({
      name: character.name || '未知角色',
      role: character.role || '神秘角色',
      traits: character.traits || '神秘的角色',
      appearance: character.appearance || '待描述',
      backstory: character.backstory || '背景故事待补充'
    }));
  };

  // 组件加载时尝试加载用户模型配置
  useEffect(() => {
    const loadUserConfig = async () => {
      try {
        const userConfig = await modelConfigAdapter.getUserModelConfig();
        if (userConfig) {
          setCurrentModelConfig(userConfig);
          console.log('📂 已加载用户模型配置');
        }
      } catch (error) {
        console.error('加载用户模型配置失败:', error);
      }
    };
    
    loadUserConfig();
  }, []);

  // 处理预加载的故事上下文
  useEffect(() => {
    if (preloadedContext) {
      console.log('🎯 处理预加载的故事上下文:', preloadedContext.title);
      
      // 恢复故事状态
      setCurrentStory(preloadedContext.storyState);
      setCurrentModelConfig(preloadedContext.modelConfig);
      setCurrentContextId(preloadedContext.id);
      setHasSavedProgress(true);

      // 恢复对话历史（模型配置现在由统一AI服务自动管理）
      storyAI.setConversationHistory(preloadedContext.conversationHistory, preloadedContext.summaryState);

      console.log('✅ 预加载故事已恢复到StoryManager');
    }
  }, [preloadedContext]);

  // 检查是否有待处理的故事配置（仅在没有预加载数据时）
  useEffect(() => {
    // 如果有预加载的故事数据，跳过待处理配置检查
    if (preloadedContext) {
      return;
    }
    
    const pendingConfigStr = localStorage.getItem('pendingStoryConfig');
    if (pendingConfigStr) {
      try {
        const pendingConfig = JSON.parse(pendingConfigStr);
        console.log('🚀 发现待处理的故事配置，开始初始化故事...');
        
        // 清除待处理的配置
        localStorage.removeItem('pendingStoryConfig');
        
        // 初始化故事
        initializeStory(pendingConfig.config, pendingConfig.modelConfig, pendingConfig.isAdvanced);
      } catch (error) {
        console.error('解析待处理的故事配置失败:', error);
        localStorage.removeItem('pendingStoryConfig');
      }
    }
  }, [preloadedContext]);

  const initializeStory = async (config: StoryConfig, modelConfig: ModelConfig, isAdvanced: boolean) => {
    setIsLoading(true);
    setAiError(null);
    setCurrentModelConfig(modelConfig);
    
    try {
      // 清除对话历史（模型配置现在由统一AI服务自动管理）
      storyAI.clearConversationHistory(); // 开始新故事时清除历史
      
      // 调用AI生成初始故事
      const response: StoryGenerationResponse = await storyAI.generateInitialStory(config, isAdvanced);
      
      if (response.success && response.content) {
        // 处理故事目标
        const storyGoals = processStoryGoals(config);
    
    const initialStory: StoryState = {
          story_id: `${userId || 'guest'}_ST${Date.now()}`,
          current_scene: response.content.scene,
          characters: normalizeCharacters(response.content.characters || []),
          setting: response.content.setting_details || config.setting || '未知世界',
          chapter: 1,
          chapter_title: response.content.chapter_title || '序章',
          choices_made: [],
          mood: response.content.mood || '神秘',
          tension_level: response.content.tension_level || 5,
          needs_choice: true, // 初始场景总是需要选择
          scene_type: 'exploration',
          story_goals: storyGoals
        };
        
        setCurrentStory(initialStory);
      } else {
        // AI生成失败，使用回退方案
        const fallbackStory = generateFallbackStory(config, isAdvanced);
        setCurrentStory(fallbackStory);
        setAiError(response.error || 'AI生成故事失败，使用默认模式');
      }
    } catch (error) {
      console.error('初始化故事失败:', error);
      const fallbackStory = generateFallbackStory(config, isAdvanced);
      setCurrentStory(fallbackStory);
      setAiError(error instanceof Error ? error.message : '未知错误');
    } finally {
      setIsLoading(false);
    }
  };

  // 处理故事目标
  const processStoryGoals = (config: StoryConfig) => {
    const hasAdvancedGoals = 'story_goals' in config && Array.isArray(config.story_goals);
    
    if (hasAdvancedGoals) {
      // 高级配置：使用用户设定的目标
      return config.story_goals.map(goal => ({
        ...goal,
        status: 'pending' as const
      }));
    } else {
      // 简单配置：从main_goal创建目标
      const goals = [];
      if (config.main_goal && config.main_goal.trim()) {
        goals.push({
          id: 'main_goal',
          description: config.main_goal,
          type: 'main' as const,
          priority: 'high' as const,
          status: 'pending' as const
        });
      }
      return goals;
    }
  };

  // 回退方案：当AI失败时使用
  const generateFallbackStory = (config: StoryConfig, isAdvanced: boolean): StoryState => {
    // 检查是否为高级配置
    const isAdvancedConfig = 'character_count' in config && 'character_details' in config;
    
    let scene: string;
    let characters: any[];
    let setting: string;
    
    if (isAdvancedConfig && isAdvanced) {
      const advConfig = config as any;
      // 使用用户提供的角色信息
      characters = advConfig.character_details.map((char: any, index: number) => ({
        name: char.name || `角色${index + 1}`,
        role: char.role || '配角',
        traits: char.personality || '神秘的角色',
        appearance: '待描述',
        backstory: '背景故事待补充'
      }));
      
      setting = advConfig.environment_details || '神秘的世界';
      scene = `在${setting}中，故事即将开始。${characters[0]?.name || '主角'}站在这个充满可能性的世界前，准备开始一段${config.genre}的冒险旅程。`;
    } else {
      // 简单配置，生成默认角色
      characters = [
        { 
          name: '主角', 
          role: '主角', 
          traits: '勇敢而充满好奇心',
          appearance: '年轻而充满活力的外表',
          backstory: '一个寻求真相的冒险者'
        },
        { 
          name: '神秘向导', 
          role: '导师', 
          traits: '智慧且经验丰富',
          appearance: '长者的风貌，眼中闪烁着智慧的光芒',
          backstory: '掌握古老知识的智者'
        },
        { 
          name: '未知敌人', 
          role: '反派', 
          traits: '强大而危险',
          appearance: '笼罩在阴影中的神秘身影',
          backstory: '隐藏在黑暗中的威胁'
        }
      ];
      setting = '神秘的世界';
      scene = `基于您的想法"${config.story_idea}"，故事在一个充满可能性的世界中展开。主角的冒险即将开始，每一个决定都可能改变故事的走向。`;
    }
    
    const storyGoals = processStoryGoals(config);
    
    return {
      story_id: `${userId || 'guest'}_ST${Date.now()}`,
      current_scene: scene,
      characters: normalizeCharacters(characters),
      setting,
      chapter: 1,
      choices_made: [],
      achievements: [],
      mood: '神秘',
      tension_level: 5,
      needs_choice: true,
      scene_type: 'exploration',
      story_goals: storyGoals
    };
  };

  const handleMakeChoice = async (choiceId: number, choiceText: string) => {
    if (!currentStory) return;

    // 记录选择处理开始时间
    const startTime = Date.now();

    // 开始处理状态
    setIsProcessingChoice(true);
    
    console.log(`👆 玩家选择: [${choiceId}] ${choiceText}`);

    try {
      // 检查是否是主动结束故事的选择
      if (choiceId === -1 && choiceText.includes('结局')) {
        console.log('🎬 用户主动选择结束故事:', choiceText);
        
        try {
          // 解析选择的结局类型
          let endingType: 'natural' | 'satisfying' | 'open' | 'dramatic' = 'natural';
          if (choiceText.includes('satisfying') || choiceText.includes('圆满')) {
            endingType = 'satisfying';
          } else if (choiceText.includes('open') || choiceText.includes('开放')) {
            endingType = 'open';
          } else if (choiceText.includes('dramatic') || choiceText.includes('戏剧')) {
            endingType = 'dramatic';
          }
          
          console.log(`🎭 生成${endingType}类型结局...`);
          
          // 检查并设置AI配置
          if (!currentModelConfig || !currentModelConfig.apiKey) {
            throw new Error('AI模型配置缺失，无法生成定制结局');
          }
          
          // 模型配置现在由统一AI服务自动管理
          
          // 使用AI生成定制结局
          const customEnding = await storyAI.generateCustomEnding(currentStory, endingType);
          
          // 清理AI响应，确保是纯文本而不是JSON
          const cleanedEnding = (() => {
            try {
              // 如果是JSON格式，尝试提取scene字段
              if (customEnding.trim().startsWith('{') && customEnding.trim().endsWith('}')) {
                const parsed = JSON.parse(customEnding);
                if (parsed.scene) {
                  return parsed.scene;
                } else if (parsed.current_scene) {
                  return parsed.current_scene;
                } else if (typeof parsed === 'string') {
                  return parsed;
                }
              }
              // 如果不是JSON或无法解析，直接返回原文本
              return customEnding;
            } catch (error) {
              console.warn('清理AI结局响应时出错，使用原始文本:', error);
              return customEnding;
            }
          })();
          
          console.log('🎬 结局内容处理:', {
            original: customEnding.substring(0, 100) + '...',
            cleaned: cleanedEnding.substring(0, 100) + '...',
            isJson: customEnding.trim().startsWith('{')
          });
          
          // 更新故事目标
          const updatedGoals = currentStory.story_goals ? updateStoryGoals(
            currentStory.story_goals, 
            choiceText, 
            currentStory.chapter
          ) : [];
          
          // 设置故事完成状态，使用清理后的结局
          const finalStory = {
            ...currentStory,
            choices_made: [...(currentStory.choices_made || []), choiceText],
            story_goals: updatedGoals,
            is_completed: true,
            completion_type: endingType === 'satisfying' ? 'success' as const : 
                            endingType === 'dramatic' ? 'cliffhanger' as const : 'neutral' as const,
            current_scene: cleanedEnding,
            needs_choice: false,
            chapter: currentStory.chapter + 1, // 结局算作新的一章
            story_progress: 100, // 故事完成时进度设置为100%
  
          };
          
          setCurrentStory(finalStory);
          setIsProcessingChoice(false);
          
          // 🎯 故事完成后自动保存进度
          setTimeout(() => {
            performAutoSave();
            console.log('📁 故事完成，已自动保存最终进度');
          }, 500);
          
          console.log('✅ AI定制结局生成完成');
          return;
          
        } catch (error) {
          console.error('❌ 生成定制结局失败:', error);
          setAiError(error instanceof Error ? error.message : '生成结局时发生未知错误');
          
          // 根据选择的结局类型生成不同的备用结局
          let fallbackEnding = '';
          const protagonist = currentStory.characters[0]?.name || '主角';
          if (choiceText.includes('圆满') || choiceText.includes('satisfying')) {
            fallbackEnding = `最终，所有的努力都得到了回报。${protagonist}和伙伴们成功地克服了所有挑战，他们的坚持不懈为这段冒险画下了完美的句号。每个人都找到了自己的归宿，友谊得到了升华，这是一个值得纪念的圆满结局。`;
          } else if (choiceText.includes('开放') || choiceText.includes('open')) {
            fallbackEnding = `当这段旅程告一段落时，${protagonist}望向远方，心中满怀期待。虽然当前的冒险结束了，但更大的世界还在等待探索。这次经历只是漫长人生中的一个篇章，未来还有无数可能性等待着他们去发现...`;
          } else if (choiceText.includes('戏剧') || choiceText.includes('dramatic')) {
            fallbackEnding = `在故事的最后关头，${protagonist}做出了一个改变一切的重要决定。这个选择的后果远比想象中更加深远，为整个故事增添了深刻的内涵。虽然结局出人意料，却又在情理之中，留下了无尽的回味。`;
          } else {
            fallbackEnding = `经历了这段奇妙的旅程，${protagonist}和同伴们都收获了珍贵的经历。虽然故事在这里告一段落，但这些回忆将伴随他们一生。每一个选择，每一次冒险，都成为了他们成长路上重要的里程碑。`;
          }
          
          const finalStory = {
            ...currentStory,
            choices_made: [...(currentStory.choices_made || []), choiceText],
            is_completed: true,
            completion_type: choiceText.includes('圆满') ? 'success' as const : 
                            choiceText.includes('戏剧') ? 'cliffhanger' as const : 'neutral' as const,
            current_scene: fallbackEnding,
            needs_choice: false,
            chapter: currentStory.chapter + 1, // 结局算作新的一章
            story_progress: 100, // 故事完成时进度设置为100%

          };
          
          setCurrentStory(finalStory);
          setIsProcessingChoice(false);
          
          // 🎯 故事完成后自动保存进度  
          setTimeout(() => {
            performAutoSave();
            console.log('📁 故事完成（备用结局），已自动保存最终进度');
          }, 500);
          
          console.log('✅ 使用备用结局完成故事');
          return;
        }
      }

      // 正常的选择处理逻辑
      if (currentModelConfig && currentModelConfig.apiKey) {
        // 配置AI服务
        // 模型配置现在由统一AI服务自动管理
        
        // 构造选择对象
        const selectedChoice = {
          id: choiceId,
          text: choiceText,
          description: '',
          difficulty: 3
        };
        
        // 调用AI生成下一章节 - 带重试机制
        const response = await generateNextChapterWithRetry(
          {
            ...currentStory,
            mood: currentStory.mood || '神秘',
            tension_level: currentStory.tension_level || 5
          },
          selectedChoice,
          currentStory.choices_made
        );
        
        try {
          if (response.success && response.content) {
            // 确保最小显示时间（用户体验）- 与StoryReader的加载动画时间匹配
            const elapsedTime = Date.now() - startTime;
            const minDisplayTime = 1800; // 至少显示1.8秒加载，留出余量
            
            console.log('🎭 StoryManager 确保最小显示时间:', {
              elapsedTime,
              minDisplayTime,
              willWait: elapsedTime < minDisplayTime
            });
            
            if (elapsedTime < minDisplayTime) {
              const waitTime = minDisplayTime - elapsedTime;
              console.log('⏱️ StoryManager 等待:', waitTime + 'ms');
              await new Promise(resolve => setTimeout(resolve, waitTime));
              console.log('✅ StoryManager 等待完成，现在更新故事');
            }
            
            // 更新故事目标状态
            const updatedGoals = updateStoryGoals(currentStory.story_goals, choiceText, currentStory.chapter + 1);
            
            // 处理新角色添加 - 使用content.new_characters
            const processedCharacters = processNewCharacters(
              currentStory?.characters || [],
              response.content?.new_characters
            );

            // 创建更新后的故事状态
            const updatedStory = {
              ...currentStory,
              current_scene: response.content?.scene || '故事继续发展...',
              chapter: currentStory.chapter + 1,
              chapter_title: response.content?.chapter_title || `第${currentStory.chapter + 1}章`,
              choices_made: [...(currentStory.choices_made || []), choiceText],
              characters: processedCharacters,
              mood: response.content?.mood || currentStory.mood || '神秘',
              tension_level: response.content?.tension_level || currentStory.tension_level || 5,
              story_progress: calculateStoryProgress(currentStory.chapter + 1),
              main_goal_status: updateGoalStatus(currentStory.choices_made || [], choiceText),
              story_goals: updatedGoals
            };

            // 正常故事流程 - 不再强制结束
            setNormalStoryFlow(updatedStory, response.content.scene);
          } else {
            // AI返回成功但内容为空的情况
            console.warn('⚠️ AI返回成功但内容为空，使用回退方案');
            await generateSimpleNextScene(choiceText, startTime);
          }
        } catch (retryError) {
          // 所有重试都失败了，使用回退方案
          console.error('❌ 经过3次重试后仍然失败，使用回退方案:', retryError);
          setAiError(retryError instanceof Error ? retryError.message : '章节生成失败，已使用备用方案');
          await generateSimpleNextScene(choiceText, startTime);
        }
      }
    } catch (error) {
      console.error('生成下一章节失败:', error);
      await generateSimpleNextScene(choiceText, startTime);
    } finally {
      setIsProcessingChoice(false);
    }
  };

  // 辅助函数：设置正常故事流程
  const setNormalStoryFlow = (updatedStory: StoryState, scene: string) => {
    const needsChoice = analyzeSceneForChoiceNeed(
      scene,
      updatedStory.chapter,
      updatedStory.mood || '神秘'
    );
    
    const finalStory = {
      ...updatedStory,
      needs_choice: needsChoice.needs,
      scene_type: needsChoice.type
    };
    
    setCurrentStory(finalStory);
    
    // 自动保存进度（每章节完成后）
    if (updatedStory.chapter > (currentStory?.chapter || 0)) {
      setTimeout(() => performAutoSave(), 500); // 延迟执行确保状态已更新
    }
  };

  // 带重试机制的章节生成函数
  const generateNextChapterWithRetry = async (
    storyState: StoryState,
    selectedChoice: { id: number; text: string; description: string; difficulty: number },
    previousChoices: string[],
    maxRetries: number = 3
  ) => {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 第${attempt}次尝试生成章节...`);
        
        const response = await storyAI.generateNextChapter(
          storyState.current_scene,
          selectedChoice.text,
          previousChoices,
          storyState // 传递完整的故事状态
        );
        
        if (response.success && response.content) {
          console.log(`✅ 第${attempt}次尝试成功生成章节`);
          return response;
        } else {
          const error = new Error(response.error || `第${attempt}次尝试失败：AI返回内容不完整`);
          console.warn(`⚠️ 第${attempt}次尝试失败:`, error.message);
          lastError = error;
          
          if (attempt < maxRetries) {
            // 在重试之前等待一小段时间
            const waitTime = attempt * 500; // 0.5s, 1s, 1.5s
            console.log(`⏱️ 等待${waitTime}ms后进行第${attempt + 1}次尝试...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(`第${attempt}次尝试失败: ${error}`);
        console.warn(`❌ 第${attempt}次尝试出现异常:`, err.message);
        lastError = err;
        
        if (attempt < maxRetries) {
          // 在重试之前等待一小段时间
          const waitTime = attempt * 500;
          console.log(`⏱️ 等待${waitTime}ms后进行第${attempt + 1}次尝试...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    // 所有重试都失败了
    console.error(`❌ 经过${maxRetries}次尝试后仍然失败，最后错误:`, lastError?.message);
    throw lastError || new Error(`章节生成失败：经过${maxRetries}次尝试后仍未成功`);
  };

  // 处理新角色添加的专用函数
  const processNewCharacters = (
    existingCharacters: Array<{ name: string; role: string; traits: string; appearance?: string; backstory?: string }>,
    newCharacters?: Array<{ name: string; role: string; traits: string; appearance?: string; backstory?: string }>
  ): Array<{ name: string; role: string; traits: string; appearance?: string; backstory?: string }> => {
    if (!newCharacters || !Array.isArray(newCharacters) || newCharacters.length === 0) {
      return existingCharacters;
    }

    // 过滤重复角色（基于姓名）- 添加安全检查
    const existingNames = new Set(
      existingCharacters
        .filter(char => char && char.name && typeof char.name === 'string')
        .map(char => char.name.toLowerCase())
    );
    
    const validNewCharacters = newCharacters.filter(newChar => {
      // 检查必要字段和类型安全
      if (!newChar || 
          !newChar.name || typeof newChar.name !== 'string' || newChar.name.trim() === '' ||
          !newChar.role || typeof newChar.role !== 'string' || newChar.role.trim() === '' ||
          !newChar.traits || typeof newChar.traits !== 'string' || newChar.traits.trim() === '') {
        console.warn('⚠️ 发现不完整的新角色，已跳过:', newChar);
        return false;
      }
      
      // 检查重复名称
      if (existingNames.has(newChar.name.toLowerCase())) {
        console.warn(`⚠️ 角色 "${newChar.name}" 已存在，已跳过`);
        return false;
      }
      
      return true;
    });

    if (validNewCharacters.length > 0) {
      console.log(`🎭 添加了 ${validNewCharacters.length} 个新角色:`, 
        validNewCharacters.map(char => `${char.name}(${char.role})`).join('、')
      );
    }

    return [...existingCharacters, ...validNewCharacters];
  };

  // 计算故事进度
  const calculateStoryProgress = (chapter: number): number => {
    // 调整进度计算，让进度更符合实际发展
    // 使用更平滑的曲线，让第15章约为90%
    const baseProgress = Math.min((chapter / 15) * 90, 90); // 15章达到90%基础进度
    const totalProgress = Math.min(baseProgress + 10, 100); // 预留10%给结局
    
    console.log('📊 计算故事进度:', {
      chapter,
      baseProgress: Math.round(baseProgress),
      totalProgress: Math.round(totalProgress)
    });
    
    return Math.round(totalProgress);
  };

  // 更新故事目标状态
  const updateStoryGoals = (currentGoals: StoryState['story_goals'], choiceText: string, chapter: number): StoryState['story_goals'] => {
    if (!currentGoals) return [];
    
    return currentGoals.map(goal => {
      if (goal.status === 'completed' || goal.status === 'failed') {
        return goal; // 已完成或失败的目标不再变化
      }
      
      const goalKeywords = goal.description.toLowerCase().split(/[\s,，。！？、]+/);
      const choiceKeywords = choiceText.toLowerCase();
      
      // 检查选择是否与目标相关
      const isRelevant = goalKeywords.some(keyword => 
        keyword.length > 1 && choiceKeywords.includes(keyword)
      ) || choiceKeywords.includes(goal.description.toLowerCase());
      
      if (isRelevant) {
        // 根据选择内容判断目标进展
        if (choiceKeywords.includes('完成') || choiceKeywords.includes('成功') || 
            choiceKeywords.includes('达成') || choiceKeywords.includes('实现')) {
          return {
            ...goal,
            status: 'completed' as const,
            completion_chapter: chapter
          };
        } else if (choiceKeywords.includes('失败') || choiceKeywords.includes('放弃') || 
                   choiceKeywords.includes('无法')) {
          return {
            ...goal,
            status: 'failed' as const,
            completion_chapter: chapter
          };
        } else if (goal.status === 'pending') {
          return {
            ...goal,
            status: 'in_progress' as const
          };
        }
      }
      
      return goal;
    });
  };

  // 基于目标的故事结束检查
  const checkStoryEndingByGoals = (storyGoals: StoryState['story_goals'], chapter: number): { shouldEnd: boolean; reason: string; type: 'success' | 'failure' | 'neutral' } => {
    if (!storyGoals || storyGoals.length === 0) {
      // 没有目标的情况下，使用更合理的章节限制
      if (chapter >= 12) {
        return { shouldEnd: true, reason: '故事已进行足够长度，可以寻找结局', type: 'neutral' };
      }
      return { shouldEnd: false, reason: '', type: 'neutral' };
    }
    
    const mainGoals = storyGoals.filter(goal => goal.type === 'main');
    const subGoals = storyGoals.filter(goal => goal.type === 'sub');
    const completedMainGoals = mainGoals.filter(goal => goal.status === 'completed');
    const failedMainGoals = mainGoals.filter(goal => goal.status === 'failed');
    const completedSubGoals = subGoals.filter(goal => goal.status === 'completed');
    
    // 主要目标都完成了 - 完美结局
    if (mainGoals.length > 0 && completedMainGoals.length === mainGoals.length) {
      return { 
        shouldEnd: true, 
        reason: `所有主要目标已完成：${completedMainGoals.map(g => g.description).join('，')}`, 
        type: 'success' 
      };
    }
    
    // 主要目标都失败了 - 悲剧结局
    if (mainGoals.length > 0 && failedMainGoals.length === mainGoals.length) {
      return { 
        shouldEnd: true, 
        reason: `所有主要目标都失败了：${failedMainGoals.map(g => g.description).join('，')}`, 
        type: 'failure' 
      };
    }
    
    // 早期成功检查（6章后）
    if (chapter >= 6) {
      // 大部分主要目标完成
      if (mainGoals.length > 0 && completedMainGoals.length >= Math.ceil(mainGoals.length * 0.7)) {
        return { 
          shouldEnd: true, 
          reason: `大部分主要目标已完成，可以创造成功结局`, 
          type: 'success' 
        };
      }
      
      // 至少一个主要目标完成 + 多个次要目标
      if (completedMainGoals.length >= 1 && completedSubGoals.length >= 3) {
        return { 
          shouldEnd: true, 
          reason: `核心目标已达成，次要任务也颇有建树`, 
          type: 'success' 
        };
      }
    }
    
    // 中期检查（8章后）
    if (chapter >= 8) {
      // 高优先级目标检查
      const highPriorityGoals = storyGoals.filter(goal => goal.priority === 'high');
      const completedHighPriorityGoals = highPriorityGoals.filter(goal => goal.status === 'completed');
      
      if (highPriorityGoals.length > 0 && 
          completedHighPriorityGoals.length >= Math.ceil(highPriorityGoals.length * 0.6)) {
        return { 
          shouldEnd: true, 
          reason: `重要目标基本完成，故事可以收尾`, 
          type: 'success' 
        };
      }
      
      // 平衡结局检查
      const totalGoals = storyGoals.length;
      const completedGoals = storyGoals.filter(goal => goal.status === 'completed').length;
      const failedGoals = storyGoals.filter(goal => goal.status === 'failed').length;
      
      if (completedGoals >= Math.ceil(totalGoals * 0.5) && failedGoals <= Math.ceil(totalGoals * 0.3)) {
        return { 
          shouldEnd: true, 
          reason: `取得了不错的成果，是时候结束这段冒险了`, 
          type: 'success' 
        };
      }
    }
    
    // 延长的故事检查（12章后）
    if (chapter >= 12) {
      // 任何进展都可以结束
      const anyProgress = storyGoals.some(goal => goal.status === 'completed' || goal.status === 'in_progress');
      if (anyProgress) {
        return { 
          shouldEnd: true, 
          reason: `故事已经充分发展，可以寻找自然的结局`, 
          type: 'neutral' 
        };
      }
    }
    
    // 强制结束检查（15章后）
    if (chapter >= 15) {
      return { 
        shouldEnd: true, 
        reason: '故事进行过长，需要寻找结局', 
        type: 'neutral' 
      };
    }
    
    return { shouldEnd: false, reason: '', type: 'neutral' };
  };

  // 更新目标状态（兼容旧版本）
  const updateGoalStatus = (previousChoices: string[], newChoice: string): 'pending' | 'in_progress' | 'completed' | 'failed' => {
    const allChoices = [...previousChoices, newChoice];
    
    // 检查失败关键词
    const failureKeywords = ['放弃', '逃跑', '失败', '死亡', '绝望', '投降'];
    const hasFailure = allChoices.some(choice => 
      failureKeywords.some(keyword => choice.includes(keyword))
    );
    
    if (hasFailure) return 'failed';
    
    // 检查完成关键词
    const completionKeywords = ['完成', '成功', '胜利', '达成', '解决', '实现'];
    const hasCompletion = allChoices.some(choice =>
      completionKeywords.some(keyword => choice.includes(keyword))
    );
    
    if (hasCompletion) return 'completed';
    
    // 检查是否在进行中
    const progressKeywords = ['开始', '尝试', '努力', '前进', '行动', '寻找'];
    const hasProgress = allChoices.some(choice =>
      progressKeywords.some(keyword => choice.includes(keyword))
    );
    
    return hasProgress ? 'in_progress' : 'pending';
  };

  // 分析场景是否需要选择项
  const analyzeSceneForChoiceNeed = (scene: string, chapter: number, mood: string) => {
    const actionKeywords = ['选择', '决定', '行动', '必须', '应该', '现在', '下一步'];
    const reflectionKeywords = ['思考', '回忆', '观察', '感受', '意识到', '发现'];
    const climaxKeywords = ['危险', '紧急', '关键', '决战', '最后', '生死'];
    
    const hasActionWords = actionKeywords.some(word => scene.includes(word));
    const hasReflectionWords = reflectionKeywords.some(word => scene.includes(word));
    const hasClimax = climaxKeywords.some(word => scene.includes(word));
    
    // 每2章必须有一次选择（增加选择频率）
    const forceChoice = chapter % 2 === 0;
    
    // 更宽松的选择需求判断
    const needsChoice = forceChoice || 
                       hasActionWords || 
                       hasClimax || 
                       scene.length > 150 ||  // 降低长度要求
                       chapter <= 3 ||        // 前3章一定要有选择
                       Math.random() > 0.3;   // 70%概率显示选择
    
    let sceneType: 'action' | 'dialogue' | 'exploration' | 'reflection' | 'climax' = 'exploration';
    if (hasClimax) sceneType = 'climax';
    else if (hasActionWords) sceneType = 'action';
    else if (hasReflectionWords) sceneType = 'reflection';
    else if (scene.includes('"') || scene.includes('说')) sceneType = 'dialogue';
    
    console.log('🎯 场景选择需求分析:', {
      chapter,
      scene_length: scene.length,
      hasActionWords,
      hasClimax,
      forceChoice,
      needsChoice,
      sceneType
    });
    
    return { needs: needsChoice, type: sceneType };
  };

  // 简单的下一场景生成（AI失败时使用）
  const generateSimpleNextScene = async (choiceText: string, startTime: number) => {
    const outcomes = [
      `你选择了"${choiceText}"。这个决定带来了意想不到的转折，故事朝着新的方向发展。`,
      `经过深思熟虑，你执行了"${choiceText}"的行动。周围的环境开始发生变化。`,
      `你的选择"${choiceText}"产生了连锁反应，新的挑战和机遇同时出现。`
    ];
    
    const randomOutcome = outcomes[Math.floor(Math.random() * outcomes.length)];
    
    // 确保最小显示时间
    const elapsedTime = Date.now() - startTime;
    const minDisplayTime = 1800;
    
    console.log('🎭 简单场景生成，确保最小显示时间:', {
      elapsedTime,
      minDisplayTime,
      willWait: elapsedTime < minDisplayTime
    });
    
    if (elapsedTime < minDisplayTime) {
      const waitTime = minDisplayTime - elapsedTime;
      console.log('⏱️ 简单场景生成等待:', waitTime + 'ms');
      await new Promise(resolve => setTimeout(resolve, waitTime));
      console.log('✅ 简单场景生成等待完成');
    }
    
    setCurrentStory(prev => {
      if (!prev) return null;
      
      return {
        ...prev,
        current_scene: randomOutcome,
        chapter: prev.chapter + 1,
        choices_made: [...(prev.choices_made || []), choiceText],
        needs_choice: true, // 修复：确保显示选择项
        scene_type: 'exploration'
      };
    });
    
    console.log('✅ 简单场景生成完成，状态将由finally块重置');
  };

  const handleRestart = () => {
    setCurrentStory(null);
    setAiError(null);
    setCurrentContextId(null);
    storyAI.clearConversationHistory();
    
    // 调用回调函数返回主页，开启新冒险
    if (onReturnToHome) {
      onReturnToHome();
    }
  };

  const handleReturnHome = () => {
    setCurrentStory(null);
    setAiError(null);
    setCurrentContextId(null);
    storyAI.clearConversationHistory();
    
    // 如果有回调函数，调用它返回主页
    if (onReturnToHome) {
      onReturnToHome();
    }
  };

  // 保存故事进度
  const handleSaveStory = async (title?: string, currentChoices?: Choice[]) => {
    if (!currentStory || !currentModelConfig) {
      console.warn('无法保存：缺少故事状态或模型配置');
      return;
    }

    try {
      // 获取对话历史和摘要状态
      const conversationHistory = storyAI.getConversationHistory().map(msg => ({
        ...msg,
        timestamp: new Date(),
        chapter: currentStory.chapter
      })) as ConversationMessage[];

      const summaryState = storyAI.getSummaryState();

      // 使用新的统一存档系统
      const contextId = saveStoryProgress(
        currentStory,
        conversationHistory,
        currentModelConfig,
        { 
          title,
          createSnapshot: false, // 更新主存档，不创建快照
          summaryState, // 包含摘要状态
          currentChoices // 包含当前选项
        }
      );

      setCurrentContextId(contextId);
      setHasSavedProgress(true); // 更新存档状态
      console.log('📁 故事进度已保存到主存档，ID:', contextId);
      console.log('💾 摘要状态已保存:', summaryState);
      
    } catch (error) {
      console.error('保存故事失败:', error);
      setAiError(error instanceof Error ? error.message : '保存失败');
      throw error; // 重新抛出错误，让StoryReader能够捕获
    }
  };

  // 加载故事进度
  const handleLoadStory = async (contextId: string) => {
    console.log(`🔍 开始加载故事，contextId: ${contextId}`);
    
    try {
      setIsLoading(true);
      
      // 先检查存档是否存在
      const allContexts = contextManager.getSavedContexts();
      console.log(`📋 当前所有存档:`, Object.keys(allContexts));
      console.log(`🎯 目标存档ID: ${contextId}`);
      console.log(`✅ 存档是否存在: ${contextId in allContexts}`);
      
      // 添加详细的存档数据检查
      if (contextId in allContexts) {
        const targetContext = allContexts[contextId];
        console.log(`📊 目标存档详情:`, {
          id: targetContext.id,
          title: targetContext.title,
          saveTime: targetContext.saveTime,
          isAutoSave: targetContext.isAutoSave,
          hasStoryState: !!targetContext.storyState,
          storyId: targetContext.storyState?.story_id,
          chapter: targetContext.storyState?.chapter
        });
      } else {
        // 如果指定ID不存在，检查是否有相似的ID
        const similarIds = Object.keys(allContexts).filter(id => 
          id.includes(contextId.replace('auto_', '')) || 
          contextId.includes(id.replace('auto_', ''))
        );
        console.log(`🔍 相似的存档ID:`, similarIds);
        
        // 检查localStorage原始数据
        const rawData = localStorage.getItem('narrative-ai-saved-contexts');
        console.log(`💾 localStorage原始数据长度:`, rawData?.length || 0);
        if (rawData) {
          try {
            const parsedRaw = JSON.parse(rawData);
            console.log(`📦 原始存档键列表:`, Object.keys(parsedRaw));
          } catch (e) {
            console.error(`❌ 解析localStorage数据失败:`, e);
          }
        }
      }
      
      const savedContext = contextManager.loadStoryContext(contextId);
      
      if (!savedContext) {
        console.error(`❌ loadStoryContext返回null，contextId: ${contextId}`);
        
        // 尝试自动修复：查找最近的自动保存
        const autoSavePattern = contextId.startsWith('auto_') ? contextId : `auto_${contextId}`;
        const manualSavePattern = contextId.replace('auto_', '');
        
        console.log(`🔧 尝试修复，查找模式: auto="${autoSavePattern}", manual="${manualSavePattern}"`);
        
        const fallbackContext = allContexts[autoSavePattern] || allContexts[manualSavePattern];
        if (fallbackContext) {
          console.log(`✅ 找到备用存档，ID: ${fallbackContext.id}`);
          // 使用找到的存档
          setCurrentStory(fallbackContext.storyState);
          setCurrentModelConfig(fallbackContext.modelConfig);
          setCurrentContextId(fallbackContext.id);
          setHasSavedProgress(true);
          // 模型配置现在由统一AI服务自动管理
          storyAI.setConversationHistory(fallbackContext.conversationHistory);
          console.log('✅ 故事进度已通过修复成功加载');
          return;
        }
        
        throw new Error('未找到指定的存档');
      }

      console.log(`📂 成功获取存档数据:`, {
        title: savedContext.title,
        chapter: savedContext.storyState.chapter,
        isAutoSave: savedContext.isAutoSave
      });

      // 恢复故事状态
      setCurrentStory(savedContext.storyState);
      setCurrentModelConfig(savedContext.modelConfig);
      setCurrentContextId(contextId);
      setHasSavedProgress(true); // 设置为已有存档状态

      // 恢复对话历史和摘要状态（模型配置现在由统一AI服务自动管理）
      storyAI.setConversationHistory(savedContext.conversationHistory, savedContext.summaryState);

      console.log('✅ 故事进度已成功加载');
      if (savedContext.summaryState) {
        console.log('✅ 摘要状态已恢复:', savedContext.summaryState);
      }
      
    } catch (error) {
      console.error('❌ 加载故事失败:', error);
      setAiError(error instanceof Error ? error.message : '加载失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 自动保存功能（仅在启用时执行）
  const performAutoSave = () => {
    if (!currentStory || !currentModelConfig || !autoSaveEnabled) return;

    try {
      const conversationHistory = storyAI.getConversationHistory().map(msg => ({
        ...msg,
        timestamp: new Date(),
        chapter: currentStory.chapter
      })) as ConversationMessage[];

      // 获取摘要状态
      const summaryState = storyAI.getSummaryState();

      // 更新自动保存以包含摘要状态和当前选项
      const contextId = contextManager.autoSave(currentStory, conversationHistory, currentModelConfig, summaryState, currentChoices);
      if (contextId) {
        setCurrentContextId(contextId);
      }
      
      console.log('🔄 自动保存完成，包含摘要状态');
      setHasSavedProgress(true); // 更新存档状态
    } catch (error) {
      console.error('自动保存失败:', error);
    }
  };

  // 切换自动保存状态
  const handleToggleAutoSave = (enabled: boolean) => {
    setAutoSaveEnabled(enabled);
    console.log(`🔄 自动保存已${enabled ? '启用' : '禁用'}`);
  };

  // 检查是否有存档 - 适配统一存档系统
  const checkHasSavedProgress = () => {
    if (!currentStory) {
      setHasSavedProgress(false);
      return;
    }
    
    const savedContexts = contextManager.getSavedContexts();
    // 检查是否有该故事的主存档
    const primarySaveId = `story_${currentStory.story_id}`;
    const hasPrimarySave = savedContexts[primarySaveId];
    
    // 检查是否有当前正在使用的存档
    const hasCurrentSave = currentContextId && savedContexts[currentContextId];
    
    setHasSavedProgress(hasPrimarySave || hasCurrentSave);
    
    // 更新当前上下文ID为主存档ID（如果存在）
    if (hasPrimarySave && (!currentContextId || currentContextId !== primarySaveId)) {
      console.log('🔄 切换到主存档ID:', primarySaveId);
      setCurrentContextId(primarySaveId);
    }
    
    // 如果当前存档被删除了，但不要清除故事状态（保持用户在存档管理界面）
    if (currentContextId && !savedContexts[currentContextId] && !hasPrimarySave) {
      console.log('🔍 当前存档已被删除，但保持故事状态');
      // 在存档管理界面时，不清除contextId以避免界面状态混乱
      if (!showSaveManager) {
      setCurrentContextId('');
      }
    }
  };

  const handleContinueStory = async () => {
    if (!currentStory) return;
    
    console.log('🔄 开始续篇冒险，创建新故事...');
    
    // 清除之前的AI错误状态
    setAiError(null);
    
    try {
      // 生成新的故事ID
      const newStoryId = `${userId || 'guest'}_ST${Date.now()}`;
      
      // 创建续篇故事的初始状态
      const continuedStory: StoryState = {
        story_id: newStoryId,
        current_scene: generateFallbackContinueScene(currentStory), // 直接使用备用场景
        characters: currentStory.characters, // 保留原有角色
        setting: currentStory.setting, // 保留原设定
        chapter: 1, // 重置章节
        choices_made: [`基于前作：${currentStory.story_id}`], // 记录来源
 // 重置成就
        mood: currentStory.mood || '神秘',
        tension_level: 3, // 重置紧张度
        needs_choice: true,
        scene_type: 'exploration',
        is_completed: false,
        story_progress: 0, // 重置进度
        main_goal_status: 'pending',
        story_goals: [
          {
            id: 'continue_main',
            description: '在新的冒险中寻找新的目标',
            type: 'main',
            priority: 'high',
            status: 'pending'
          },
          {
            id: 'continue_growth',
            description: '角色进一步成长和发展',
            type: 'personal',
            priority: 'medium',
            status: 'pending'
          }
        ]
      };
      
      // 更新当前故事状态
      setCurrentStory(continuedStory);
      
      // 清空当前上下文ID，因为这是新故事
      setCurrentContextId('');
      
      // 如果启用了自动保存，保存新故事
      if (autoSaveEnabled && currentModelConfig) {
        setTimeout(() => {
          try {
            autoSaveContext(continuedStory, [], currentModelConfig);
            console.log('🔄 续篇故事自动保存完成');
            setHasSavedProgress(true);
          } catch (error) {
            console.error('续篇自动保存失败:', error);
          }
        }, 1000);
      }
      
      console.log('✅ 续篇冒险已开始，这是一个全新的故事');
      
    } catch (error) {
      console.error('创建续篇失败:', error);
      setAiError('无法创建续篇，请尝试重新开始');
    }
  };
  
  // 生成备用的续篇开场场景
  const generateFallbackContinueScene = (previousStory: StoryState): string => {
    const protagonist = previousStory.characters[0]?.name || '主角';
    const setting = previousStory.setting;
    
    const continueScenes = [
      `经历了之前的冒险后，${protagonist}在${setting}中获得了宝贵的经验。如今，新的挑战悄然而至，一个全新的故事即将展开...`,
      `时光荏苒，${protagonist}已经从之前的冒险中成长了许多。在${setting}的某个角落，新的机遇正在等待着他们的到来...`,
      `之前的冒险虽然结束了，但${protagonist}的故事还在继续。在${setting}中，新的谜团和挑战正等待着被揭开...`,
      `${protagonist}回望过去的冒险，心中充满了成就感。然而，在${setting}的远方，新的传说正在召唤着他们前进...`,
      `休整了一段时间后，${protagonist}再次踏上了冒险的征程。这一次，在${setting}中等待他们的又会是什么样的奇遇呢？`
    ];
    
    return continueScenes[Math.floor(Math.random() * continueScenes.length)];
  };

  // 监听故事完成状态，确保自动保存
  useEffect(() => {
    if (currentStory?.is_completed && !isProcessingChoice && autoSaveEnabled) {
      console.log('📚 检测到故事已完成，触发自动保存...');
      
      // 延迟保存确保状态完全更新
      const saveTimer = setTimeout(() => {
        performAutoSave();
        console.log('📁 故事完成，已自动保存最终进度');
      }, 800);
      
      return () => clearTimeout(saveTimer);
    }
  }, [currentStory?.is_completed, isProcessingChoice, autoSaveEnabled]);

  // 组件挂载时和故事变化时检查存档状态
  useEffect(() => {
    // 如果正在显示存档管理器，则跳过存档状态检查，避免删除操作导致的状态混乱
    if (showSaveManager) {
      return;
    }
    checkHasSavedProgress();
  }, [currentStory, currentContextId, showSaveManager]); // 添加showSaveManager依赖

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] py-12">
        <div className="text-center bg-white/80 backdrop-blur-sm p-12 rounded-3xl shadow-lg border border-gray-200/50 max-w-md mx-auto">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl mb-6 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-6"></div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">AI正在创作专属故事</h3>
          <p className="text-gray-600 mb-4">正在生成角色、场景和剧情...</p>
          {currentModelConfig && (
            <div className="text-xs bg-gray-100 text-gray-600 px-3 py-2 rounded-full inline-block mb-2">
              {currentModelConfig.provider} - {currentModelConfig.model}
            </div>
          )}
          {aiError && (
            <div className="text-xs bg-red-50 text-red-600 px-3 py-2 rounded-lg mt-4">
              注意: {aiError}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!currentStory) {
    return <StoryInitializer 
      onInitializeStory={initializeStory} 
      onLoadStory={handleLoadStory}
      onNavigate={onNavigate}
    />;
  }

  // 显示存档管理器
  if (showSaveManager) {
    return (
      <SaveManager
        onLoadStory={handleLoadStory}
        onSaveStory={handleSaveStory}
        currentStoryExists={!!currentStory}
        onClose={() => setShowSaveManager(false)}
      />
    );
  }

  return (
    <StoryReader
      initialStory={currentStory}
      onMakeChoice={handleMakeChoice}
      onRestart={handleRestart}
      onContinue={handleContinueStory}
      modelConfig={currentModelConfig}
      aiError={aiError}
      isProcessingChoice={isProcessingChoice}
      onSaveStory={handleSaveStory}
      onShowSaveManager={() => setShowSaveManager(true)}
      onReturnHome={handleReturnHome}
      autoSaveEnabled={autoSaveEnabled}
      onToggleAutoSave={handleToggleAutoSave}
      hasSavedProgress={hasSavedProgress}
      savedChoices={preloadedContext?.currentChoices}
      onChoicesUpdate={handleChoicesUpdate}
    />
  );
};

export default StoryManager;

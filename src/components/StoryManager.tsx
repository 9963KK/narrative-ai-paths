import React, { useState } from 'react';
import StoryInitializer from './StoryInitializer';
import StoryReader from './StoryReader';
import { ModelConfig } from './model-config/constants';
import { storyAI, StoryGenerationResponse } from '../services/storyAI';

// 导入新的配置类型
import { StoryConfig } from './StoryInitializer';

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
}

const StoryManager: React.FC = () => {
  const [currentStory, setCurrentStory] = useState<StoryState | null>(null);
  const [currentModelConfig, setCurrentModelConfig] = useState<ModelConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const initializeStory = async (config: StoryConfig, modelConfig: ModelConfig, isAdvanced: boolean) => {
    setIsLoading(true);
    setAiError(null);
    setCurrentModelConfig(modelConfig);
    
    try {
      // 配置AI服务并清除对话历史
      storyAI.setModelConfig(modelConfig);
      storyAI.clearConversationHistory(); // 开始新故事时清除历史
      
      // 调用AI生成初始故事
      const response: StoryGenerationResponse = await storyAI.generateInitialStory(config, isAdvanced);
      
      if (response.success && response.content) {
        const initialStory: StoryState = {
          story_id: `ST${Date.now()}`,
          current_scene: response.content.scene,
          characters: response.content.characters || [],
          setting: config.setting,
          chapter: 1,
          choices_made: [],
          achievements: response.content.achievements || [],
          mood: response.content.mood || '神秘',
          tension_level: response.content.tension_level || 5,
          needs_choice: true, // 初始场景总是需要选择
          scene_type: 'exploration'
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
        { name: '主角', role: '主角', traits: '勇敢而充满好奇心' },
        { name: '神秘向导', role: '导师', traits: '智慧且经验丰富' },
        { name: '未知敌人', role: '反派', traits: '强大而危险' }
      ];
      setting = '神秘的世界';
      scene = `基于您的想法"${config.story_idea}"，故事在一个充满可能性的世界中展开。主角的冒险即将开始，每一个决定都可能改变故事的走向。`;
    }
    
    return {
      story_id: `ST${Date.now()}`,
      current_scene: scene,
      characters,
      setting,
      chapter: 1,
      choices_made: [],
      achievements: [],
      mood: '神秘',
      tension_level: 5,
      needs_choice: true,
      scene_type: 'exploration'
    };
  };

  const handleMakeChoice = async (choiceId: number, choiceText: string) => {
    if (!currentStory || !currentModelConfig) return;
    
    console.log(`用户选择了选项 ${choiceId}: ${choiceText}`);
    
    // 添加一个最小延迟，确保用户能看到加载反馈
    const startTime = Date.now();
    
    try {
      // 配置AI服务
      storyAI.setModelConfig(currentModelConfig);
      
      // 构造选择对象
      const selectedChoice = {
        id: choiceId,
        text: choiceText,
        description: '',
        difficulty: 3
      };
      
      // 调用AI生成下一章节
      const response = await storyAI.generateNextChapter(
        {
          ...currentStory,
          mood: currentStory.mood || '神秘',
          tension_level: currentStory.tension_level || 5
        },
        selectedChoice,
        currentStory.choices_made
      );
      
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
          
          // 创建更新后的故事状态
          const updatedStory = {
            ...currentStory,
            current_scene: response.content?.scene || '故事继续发展...',
            chapter: currentStory.chapter + 1,
            choices_made: [...(currentStory.choices_made || []), choiceText],
            characters: (response.content?.new_characters && Array.isArray(response.content.new_characters))
              ? [...(currentStory?.characters || []), ...response.content.new_characters]
              : (currentStory?.characters || []),
            achievements: (response.content?.achievements && Array.isArray(response.content.achievements))
              ? [...(currentStory?.achievements || []), ...response.content.achievements]
              : (currentStory?.achievements || []),
            mood: response.content?.mood || currentStory.mood || '神秘',
            tension_level: response.content?.tension_level || currentStory.tension_level || 5,
            story_progress: calculateStoryProgress(currentStory.chapter + 1, currentStory.achievements?.length || 0),
            main_goal_status: updateGoalStatus(currentStory.choices_made || [], choiceText)
          };

          // 检查故事是否应该结束
          const endingCheck = storyAI.shouldStoryEnd(updatedStory);
          
          console.log('🔚 故事结束检查:', {
            shouldEnd: endingCheck.shouldEnd,
            reason: endingCheck.reason,
            suggestedType: endingCheck.suggestedType,
            chapter: updatedStory.chapter,
            achievements: updatedStory.achievements?.length
          });

          if (endingCheck.shouldEnd) {
            // 生成故事结局
            console.log('🎬 开始生成故事结局');
            try {
              const endingResponse = await storyAI.generateStoryEnding(updatedStory, endingCheck.suggestedType);
              
              if (endingResponse.success && endingResponse.content) {
                setCurrentStory({
                  ...updatedStory,
                  current_scene: endingResponse.content.scene,
                  achievements: [
                    ...(updatedStory.achievements || []),
                    ...(endingResponse.content.achievements || [])
                  ],
                  is_completed: true,
                  completion_type: endingCheck.suggestedType,
                  needs_choice: false,
                  scene_type: 'climax'
                });
              } else {
                // 结局生成失败，继续正常故事流程
                console.warn('结局生成失败，继续故事');
                setNormalStoryFlow(updatedStory, response.content.scene);
              }
            } catch (error) {
              console.error('生成结局时出错:', error);
              setNormalStoryFlow(updatedStory, response.content.scene);
            }
          } else {
            // 正常故事流程
            setNormalStoryFlow(updatedStory, response.content.scene);
          }
        } else {
          // AI失败时的简单处理
          await generateSimpleNextScene(choiceText, startTime);
        }
          } catch (error) {
        console.error('生成下一章节失败:', error);
        await generateSimpleNextScene(choiceText, startTime);
      }
  };

  // 辅助函数：设置正常故事流程
  const setNormalStoryFlow = (updatedStory: StoryState, scene: string) => {
    const needsChoice = analyzeSceneForChoiceNeed(
      scene,
      updatedStory.chapter,
      updatedStory.mood || '神秘'
    );
    
    setCurrentStory({
      ...updatedStory,
      needs_choice: needsChoice.needs,
      scene_type: needsChoice.type
    });
  };

  // 计算故事进度
  const calculateStoryProgress = (chapter: number, achievementCount: number): number => {
    // 基于章节和成就计算进度百分比
    const chapterProgress = Math.min((chapter / 12) * 70, 70); // 章节贡献最多70%
    const achievementProgress = Math.min((achievementCount / 8) * 30, 30); // 成就贡献最多30%
    return Math.min(chapterProgress + achievementProgress, 100);
  };

  // 更新目标状态
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
    
    // 每3章必须有一次选择
    const forceChoice = chapter % 3 === 0;
    
    // 高紧张度或包含行动词汇时需要选择
    const needsChoice = forceChoice || hasActionWords || hasClimax || scene.length > 200;
    
    let sceneType: 'action' | 'dialogue' | 'exploration' | 'reflection' | 'climax' = 'exploration';
    if (hasClimax) sceneType = 'climax';
    else if (hasActionWords) sceneType = 'action';
    else if (hasReflectionWords) sceneType = 'reflection';
    else if (scene.includes('"') || scene.includes('说')) sceneType = 'dialogue';
    
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
        needs_choice: prev.chapter % 2 === 0, // 每2章一次选择
        scene_type: 'exploration'
      };
    });
  };

  const handleRestart = () => {
    setCurrentStory(null);
    setAiError(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-xl text-slate-700">AI正在为您创作专属故事...</p>
          <p className="text-sm text-slate-500 mt-2">正在生成角色、场景和剧情</p>
          {currentModelConfig && (
            <p className="text-xs text-slate-400 mt-1">
              使用模型: {currentModelConfig.provider} - {currentModelConfig.model}
            </p>
          )}
          {aiError && (
            <p className="text-xs text-red-500 mt-2 max-w-md mx-auto">
              注意: {aiError}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!currentStory) {
    return <StoryInitializer onInitializeStory={initializeStory} />;
  }

  return (
    <StoryReader
      initialStory={currentStory}
      onMakeChoice={handleMakeChoice}
      onRestart={handleRestart}
      modelConfig={currentModelConfig}
      aiError={aiError}
    />
  );
};

export default StoryManager;

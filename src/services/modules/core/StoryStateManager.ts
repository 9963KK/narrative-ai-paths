/**
 * StoryStateManager - 故事状态管理核心服务
 * 管理故事的整体状态，包括进度、角色、设定等
 * 基于 @docs/StoryAI-Architecture.md 设计文档
 */

import { userStorage } from '../../userStorage';
import { devError, stateLog } from '@/utils/logger';
import { 
  IStoryStateManager, 
  StoryState, 
  Character,
  StoryGoal 
} from '../types';

export class StoryStateManager implements IStoryStateManager {
  private currentState: StoryState | null = null;

  constructor() {
  }

  // ==================== 状态管理 ====================

  /**
   * 获取当前故事状态
   */
  getState(): StoryState | null {
    return this.currentState ? { ...this.currentState } : null;
  }

  /**
   * 设置故事状态
   */
  setState(state: StoryState): void {
    if (!this.validateState(state)) {
      throw new Error('故事状态验证失败');
    }
    
    this.currentState = { ...state };
  }

  /**
   * 更新故事状态（部分更新）
   */
  updateState(updates: Partial<StoryState>): void {
    if (!this.currentState) {
      throw new Error('尚未设置初始故事状态');
    }

    // 创建更新后的状态
    const updatedState = { ...this.currentState, ...updates };
    
    // 验证更新后的状态
    if (!this.validateState(updatedState)) {
      throw new Error('更新后的故事状态验证失败');
    }

    this.currentState = updatedState;
  }

  // ==================== 持久化 ====================

  /**
   * 保存故事状态到用户存储
   */
  async saveState(userId: string): Promise<void> {
    if (!this.currentState) {
      throw new Error('没有可保存的故事状态');
    }

    try {
      const stateData = {
        storyState: this.currentState,
        savedAt: new Date().toISOString(),
        version: '1.0'
      };

      await userStorage.saveStoryState(userId, stateData);
    } catch (error) {
      devError('保存故事状态失败:', error);
      throw new Error(`保存故事状态失败: ${(error as Error).message}`);
    }
  }

  /**
   * 从用户存储加载故事状态
   */
  async loadState(userId: string): Promise<StoryState | null> {
    try {
      const stateData = await userStorage.loadStoryState(userId);
      
      if (!stateData || !stateData.storyState) {
        stateLog(`📭 用户 ${userId} 没有保存的故事状态`);
        return null;
      }

      const loadedState = stateData.storyState;
      
      // 验证加载的状态
      if (!this.validateState(loadedState)) {
        devError('加载的故事状态验证失败，将忽略');
        return null;
      }

      this.currentState = loadedState;
      
      return { ...loadedState };
    } catch (error) {
      devError('加载故事状态失败:', error);
      throw new Error(`加载故事状态失败: ${(error as Error).message}`);
    }
  }

  // ==================== 验证 ====================

  /**
   * 验证故事状态的完整性和有效性
   */
  validateState(state: StoryState): boolean {
    try {
      // 必需字段检查
      if (!state.story_id || typeof state.story_id !== 'string') {
        devError('故事ID无效');
        return false;
      }

      if (!state.current_scene || typeof state.current_scene !== 'string') {
        devError('当前场景无效');
        return false;
      }

      if (!Array.isArray(state.characters)) {
        devError('角色列表无效');
        return false;
      }

      if (!state.setting || typeof state.setting !== 'string') {
        devError('故事设定无效');
        return false;
      }

      if (typeof state.chapter !== 'number' || state.chapter < 0) {
        devError('章节数无效');
        return false;
      }

      if (!Array.isArray(state.choices_made)) {
        devError('选择历史无效');
        return false;
      }

      // mood 字段在有值时验证类型
      if (state.mood !== undefined && typeof state.mood !== 'string') {
        devError('故事氛围类型无效');
        return false;
      }

      // tension_level 字段在有值时验证范围
      if (state.tension_level !== undefined && (typeof state.tension_level !== 'number' || state.tension_level < 0 || state.tension_level > 100)) {
        devError('紧张度无效（应为0-100）');
        return false;
      }

      // 角色验证
      for (const character of state.characters) {
        if (!this.validateCharacter(character)) {
          return false;
        }
      }

      // 故事目标验证（如果存在）
      if (state.story_goals && Array.isArray(state.story_goals)) {
        for (const goal of state.story_goals) {
          if (!this.validateStoryGoal(goal)) {
            return false;
          }
        }
      }

      // 可选字段验证
      if (state.story_progress !== undefined) {
        if (typeof state.story_progress !== 'number' || state.story_progress < 0 || state.story_progress > 100) {
          devError('故事进度无效（应为0-100）');
          return false;
        }
      }

      if (state.completion_type !== undefined) {
        const validTypes = ['success', 'failure', 'neutral', 'cliffhanger'];
        if (!validTypes.includes(state.completion_type)) {
          devError('完成类型无效');
          return false;
        }
      }

      return true;
    } catch (error) {
      devError('状态验证过程中出错:', error);
      return false;
    }
  }

  /**
   * 重置故事状态
   */
  resetState(): void {
    this.currentState = null;
    stateLog('🔄 故事状态已重置');
  }

  // ==================== 状态查询 ====================

  /**
   * 获取当前章节数
   */
  getCurrentChapter(): number {
    return this.currentState?.chapter || 0;
  }

  /**
   * 获取角色列表
   */
  getCharacters(): Character[] {
    return this.currentState?.characters ? [...this.currentState.characters] : [];
  }

  /**
   * 获取故事进度
   */
  getStoryProgress(): number {
    return this.currentState?.story_progress || 0;
  }

  /**
   * 获取特定角色
   */
  getCharacterByName(name: string): Character | null {
    if (!this.currentState || !this.currentState.characters) {
      return null;
    }

    return this.currentState.characters.find(char => char.name === name) || null;
  }

  /**
   * 获取故事目标列表
   */
  getStoryGoals(): StoryGoal[] {
    return this.currentState?.story_goals ? [...this.currentState.story_goals] : [];
  }

  /**
   * 获取主要目标
   */
  getMainGoal(): StoryGoal | null {
    const goals = this.getStoryGoals();
    return goals.find(goal => goal.type === 'main') || null;
  }

  /**
   * 检查故事是否完成
   */
  isStoryCompleted(): boolean {
    return this.currentState?.is_completed === true;
  }

  /**
   * 获取选择历史
   */
  getChoiceHistory(): string[] {
    return this.currentState?.choices_made ? [...this.currentState.choices_made] : [];
  }

  // ==================== 高级状态操作 ====================

  /**
   * 添加新角色
   */
  addCharacter(character: Character): void {
    if (!this.validateCharacter(character)) {
      throw new Error('角色数据验证失败');
    }

    if (!this.currentState) {
      throw new Error('尚未设置故事状态');
    }

    // 检查角色是否已存在
    const existingChar = this.getCharacterByName(character.name);
    if (existingChar) {
      devError(`角色 ${character.name} 已存在，将更新信息`);
      this.updateCharacter(character.name, character);
      return;
    }

    this.currentState.characters.push({ ...character });
    stateLog(`✨ 新角色已添加: ${character.name}`);
  }

  /**
   * 更新角色信息
   */
  updateCharacter(characterName: string, updates: Partial<Character>): void {
    if (!this.currentState || !this.currentState.characters) {
      throw new Error('尚未设置故事状态');
    }

    const charIndex = this.currentState.characters.findIndex(char => char.name === characterName);
    if (charIndex === -1) {
      throw new Error(`角色 ${characterName} 不存在`);
    }

    const updatedCharacter = { ...this.currentState.characters[charIndex], ...updates };
    
    if (!this.validateCharacter(updatedCharacter)) {
      throw new Error('更新后的角色数据验证失败');
    }

    this.currentState.characters[charIndex] = updatedCharacter;
    stateLog(`🔄 角色 ${characterName} 信息已更新`);
  }

  /**
   * 添加选择记录
   */
  addChoice(choice: string): void {
    if (!this.currentState) {
      throw new Error('尚未设置故事状态');
    }

    this.currentState.choices_made.push(choice);
    stateLog(`📝 选择已记录: ${choice}`);
  }

  /**
   * 更新故事目标状态
   */
  updateStoryGoal(goalId: string, updates: Partial<StoryGoal>): void {
    if (!this.currentState || !this.currentState.story_goals) {
      return;
    }

    const goalIndex = this.currentState.story_goals.findIndex(goal => goal.id === goalId);
    if (goalIndex === -1) {
      devError(`目标 ${goalId} 不存在`);
      return;
    }

    const updatedGoal = { ...this.currentState.story_goals[goalIndex], ...updates };
    
    if (!this.validateStoryGoal(updatedGoal)) {
      throw new Error('更新后的目标数据验证失败');
    }

    this.currentState.story_goals[goalIndex] = updatedGoal;
    stateLog(`🎯 目标 ${goalId} 已更新: ${updatedGoal.status}`);
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 验证角色数据
   */
  private validateCharacter(character: Character): boolean {
    return !!(
      character.name && typeof character.name === 'string' &&
      character.role && typeof character.role === 'string' &&
      character.traits && typeof character.traits === 'string'
    );
  }

  /**
   * 验证故事目标数据
   */
  private validateStoryGoal(goal: StoryGoal): boolean {
    const validTypes = ['main', 'sub', 'personal', 'relationship'];
    const validPriorities = ['high', 'medium', 'low'];
    const validStatuses = ['pending', 'in_progress', 'completed', 'failed'];

    return !!(
      goal.id && typeof goal.id === 'string' &&
      goal.description && typeof goal.description === 'string' &&
      validTypes.includes(goal.type) &&
      validPriorities.includes(goal.priority) &&
      validStatuses.includes(goal.status)
    );
  }
}

// 导出单例实例
export const storyStateManager = new StoryStateManager();
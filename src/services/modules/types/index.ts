/**
 * StoryAI 模块化架构 - 通用接口定义
 * 基于 @docs/StoryAI-Architecture.md 设计文档
 */

import { ModelConfig } from '@/components/model-config/constants';

// ==================== 基础接口 ====================

// 基础响应接口
export interface BaseResponse {
  success: boolean;
  error?: string;
  timestamp: string;
}

// AI响应接口
export interface AIResponse extends BaseResponse {
  choices?: Array<{
    message: {
      content: string;
      role: string;
    };
  }>;
  usage?: {
    total_tokens: number;
    prompt_tokens: number;
    completion_tokens: number;
  };
}

// 模块配置接口
export interface ModuleConfig {
  enabled: boolean;
  priority: number;
  options: Record<string, any>;
}

// 模块状态接口
export interface ModuleState {
  initialized: boolean;
  lastUpdate: string;
  errorCount: number;
  performance: {
    averageResponseTime: number;
    successRate: number;
  };
}

// ==================== 故事相关接口 ====================

// 角色接口
export interface Character {
  name: string;
  role: string;
  traits: string;
  appearance?: string;
  backstory?: string;
}

// 故事目标接口
export interface StoryGoal {
  id: string;
  description: string;
  type: 'main' | 'sub' | 'personal' | 'relationship';
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  completion_chapter?: number;
}

// 故事状态接口
export interface StoryState {
  story_id: string;
  current_scene: string;
  characters: Character[];
  setting: string;
  chapter: number;
  chapter_title?: string;
  choices_made: string[];
  mood: string;
  tension_level: number;
  is_completed?: boolean;
  completion_type?: 'success' | 'failure' | 'neutral' | 'cliffhanger';
  story_progress?: number;
  main_goal_status?: 'pending' | 'in_progress' | 'completed' | 'failed';
  story_goals?: StoryGoal[];
}

// 选择项接口
export interface Choice {
  id: number;
  text: string;
  description: string;
  consequences: string;
  difficulty: number;
}

// 故事生成响应接口
export interface StoryGenerationResponse {
  success: boolean;
  content?: {
    scene: string;
    choices?: Choice[]; // 改为可选，因为选择项由专门的模块生成
    characters?: Character[];
    new_characters?: Character[];
    chapter_title?: string;
    mood?: string;
    tension_level?: number;
    story_length_target?: string;
    preferred_ending_type?: string;
    setting_details?: string;
  };
  error?: string;
}

// 故事配置接口（简化版，兼容现有代码）
export interface StoryConfig {
  genre: string;
  story_idea: string;
  main_goal?: string;
  [key: string]: any; // 允许扩展字段以兼容高级配置
}

// ==================== 对话和摘要接口 ====================

// 对话历史接口
export interface ConversationHistory {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: string;
  tokens?: number;
}

// 摘要数据接口
export interface SummaryData {
  plot_developments: string[];
  character_changes: Array<{name: string, change: string}>;
  key_decisions: Array<{decision: string, consequence: string}>;
  atmosphere: {
    mood: string;
    tension_level: number;
  };
  important_clues: string[];
  timestamp: string;
  summary_version: number;
}

// ==================== 核心模块接口 ====================

// AI模型服务接口
export interface IAIModelService {
  // 核心AI调用方法
  callAI(prompt: string, systemPrompt?: string, useHistory?: boolean): Promise<AIResponse>;
  
  // 配置管理
  setModelConfig(config: ModelConfig): void;
  getModelConfig(): ModelConfig | null;
  
  // Token管理
  estimateTokens(text: string): number;
  getRemainingTokens(): number;
  
  // 状态管理
  getState(): ModuleState;
  resetState(): void;
}

// 故事状态管理器接口
export interface IStoryStateManager {
  // 状态管理
  getState(): StoryState | null;
  setState(state: StoryState): void;
  updateState(updates: Partial<StoryState>): void;
  
  // 持久化
  saveState(userId: string): Promise<void>;
  loadState(userId: string): Promise<StoryState | null>;
  
  // 验证
  validateState(state: StoryState): boolean;
  resetState(): void;
  
  // 状态查询
  getCurrentChapter(): number;
  getCharacters(): Character[];
  getStoryProgress(): number;
}

// ==================== 功能模块接口 ====================

// 故事初始化器接口
export interface IStoryInitializer {
  // 故事生成
  generateInitialStory(config: StoryConfig): Promise<StoryGenerationResponse>;
  generateStoryOutlines(config: StoryConfig): Promise<string[]>;
  
  // 角色创建
  createInitialCharacters(config: StoryConfig): Promise<Character[]>;
  
  // 设定建立
  establishSetting(config: StoryConfig): Promise<string>;
}

// 内容生成器接口
export interface IContentGenerator {
  // 内容生成
  generateNextChapter(state: StoryState, choice?: string): Promise<StoryGenerationResponse>;
  generateSceneDescription(context: string): Promise<string>;
  generateDialogue(characters: Character[], context: string): Promise<string>;
  
  // 情节控制
  advancePlot(state: StoryState): Promise<string>;
  buildTension(currentLevel: number, target: number): Promise<string>;
}

// 选择生成器接口
export interface IChoiceGenerator {
  // 选择生成
  generateChoices(state: StoryState, context: string): Promise<Choice[]>;
  
  // 选择优化
  determineChoiceCount(state: StoryState): number;
  evaluateChoiceDifficulty(choice: Choice, state: StoryState): number;
  
  // 后果预测
  predictConsequences(choice: Choice, state: StoryState): Promise<string>;
}

// 内容解析器接口
export interface IContentParser {
  // 解析方法
  parseStoryResponse(response: string): StoryGenerationResponse | null;
  parseChoices(response: string): Choice[] | null;
  parseCharacters(response: string): Character[] | null;
  
  // 验证方法
  validateStoryContent(content: any): boolean;
  validateChoiceFormat(choices: any[]): boolean;
  
  // 修复方法
  repairMalformedJSON(jsonString: string): string;
  sanitizeContent(content: string): string;
}

// 结局生成器接口
export interface IEndingGenerator {
  // 结束判断
  shouldStoryEnd(state: StoryState): boolean;
  determineEndingType(state: StoryState): 'success' | 'failure' | 'neutral' | 'cliffhanger';
  
  // 结局生成
  generateStoryEnding(state: StoryState): Promise<string>;
  generateCustomEnding(state: StoryState, endingType: string): Promise<string>;
  
  // 结局评估
  evaluateStoryCompletion(state: StoryState): number; // 0-100 完成度
}

// 摘要管理器接口
export interface ISummaryManager {
  // 摘要生成
  generateSummary(history: ConversationHistory[]): Promise<string>;
  mergeSummaries(oldSummary: string, newSummary: string): string;
  
  // 摘要管理
  shouldTriggerSummary(conversationCount: number): boolean;
  compressHistory(history: ConversationHistory[]): string;
  
  // 摘要解析
  parseSummaryJSON(summaryText: string): SummaryData | null;
  formatSummaryDisplay(summary: string): void;
}

// 会话管理器接口
export interface IConversationManager {
  // 历史管理
  addToHistory(role: 'system' | 'user' | 'assistant', content: string): void;
  getHistory(): ConversationHistory[];
  clearHistory(): void;
  
  // 上下文管理
  buildContext(includeHistory: boolean): string;
  optimizeContextWindow(): void;
  
  // 会话持久化
  saveConversation(userId: string): Promise<void>;
  loadConversation(userId: string): Promise<ConversationHistory[]>;
  
  // 摘要集成
  setSummaryState(summary: string, summaryData?: SummaryData): void;
  getSummaryState(): { summary: string; data?: SummaryData };
}

// 角色开发器接口
export interface ICharacterDeveloper {
  // 角色开发
  developCharacter(character: Character, context: string): Promise<Character>;
  createNewCharacter(requirements: string): Promise<Character>;
  
  // 关系管理
  updateCharacterRelationships(characters: Character[]): Promise<Character[]>;
  trackCharacterArc(character: Character, story: StoryState): Promise<string>;
  
  // 角色验证
  validateCharacter(character: Character): boolean;
  mergeCharacterUpdates(existing: Character, updates: Partial<Character>): Character;
}

// ==================== 文档分析接口 ====================

// 文档分析结果接口
export interface DocumentAnalysisResult {
  success: boolean;
  data?: {
    characters: Character[];
    setting: {
      time: string;
      place: string;
      worldBackground: string;
      atmosphere: string;
    };
    themes: {
      mainThemes: string[];
      deeperMeaning: string;
    };
    plotElements: {
      mainConflict: string;
      keyEvents: string[];
      plotDevices: string[];
      narrativeTechniques: string;
    };
    writingStyle: {
      tone: string;
      narrativePerspective: string;
      genre: string;
    };
    suggestedStorySeeds: Array<{
      title: string;
      premise: string;
      characters: string[];
      setting: string;
    }>;
  };
  error?: string;
}

// 文档分析器接口
export interface IDocumentAnalyzer {
  // 文档分析
  analyzeDocument(content: string, fileName: string): Promise<DocumentAnalysisResult>;
  
  // 文件处理
  readFile(file: File): Promise<string>;
  isFileTypeSupported(file: File): boolean;
  getSupportedFileTypesDescription(): string;
  
  // 内容提取
  extractCharacters(content: string): Promise<Character[]>;
  extractSetting(content: string): Promise<any>;
  extractThemes(content: string): Promise<any>;
  extractPlotElements(content: string): Promise<any>;
  extractWritingStyle(content: string): Promise<any>;
  
  // 种子生成
  generateStorySeeds(analysisResult: DocumentAnalysisResult): Promise<any[]>;
}

// ==================== 工具函数接口 ====================

// 错误处理函数类型
export type ErrorHandler = (error: Error, context: string) => void;

// 重试配置接口
export interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier: number;
}

// 缓存配置接口
export interface CacheConfig {
  ttl: number; // 生存时间（秒）
  maxSize: number; // 最大缓存项数
  enabled: boolean;
}

// 性能监控接口
export interface PerformanceMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  error?: string;
}

// ==================== 导出 ====================

// 默认重试配置
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2
};

// 默认缓存配置
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  ttl: 300, // 5分钟
  maxSize: 100,
  enabled: true
};
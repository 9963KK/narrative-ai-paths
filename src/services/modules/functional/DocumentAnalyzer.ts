/**
 * DocumentAnalyzer - 文档分析器
 * 分析文档内容，提取故事元素和创意灵感
 * 基于 @docs/StoryAI-Architecture.md 设计文档
 */

import { aiModelService } from '../core/AIModelService';
import { contentParser } from './ContentParser';
import { 
  IDocumentAnalyzer, 
  Character,
  DocumentAnalysisResult
} from '../types';

export class DocumentAnalyzer implements IDocumentAnalyzer {

  constructor() {
    console.log('📄 DocumentAnalyzer 初始化完成');
  }

  // ==================== 文档分析 ====================

  /**
   * 分析文档内容
   */
  async analyzeDocument(content: string, fileName: string): Promise<DocumentAnalysisResult> {
    try {
      console.log(`📖 开始分析文档: ${fileName}...`);

      if (!content || content.trim().length === 0) {
        throw new Error('文档内容为空');
      }

      // 清理和预处理内容
      const cleanedContent = this.sanitizeContent(content);
      
      if (cleanedContent.length < 100) {
        throw new Error('文档内容过短，无法进行有效分析');
      }

      const prompt = this.buildDocumentAnalysisPrompt(cleanedContent, fileName);
      const systemPrompt = this.getDocumentAnalysisSystemPrompt();

      const response = await aiModelService.callAI(
        prompt,
        systemPrompt,
        false, // 不使用历史
        true   // 强制JSON输出
      );

      if (!response.success || !response.choices?.[0]?.message?.content) {
        throw new Error('AI文档分析失败');
      }

      const content_str = response.choices[0].message.content;
      
      // 解析分析结果
      const analysisData = this.parseAnalysisResult(content_str);
      
      if (analysisData) {
        console.log(`✅ 文档 ${fileName} 分析成功`);
        return {
          success: true,
          data: analysisData
        };
      } else {
        throw new Error('分析结果解析失败');
      }
    } catch (error) {
      console.error(`❌ 文档 ${fileName} 分析失败:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '文档分析失败'
      };
    }
  }

  // ==================== 文件处理 ====================

  /**
   * 读取文件内容
   */
  async readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          resolve(content);
        } else {
          reject(new Error('文件读取失败'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('文件读取出错'));
      };
      
      // 根据文件类型选择读取方式
      if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        reader.readAsText(file, 'UTF-8');
      } else {
        reader.readAsText(file, 'UTF-8'); // 默认以文本方式读取
      }
    });
  }

  /**
   * 检查文件类型是否支持
   */
  isFileTypeSupported(file: File): boolean {
    const supportedTypes = [
      'text/plain',
      'text/markdown',
      'application/json'
    ];
    
    const supportedExtensions = [
      '.txt', '.md', '.json', '.rtf'
    ];
    
    // 检查MIME类型
    if (supportedTypes.includes(file.type)) {
      return true;
    }
    
    // 检查文件扩展名
    const fileName = file.name.toLowerCase();
    return supportedExtensions.some(ext => fileName.endsWith(ext));
  }

  /**
   * 获取支持的文件类型描述
   */
  getSupportedFileTypesDescription(): string {
    return '支持的文件类型：文本文件(.txt)、Markdown文件(.md)、JSON文件(.json)、RTF文件(.rtf)';
  }

  // ==================== 内容提取 ====================

  /**
   * 提取角色信息
   */
  async extractCharacters(content: string): Promise<Character[]> {
    try {
      console.log('👥 开始提取角色信息...');

      const prompt = this.buildCharacterExtractionPrompt(content);
      const systemPrompt = this.getCharacterExtractionSystemPrompt();

      const response = await aiModelService.callAI(
        prompt,
        systemPrompt,
        false,
        true
      );

      if (!response.success || !response.choices?.[0]?.message?.content) {
        throw new Error('AI角色提取失败');
      }

      const characters = contentParser.parseCharacters(response.choices[0].message.content);
      console.log(`✅ 成功提取 ${characters?.length || 0} 个角色`);
      return characters || [];
    } catch (error) {
      console.error('❌ 角色提取失败:', error);
      return [];
    }
  }

  /**
   * 提取设定信息
   */
  async extractSetting(content: string): Promise<any> {
    try {
      console.log('🌍 开始提取设定信息...');

      const prompt = this.buildSettingExtractionPrompt(content);
      const systemPrompt = this.getSettingExtractionSystemPrompt();

      const response = await aiModelService.callAI(
        prompt,
        systemPrompt,
        false,
        true
      );

      if (!response.success || !response.choices?.[0]?.message?.content) {
        throw new Error('AI设定提取失败');
      }

      const settingData = this.parseSettingData(response.choices[0].message.content);
      console.log('✅ 设定信息提取成功');
      return settingData;
    } catch (error) {
      console.error('❌ 设定提取失败:', error);
      return this.getFallbackSetting();
    }
  }

  /**
   * 提取主题信息
   */
  async extractThemes(content: string): Promise<any> {
    try {
      console.log('🎯 开始提取主题信息...');

      const prompt = this.buildThemeExtractionPrompt(content);
      const systemPrompt = this.getThemeExtractionSystemPrompt();

      const response = await aiModelService.callAI(
        prompt,
        systemPrompt,
        false,
        true
      );

      if (!response.success || !response.choices?.[0]?.message?.content) {
        throw new Error('AI主题提取失败');
      }

      const themeData = this.parseThemeData(response.choices[0].message.content);
      console.log('✅ 主题信息提取成功');
      return themeData;
    } catch (error) {
      console.error('❌ 主题提取失败:', error);
      return this.getFallbackThemes();
    }
  }

  /**
   * 提取情节元素
   */
  async extractPlotElements(content: string): Promise<any> {
    try {
      console.log('📚 开始提取情节元素...');

      const prompt = this.buildPlotExtractionPrompt(content);
      const systemPrompt = this.getPlotExtractionSystemPrompt();

      const response = await aiModelService.callAI(
        prompt,
        systemPrompt,
        false,
        true
      );

      if (!response.success || !response.choices?.[0]?.message?.content) {
        throw new Error('AI情节提取失败');
      }

      const plotData = this.parsePlotData(response.choices[0].message.content);
      console.log('✅ 情节元素提取成功');
      return plotData;
    } catch (error) {
      console.error('❌ 情节提取失败:', error);
      return this.getFallbackPlotElements();
    }
  }

  /**
   * 提取写作风格
   */
  async extractWritingStyle(content: string): Promise<any> {
    try {
      console.log('✍️ 开始提取写作风格...');

      const prompt = this.buildStyleExtractionPrompt(content);
      const systemPrompt = this.getStyleExtractionSystemPrompt();

      const response = await aiModelService.callAI(
        prompt,
        systemPrompt,
        false,
        true
      );

      if (!response.success || !response.choices?.[0]?.message?.content) {
        throw new Error('AI风格提取失败');
      }

      const styleData = this.parseStyleData(response.choices[0].message.content);
      console.log('✅ 写作风格提取成功');
      return styleData;
    } catch (error) {
      console.error('❌ 写作风格提取失败:', error);
      return this.getFallbackWritingStyle();
    }
  }

  // ==================== 种子生成 ====================

  /**
   * 生成故事种子
   */
  async generateStorySeeds(analysisResult: DocumentAnalysisResult): Promise<any[]> {
    try {
      console.log('🌱 开始生成故事种子...');

      if (!analysisResult.success || !analysisResult.data) {
        throw new Error('分析结果无效');
      }

      const prompt = this.buildStorySeedsPrompt(analysisResult.data);
      const systemPrompt = this.getStorySeedsSystemPrompt();

      const response = await aiModelService.callAI(
        prompt,
        systemPrompt,
        false,
        true
      );

      if (!response.success || !response.choices?.[0]?.message?.content) {
        throw new Error('AI故事种子生成失败');
      }

      const seeds = this.parseSeedsData(response.choices[0].message.content);
      console.log(`✅ 成功生成 ${seeds?.length || 0} 个故事种子`);
      return seeds || [];
    } catch (error) {
      console.error('❌ 故事种子生成失败:', error);
      return this.getFallbackStorySeeds();
    }
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 清理文档内容
   */
  private sanitizeContent(content: string): string {
    // 移除多余的空白字符
    let cleaned = content.replace(/\s+/g, ' ').trim();
    
    // 限制内容长度（避免超出token限制）
    if (cleaned.length > 20000) {
      cleaned = cleaned.substring(0, 20000) + '...';
    }
    
    return cleaned;
  }

  /**
   * 构建文档分析提示词
   */
  private buildDocumentAnalysisPrompt(content: string, fileName: string): string {
    return `请对以下文档进行全面分析，提取故事创作相关的要素：

【文档信息】：
文件名：${fileName}
内容长度：${content.length}字符

【文档内容】：
${content}

【分析要求】：
请从以下维度进行深入分析：

1. 角色分析：识别文档中的人物角色，包括姓名、身份、性格特征、外貌描述、背景故事等
2. 设定分析：提取时间、地点、世界观背景、氛围环境等设定元素
3. 主题分析：识别核心主题、深层含义、价值观念、哲学思考等
4. 情节分析：提取主要冲突、关键事件、情节装置、叙事技巧等
5. 风格分析：分析文体风格、叙事视角、语言特色、体裁类型等
6. 创意种子：基于分析结果，生成3-5个可用于故事创作的创意种子

【输出格式】：
请以JSON格式返回分析结果，包含以下结构：
{
  "characters": [角色数组],
  "setting": {设定对象},
  "themes": {主题对象},
  "plotElements": {情节对象},
  "writingStyle": {风格对象},
  "suggestedStorySeeds": [种子数组]
}`;
  }

  /**
   * 构建角色提取提示词
   */
  private buildCharacterExtractionPrompt(content: string): string {
    return `从以下文档中提取角色信息：

内容：${content.substring(0, 3000)}...

请识别文档中的角色，包括：
- 主要角色和次要角色
- 角色的姓名、身份/职业
- 性格特征和人物特点
- 外貌描述（如有）
- 背景故事（如有）

请以JSON数组格式返回角色信息。`;
  }

  /**
   * 获取文档分析系统提示词
   */
  private getDocumentAnalysisSystemPrompt(): string {
    return `你是一个专业的文学分析和故事创作专家。能够从任何文档中提取有价值的创作元素。

分析原则：
1. 深度挖掘文档中的隐含信息和创作价值
2. 识别可用于故事创作的各种元素
3. 提供具体而实用的分析结果
4. 保持客观中立的分析态度
5. 必须返回有效的JSON格式

分析技巧：
- 从字里行间捕捉人物性格和关系
- 识别环境描写中的氛围和情感
- 发现文本中的冲突和张力点
- 理解作者的写作意图和风格特色
- 挖掘可延展的创意可能性`;
  }

  /**
   * 获取角色提取系统提示词
   */
  private getCharacterExtractionSystemPrompt(): string {
    return `你是角色分析专家，专注于从文本中提取和分析人物角色。

提取原则：
1. 识别文档中所有重要的人物角色
2. 分析角色的基本信息和特征
3. 挖掘角色的深层特质和背景
4. 整理角色信息为结构化数据
5. 必须返回有效的JSON数组格式

角色要素：
- 基本信息：姓名、身份、职业
- 外在特征：外貌、年龄、特殊标识
- 内在特质：性格、价值观、动机
- 关系网络：与其他角色的关系
- 成长轨迹：发展变化和成长空间`;
  }

  // 更多系统提示词方法...
  private getSettingExtractionSystemPrompt(): string {
    return `你是设定分析专家，专注于提取文档中的时空背景和世界观设定。

提取要求：
1. 时间设定：历史背景、时代特征、具体时间
2. 地点设定：地理环境、场所特色、空间氛围
3. 世界观：社会结构、文化背景、规则体系
4. 氛围环境：整体格调、情感基调、视觉风格
5. 必须返回有效的JSON格式`;
  }

  private getThemeExtractionSystemPrompt(): string {
    return `你是主题分析专家，擅长挖掘文档的深层主题和思想内涵。

分析重点：
1. 核心主题：文档表达的主要观点和思想
2. 价值观念：体现的道德观、人生观、世界观
3. 哲学思考：涉及的深层哲学问题
4. 情感内核：传达的情感和情绪
5. 必须返回有效的JSON格式`;
  }

  private getPlotExtractionSystemPrompt(): string {
    return `你是情节分析专家，专注于提取文档中的故事情节和叙事元素。

分析要素：
1. 主要冲突：核心矛盾和对立关系
2. 关键事件：重要情节点和转折
3. 情节装置：推动故事的技巧和手法
4. 叙事结构：故事的组织和发展方式
5. 必须返回有效的JSON格式`;
  }

  private getStyleExtractionSystemPrompt(): string {
    return `你是文体风格专家，专注于分析文档的写作风格和表达特色。

分析维度：
1. 语言风格：用词特点、句式结构、修辞手法
2. 叙事视角：第一人称、第三人称等视角选择
3. 文体类型：小说、散文、诗歌等体裁特征
4. 表达技巧：描写手法、对话特色、节奏控制
5. 必须返回有效的JSON格式`;
  }

  private getStorySeedsSystemPrompt(): string {
    return `你是创意故事专家，基于文档分析结果生成有价值的故事创作种子。

生成原则：
1. 每个种子都应该是完整可行的故事概念
2. 融合分析结果中的多个要素
3. 具有创新性和吸引力
4. 适合互动式故事创作
5. 必须返回有效的JSON数组格式

种子要素：
- 引人入胜的标题
- 清晰的故事前提
- 主要角色设定
- 世界观背景
- 核心冲突或挑战`;
  }

  // 解析方法
  private parseAnalysisResult(content: string): any {
    try {
      // 尝试直接解析JSON
      const parsed = JSON.parse(content);
      
      // 验证必要字段
      if (parsed.characters && parsed.setting && parsed.themes && 
          parsed.plotElements && parsed.writingStyle && parsed.suggestedStorySeeds) {
        return parsed;
      } else {
        throw new Error('缺少必要字段');
      }
    } catch (error) {
      console.warn('JSON解析失败，尝试修复:', error);
      
      // 尝试修复JSON格式
      const repairedContent = contentParser.repairMalformedJSON(content);
      try {
        return JSON.parse(repairedContent);
      } catch (repairError) {
        console.error('JSON修复失败:', repairError);
        return null;
      }
    }
  }

  private parseSettingData(content: string): any {
    try {
      return JSON.parse(content);
    } catch (error) {
      return this.getFallbackSetting();
    }
  }

  private parseThemeData(content: string): any {
    try {
      return JSON.parse(content);
    } catch (error) {
      return this.getFallbackThemes();
    }
  }

  private parsePlotData(content: string): any {
    try {
      return JSON.parse(content);
    } catch (error) {
      return this.getFallbackPlotElements();
    }
  }

  private parseStyleData(content: string): any {
    try {
      return JSON.parse(content);
    } catch (error) {
      return this.getFallbackWritingStyle();
    }
  }

  private parseSeedsData(content: string): any[] {
    try {
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (error) {
      return this.getFallbackStorySeeds();
    }
  }

  // 回退方案
  private getFallbackSetting(): any {
    return {
      time: "现代",
      place: "城市环境",
      worldBackground: "现实世界设定",
      atmosphere: "日常生活氛围"
    };
  }

  private getFallbackThemes(): any {
    return {
      mainThemes: ["成长", "探索", "发现"],
      deeperMeaning: "关于人生旅程和自我发现的思考"
    };
  }

  private getFallbackPlotElements(): any {
    return {
      mainConflict: "内在冲突与外在挑战",
      keyEvents: ["起始事件", "转折点", "高潮", "结局"],
      plotDevices: ["悬念", "伏笔", "对比"],
      narrativeTechniques: "线性叙事结构"
    };
  }

  private getFallbackWritingStyle(): any {
    return {
      tone: "中性客观",
      narrativePerspective: "第三人称",
      genre: "现实主义"
    };
  }

  private getFallbackStorySeeds(): any[] {
    return [
      {
        title: "未知的旅程",
        premise: "一个普通人踏上了意想不到的冒险之路",
        characters: ["主角", "向导", "挑战者"],
        setting: "神秘的世界"
      },
      {
        title: "隐藏的真相",
        premise: "在日常生活中发现了隐藏的秘密",
        characters: ["探索者", "知情人", "守护者"],
        setting: "熟悉又陌生的环境"
      }
    ];
  }

  // 构建其他提取提示词的方法
  private buildSettingExtractionPrompt(content: string): string {
    return `提取以下文档的设定信息：\n\n${content.substring(0, 3000)}...\n\n请分析时间、地点、世界观和氛围设定，以JSON格式返回。`;
  }

  private buildThemeExtractionPrompt(content: string): string {
    return `分析以下文档的主题内容：\n\n${content.substring(0, 3000)}...\n\n请识别核心主题和深层含义，以JSON格式返回。`;
  }

  private buildPlotExtractionPrompt(content: string): string {
    return `提取以下文档的情节元素：\n\n${content.substring(0, 3000)}...\n\n请分析主要冲突、关键事件和叙事技巧，以JSON格式返回。`;
  }

  private buildStyleExtractionPrompt(content: string): string {
    return `分析以下文档的写作风格：\n\n${content.substring(0, 3000)}...\n\n请识别语言特色、叙事视角和文体特征，以JSON格式返回。`;
  }

  private buildStorySeedsPrompt(analysisData: any): string {
    return `基于以下文档分析结果，生成创意故事种子：\n\n${JSON.stringify(analysisData, null, 2)}\n\n请生成3-5个完整的故事创意种子，每个包含标题、前提、角色和设定，以JSON数组格式返回。`;
  }
}

// 导出单例实例
export const documentAnalyzer = new DocumentAnalyzer();
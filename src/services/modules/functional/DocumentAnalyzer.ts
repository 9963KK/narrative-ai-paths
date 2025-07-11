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

  // ==================== 模型配置 ====================

  /**
   * 设置模型配置 (向后兼容方法)
   */
  setModelConfig(config: any): void {
    try {
      aiModelService.setModelConfig(config);
      console.log('📄 DocumentAnalyzer 模型配置已更新');
    } catch (error) {
      console.error('📄 DocumentAnalyzer 模型配置设置失败:', error);
    }
  }

  // ==================== 文档分析 ====================

  /**
   * 分析文档内容 (增强版，包含重试机制)
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

      // 重试机制，最多3次
      let analysisData = null;
      let lastError = null;
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`📄 文档分析尝试 ${attempt}/3`);
          
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
          // 已移除AI分析原始响应调试输出
          
          // 解析分析结果
          const tempResult = this.parseAnalysisResult(content_str);
          
          // 验证角色名称质量
          const hasValidCharacterNames = tempResult.characters && tempResult.characters.length > 0 && 
            tempResult.characters.some((char: any) => {
              const name = char.name?.trim() || '';
              // 检查是否是有效的角色名称（不是泛指词汇）
              const invalidNames = ['主角', '男主', '女主', '主人公', '角色', '人物', '配角', '反派', '男性', '女性', '主要角色', '次要角色'];
              return name.length > 0 && !invalidNames.includes(name);
            });

          if (hasValidCharacterNames || attempt === 3) {
            // 如果角色名称有效，或者已经是最后一次尝试，就使用这个结果
            analysisData = tempResult;
            console.log(`📄 文档分析完成 (尝试${attempt}):`, analysisData);
            break;
          } else {
            console.log(`📄 角色名称提取质量不佳，准备重试 (尝试${attempt})`);
            // 如果是前两次尝试且角色名称质量不佳，继续重试
            continue;
          }
        } catch (error) {
          lastError = error;
          console.error(`📄 文档分析尝试${attempt}失败:`, error);
          
          if (attempt === 3) {
            // 最后一次尝试失败，抛出错误
            throw error;
          }
          // 否则继续下一次尝试
        }
      }
      
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
   * 构建文档分析提示词 (详细版本，移植自旧实现)
   */
  private buildDocumentAnalysisPrompt(content: string, fileName: string): string {
    return `请分析以下文档内容：

文档名称: ${fileName}
文档内容:
${content}

请按照以下JSON格式输出分析结果，特别注意characters数组中的name字段必须是文档中的真实角色姓名：
{
  "characters": [
    {
      "name": "角色的真实姓名（必须是文档中明确提及的具体名字，不能是'主角'、'男主'等泛指）",
      "role": "角色定位（如：主角、反派、配角等）",
      "traits": "性格特点描述",
      "appearance": "外貌描述（如有）",
      "backstory": "背景故事（如有）"
    }
  ],
  "setting": {
    "time": "时代背景",
    "place": "地理位置",
    "worldBackground": "世界观设定",
    "atmosphere": "整体氛围"
  },
  "themes": {
    "mainThemes": ["主题1", "主题2", "主题3"],
    "deeperMeaning": "深层含义"
  },
  "plotElements": {
    "mainConflict": "主要冲突",
    "keyEvents": ["关键事件1", "关键事件2"],
    "plotDevices": ["叙事手法1", "叙事手法2"],
    "narrativeTechniques": "叙事技巧描述"
  },
  "writingStyle": {
    "tone": "整体语调",
    "narrativePerspective": "叙述视角",
    "genre": "文体类型"
  },
  "suggestedStorySeeds": [
    {
      "title": "故事标题",
      "premise": "故事前提",
      "characters": ["主要角色1", "主要角色2"],
      "setting": "故事背景"
    }
  ]
}

请确保输出的是有效的JSON格式，包含所有必需字段。`;
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
   * 获取文档分析系统提示词 (详细版本，移植自旧实现)
   */
  private getDocumentAnalysisSystemPrompt(): string {
    return `你是一个专业的文学分析师，擅长分析小说和故事文本。请仔细分析用户提供的文档内容，特别注意以下要求：

**重要：角色名称提取要求**
- 必须提取文档中明确提及的角色真实姓名，不要使用"主角"、"男主"、"女主"等代称
- 如果文档中没有明确的姓名，可以提取角色的称谓或代号
- 每个角色的name字段必须是具体的名字，而不是泛指词汇

请提取以下信息：
1. 人物分析：识别主要角色的真实姓名、角色定位、性格特点、外貌描述、背景故事
2. 故事背景：分析时代背景、地理位置、世界观设定、整体氛围
3. 主题分析：识别作品的主要主题和深层含义
4. 情节元素：主要冲突、关键事件、叙事手法
5. 写作风格：语调、叙述视角、文体类型
6. 故事种子：基于分析结果，提供3-5个可用于新故事创作的创意种子

请以JSON格式输出分析结果，确保JSON格式完全正确。`;
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

  // 解析方法 (增强版，移植自旧实现)
  private parseAnalysisResult(content: string): any {
    try {
      // 清理响应文本
      let cleanedResponse = content.trim();
      
      // 移除可能的markdown代码块标记
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, '');
      }
      if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/, '');
      }
      if (cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/\s*```$/, '');
      }

      // 增强的JSON清理逻辑
      // 移除BOM和其他不可见字符
      cleanedResponse = cleanedResponse.replace(/^\uFEFF/, ''); // BOM
      cleanedResponse = cleanedResponse.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ''); // 控制字符
      
      // 移除可能的前后缀说明文字
      const jsonStart = cleanedResponse.indexOf('{');
      const jsonEnd = cleanedResponse.lastIndexOf('}');
      
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd + 1);
      }
      
      // 已移除清理后的JSON调试输出

      // 尝试直接解析
      let parsed;
      try {
        parsed = JSON.parse(cleanedResponse);
      } catch (parseError) {
        console.warn('📄 直接解析失败，尝试修复JSON格式:', parseError);
        
        // 尝试修复常见的JSON格式问题
        let fixedJson = cleanedResponse;
        
        // 修复可能的尾逗号问题
        fixedJson = fixedJson.replace(/,(\s*[}\]])/g, '$1');
        
        // 修复可能的引号问题
        fixedJson = fixedJson.replace(/[\u201C\u201D]/g, '"'); // 中文引号
        fixedJson = fixedJson.replace(/[\u2018\u2019]/g, "'"); // 中文单引号
        
        // 修复可能的换行问题
        fixedJson = fixedJson.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
        
        // 再次尝试解析
        try {
          parsed = JSON.parse(fixedJson);
          // JSON修复成功
        } catch (fixError) {
          console.error('📄 JSON修复也失败:', fixError);
          console.error('📄 问题JSON内容:', cleanedResponse);
          
          // 尝试使用更宽松的解析方式
          try {
            // 使用eval (仅在安全环境下)
            parsed = (function() { 
              return eval('(' + cleanedResponse + ')'); 
            })();
            console.log('📄 使用eval解析成功');
          } catch (evalError) {
            console.error('📄 eval解析也失败:', evalError);
            throw new Error(`JSON解析失败: ${parseError.message}`);
          }
        }
      }
      
      // 验证并清理数据结构
      if (!parsed.characters || !Array.isArray(parsed.characters)) {
        parsed.characters = [];
      } else {
        // 验证和清理角色数据
        parsed.characters = parsed.characters.filter((char: any) => {
          // 确保角色有基本信息
          return char && typeof char === 'object' && char.name && char.name.trim().length > 0;
        }).map((char: any) => ({
          name: char.name?.trim() || '未知角色',
          role: char.role?.trim() || '未明确',
          traits: char.traits?.trim() || '待定义',
          appearance: char.appearance?.trim() || '',
          backstory: char.backstory?.trim() || ''
        }));
      }
      
      if (!parsed.setting || typeof parsed.setting !== 'object') {
        parsed.setting = {
          time: '未明确',
          place: '未明确',
          worldBackground: '未明确',
          atmosphere: '未明确'
        };
      }
      
      if (!parsed.themes || typeof parsed.themes !== 'object') {
        parsed.themes = {
          mainThemes: [],
          deeperMeaning: ''
        };
      } else {
        // 验证themes对象结构
        if (!Array.isArray(parsed.themes.mainThemes)) {
          parsed.themes.mainThemes = [];
        }
        if (typeof parsed.themes.deeperMeaning !== 'string') {
          parsed.themes.deeperMeaning = '';
        }
      }
      
      if (!parsed.plotElements || typeof parsed.plotElements !== 'object') {
        parsed.plotElements = {
          mainConflict: '未明确',
          keyEvents: [],
          plotDevices: [],
          narrativeTechniques: '未明确'
        };
      } else {
        // 验证plotElements对象结构
        if (typeof parsed.plotElements.mainConflict !== 'string') {
          parsed.plotElements.mainConflict = '未明确';
        }
        if (!Array.isArray(parsed.plotElements.keyEvents)) {
          parsed.plotElements.keyEvents = [];
        }
        if (!Array.isArray(parsed.plotElements.plotDevices)) {
          parsed.plotElements.plotDevices = [];
        }
        if (typeof parsed.plotElements.narrativeTechniques !== 'string') {
          parsed.plotElements.narrativeTechniques = '未明确';
        }
      }
      
      if (!parsed.writingStyle || typeof parsed.writingStyle !== 'object') {
        parsed.writingStyle = {
          tone: '未明确',
          narrativePerspective: '未明确',
          genre: '未明确'
        };
      }
      
      if (!parsed.suggestedStorySeeds || !Array.isArray(parsed.suggestedStorySeeds)) {
        parsed.suggestedStorySeeds = [];
      }

      // JSON解析和验证完成
      return parsed;
    } catch (error) {
      console.error('📄 JSON解析失败:', error);
      throw new Error('AI返回的分析结果格式错误，无法解析');
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
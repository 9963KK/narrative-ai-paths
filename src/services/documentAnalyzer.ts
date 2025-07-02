import { ModelConfig } from '@/components/model-config/constants';
import { Character } from './modules';

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

// 支持的文件类型
export const SUPPORTED_FILE_TYPES = {
  'text/plain': ['.txt'],
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/markdown': ['.md'],
  'text/rtf': ['.rtf']
};

class DocumentAnalyzer {
  private modelConfig: ModelConfig | null = null;

  setModelConfig(config: ModelConfig) {
    this.modelConfig = config;
  }

  // 分析文档内容
  async analyzeDocument(content: string, fileName: string): Promise<DocumentAnalysisResult> {
    if (!this.modelConfig || !this.modelConfig.apiKey) {
      return {
        success: false,
        error: 'AI模型配置不完整，请先配置模型'
      };
    }

    try {
      console.log('📄 开始分析文档:', fileName);
      
      // 检查内容长度，如果太长则进行分段分析
      const maxLength = 8000; // 控制单次分析的内容长度
      let analysisContent = content;
      
      if (content.length > maxLength) {
        // 提取前半部分和后半部分的关键内容
        const firstPart = content.substring(0, maxLength / 2);
        const lastPart = content.substring(content.length - maxLength / 2);
        analysisContent = `文档开头部分:\n${firstPart}\n\n文档结尾部分:\n${lastPart}`;
        console.log('📄 文档较长，提取关键部分进行分析');
      }

      const systemPrompt = `你是一个专业的文学分析师，擅长分析小说和故事文本。请仔细分析用户提供的文档内容，特别注意以下要求：

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

      const userPrompt = `请分析以下文档内容：

文档名称: ${fileName}
文档内容:
${analysisContent}

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

      // 重试机制，最多3次
      let parsedResult = null;
      let lastError = null;
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`📄 文档分析尝试 ${attempt}/3`);
          
          const response = await this.callAI(userPrompt, systemPrompt);
          
          if (!response.choices || !response.choices[0] || !response.choices[0].message) {
            throw new Error('AI响应格式错误');
          }

          const content_text = response.choices[0].message.content;
          console.log(`📄 AI分析原始响应 (尝试${attempt}):`, content_text);

          // 解析JSON响应
          const tempResult = this.extractAnalysisContent(content_text);
          
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
            parsedResult = tempResult;
            console.log(`📄 文档分析完成 (尝试${attempt}):`, parsedResult);
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
      
      return {
        success: true,
        data: parsedResult
      };

    } catch (error) {
      console.error('📄 文档分析失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '分析过程中发生未知错误'
      };
    }
  }

  // 从AI响应中提取分析内容
  private extractAnalysisContent(response: string): any {
    try {
      // 清理响应文本
      let cleanedResponse = response.trim();
      
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

      // 🔧 增强的JSON清理逻辑
      // 移除BOM和其他不可见字符
      cleanedResponse = cleanedResponse.replace(/^\uFEFF/, ''); // BOM
      cleanedResponse = cleanedResponse.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ''); // 控制字符
      
      // 移除可能的前后缀说明文字
      const jsonStart = cleanedResponse.indexOf('{');
      const jsonEnd = cleanedResponse.lastIndexOf('}');
      
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd + 1);
      }
      
      console.log('📄 清理后的JSON字符串长度:', cleanedResponse.length);
      console.log('📄 清理后的JSON前100字符:', cleanedResponse.substring(0, 100));

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
          console.log('📄 JSON修复成功');
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
      
      // 验证必需字段
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

      console.log('📄 JSON解析和验证完成');
      return parsed;
    } catch (error) {
      console.error('📄 JSON解析失败:', error);
      throw new Error('AI返回的分析结果格式错误，无法解析');
    }
  }

  // 调用AI API
  private async callAI(prompt: string, systemPrompt: string): Promise<any> {
    if (!this.modelConfig || !this.modelConfig.apiKey) {
      throw new Error('AI模型配置不完整');
    }

    const baseUrl = this.getApiBaseUrl();
    const payload = this.createPayload(prompt, systemPrompt);

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.modelConfig.apiKey}`,
        ...(this.modelConfig.provider === 'anthropic' && {
          'anthropic-version': '2023-06-01'
        })
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API请求失败: ${response.status} ${response.statusText}\n${errorText}`);
    }

    return await response.json();
  }

  // 获取API基础URL
  private getApiBaseUrl(): string {
    if (!this.modelConfig) throw new Error('模型配置未设置');

    switch (this.modelConfig.provider) {
      case 'openai':
        return 'https://api.openai.com/v1';
      case 'anthropic':
        return 'https://api.anthropic.com/v1';
      case 'deepseek':
        return 'https://api.deepseek.com/v1';
      case 'moonshot':
        return 'https://api.moonshot.cn/v1';
      case 'zhipu':
        return 'https://open.bigmodel.cn/api/paas/v4';
      case 'openrouter':
        return 'https://openrouter.ai/api/v1';
      default:
        return this.modelConfig.baseUrl || '';
    }
  }

  // 创建请求载荷
  private createPayload(prompt: string, systemPrompt: string) {
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ];

    const basePayload = {
      model: this.modelConfig!.model,
      messages,
      temperature: 0.3, // 使用较低的温度以获得更准确的分析
      max_tokens: this.modelConfig!.maxTokens || 3000
    };

    // 适配不同提供商的格式
    switch (this.modelConfig!.provider) {
      case 'anthropic':
        return {
          ...basePayload,
          max_tokens: basePayload.max_tokens
        };
      case 'zhipu':
        return {
          ...basePayload,
          top_p: 0.7,
          stream: false
        };
      default:
        return basePayload;
    }
  }

  // 读取文件内容
  async readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (!content || content.trim().length === 0) {
          reject(new Error('文件内容为空或无法读取'));
          return;
        }
        resolve(content);
      };
      
      reader.onerror = () => {
        reject(new Error('文件读取失败'));
      };
      
      // 根据文件类型选择读取方式
      if (file.type.startsWith('text/')) {
        reader.readAsText(file, 'UTF-8');
      } else {
        // 对于其他格式，先尝试作为文本读取
        reader.readAsText(file, 'UTF-8');
      }
    });
  }

  // 验证文件类型
  isFileTypeSupported(file: File): boolean {
    const supportedTypes = Object.keys(SUPPORTED_FILE_TYPES);
    const supportedExtensions = Object.values(SUPPORTED_FILE_TYPES).flat();
    
    // 检查MIME类型
    if (supportedTypes.includes(file.type)) {
      return true;
    }
    
    // 检查文件扩展名
    const fileName = file.name.toLowerCase();
    return supportedExtensions.some(ext => fileName.endsWith(ext));
  }

  // 获取支持的文件类型描述
  getSupportedFileTypesDescription(): string {
    return '支持的文件格式：.txt, .md, .rtf, .doc, .docx, .pdf（文本格式）';
  }
}

// 导出单例
export const documentAnalyzer = new DocumentAnalyzer();
export default DocumentAnalyzer; 
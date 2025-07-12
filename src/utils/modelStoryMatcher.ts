/**
 * 模型与故事类型匹配工具
 * 根据故事类型推荐合适的AI模型，无需存储在数据库中
 */

// 前端支持的故事类型定义
export const STORY_GENRES = {
  'sci-fi': { label: '🚀 科幻小说', desc: '探索未来科技与太空' },
  'fantasy': { label: '🐉 奇幻小说', desc: '魔法与神话世界' },
  'mystery': { label: '🔍 推理悬疑', desc: '解谜与侦探故事' },
  'romance': { label: '💕 浪漫爱情', desc: '情感与关系发展' },
  'thriller': { label: '⚡惊悚恐怖', desc: '紧张刺激的冒险' },
  'historical': { label: '🏛️ 历史小说', desc: '重现过去的时代' },
  'slice-of-life': { label: '🌸 日常生活', desc: '温馨的生活片段' },
  'adventure': { label: '🗺️ 冒险探索', desc: '刺激的旅程体验' },
  'contemporary': { label: '🏙️ 现代故事', desc: '当代背景设定' }
} as const;

export type StoryGenre = keyof typeof STORY_GENRES;

// 模型与故事类型的适配关系
export const MODEL_STORY_TAGS: Record<string, StoryGenre[]> = {
  // DeepSeek: 逻辑推理强，适合科幻悬疑
  'deepseek-chat': ['sci-fi', 'mystery', 'contemporary', 'thriller'],
  
  // GPT-3.5: 通用创作，适合日常轻松故事
  'gpt-3.5-turbo': ['slice-of-life', 'contemporary', 'romance', 'adventure'],
  
  // GPT-4: 专业创作，适合复杂故事
  'gpt-4': ['historical', 'fantasy', 'mystery', 'thriller'],
  'gpt-4-turbo': ['adventure', 'fantasy', 'sci-fi', 'historical'],
  
  // Claude系列: 情感描写出色
  'claude-3-haiku': ['slice-of-life', 'romance', 'contemporary'],
  'claude-3-sonnet': ['romance', 'contemporary', 'historical'],
  'claude-3-opus': ['historical', 'fantasy', 'mystery'],
  
  // 中文模型: 传统文化和现代故事
  'glm-4': ['fantasy', 'historical', 'contemporary'],
  'moonshot-v1-8k': ['contemporary', 'romance', 'slice-of-life'],
  'moonshot-v1-32k': ['historical', 'fantasy', 'adventure'],
  
  // 其他模型的默认适配
  'default': ['contemporary', 'adventure', 'fantasy']
};

/**
 * 根据故事类型获取推荐的模型
 * @param genre 故事类型
 * @param availableModels 用户可用的模型列表
 * @returns 推荐的模型列表，按适合度排序
 */
export function getRecommendedModelsForGenre(
  genre: StoryGenre,
  availableModels: Array<{ display_name: string; [key: string]: any }>
): Array<{ model: any; suitabilityScore: number }> {
  const recommendations = availableModels.map(model => {
    const modelName = model.display_name || model.model || '';
    const tags = MODEL_STORY_TAGS[modelName] || MODEL_STORY_TAGS['default'];
    
    // 计算适合度评分
    let score = 0;
    const genreIndex = tags.indexOf(genre);
    
    if (genreIndex === 0) {
      score = 100; // 最适合
    } else if (genreIndex === 1) {
      score = 80;  // 很适合
    } else if (genreIndex === 2) {
      score = 60;  // 较适合
    } else if (genreIndex === 3) {
      score = 40;  // 一般适合
    } else if (tags.includes(genre)) {
      score = 20;  // 基本适合
    } else {
      score = 10;  // 通用适合
    }
    
    return {
      model,
      suitabilityScore: score
    };
  });
  
  // 按适合度排序
  return recommendations.sort((a, b) => b.suitabilityScore - a.suitabilityScore);
}

/**
 * 获取模型适合的故事类型标签（用于前端展示）
 * @param modelName 模型名称
 * @returns 适合的故事类型标签数组
 */
export function getModelStoryTags(modelName: string): Array<{
  genre: StoryGenre;
  label: string;
  suitability: 'perfect' | 'good' | 'fair' | 'basic';
}> {
  const tags = MODEL_STORY_TAGS[modelName] || MODEL_STORY_TAGS['default'];
  
  return tags.map((genre, index) => ({
    genre,
    label: STORY_GENRES[genre].label,
    suitability: index === 0 ? 'perfect' : 
                index === 1 ? 'good' : 
                index === 2 ? 'fair' : 'basic'
  }));
}

/**
 * 获取故事类型的详细信息
 * @param genre 故事类型
 * @returns 故事类型的详细信息
 */
export function getGenreInfo(genre: StoryGenre) {
  return STORY_GENRES[genre];
}

/**
 * 获取所有支持的故事类型
 * @returns 所有故事类型的数组
 */
export function getAllGenres(): Array<{
  value: StoryGenre;
  label: string;
  desc: string;
}> {
  return Object.entries(STORY_GENRES).map(([value, info]) => ({
    value: value as StoryGenre,
    label: info.label,
    desc: info.desc
  }));
}

/**
 * 根据模型名称获取适合度颜色
 * @param suitability 适合度等级
 * @returns CSS类名
 */
export function getSuitabilityColor(suitability: 'perfect' | 'good' | 'fair' | 'basic'): string {
  switch (suitability) {
    case 'perfect': return 'bg-green-100 text-green-800 border-green-200';
    case 'good': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'fair': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'basic': return 'bg-gray-100 text-gray-800 border-gray-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}
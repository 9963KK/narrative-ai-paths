import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  getRecommendedModelsForGenre, 
  getModelStoryTags, 
  getAllGenres, 
  getSuitabilityColor,
  type StoryGenre 
} from '@/utils/modelStoryMatcher';

interface ModelStoryMatcherProps {
  availableModels: Array<{
    display_name: string;
    provider: string;
    description: string;
    performance_level: string;
    [key: string]: any;
  }>;
}

/**
 * 模型与故事类型匹配展示组件
 * 演示前端动态匹配逻辑，无需数据库存储
 */
export const ModelStoryMatcher: React.FC<ModelStoryMatcherProps> = ({ availableModels }) => {
  const [selectedGenre, setSelectedGenre] = useState<StoryGenre | ''>('');
  
  const genres = getAllGenres();
  const recommendations = selectedGenre 
    ? getRecommendedModelsForGenre(selectedGenre, availableModels)
    : [];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🎯 智能模型推荐
          <Badge variant="secondary" className="text-xs">前端动态匹配</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* 故事类型选择 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">选择故事类型</label>
            <Select value={selectedGenre} onValueChange={(value) => setSelectedGenre(value as StoryGenre)}>
              <SelectTrigger>
                <SelectValue placeholder="请选择您要创作的故事类型" />
              </SelectTrigger>
              <SelectContent>
                {genres.map((genre) => (
                  <SelectItem key={genre.value} value={genre.value}>
                    <div className="flex items-center gap-2">
                      <span>{genre.label}</span>
                      <span className="text-xs text-gray-500">- {genre.desc}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 推荐结果 */}
          {selectedGenre && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                为「{genres.find(g => g.value === selectedGenre)?.label}」推荐的AI模型
              </h3>
              
              <div className="grid gap-3">
                {recommendations.map(({ model, suitabilityScore }, index) => (
                  <div 
                    key={model.display_name} 
                    className={`p-4 rounded-lg border-2 transition-all ${
                      index === 0 
                        ? 'border-green-300 bg-green-50' 
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <h4 className="font-semibold">{model.display_name}</h4>
                        <Badge variant="outline" className="text-xs">
                          {model.provider}
                        </Badge>
                        {index === 0 && (
                          <Badge className="bg-green-600 text-white text-xs">
                            ⭐ 最佳推荐
                          </Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          适合度: {suitabilityScore}/100
                        </div>
                        <div className="text-xs text-gray-500">
                          {model.performance_level}
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3">
                      {model.description}
                    </p>
                    
                    {/* 显示该模型适合的所有故事类型 */}
                    <div className="space-y-2">
                      <div className="text-xs text-gray-500">该模型适合的故事类型：</div>
                      <div className="flex flex-wrap gap-1">
                        {getModelStoryTags(model.display_name).map((tag, tagIndex) => (
                          <Badge 
                            key={tagIndex} 
                            variant="outline"
                            className={`text-xs ${getSuitabilityColor(tag.suitability)} ${
                              tag.genre === selectedGenre ? 'ring-2 ring-blue-400' : ''
                            }`}
                          >
                            {tag.label}
                            {tag.genre === selectedGenre && ' 🎯'}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 说明文字 */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-800">
              <h4 className="font-semibold mb-2">💡 智能匹配说明</h4>
              <ul className="space-y-1 text-xs">
                <li>• 故事类型与模型的匹配关系存储在前端代码中</li>
                <li>• 数据库只存储模型的技术特性标签</li>
                <li>• 根据用户选择的故事类型动态推荐最适合的AI模型</li>
                <li>• 推荐算法考虑模型特性、适配度和用户权限</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ModelStoryMatcher;
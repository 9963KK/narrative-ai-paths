import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings } from 'lucide-react';
import ModelConfig from './ModelConfig';
import { ModelConfig as ModelConfigType } from './model-config/constants';

interface StoryConfig {
  genre: string;
  protagonist: string;
  setting: string;
  special_requirements: string;
}

interface StoryInitializerProps {
  onInitializeStory: (config: StoryConfig, modelConfig: ModelConfigType) => void;
}

const StoryInitializer: React.FC<StoryInitializerProps> = ({ onInitializeStory }) => {
  const [config, setConfig] = useState<StoryConfig>({
    genre: '',
    protagonist: '',
    setting: '',
    special_requirements: ''
  });

  const [modelConfig, setModelConfig] = useState<ModelConfigType>({
    provider: 'openai',
    model: 'gpt-4',
    apiKey: '',
    temperature: 0.8,
    maxTokens: 2000
  });

  const [showModelConfig, setShowModelConfig] = useState(false);

  const genres = [
    { value: 'sci-fi', label: '科幻小说' },
    { value: 'fantasy', label: '奇幻小说' },
    { value: 'mystery', label: '推理悬疑' },
    { value: 'romance', label: '浪漫爱情' },
    { value: 'thriller', label: '惊悚恐怖' },
    { value: 'historical', label: '历史小说' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (config.genre && config.protagonist && config.setting && modelConfig.apiKey) {
      onInitializeStory(config, modelConfig);
    }
  };

  if (showModelConfig) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <ModelConfig
          config={modelConfig}
          onConfigChange={setModelConfig}
          onClose={() => setShowModelConfig(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-white shadow-lg border-slate-200">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-slate-800">
            AI小说创作平台
          </CardTitle>
          <p className="text-slate-600 mt-2">定制您的专属互动故事</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-end mb-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModelConfig(true)}
                className="flex items-center gap-2 border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                <Settings className="h-4 w-4" />
                模型配置
              </Button>
            </div>

            {!modelConfig.apiKey && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <p className="text-amber-800 text-sm">
                  ⚠️ 请先配置AI模型才能开始创作故事
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="genre" className="text-slate-700 font-medium">故事类型</Label>
              <Select value={config.genre} onValueChange={(value) => setConfig(prev => ({ ...prev, genre: value }))}>
                <SelectTrigger className="mt-2 bg-white border-slate-300 text-slate-800">
                  <SelectValue placeholder="选择故事类型" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  {genres.map((genre) => (
                    <SelectItem key={genre.value} value={genre.value} className="text-slate-800 hover:bg-blue-50">
                      {genre.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="protagonist" className="text-slate-700 font-medium">主角设定</Label>
              <Input
                id="protagonist"
                value={config.protagonist}
                onChange={(e) => setConfig(prev => ({ ...prev, protagonist: e.target.value }))}
                placeholder="例如：失去记忆的AI工程师"
                className="mt-2 bg-white border-slate-300 text-slate-800 placeholder:text-slate-400"
              />
            </div>

            <div>
              <Label htmlFor="setting" className="text-slate-700 font-medium">故事背景</Label>
              <Input
                id="setting"
                value={config.setting}
                onChange={(e) => setConfig(prev => ({ ...prev, setting: e.target.value }))}
                placeholder="例如：22世纪太空殖民地"
                className="mt-2 bg-white border-slate-300 text-slate-800 placeholder:text-slate-400"
              />
            </div>

            <div>
              <Label htmlFor="requirements" className="text-slate-700 font-medium">特殊要求（可选）</Label>
              <Textarea
                id="requirements"
                value={config.special_requirements}
                onChange={(e) => setConfig(prev => ({ ...prev, special_requirements: e.target.value }))}
                placeholder="例如：包含赛博朋克元素、多重结局、浪漫情节等"
                className="mt-2 bg-white border-slate-300 text-slate-800 placeholder:text-slate-400 resize-none"
                rows={3}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-all duration-300"
              disabled={!config.genre || !config.protagonist || !config.setting || !modelConfig.apiKey}
            >
              开始创作我的故事
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default StoryInitializer;

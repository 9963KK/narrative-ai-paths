
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface StoryConfig {
  genre: string;
  protagonist: string;
  setting: string;
  special_requirements: string;
}

interface StoryInitializerProps {
  onInitializeStory: (config: StoryConfig) => void;
}

const StoryInitializer: React.FC<StoryInitializerProps> = ({ onInitializeStory }) => {
  const [config, setConfig] = useState<StoryConfig>({
    genre: '',
    protagonist: '',
    setting: '',
    special_requirements: ''
  });

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
    if (config.genre && config.protagonist && config.setting) {
      onInitializeStory(config);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-slate-800/90 border-purple-500/30 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            AI小说创作平台
          </CardTitle>
          <p className="text-slate-300 mt-2">定制您的专属互动故事</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="genre" className="text-purple-200 font-medium">故事类型</Label>
              <Select value={config.genre} onValueChange={(value) => setConfig(prev => ({ ...prev, genre: value }))}>
                <SelectTrigger className="mt-2 bg-slate-700 border-purple-500/30 text-white">
                  <SelectValue placeholder="选择故事类型" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-purple-500/30">
                  {genres.map((genre) => (
                    <SelectItem key={genre.value} value={genre.value} className="text-white hover:bg-purple-600/30">
                      {genre.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="protagonist" className="text-purple-200 font-medium">主角设定</Label>
              <Input
                id="protagonist"
                value={config.protagonist}
                onChange={(e) => setConfig(prev => ({ ...prev, protagonist: e.target.value }))}
                placeholder="例如：失去记忆的AI工程师"
                className="mt-2 bg-slate-700 border-purple-500/30 text-white placeholder:text-slate-400"
              />
            </div>

            <div>
              <Label htmlFor="setting" className="text-purple-200 font-medium">故事背景</Label>
              <Input
                id="setting"
                value={config.setting}
                onChange={(e) => setConfig(prev => ({ ...prev, setting: e.target.value }))}
                placeholder="例如：22世纪太空殖民地"
                className="mt-2 bg-slate-700 border-purple-500/30 text-white placeholder:text-slate-400"
              />
            </div>

            <div>
              <Label htmlFor="requirements" className="text-purple-200 font-medium">特殊要求（可选）</Label>
              <Textarea
                id="requirements"
                value={config.special_requirements}
                onChange={(e) => setConfig(prev => ({ ...prev, special_requirements: e.target.value }))}
                placeholder="例如：包含赛博朋克元素、多重结局、浪漫情节等"
                className="mt-2 bg-slate-700 border-purple-500/30 text-white placeholder:text-slate-400 resize-none"
                rows={3}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 rounded-lg transition-all duration-300 transform hover:scale-105"
              disabled={!config.genre || !config.protagonist || !config.setting}
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

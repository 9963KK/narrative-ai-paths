
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface StoryState {
  story_id: string;
  current_scene: string;
  characters: Array<{ name: string; role: string; traits: string }>;
  setting: string;
  chapter: number;
  choices_made: string[];
  achievements: string[];
}

interface Choice {
  id: number;
  text: string;
  description: string;
}

interface StoryReaderProps {
  initialStory: StoryState;
  onMakeChoice: (choiceId: number) => void;
  onRestart: () => void;
}

const StoryReader: React.FC<StoryReaderProps> = ({ initialStory, onMakeChoice, onRestart }) => {
  const [story, setStory] = useState<StoryState>(initialStory);
  const [currentText, setCurrentText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [choices, setChoices] = useState<Choice[]>([]);
  const [showChoices, setShowChoices] = useState(false);

  // 模拟打字机效果
  useEffect(() => {
    if (story.current_scene && story.current_scene !== currentText) {
      setIsTyping(true);
      setCurrentText('');
      let index = 0;
      const interval = setInterval(() => {
        if (index < story.current_scene.length) {
          setCurrentText(story.current_scene.slice(0, index + 1));
          index++;
        } else {
          setIsTyping(false);
          // 打字完成后显示选择项
          setTimeout(() => {
            setChoices([
              { id: 1, text: "深入调查", description: "追寻真相的线索" },
              { id: 2, text: "谨慎行事", description: "保护自己的安全" }
            ]);
            setShowChoices(true);
          }, 1000);
          clearInterval(interval);
        }
      }, 50);

      return () => clearInterval(interval);
    }
  }, [story.current_scene]);

  const handleChoice = (choiceId: number) => {
    setShowChoices(false);
    setChoices([]);
    onMakeChoice(choiceId);
    
    // 模拟新的故事内容
    const newScene = choiceId === 1 ? 
      "你决定深入调查这个神秘事件。走向废弃的实验室，霓虹灯的光芒在雨夜中闪烁。突然，一个黑影从角落里窜出，你感到一阵眩晕..." :
      "你选择谨慎行事，悄悄绕过这个危险区域。然而，在返回的路上，你发现了一张神秘的数据卡片，上面记录着一些你从未见过的代码...";
    
    setTimeout(() => {
      setStory(prev => ({
        ...prev,
        current_scene: newScene,
        chapter: prev.chapter + 1,
        choices_made: [...prev.choices_made, choices.find(c => c.id === choiceId)?.text || '']
      }));
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 头部信息 */}
        <Card className="bg-slate-800/90 border-purple-500/30 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl text-purple-200">
                第 {story.chapter} 章
              </CardTitle>
              <div className="flex items-center space-x-4">
                <Badge variant="outline" className="border-purple-500/50 text-purple-200">
                  ID: {story.story_id}
                </Badge>
                <Progress value={(story.chapter / 10) * 100} className="w-32" />
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* 角色信息 */}
        <Card className="bg-slate-800/90 border-purple-500/30 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-purple-200">角色信息</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {story.characters.map((character, index) => (
                <div key={index} className="bg-slate-700/50 p-3 rounded-lg border border-purple-500/20">
                  <h4 className="font-semibold text-purple-300">{character.name}</h4>
                  <p className="text-sm text-slate-400 mb-1">{character.role}</p>
                  <p className="text-xs text-slate-300">{character.traits}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 主要故事内容 */}
        <Card className="bg-slate-800/90 border-purple-500/30 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="prose prose-invert max-w-none">
              <div className="text-slate-200 text-lg leading-relaxed whitespace-pre-wrap">
                {currentText}
                {isTyping && <span className="animate-pulse text-purple-400">|</span>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 选择项 */}
        {showChoices && (
          <Card className="bg-slate-800/90 border-purple-500/30 backdrop-blur-sm animate-in slide-in-from-bottom-4">
            <CardHeader>
              <CardTitle className="text-lg text-purple-200">选择你的行动</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {choices.map((choice) => (
                  <Button
                    key={choice.id}
                    variant="outline"
                    onClick={() => handleChoice(choice.id)}
                    className="w-full text-left h-auto p-4 bg-slate-700/50 border-purple-500/30 hover:bg-purple-600/20 hover:border-purple-400/50 transition-all duration-300"
                  >
                    <div>
                      <div className="font-semibold text-purple-200">{choice.text}</div>
                      <div className="text-sm text-slate-400 mt-1">{choice.description}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 成就系统 */}
        {story.achievements.length > 0 && (
          <Card className="bg-slate-800/90 border-purple-500/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg text-purple-200">已解锁成就</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {story.achievements.map((achievement, index) => (
                  <Badge key={index} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                    {achievement}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 操作按钮 */}
        <div className="flex justify-center space-x-4">
          <Button
            onClick={onRestart}
            variant="outline"
            className="border-purple-500/50 text-purple-200 hover:bg-purple-600/20"
          >
            重新开始
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StoryReader;

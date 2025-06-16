
import React, { useState } from 'react';
import StoryInitializer from './StoryInitializer';
import StoryReader from './StoryReader';

interface StoryConfig {
  genre: string;
  protagonist: string;
  setting: string;
  special_requirements: string;
}

interface StoryState {
  story_id: string;
  current_scene: string;
  characters: Array<{ name: string; role: string; traits: string }>;
  setting: string;
  chapter: number;
  choices_made: string[];
  achievements: string[];
}

const StoryManager: React.FC = () => {
  const [currentStory, setCurrentStory] = useState<StoryState | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const initializeStory = async (config: StoryConfig) => {
    setIsLoading(true);
    
    // 模拟AI生成初始故事
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const initialStory: StoryState = {
      story_id: `ST${Date.now()}`,
      current_scene: generateInitialScene(config),
      characters: generateCharacters(config),
      setting: config.setting,
      chapter: 1,
      choices_made: [],
      achievements: []
    };
    
    setCurrentStory(initialStory);
    setIsLoading(false);
  };

  const generateInitialScene = (config: StoryConfig): string => {
    const sceneTemplates = {
      'sci-fi': `在${config.setting}的深处，${config.protagonist}慢慢苏醒过来。周围是闪烁的全息屏幕和嗡嗡作响的机械声。记忆模糊不清，但有一种强烈的预感——这里隐藏着改变一切的秘密。

空气中弥漫着金属和臭氧的味道，远处传来的警报声让人心跳加速。你的手腕上闪烁着一个未知的数字代码，似乎在倒计时着什么重要的事情。

现在，你必须做出选择...`,
      'fantasy': `在${config.setting}的魔法森林中，${config.protagonist}从一场奇异的梦境中醒来。古老的符文在空中闪烁，周围的树木似乎在低语着远古的秘密。

一把闪闪发光的剑就在你的身边，剑柄上刻着你从未见过却莫名熟悉的文字。远处传来龙鸣声，预示着一场史诗般的冒险即将开始。

命运的齿轮开始转动...`,
      'mystery': `在${config.setting}的雨夜中，${config.protagonist}站在一栋废弃建筑前。闪电照亮了破碎的窗户，里面传出令人不安的声音。

你的口袋里有一张神秘的纸条，上面只写着一个地址和时间——正是现在。记忆中有些片段缺失，但直觉告诉你，这里隐藏着一个巨大的阴谋。

真相就在咫尺之间...`,
      'romance': `在${config.setting}的咖啡厅里，${config.protagonist}意外遇到了一个让心跳加速的人。阳光透过窗户洒在对方的脸上，时间仿佛在这一刻停止了。

一个偶然的眼神交汇，一个甜美的微笑，命运的红线似乎已经悄悄地将你们连接在一起。但是，这个人的身份似乎并不简单...

爱情的故事即将开始...`,
      'thriller': `在${config.setting}的深夜，${config.protagonist}发现自己被困在一个陌生的地方。四周一片寂静，只有自己的心跳声在耳边回响。

手机没有信号，门被锁死，窗户被封住。墙上的时钟指向午夜，而你完全不记得自己是如何来到这里的。

恐惧开始蔓延，但求生的本能告诉你必须找到出路...`,
      'historical': `在${config.setting}的古老街道上，${config.protagonist}身着时代的服装，感受着历史的厚重。周围的建筑述说着过去的故事，空气中弥漫着那个年代特有的气息。

你手中握着一封重要的信件，内容关乎国家的命运。战争的阴云正在聚集，而你必须在历史的洪流中找到自己的位置。

历史的车轮正在转动...`
    };

    return sceneTemplates[config.genre as keyof typeof sceneTemplates] || sceneTemplates['sci-fi'];
  };

  const generateCharacters = (config: StoryConfig): Array<{ name: string; role: string; traits: string }> => {
    const characterTemplates = {
      'sci-fi': [
        { name: '凯', role: '主角', traits: '植入式记忆芯片故障，拥有超凡的直觉和分析能力' },
        { name: 'ARIA', role: 'AI助手', traits: '先进的人工智能，忠诚但隐藏着秘密' },
        { name: '赛博公司总裁', role: '反派', traits: '权力欲极强，控制着整个数字世界' }
      ],
      'fantasy': [
        { name: '艾琳', role: '主角', traits: '天生的魔法天赋，但对自己的身世一无所知' },
        { name: '智者梅林', role: '导师', traits: '古老的智慧，掌握着禁忌的魔法知识' },
        { name: '暗影领主', role: '反派', traits: '黑暗魔法的掌控者，试图毁灭世界' }
      ],
      'mystery': [
        { name: '侦探李明', role: '主角', traits: '敏锐的观察力，但被过去的案件所困扰' },
        { name: '神秘女子', role: '关键人物', traits: '知道真相但不肯说出来' },
        { name: '幕后黑手', role: '反派', traits: '精心策划的阴谋家，身份成谜' }
      ],
      'romance': [
        { name: '林小雨', role: '主角', traits: '善良温柔，但对爱情缺乏信心' },
        { name: '陈浩然', role: '男主角', traits: '成功人士，但内心孤独' },
        { name: '前任', role: '障碍', traits: '过去的感情纠葛' }
      ],
      'thriller': [
        { name: '张华', role: '主角', traits: '普通人，但在危机中展现出惊人的求生能力' },
        { name: '神秘声音', role: '操控者', traits: '隐藏在暗处的危险存在' },
        { name: '同伴', role: '盟友', traits: '一起被困的人，但可能不值得信任' }
      ],
      'historical': [
        { name: '李文', role: '主角', traits: '书生出身，但怀有报国之志' },
        { name: '将军', role: '导师', traits: '经验丰富的军事家' },
        { name: '奸臣', role: '反派', traits: '权倾朝野，阻挠主角的使命' }
      ]
    };

    return characterTemplates[config.genre as keyof typeof characterTemplates] || characterTemplates['sci-fi'];
  };

  const handleMakeChoice = (choiceId: number) => {
    console.log(`用户选择了选项 ${choiceId}`);
    // 这里可以调用AI API来生成下一段剧情
  };

  const handleRestart = () => {
    setCurrentStory(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-xl text-purple-200">AI正在为您创作专属故事...</p>
          <p className="text-sm text-purple-300 mt-2">请稍候片刻</p>
        </div>
      </div>
    );
  }

  if (!currentStory) {
    return <StoryInitializer onInitializeStory={initializeStory} />;
  }

  return (
    <StoryReader
      initialStory={currentStory}
      onMakeChoice={handleMakeChoice}
      onRestart={handleRestart}
    />
  );
};

export default StoryManager;

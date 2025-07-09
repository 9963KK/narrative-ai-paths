import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Settings, ArrowLeft, Upload, BookOpen } from 'lucide-react';
import ModelConfig from '@/components/ModelConfig';
import DocumentAnalyzer from '@/components/DocumentAnalyzer';
import DocumentAnalysisResultView from '@/components/DocumentAnalysisResultView';
import { ModelConfig as ModelConfigType } from '@/components/model-config/constants';
import { loadModelConfig, hasSavedConfig } from '@/services/configStorage';
import { DocumentAnalysisResult } from '@/services/documentAnalyzer';

const DocumentAnalysis: React.FC = () => {
  const navigate = useNavigate();
  const [showModelConfig, setShowModelConfig] = useState(false);
  const [hasValidConfig, setHasValidConfig] = useState(false);
  const [documentAnalysisResult, setDocumentAnalysisResult] = useState<DocumentAnalysisResult | null>(null);
  const [showAnalysisResult, setShowAnalysisResult] = useState(false);

  const [modelConfig, setModelConfig] = useState<ModelConfigType>({
    provider: 'openai',
    model: 'gpt-4',
    apiKey: '',
    temperature: 0.8,
    maxTokens: 2000
  });

  // 组件加载时检查本地配置
  useEffect(() => {
    const savedConfig = loadModelConfig();
    if (savedConfig && savedConfig.apiKey) {
      setModelConfig(savedConfig);
      setHasValidConfig(true);
      console.log('📂 已从本地存储加载配置');
    } else {
      setHasValidConfig(hasSavedConfig());
    }
  }, []);

  // 处理文档分析完成
  const handleDocumentAnalysisComplete = (result: DocumentAnalysisResult) => {
    setDocumentAnalysisResult(result);
    console.log('📄 文档分析完成，切换到结果展示界面', result);
    
    if (result.success && result.data) {
      setShowAnalysisResult(true);
    }
  };

  // 基于文档分析创建故事
  const handleCreateFromAnalysis = (selectedSeed?: any) => {
    if (!documentAnalysisResult?.success || !documentAnalysisResult.data) return;
    
    const hasApiKey = modelConfig.apiKey || hasValidConfig;
    if (!hasApiKey) {
      alert('请先配置AI模型');
      return;
    }

    // 使用文档分析结果创建配置
    const analysisData = documentAnalysisResult.data;
    
    // 从写作风格推断文体类型
    let inferredGenre = 'fantasy'; // 默认
    const genre = analysisData.writingStyle.genre.toLowerCase();
    if (genre.includes('科幻') || genre.includes('sci-fi')) {
      inferredGenre = 'sci-fi';
    } else if (genre.includes('奇幻') || genre.includes('fantasy')) {
      inferredGenre = 'fantasy';
    } else if (genre.includes('推理') || genre.includes('悬疑') || genre.includes('mystery')) {
      inferredGenre = 'mystery';
    } else if (genre.includes('爱情') || genre.includes('浪漫') || genre.includes('romance')) {
      inferredGenre = 'romance';
    } else if (genre.includes('惊悚') || genre.includes('恐怖')) {
      inferredGenre = 'thriller';
    } else if (genre.includes('历史')) {
      inferredGenre = 'historical';
    } else if (genre.includes('日常') || genre.includes('生活')) {
      inferredGenre = 'slice-of-life';
    } else if (genre.includes('冒险')) {
      inferredGenre = 'adventure';
    }

    // 从语调推断故事基调
    let inferredTone: 'light' | 'serious' | 'humorous' | 'dark' | 'romantic' = 'serious';
    const tone = analysisData.writingStyle.tone.toLowerCase();
    if (tone.includes('轻松') || tone.includes('轻快')) {
      inferredTone = 'light';
    } else if (tone.includes('幽默') || tone.includes('诙谐')) {
      inferredTone = 'humorous';
    } else if (tone.includes('黑暗') || tone.includes('沉重')) {
      inferredTone = 'dark';
    } else if (tone.includes('浪漫') || tone.includes('温馨')) {
      inferredTone = 'romantic';
    }

    // 使用选中的创意种子，或者默认使用第一个
    const seedToUse = selectedSeed || analysisData.suggestedStorySeeds[0];
    const baseStoryIdea = seedToUse 
      ? `基于《${seedToUse.title}》的创意：${seedToUse.premise}`
      : '继承原作精神的全新故事';

    // 如果有选中的创意种子，优先使用其角色和背景
    const charactersToUse = seedToUse?.characters 
      ? seedToUse.characters.map((charName: string, index: number) => {
          // 尝试从分析的角色中找到匹配的角色，如果没有则创建新角色
          const matchedChar = analysisData.characters.find(char => 
            char.name && char.name.includes(charName) || charName.includes(char.name || '')
          );
          return {
            name: charName,
            role: index === 0 ? '主角' : '配角',
            traits: matchedChar?.traits || '待定义的角色特征',
            appearance: matchedChar?.appearance || '待描述',
            backstory: matchedChar?.backstory || '待补充的背景故事'
          };
        })
      : analysisData.characters.slice(0, 6).map((char, index) => ({
          name: char.name || `角色${index + 1}`,
          role: char.role || '配角',
          traits: char.traits || '待定义',
          appearance: char.appearance || '',
          backstory: char.backstory || ''
        }));

    // 如果有选中的创意种子，优先使用其背景设定
    const settingToUse = seedToUse?.setting 
      ? `${seedToUse.setting}。${analysisData.setting.worldBackground}`
      : `${analysisData.setting.time}，${analysisData.setting.place}。${analysisData.setting.worldBackground}`;

    const documentBasedConfig = {
      genre: inferredGenre,
      story_idea: baseStoryIdea,
      protagonist: charactersToUse[0]?.name || '新主角',
      setting: settingToUse,
      special_requirements: seedToUse ? `特别注重创意种子"${seedToUse.title}"中的核心元素和角色关系` : '',
      character_count: Math.min(Math.max(charactersToUse.length, 3), 6),
      character_details: charactersToUse.slice(0, 6),
      environment_details: `${settingToUse}。整体氛围：${analysisData.setting.atmosphere}`,
      preferred_ending: 'open',
      story_length: 'medium',
      tone: inferredTone,
      story_goals: analysisData.plotElements.keyEvents.slice(0, 3).map((event, index) => ({
        id: `goal_${index + 1}`,
        description: event,
        type: index === 0 ? 'main' as const : 'sub' as const,
        priority: index === 0 ? 'high' as const : 'medium' as const
      })),
      documentAnalysis: documentAnalysisResult,
      useDocumentAnalysis: true
    };

    let configToUse = modelConfig;
    if (!modelConfig.apiKey && hasValidConfig) {
      const savedConfig = loadModelConfig();
      if (savedConfig) {
        configToUse = savedConfig;
        setModelConfig(savedConfig);
      }
    }

    // 保存配置到 localStorage
    localStorage.setItem('pendingStoryConfig', JSON.stringify({
      config: documentBasedConfig,
      modelConfig: configToUse,
      isAdvanced: true
    }));
    
    // 重定向到故事创作页面
    navigate('/app/creating');
  };

  // 导出分析结果
  const handleExportAnalysisResult = () => {
    if (!documentAnalysisResult?.success || !documentAnalysisResult.data) return;
    
    const dataStr = JSON.stringify(documentAnalysisResult.data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `document-analysis-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 处理文档分析结果变更
  const handleAnalysisResultChange = (updatedResult: DocumentAnalysisResult) => {
    setDocumentAnalysisResult(updatedResult);
    console.log('文档分析结果已更新:', updatedResult);
  };

  // 基于分析结果进入专业模式
  const handleGoToAdvanced = () => {
    // 导航到专业模式页面，并传递分析结果
    navigate('/app/advanced', { state: { documentAnalysis: documentAnalysisResult } });
  };

  // 模型配置界面
  if (showModelConfig) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <ModelConfig
          config={modelConfig}
          onConfigChange={(config) => {
            setModelConfig(config);
            setHasValidConfig(!!config.apiKey);
          }}
          onClose={() => setShowModelConfig(false)}
        />
      </div>
    );
  }

  // 文档分析结果展示界面
  if (showAnalysisResult && documentAnalysisResult) {
    return (
      <DocumentAnalysisResultView
        result={documentAnalysisResult}
        onBack={() => setShowAnalysisResult(false)}
        onCreateStory={handleCreateFromAnalysis}
        onExportResult={handleExportAnalysisResult}
        onSaveChanges={handleAnalysisResultChange}
        onGoToAdvanced={handleGoToAdvanced}
      />
    );
  }

  // 主要的文档分析界面
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/app')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            返回主页
          </Button>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-800 flex items-center justify-center gap-3 mb-2">
              <Upload className="h-8 w-8 text-teal-600" />
              文档基础创作
            </h1>
            <p className="text-slate-600">上传您的小说草稿，AI 提取核心元素，基于现有内容激发创作灵感</p>
          </div>
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
        
        {!modelConfig.apiKey && !hasValidConfig && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-amber-800 text-sm text-center">
              ⚠️ 请先配置AI模型才能进行文档分析
            </p>
          </div>
        )}

        <DocumentAnalyzer
          modelConfig={modelConfig.apiKey ? modelConfig : (hasValidConfig ? loadModelConfig()! : modelConfig)}
          onAnalysisComplete={handleDocumentAnalysisComplete}
          onClose={() => navigate('/app')}
        />
      </div>
    </div>
  );
};

export default DocumentAnalysis;
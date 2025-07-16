import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Settings, ArrowLeft, Upload, BookOpen, Database } from 'lucide-react';
import DocumentAnalyzer from '@/components/DocumentAnalyzer';
import DocumentAnalysisResultView from '@/components/DocumentAnalysisResultView';
import DocumentRecordManager from '@/components/DocumentRecordManager';
import { ModelConfig as ModelConfigType } from '@/components/model-config/constants';
import { modelConfigAdapter } from '@/services/modelConfigAdapter';
import { DocumentAnalysisResult } from '@/services/documentAnalyzer';
import { DocumentRecord } from '@/services/documentRecordManager';

const DocumentAnalysis: React.FC = () => {
  const navigate = useNavigate();
  const [hasValidConfig, setHasValidConfig] = useState(false);
  const [documentAnalysisResult, setDocumentAnalysisResult] = useState<DocumentAnalysisResult | null>(null);
  const [showAnalysisResult, setShowAnalysisResult] = useState(false);
  const [showRecordManager, setShowRecordManager] = useState(false);

  const [modelConfig, setModelConfig] = useState<ModelConfigType>({
    provider: 'openai',
    model: 'gpt-4',
    apiKey: '',
    temperature: 0.8,
    maxTokens: 2000
  });

  // 组件加载时检查用户模型配置
  useEffect(() => {
    const loadUserConfig = async () => {
      try {
        // 确保用户有可用模型
        await modelConfigAdapter.ensureUserHasModels();
        
        // 获取用户模型配置
        const userConfig = await modelConfigAdapter.getUserModelConfig();
        if (userConfig) {
          setModelConfig(userConfig);
          setHasValidConfig(true);
          console.log('📂 已加载用户模型配置');
        } else {
          setHasValidConfig(false);
          console.warn('用户没有可用的模型配置');
        }
      } catch (error) {
        console.error('加载用户配置失败:', error);
        setHasValidConfig(false);
      }
    };
    
    loadUserConfig();
  }, []);

  // 处理文档分析完成
  const handleDocumentAnalysisComplete = (result: DocumentAnalysisResult) => {
    setDocumentAnalysisResult(result);
    
    if (result.success && result.data) {
      setShowAnalysisResult(true);
    }
  };

  // 基于文档分析创建故事
  const handleCreateFromAnalysis = async (selectedSeed?: any) => {
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
      const userConfig = await modelConfigAdapter.getUserModelConfig();
      if (userConfig) {
        configToUse = userConfig;
        setModelConfig(userConfig);
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
  };

  // 基于分析结果进入专业模式
  const handleGoToAdvanced = () => {
    // 导航到专业模式页面，并传递分析结果
    navigate('/app/advanced', { state: { documentAnalysis: documentAnalysisResult } });
  };

  // 处理从记录管理器选择记录
  const handleSelectRecord = (record: DocumentRecord) => {
    if (record.analysisResult) {
      setDocumentAnalysisResult(record.analysisResult);
      setShowAnalysisResult(true);
      setShowRecordManager(false);
    }
  };

  // 处理查看记录结果
  const handleViewRecordResult = (record: DocumentRecord) => {
    if (record.analysisResult) {
      setDocumentAnalysisResult(record.analysisResult);
      setShowAnalysisResult(true);
      setShowRecordManager(false);
    }
  };

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

  // 记录管理界面
  if (showRecordManager) {
    return (
      <div className="min-h-screen bg-gray-50 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50/10 via-gray-50 to-gray-50">
        <div className="container mx-auto p-4 sm:p-8">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 animate-in slide-in-from-top-4 fade-in-0 duration-500">
              <Button
                variant="ghost"
                onClick={() => setShowRecordManager(false)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 bg-white/80 backdrop-blur-sm shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 rounded-xl px-4 py-2"
              >
                <ArrowLeft className="h-4 w-4" />
                返回分析
              </Button>
              
              <div className="flex items-center gap-3 animate-in slide-in-from-top-4 fade-in-0 duration-600">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <Database className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-800">解析记录管理</h1>
                  <p className="text-sm text-gray-600">查看和管理文档解析历史</p>
                </div>
              </div>
              
              <div className="w-[120px]"></div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-gray-200/50 overflow-hidden p-6 animate-in slide-in-from-bottom-4 fade-in-0 duration-700">
              <DocumentRecordManager
                onSelectRecord={handleSelectRecord}
                onViewResult={handleViewRecordResult}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 主要的文档分析界面
  return (
    <div className="min-h-screen bg-gray-50 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50/10 via-gray-50 to-gray-50">
      <div className="container mx-auto p-4 sm:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8 animate-in slide-in-from-top-4 fade-in-0 duration-500">
            {/* 返回主页按钮 */}
            <Button
              onClick={() => navigate('/app')}
              variant="outline"
              className="px-6 py-3 bg-white border-gray-200 hover:border-gray-300 text-gray-700 hover:text-gray-900 font-medium shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 rounded-xl"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回主页
            </Button>
            
            {/* 查询历史记录按钮 */}
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowRecordManager(true)}
              className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border-gray-200/50 text-gray-700 hover:bg-white hover:shadow-lg transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 rounded-xl"
            >
              <Database className="h-4 w-4" />
              查询历史记录
            </Button>
          </div>


          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-gray-200/50 overflow-hidden animate-in slide-in-from-bottom-4 fade-in-0 duration-700">
            <DocumentAnalyzer
              modelConfig={modelConfig}
              onAnalysisComplete={handleDocumentAnalysisComplete}
              onClose={() => navigate('/app')}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentAnalysis;
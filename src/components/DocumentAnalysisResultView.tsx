import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, 
  Download, 
  Play, 
  Users, 
  Heart, 
  MapPin, 
  Clock, 
  Globe, 
  Sword, 
  Target, 
  Palette, 
  Lightbulb, 
  BookOpen, 
  Sparkles,
  User,
  CheckCircle2,
  Edit,
  Save,
  X,
  Plus,
  Trash2,
  AlertCircle,
  Eye,
  FileText
} from 'lucide-react';
import { DocumentAnalysisResult } from '@/services/documentAnalyzer';

interface DocumentAnalysisResultViewProps {
  result: DocumentAnalysisResult;
  onBack: () => void;
  onCreateStory: (selectedSeed?: any) => void;
  onExportResult?: () => void;
  onSaveChanges?: (updatedResult: DocumentAnalysisResult) => void;
  onGoToAdvanced?: () => void;
}

const DocumentAnalysisResultView: React.FC<DocumentAnalysisResultViewProps> = ({
  result,
  onBack,
  onCreateStory,
  onExportResult,
  onSaveChanges,
  onGoToAdvanced
}) => {
  const [selectedSeedIndex, setSelectedSeedIndex] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState(result.data);

  if (!result.success || !result.data) {
    return (
      <div className="p-6 text-center text-red-600">
        分析结果无效或加载失败
      </div>
    );
  }

  const data = isEditing ? editedData! : result.data;

  // 深拷贝数据以避免直接修改原始数据
  const initEditMode = () => {
    setEditedData(JSON.parse(JSON.stringify(result.data)));
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setEditedData(result.data);
    setIsEditing(false);
  };

  const saveChanges = () => {
    if (editedData && onSaveChanges) {
      const updatedResult: DocumentAnalysisResult = {
        ...result,
        data: editedData
      };
      onSaveChanges(updatedResult);
    }
    setIsEditing(false);
  };

  // 更新角色信息
  const updateCharacter = (index: number, field: string, value: string) => {
    if (!editedData) return;
    const newCharacters = [...editedData.characters];
    newCharacters[index] = { ...newCharacters[index], [field]: value };
    setEditedData({ ...editedData, characters: newCharacters });
  };

  // 添加新角色
  const addCharacter = () => {
    if (!editedData) return;
    const newCharacter = {
      name: '新角色',
      role: '配角',
      traits: '',
      appearance: '',
      backstory: ''
    };
    setEditedData({
      ...editedData,
      characters: [...editedData.characters, newCharacter]
    });
  };

  // 删除角色
  const removeCharacter = (index: number) => {
    if (!editedData) return;
    const newCharacters = editedData.characters.filter((_, i) => i !== index);
    setEditedData({ ...editedData, characters: newCharacters });
  };

  // 更新设定信息
  const updateSetting = (field: string, value: string) => {
    if (!editedData) return;
    setEditedData({
      ...editedData,
      setting: { ...editedData.setting, [field]: value }
    });
  };

  // 更新主题信息
  const updateThemes = (field: string, value: string | string[]) => {
    if (!editedData) return;
    setEditedData({
      ...editedData,
      themes: { ...editedData.themes, [field]: value }
    });
  };

  // 更新主题数组
  const updateMainTheme = (index: number, value: string) => {
    if (!editedData) return;
    const newThemes = [...editedData.themes.mainThemes];
    newThemes[index] = value;
    updateThemes('mainThemes', newThemes);
  };

  // 添加新主题
  const addMainTheme = () => {
    if (!editedData) return;
    updateThemes('mainThemes', [...editedData.themes.mainThemes, '新主题']);
  };

  // 删除主题
  const removeMainTheme = (index: number) => {
    if (!editedData) return;
    const newThemes = editedData.themes.mainThemes.filter((_, i) => i !== index);
    updateThemes('mainThemes', newThemes);
  };

  // 更新情节元素
  const updatePlotElements = (field: string, value: string | string[]) => {
    if (!editedData) return;
    setEditedData({
      ...editedData,
      plotElements: { ...editedData.plotElements, [field]: value }
    });
  };

  // 更新关键事件
  const updateKeyEvent = (index: number, value: string) => {
    if (!editedData) return;
    const newEvents = [...editedData.plotElements.keyEvents];
    newEvents[index] = value;
    updatePlotElements('keyEvents', newEvents);
  };

  // 添加关键事件
  const addKeyEvent = () => {
    if (!editedData) return;
    updatePlotElements('keyEvents', [...editedData.plotElements.keyEvents, '新事件']);
  };

  // 删除关键事件
  const removeKeyEvent = (index: number) => {
    if (!editedData) return;
    const newEvents = editedData.plotElements.keyEvents.filter((_, i) => i !== index);
    updatePlotElements('keyEvents', newEvents);
  };

  // 更新写作风格
  const updateWritingStyle = (field: string, value: string) => {
    if (!editedData) return;
    setEditedData({
      ...editedData,
      writingStyle: { ...editedData.writingStyle, [field]: value }
    });
  };

  // 更新创意种子
  const updateSuggestedSeed = (index: number, field: string, value: string | string[]) => {
    if (!editedData) return;
    const newSeeds = [...editedData.suggestedStorySeeds];
    newSeeds[index] = { ...newSeeds[index], [field]: value };
    setEditedData({ ...editedData, suggestedStorySeeds: newSeeds });
  };

  // 添加创意种子
  const addSuggestedSeed = () => {
    if (!editedData) return;
    const newSeed = {
      title: '新创意',
      premise: '故事前提',
      characters: ['主角'],
      setting: '背景设定'
    };
    setEditedData({
      ...editedData,
      suggestedStorySeeds: [...editedData.suggestedStorySeeds, newSeed]
    });
  };

  // 删除创意种子
  const removeSuggestedSeed = (index: number) => {
    if (!editedData) return;
    const newSeeds = editedData.suggestedStorySeeds.filter((_, i) => i !== index);
    setEditedData({ ...editedData, suggestedStorySeeds: newSeeds });
    // 如果删除的是选中的种子，清除选择
    if (selectedSeedIndex === index) {
      setSelectedSeedIndex(null);
    } else if (selectedSeedIndex !== null && selectedSeedIndex > index) {
      setSelectedSeedIndex(selectedSeedIndex - 1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-purple-50/20">
      {/* 顶部渐变背景 */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-pink-600/5"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-pink-400/10 to-orange-400/10 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>
        
        {/* 标题栏 */}
        <div className="relative z-10 backdrop-blur-sm bg-white/80 border-b border-gray-200/50 shadow-lg">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBack}
                  className="flex items-center gap-2 bg-white/80 backdrop-blur-sm shadow-md hover:shadow-lg transition-all duration-300 rounded-xl px-4 py-2 border border-gray-200/50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  返回
                </Button>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">文档分析结果</h1>
                    <p className="text-sm text-gray-600 mt-1">AI智能分析完成，为您提供创作灵感</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {isEditing ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={cancelEdit}
                      className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border-gray-200/50 hover:bg-white hover:shadow-lg transition-all duration-300 rounded-xl"
                    >
                      <X className="h-4 w-4" />
                      取消
                    </Button>
                    <Button
                      size="sm"
                      onClick={saveChanges}
                      className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
                    >
                      <Save className="h-4 w-4" />
                      保存修改
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={initEditMode}
                      className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border-gray-200/50 hover:bg-white hover:shadow-lg transition-all duration-300 rounded-xl"
                    >
                      <Edit className="h-4 w-4" />
                      编辑分析结果
                    </Button>
                    {onExportResult && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onExportResult}
                        className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border-gray-200/50 hover:bg-white hover:shadow-lg transition-all duration-300 rounded-xl"
                      >
                        <Download className="h-4 w-4" />
                        导出结果
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">

        {/* 三列布局 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左列：人物分析 + 写作风格 */}
          <div className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-500 rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6">
                <CardTitle className="flex items-center gap-3 text-white text-xl font-bold">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  人物分析
                  {isEditing && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={addCharacter}
                      className="ml-auto h-8 w-8 p-0 bg-white/20 border-white/30 hover:bg-white/30 text-white rounded-lg"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </CardTitle>
                <p className="text-blue-100 text-sm mt-2">分析文档中的关键人物角色</p>
              </div>
              <CardContent className="p-6">
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {data.characters.map((character, index) => (
                      <div key={index} className="group p-4 border border-gray-200/50 rounded-2xl bg-gradient-to-r from-gray-50 to-blue-50/30 hover:from-blue-50/50 hover:to-indigo-50/50 transition-all duration-300 shadow-sm hover:shadow-md">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                              <User className="h-4 w-4 text-white" />
                            </div>
                            {isEditing ? (
                              <Input
                                value={character.name}
                                onChange={(e) => updateCharacter(index, 'name', e.target.value)}
                                className="h-8 text-sm font-semibold bg-white/80 border-gray-200/50 rounded-xl"
                                placeholder="角色名称"
                              />
                            ) : (
                              <span className="font-bold text-gray-800 text-lg">{character.name}</span>
                            )}
                          </div>
                          {isEditing && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeCharacter(index)}
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      
                        <div className="space-y-3 text-sm">
                          <div className="bg-white/60 rounded-xl p-3">
                            <span className="font-semibold text-indigo-700 text-xs uppercase tracking-wide">定位</span>
                            {isEditing ? (
                              <Input
                                value={character.role}
                                onChange={(e) => updateCharacter(index, 'role', e.target.value)}
                                className="h-8 text-sm mt-2 bg-white/80 border-gray-200/50 rounded-xl"
                                placeholder="角色定位"
                              />
                            ) : (
                              <p className="text-gray-800 font-medium mt-1">{character.role}</p>
                            )}
                          </div>
                          
                          <div className="bg-white/60 rounded-xl p-3">
                            <span className="font-semibold text-indigo-700 text-xs uppercase tracking-wide">性格特征</span>
                            {isEditing ? (
                              <Textarea
                                value={character.traits}
                                onChange={(e) => updateCharacter(index, 'traits', e.target.value)}
                                className="h-20 text-sm mt-2 bg-white/80 border-gray-200/50 rounded-xl"
                                placeholder="性格特征"
                              />
                            ) : (
                              <p className="text-gray-700 text-sm leading-relaxed mt-1">{character.traits}</p>
                            )}
                          </div>
                          
                          <div className="bg-white/60 rounded-xl p-3">
                            <span className="font-semibold text-indigo-700 text-xs uppercase tracking-wide">外貌描述</span>
                            {isEditing ? (
                              <Textarea
                                value={character.appearance}
                                onChange={(e) => updateCharacter(index, 'appearance', e.target.value)}
                                className="h-20 text-sm mt-2 bg-white/80 border-gray-200/50 rounded-xl"
                                placeholder="外貌描述"
                              />
                            ) : (
                              <p className="text-gray-700 text-sm leading-relaxed mt-1">{character.appearance}</p>
                            )}
                          </div>
                          
                          <div className="bg-white/60 rounded-xl p-3">
                            <span className="font-semibold text-indigo-700 text-xs uppercase tracking-wide">背景故事</span>
                            {isEditing ? (
                              <Textarea
                                value={character.backstory}
                                onChange={(e) => updateCharacter(index, 'backstory', e.target.value)}
                                className="h-20 text-sm mt-2 bg-white/80 border-gray-200/50 rounded-xl"
                                placeholder="背景故事"
                              />
                            ) : (
                              <p className="text-gray-700 text-sm leading-relaxed mt-1">{character.backstory}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* 写作风格 */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-500 rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6">
                <CardTitle className="flex items-center gap-3 text-white text-xl font-bold">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Palette className="h-6 w-6 text-white" />
                  </div>
                  写作风格
                </CardTitle>
                <p className="text-indigo-100 text-sm mt-2">作品的独特表达方式</p>
              </div>
              <CardContent className="p-6 space-y-4">
                <div className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-2xl p-4 border-l-4 border-pink-400">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-pink-400 rounded-full flex items-center justify-center">
                      <Heart className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-bold text-pink-800 text-lg">语调风格</span>
                  </div>
                  {isEditing ? (
                    <Input
                      value={data.writingStyle.tone}
                      onChange={(e) => updateWritingStyle('tone', e.target.value)}
                      placeholder="语调风格"
                      className="text-sm bg-white/80 border-pink-200/50 rounded-xl"
                    />
                  ) : (
                    <p className="text-pink-700 text-sm font-medium pl-2">{data.writingStyle.tone}</p>
                  )}
                </div>
                
                <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-2xl p-4 border-l-4 border-teal-400">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-teal-400 rounded-full flex items-center justify-center">
                      <Eye className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-bold text-teal-800 text-lg">叙述视角</span>
                  </div>
                  {isEditing ? (
                    <Input
                      value={data.writingStyle.narrativePerspective}
                      onChange={(e) => updateWritingStyle('narrativePerspective', e.target.value)}
                      placeholder="叙述视角"
                      className="text-sm bg-white/80 border-teal-200/50 rounded-xl"
                    />
                  ) : (
                    <p className="text-teal-700 text-sm font-medium pl-2">{data.writingStyle.narrativePerspective}</p>
                  )}
                </div>
                
                <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl p-4 border-l-4 border-emerald-400">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-emerald-400 rounded-full flex items-center justify-center">
                      <BookOpen className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-bold text-emerald-800 text-lg">文体类型</span>
                  </div>
                  {isEditing ? (
                    <Input
                      value={data.writingStyle.genre}
                      onChange={(e) => updateWritingStyle('genre', e.target.value)}
                      placeholder="文体类型"
                      className="text-sm bg-white/80 border-emerald-200/50 rounded-xl"
                    />
                  ) : (
                    <p className="text-emerald-700 text-sm font-medium pl-2">{data.writingStyle.genre}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 中列：故事背景 + 主题情节 */}
          <div className="space-y-6">
            {/* 故事背景 */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-500 rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6">
                <CardTitle className="flex items-center gap-3 text-white text-xl font-bold">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Globe className="h-6 w-6 text-white" />
                  </div>
                  故事背景
                </CardTitle>
                <p className="text-green-100 text-sm mt-2">构建故事世界的基础设定</p>
              </div>
              <CardContent className="p-6 space-y-4">
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-4 border-l-4 border-amber-400">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center">
                      <Clock className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-bold text-amber-800 text-lg">时代背景</span>
                  </div>
                  {isEditing ? (
                    <Input
                      value={data.setting.time}
                      onChange={(e) => updateSetting('time', e.target.value)}
                      placeholder="时代背景"
                      className="text-sm bg-white/80 border-amber-200/50 rounded-xl"
                    />
                  ) : (
                    <p className="text-amber-700 text-sm font-medium pl-2">{data.setting.time}</p>
                  )}
                </div>
                
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-4 border-l-4 border-blue-400">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center">
                      <MapPin className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-bold text-blue-800 text-lg">地理位置</span>
                  </div>
                  {isEditing ? (
                    <Input
                      value={data.setting.place}
                      onChange={(e) => updateSetting('place', e.target.value)}
                      placeholder="地理位置"
                      className="text-sm bg-white/80 border-blue-200/50 rounded-xl"
                    />
                  ) : (
                    <p className="text-blue-700 text-sm font-medium pl-2">{data.setting.place}</p>
                  )}
                </div>
                
                <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-2xl p-4 border-l-4 border-purple-400">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-purple-400 rounded-full flex items-center justify-center">
                      <Globe className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-bold text-purple-800 text-lg">世界观</span>
                  </div>
                  {isEditing ? (
                    <Textarea
                      value={data.setting.worldBackground}
                      onChange={(e) => updateSetting('worldBackground', e.target.value)}
                      placeholder="世界观设定"
                      className="text-sm h-24 bg-white/80 border-purple-200/50 rounded-xl"
                    />
                  ) : (
                    <p className="text-purple-700 text-sm leading-relaxed pl-2">{data.setting.worldBackground}</p>
                  )}
                </div>
                
                <div className="bg-gradient-to-r from-rose-50 to-pink-50 rounded-2xl p-4 border-l-4 border-rose-400">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-rose-400 rounded-full flex items-center justify-center">
                      <Heart className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-bold text-rose-800 text-lg">整体氛围</span>
                  </div>
                  {isEditing ? (
                    <Input
                      value={data.setting.atmosphere}
                      onChange={(e) => updateSetting('atmosphere', e.target.value)}
                      placeholder="整体氛围"
                      className="text-sm bg-white/80 border-rose-200/50 rounded-xl"
                    />
                  ) : (
                    <p className="text-rose-700 text-sm font-medium pl-2">{data.setting.atmosphere}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 主题与情节概要 */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-500 rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-red-600 p-6">
                <CardTitle className="flex items-center gap-3 text-white text-xl font-bold">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Target className="h-6 w-6 text-white" />
                  </div>
                  主题与情节
                  {isEditing && (
                    <div className="ml-auto flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={addMainTheme}
                        className="h-8 w-8 p-0 bg-white/20 border-white/30 hover:bg-white/30 text-white rounded-lg"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={addKeyEvent}
                        className="h-8 w-8 p-0 bg-white/20 border-white/30 hover:bg-white/30 text-white rounded-lg"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardTitle>
                <p className="text-purple-100 text-sm mt-2">故事的核心主题与关键情节</p>
              </div>
              <CardContent className="p-6 space-y-4">
                {/* 主要主题 */}
                <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-2xl p-4 border-l-4 border-violet-400">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-violet-400 rounded-full flex items-center justify-center">
                      <Target className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-bold text-violet-800 text-base">主要主题</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {data.themes.mainThemes.slice(0, 4).map((theme, index) => (
                      <div key={index} className="flex items-center gap-1">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <Input
                              value={theme}
                              onChange={(e) => updateMainTheme(index, e.target.value)}
                              className="h-7 text-xs w-20 bg-white/80 border-violet-200/50 rounded-lg"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeMainTheme(index)}
                              className="h-7 w-7 p-0 text-red-500 hover:bg-red-50 rounded-lg"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Badge className="bg-gradient-to-r from-violet-500 to-purple-500 text-white px-2 py-1 text-xs rounded-full">
                            {theme}
                          </Badge>
                        )}
                      </div>
                    ))}
                    {data.themes.mainThemes.length > 4 && (
                      <span className="text-xs text-gray-500">+{data.themes.mainThemes.length - 4}个</span>
                    )}
                  </div>
                </div>
                
                {/* 主要冲突 */}
                <div className="bg-gradient-to-r from-red-50 to-rose-50 rounded-2xl p-4 border-l-4 border-red-400">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-red-400 rounded-full flex items-center justify-center">
                      <Sword className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-bold text-red-800 text-base">主要冲突</span>
                  </div>
                  {isEditing ? (
                    <Textarea
                      value={data.plotElements.mainConflict}
                      onChange={(e) => updatePlotElements('mainConflict', e.target.value)}
                      placeholder="主要冲突描述"
                      className="text-sm h-16 bg-white/80 border-red-200/50 rounded-xl"
                    />
                  ) : (
                    <p className="text-red-700 text-sm leading-relaxed">{data.plotElements.mainConflict}</p>
                  )}
                </div>
                
                {/* 关键事件 */}
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-4 border-l-4 border-orange-400">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-orange-400 rounded-full flex items-center justify-center">
                      <Clock className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-bold text-orange-800 text-base">关键事件</span>
                  </div>
                  <div className="space-y-2">
                    {data.plotElements.keyEvents.slice(0, 3).map((event, index) => (
                      <div key={index} className="flex items-start gap-2 bg-white/60 rounded-lg p-2">
                        <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {index + 1}
                        </div>
                        {isEditing ? (
                          <div className="flex-1 flex items-center gap-1">
                            <Input
                              value={event}
                              onChange={(e) => updateKeyEvent(index, e.target.value)}
                              className="text-xs h-6 bg-white/80 border-orange-200/50 rounded-lg"
                              placeholder="关键事件"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeKeyEvent(index)}
                              className="h-6 w-6 p-0 text-red-500 hover:bg-red-50 rounded-lg"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-orange-700 text-xs font-medium flex-1">{event}</span>
                        )}
                      </div>
                    ))}
                    {data.plotElements.keyEvents.length > 3 && (
                      <div className="text-center">
                        <span className="text-xs text-gray-500">还有 {data.plotElements.keyEvents.length - 3} 个事件...</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右列：创意种子 */}
          <div className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-500 rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-yellow-500 to-orange-600 p-6">
                <CardTitle className="flex items-center gap-3 text-white text-xl font-bold">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Lightbulb className="h-6 w-6 text-white" />
                  </div>
                  创意种子
                  {isEditing && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={addSuggestedSeed}
                      className="ml-auto h-8 w-8 p-0 bg-white/20 border-white/30 hover:bg-white/30 text-white rounded-lg"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </CardTitle>
                <p className="text-orange-100 text-sm mt-2">选择一个创意种子作为故事起点</p>
                {!isEditing && selectedSeedIndex === null && (
                  <div className="mt-4 bg-red-500/20 border border-red-300/50 rounded-xl p-3">
                    <p className="text-red-100 text-sm font-medium flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      必须选择一个创意种子才能开始创作
                    </p>
                  </div>
                )}
              </div>
              <CardContent className="p-6">
                <ScrollArea className="h-[600px]">
                  <div className="space-y-6 p-2">
                    {data.suggestedStorySeeds.map((seed, index) => (
                      <div 
                        key={index} 
                        className={`group p-6 border-2 rounded-2xl transition-all duration-300 cursor-pointer transform hover:scale-[1.02] hover:z-10 relative ${
                          selectedSeedIndex === index 
                            ? 'border-orange-400 bg-gradient-to-r from-orange-50 to-yellow-50 shadow-xl ring-4 ring-orange-200/50' 
                            : 'border-gray-200/50 bg-white hover:border-orange-300 hover:shadow-lg hover:bg-gradient-to-r hover:from-orange-50/50 hover:to-yellow-50/50'
                        } ${isEditing ? 'cursor-default' : 'cursor-pointer'}`}
                        onClick={!isEditing ? () => setSelectedSeedIndex(selectedSeedIndex === index ? null : index) : undefined}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3 flex-1">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                              selectedSeedIndex === index ? 'bg-gradient-to-br from-orange-500 to-yellow-600' : 'bg-gradient-to-br from-gray-400 to-gray-500'
                            }`}>
                              <BookOpen className="h-5 w-5 text-white" />
                            </div>
                            {isEditing ? (
                              <Input
                                value={seed.title}
                                onChange={(e) => updateSuggestedSeed(index, 'title', e.target.value)}
                                className="h-10 text-lg font-bold bg-white/80 border-orange-200/50 rounded-xl"
                                placeholder="故事标题"
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <h3 className="font-bold text-gray-800 text-lg">{seed.title}</h3>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {!isEditing && selectedSeedIndex === index && (
                              <div className="bg-orange-500 rounded-full p-2 shadow-lg animate-pulse">
                                <CheckCircle2 className="h-5 w-5 text-white" />
                              </div>
                            )}
                            {isEditing && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeSuggestedSeed(index);
                                }}
                                className="h-10 w-10 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="h-5 w-5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      
                        <div className="space-y-4 text-sm">
                          <div className="bg-white/80 rounded-2xl p-4 border border-gray-200/50">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                <FileText className="h-3 w-3 text-white" />
                              </div>
                              <span className="font-bold text-blue-700 text-sm uppercase tracking-wide">故事前提</span>
                            </div>
                            {isEditing ? (
                              <Textarea
                                value={seed.premise}
                                onChange={(e) => updateSuggestedSeed(index, 'premise', e.target.value)}
                                className="h-20 text-sm bg-white/80 border-blue-200/50 rounded-xl"
                                placeholder="故事前提"
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <p className="text-gray-700 text-sm leading-relaxed">{seed.premise}</p>
                            )}
                          </div>
                          
                          <div className="bg-white/80 rounded-2xl p-4 border border-gray-200/50">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                                <Users className="h-3 w-3 text-white" />
                              </div>
                              <span className="font-bold text-purple-700 text-sm uppercase tracking-wide">主要角色</span>
                            </div>
                            {isEditing ? (
                              <Textarea
                                value={Array.isArray(seed.characters) ? seed.characters.join(', ') : seed.characters}
                                onChange={(e) => updateSuggestedSeed(index, 'characters', e.target.value.split(', '))}
                                className="h-16 text-sm bg-white/80 border-purple-200/50 rounded-xl"
                                placeholder="主要角色（用逗号分隔）"
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {(Array.isArray(seed.characters) ? seed.characters : [seed.characters]).map((char, charIndex) => (
                                  <Badge key={charIndex} className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-3 py-1 rounded-full">
                                    <Sparkles className="h-3 w-3 mr-1" />
                                    {char}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          <div className="bg-white/80 rounded-2xl p-4 border border-gray-200/50">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                <Globe className="h-3 w-3 text-white" />
                              </div>
                              <span className="font-bold text-green-700 text-sm uppercase tracking-wide">故事背景</span>
                            </div>
                            {isEditing ? (
                              <Textarea
                                value={seed.setting}
                                onChange={(e) => updateSuggestedSeed(index, 'setting', e.target.value)}
                                className="h-20 text-sm bg-white/80 border-green-200/50 rounded-xl"
                                placeholder="故事背景"
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <p className="text-gray-700 text-sm leading-relaxed">{seed.setting}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 底部创作按钮 */}
        {!isEditing && (
          <div className="mt-12 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 rounded-3xl blur-3xl"></div>
            <div className="relative bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-gray-200/50 p-8">
              <div className="flex flex-col items-center space-y-6">
                {selectedSeedIndex !== null ? (
                  <div className="text-center">
                    <div className="flex items-center gap-3 bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-2xl px-6 py-4 shadow-lg">
                      <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-yellow-600 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-white" />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-medium text-orange-600 uppercase tracking-wide">已选择创意种子</p>
                        <p className="text-lg font-bold text-orange-800">
                          {data.suggestedStorySeeds[selectedSeedIndex].title}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl px-6 py-4 shadow-lg">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full flex items-center justify-center">
                          <AlertCircle className="h-5 w-5 text-white" />
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">选择提醒</p>
                          <p className="text-lg font-bold text-amber-800">请先选择一个创意种子</p>
                        </div>
                      </div>
                      <p className="text-sm text-amber-700 text-center">必须选择创意种子才能开始创作</p>
                    </div>
                  </div>
                )}
                
                <div className="flex gap-6">
                  <Button
                    size="lg"
                    disabled={selectedSeedIndex === null}
                    onClick={() => onCreateStory(selectedSeedIndex !== null ? data.suggestedStorySeeds[selectedSeedIndex] : undefined)}
                    className={`flex items-center gap-3 px-10 py-6 text-lg font-bold rounded-2xl transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105 ${
                      selectedSeedIndex !== null 
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white' 
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <Play className="h-6 w-6" />
                    开始创作
                  </Button>
                  
                  {onGoToAdvanced && (
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={onGoToAdvanced}
                      className="flex items-center gap-3 px-10 py-6 text-lg font-bold border-2 border-purple-300 text-purple-700 hover:bg-purple-50 hover:border-purple-400 transition-all duration-300 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      <Edit className="h-6 w-6" />
                      进入专业模式
                    </Button>
                  )}
                </div>
                
                {selectedSeedIndex === null && (
                  <div className="max-w-md text-center">
                    <p className="text-sm text-gray-500 font-medium bg-gray-100 px-4 py-2 rounded-full">
                      💡 请从上方的创意种子中选择一个作为您的故事起点
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentAnalysisResultView; 
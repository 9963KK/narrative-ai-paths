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
  Trash2
} from 'lucide-react';
import { DocumentAnalysisResult } from '@/services/documentAnalyzer';

interface DocumentAnalysisResultViewProps {
  result: DocumentAnalysisResult;
  onBack: () => void;
  onCreateStory: (selectedSeed?: any) => void;
  onExportResult?: () => void;
  onSaveChanges?: (updatedResult: DocumentAnalysisResult) => void;
}

const DocumentAnalysisResultView: React.FC<DocumentAnalysisResultViewProps> = ({
  result,
  onBack,
  onCreateStory,
  onExportResult,
  onSaveChanges
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
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            返回
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">文档分析结果</h1>
        </div>
        
        <div className="flex items-center gap-3">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={cancelEdit}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                取消
              </Button>
              <Button
                size="sm"
                onClick={saveChanges}
                className="flex items-center gap-2"
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
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                编辑分析结果
              </Button>
              {onExportResult && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onExportResult}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  导出结果
                </Button>
              )}

            </>
          )}
        </div>
      </div>

      {/* 三列布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左列：人物分析 */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-blue-600" />
                人物分析
                {isEditing && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={addCharacter}
                    className="ml-auto h-6 w-6 p-0"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {data.characters.map((character, index) => (
                    <div key={index} className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-600" />
                          {isEditing ? (
                            <Input
                              value={character.name}
                              onChange={(e) => updateCharacter(index, 'name', e.target.value)}
                              className="h-6 text-sm font-semibold"
                              placeholder="角色名称"
                            />
                          ) : (
                            <span className="font-semibold text-gray-800">{character.name}</span>
                          )}
                        </div>
                        {isEditing && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeCharacter(index)}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="font-medium text-gray-600">定位：</span>
                          {isEditing ? (
                            <Input
                              value={character.role}
                              onChange={(e) => updateCharacter(index, 'role', e.target.value)}
                              className="h-6 text-xs mt-1"
                              placeholder="角色定位"
                            />
                          ) : (
                            <span className="text-gray-700">{character.role}</span>
                          )}
                        </div>
                        
                        <div>
                          <span className="font-medium text-gray-600">性格：</span>
                          {isEditing ? (
                            <Textarea
                              value={character.traits}
                              onChange={(e) => updateCharacter(index, 'traits', e.target.value)}
                              className="h-16 text-xs mt-1"
                              placeholder="性格特征"
                            />
                          ) : (
                            <p className="text-gray-700 text-xs leading-relaxed">{character.traits}</p>
                          )}
                        </div>
                        
                        <div>
                          <span className="font-medium text-gray-600">外貌：</span>
                          {isEditing ? (
                            <Textarea
                              value={character.appearance}
                              onChange={(e) => updateCharacter(index, 'appearance', e.target.value)}
                              className="h-16 text-xs mt-1"
                              placeholder="外貌描述"
                            />
                          ) : (
                            <p className="text-gray-700 text-xs leading-relaxed">{character.appearance}</p>
                          )}
                        </div>
                        
                        <div>
                          <span className="font-medium text-gray-600">背景：</span>
                          {isEditing ? (
                            <Textarea
                              value={character.backstory}
                              onChange={(e) => updateCharacter(index, 'backstory', e.target.value)}
                              className="h-16 text-xs mt-1"
                              placeholder="背景故事"
                            />
                          ) : (
                            <p className="text-gray-700 text-xs leading-relaxed">{character.backstory}</p>
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

        {/* 中列：故事背景与情节 */}
        <div className="space-y-4">
          {/* 故事背景 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Globe className="h-5 w-5 text-green-600" />
                故事背景
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-gray-600" />
                  <span className="font-semibold text-gray-700">时代背景</span>
                </div>
                {isEditing ? (
                  <Input
                    value={data.setting.time}
                    onChange={(e) => updateSetting('time', e.target.value)}
                    placeholder="时代背景"
                    className="text-sm"
                  />
                ) : (
                  <p className="text-gray-600 text-sm pl-6">{data.setting.time}</p>
                )}
              </div>
              
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-gray-600" />
                  <span className="font-semibold text-gray-700">地理位置</span>
                </div>
                {isEditing ? (
                  <Input
                    value={data.setting.place}
                    onChange={(e) => updateSetting('place', e.target.value)}
                    placeholder="地理位置"
                    className="text-sm"
                  />
                ) : (
                  <p className="text-gray-600 text-sm pl-6">{data.setting.place}</p>
                )}
              </div>
              
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="h-4 w-4 text-gray-600" />
                  <span className="font-semibold text-gray-700">世界观</span>
                </div>
                {isEditing ? (
                  <Textarea
                    value={data.setting.worldBackground}
                    onChange={(e) => updateSetting('worldBackground', e.target.value)}
                    placeholder="世界观设定"
                    className="text-sm h-20"
                  />
                ) : (
                  <p className="text-gray-600 text-sm leading-relaxed pl-6">{data.setting.worldBackground}</p>
                )}
              </div>
              
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="h-4 w-4 text-gray-600" />
                  <span className="font-semibold text-gray-700">整体氛围</span>
                </div>
                {isEditing ? (
                  <Input
                    value={data.setting.atmosphere}
                    onChange={(e) => updateSetting('atmosphere', e.target.value)}
                    placeholder="整体氛围"
                    className="text-sm"
                  />
                ) : (
                  <p className="text-gray-600 text-sm pl-6">{data.setting.atmosphere}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 主题分析 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="h-5 w-5 text-purple-600" />
                主题分析
                {isEditing && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={addMainTheme}
                    className="ml-auto h-6 w-6 p-0"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="font-semibold text-gray-700 mb-2">主要主题</div>
                <div className="flex flex-wrap gap-2">
                  {data.themes.mainThemes.map((theme, index) => (
                    <div key={index} className="flex items-center gap-1">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={theme}
                            onChange={(e) => updateMainTheme(index, e.target.value)}
                            className="h-6 text-xs w-20"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeMainTheme(index)}
                            className="h-6 w-6 p-0 text-red-500"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          {theme}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <div className="font-semibold text-gray-700 mb-2">深层含义</div>
                {isEditing ? (
                  <Textarea
                    value={data.themes.deeperMeaning}
                    onChange={(e) => updateThemes('deeperMeaning', e.target.value)}
                    placeholder="深层含义分析"
                    className="text-sm h-20"
                  />
                ) : (
                  <p className="text-gray-600 text-sm leading-relaxed">{data.themes.deeperMeaning}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 情节元素 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sword className="h-5 w-5 text-red-600" />
                情节元素
                {isEditing && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={addKeyEvent}
                    className="ml-auto h-6 w-6 p-0"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="font-semibold text-gray-700 mb-2">主要冲突</div>
                {isEditing ? (
                  <Textarea
                    value={data.plotElements.mainConflict}
                    onChange={(e) => updatePlotElements('mainConflict', e.target.value)}
                    placeholder="主要冲突描述"
                    className="text-sm h-16"
                  />
                ) : (
                  <p className="text-gray-600 text-sm leading-relaxed">{data.plotElements.mainConflict}</p>
                )}
              </div>
              
              <div>
                <div className="font-semibold text-gray-700 mb-2">关键事件</div>
                <div className="space-y-2">
                  {data.plotElements.keyEvents.map((event, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-4">{index + 1}.</span>
                      {isEditing ? (
                        <div className="flex-1 flex items-center gap-2">
                          <Input
                            value={event}
                            onChange={(e) => updateKeyEvent(index, e.target.value)}
                            className="text-xs h-6"
                            placeholder="关键事件"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeKeyEvent(index)}
                            className="h-6 w-6 p-0 text-red-500"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-gray-600 text-xs">{event}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <div className="font-semibold text-gray-700 mb-2">叙事技巧</div>
                {isEditing ? (
                  <Textarea
                    value={data.plotElements.narrativeTechniques}
                    onChange={(e) => updatePlotElements('narrativeTechniques', e.target.value)}
                    placeholder="叙事技巧描述"
                    className="text-sm h-16"
                  />
                ) : (
                  <p className="text-gray-600 text-sm leading-relaxed">{data.plotElements.narrativeTechniques}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 写作风格 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Palette className="h-5 w-5 text-indigo-600" />
                写作风格
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="font-semibold text-gray-700 mb-2">语调</div>
                {isEditing ? (
                  <Input
                    value={data.writingStyle.tone}
                    onChange={(e) => updateWritingStyle('tone', e.target.value)}
                    placeholder="语调风格"
                    className="text-sm"
                  />
                ) : (
                  <p className="text-gray-600 text-sm">{data.writingStyle.tone}</p>
                )}
              </div>
              
              <div>
                <div className="font-semibold text-gray-700 mb-2">叙述视角</div>
                {isEditing ? (
                  <Input
                    value={data.writingStyle.narrativePerspective}
                    onChange={(e) => updateWritingStyle('narrativePerspective', e.target.value)}
                    placeholder="叙述视角"
                    className="text-sm"
                  />
                ) : (
                  <p className="text-gray-600 text-sm">{data.writingStyle.narrativePerspective}</p>
                )}
              </div>
              
              <div>
                <div className="font-semibold text-gray-700 mb-2">文体类型</div>
                {isEditing ? (
                  <Input
                    value={data.writingStyle.genre}
                    onChange={(e) => updateWritingStyle('genre', e.target.value)}
                    placeholder="文体类型"
                    className="text-sm"
                  />
                ) : (
                  <p className="text-gray-600 text-sm">{data.writingStyle.genre}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右列：创意种子 */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lightbulb className="h-5 w-5 text-yellow-600" />
                创意种子
                {isEditing && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={addSuggestedSeed}
                    className="ml-auto h-6 w-6 p-0"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                )}
              </CardTitle>
              {!isEditing && (
                <p className="text-xs text-gray-500 mt-1">
                  点击选择一个创意种子作为故事起点
                </p>
              )}
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {data.suggestedStorySeeds.map((seed, index) => (
                    <div 
                      key={index} 
                      className={`p-4 border rounded-lg transition-all cursor-pointer ${
                        selectedSeedIndex === index 
                          ? 'border-blue-500 bg-blue-50 shadow-md' 
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                      } ${isEditing ? 'cursor-default' : 'cursor-pointer'}`}
                      onClick={!isEditing ? () => setSelectedSeedIndex(selectedSeedIndex === index ? null : index) : undefined}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-1">
                          <BookOpen className="h-4 w-4 text-gray-600 flex-shrink-0" />
                          {isEditing ? (
                            <Input
                              value={seed.title}
                              onChange={(e) => updateSuggestedSeed(index, 'title', e.target.value)}
                              className="h-6 text-sm font-semibold"
                              placeholder="故事标题"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <h3 className="font-semibold text-gray-800 text-sm">{seed.title}</h3>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {!isEditing && selectedSeedIndex === index && (
                            <CheckCircle2 className="h-4 w-4 text-blue-600" />
                          )}
                          {isEditing && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeSuggestedSeed(index);
                              }}
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-3 text-xs">
                        <div>
                          <span className="font-medium text-gray-600">故事前提：</span>
                          {isEditing ? (
                            <Textarea
                              value={seed.premise}
                              onChange={(e) => updateSuggestedSeed(index, 'premise', e.target.value)}
                              className="h-16 text-xs mt-1"
                              placeholder="故事前提"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <p className="text-gray-700 text-xs leading-relaxed mt-1">{seed.premise}</p>
                          )}
                        </div>
                        
                        <div>
                          <span className="font-medium text-gray-600">主要角色：</span>
                          {isEditing ? (
                            <Textarea
                              value={Array.isArray(seed.characters) ? seed.characters.join(', ') : seed.characters}
                              onChange={(e) => updateSuggestedSeed(index, 'characters', e.target.value.split(', '))}
                              className="h-12 text-xs mt-1"
                              placeholder="主要角色（用逗号分隔）"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(Array.isArray(seed.characters) ? seed.characters : [seed.characters]).map((char, charIndex) => (
                                <Badge key={charIndex} variant="outline" className="text-xs">
                                  <Sparkles className="h-2 w-2 mr-1" />
                                  {char}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <div>
                          <span className="font-medium text-gray-600">故事背景：</span>
                          {isEditing ? (
                            <Textarea
                              value={seed.setting}
                              onChange={(e) => updateSuggestedSeed(index, 'setting', e.target.value)}
                              className="h-16 text-xs mt-1"
                              placeholder="故事背景"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <p className="text-gray-700 text-xs leading-relaxed mt-1">{seed.setting}</p>
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
        <div className="mt-8 border-t border-gray-200 pt-6">
          <div className="flex flex-col items-center space-y-4">
            {selectedSeedIndex !== null && (
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">已选择创意种子</p>
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">
                    {data.suggestedStorySeeds[selectedSeedIndex].title}
                  </span>
                </div>
              </div>
            )}
            
                         <Button
               size="lg"
               onClick={() => onCreateStory(selectedSeedIndex !== null ? data.suggestedStorySeeds[selectedSeedIndex] : undefined)}
               className="flex items-center gap-3 px-8 py-4 text-base font-medium bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
             >
               <Play className="h-5 w-5" />
               开始创作
             </Button>
            
            {selectedSeedIndex === null && (
              <p className="text-xs text-gray-500 text-center max-w-md">
                提示：选择一个创意种子可以获得更个性化的故事创作体验
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentAnalysisResultView; 
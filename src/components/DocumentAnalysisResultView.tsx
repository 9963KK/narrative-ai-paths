import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

  const PAPER_TEXTURE_URL = 'https://www.transparenttextures.com/patterns/cream-paper.png';

  return (
    <div className="min-h-screen bg-[#fdfbf9] relative font-serif">
      <div
        className="absolute inset-0 opacity-40 pointer-events-none z-0"
        style={{ backgroundImage: `url(${PAPER_TEXTURE_URL})` }}
      />
      {/* 简化的顶部背景 */}
      <div className="relative z-10">
        <div className="absolute inset-0 bg-[#f2f0ea]/30"></div>

        {/* 标题栏 */}
        <div className="relative z-10 bg-[#fffdf9] border-b border-[#c5a059]/30 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBack}
                  className="flex items-center gap-2 hover:bg-[#f2f0ea] rounded-xl px-4 py-2 text-[#5d554a] font-serif"
                >
                  <ArrowLeft className="h-4 w-4" />
                  返回
                </Button>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#2c241b] rounded-2xl flex items-center justify-center border border-[#c5a059]">
                    <BookOpen className="w-6 h-6 text-[#c5a059]" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-[#2c241b] font-serif">文档分析结果</h1>
                    <p className="text-sm text-[#8c7b6c] mt-1 font-serif italic">AI智能分析完成，为您提供创作灵感</p>
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
                      className="flex items-center gap-2 border-[#c5a059] text-[#5d554a] font-serif"
                    >
                      <X className="h-4 w-4" />
                      取消
                    </Button>
                    <Button
                      size="sm"
                      onClick={saveChanges}
                      className="flex items-center gap-2 bg-[#5d7a5d] hover:bg-[#4a634a] text-white font-serif"
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
                      className="flex items-center gap-2 border-[#c5a059] text-[#5d554a] hover:bg-[#c5a059]/10 font-serif"
                    >
                      <Edit className="h-4 w-4" />
                      编辑分析结果
                    </Button>
                    {onExportResult && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onExportResult}
                        className="flex items-center gap-2 border-[#c5a059] text-[#5d554a] hover:bg-[#c5a059]/10 font-serif"
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
          {/* 左列：人物分析 */}
          <div className="space-y-6">
            <Card className="bg-[#fffdf9] border border-[#c5a059] shadow-lg rounded-2xl overflow-hidden">
              <div className="bg-[#2c241b] p-6 border-b border-[#c5a059]">
                <CardTitle className="flex items-center gap-3 text-[#c5a059] text-xl font-bold font-serif">
                  <div className="w-10 h-10 bg-[#c5a059]/20 rounded-xl flex items-center justify-center border border-[#c5a059]/50">
                    <Users className="h-6 w-6 text-[#c5a059]" />
                  </div>
                  人物分析
                  {isEditing && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={addCharacter}
                      className="ml-auto h-8 w-8 p-0 bg-[#c5a059]/20 border-[#c5a059]/30 hover:bg-[#c5a059]/30 text-[#c5a059] rounded-lg"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </CardTitle>
                <p className="text-[#8c7b6c] text-sm mt-2 font-serif italic">分析文档中的关键人物角色</p>
              </div>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {data.characters.map((character, index) => (
                    <div key={index} className="group p-4 border border-[#f2f0ea] rounded-2xl bg-[#fdfbf9] hover:bg-[#f5f0e6] transition-colors duration-200">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-[#c5a059] rounded-full flex items-center justify-center border border-[#b08d4b]">
                            <User className="h-4 w-4 text-[#2c241b]" />
                          </div>
                          {isEditing ? (
                            <Input
                              value={character.name}
                              onChange={(e) => updateCharacter(index, 'name', e.target.value)}
                              className="h-8 text-sm font-bold bg-white border-[#f2f0ea] rounded-xl font-serif text-[#2c241b]"
                              placeholder="角色名称"
                            />
                          ) : (
                            <span className="font-bold text-[#2c241b] text-lg font-serif">{character.name}</span>
                          )}
                        </div>
                        {isEditing && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeCharacter(index)}
                            className="h-8 w-8 p-0 text-[#8a4b38] hover:text-[#6e3c2d] hover:bg-[#8a4b38]/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="space-y-3 text-sm font-serif">
                        <div className="bg-white rounded-xl p-3 border border-[#f2f0ea]">
                          <span className="font-bold text-[#5d554a] text-xs uppercase tracking-wide">定位</span>
                          {isEditing ? (
                            <Input
                              value={character.role}
                              onChange={(e) => updateCharacter(index, 'role', e.target.value)}
                              className="h-8 text-sm mt-2 bg-white border-[#f2f0ea] rounded-xl font-serif text-[#2c241b]"
                              placeholder="角色定位"
                            />
                          ) : (
                            <p className="text-[#2c241b] font-medium mt-1">{character.role}</p>
                          )}
                        </div>

                        <div className="bg-white rounded-xl p-3 border border-[#f2f0ea]">
                          <span className="font-bold text-[#5d554a] text-xs uppercase tracking-wide">性格特征</span>
                          {isEditing ? (
                            <Textarea
                              value={character.traits}
                              onChange={(e) => updateCharacter(index, 'traits', e.target.value)}
                              className="h-20 text-sm mt-2 bg-white border-[#e8e4d9] rounded-xl font-serif text-[#2c241b]"
                              placeholder="性格特征"
                            />
                          ) : (
                            <p className="text-[#5d554a] text-sm leading-relaxed mt-1">{character.traits}</p>
                          )}
                        </div>

                        <div className="bg-white rounded-xl p-3 border border-[#e8e4d9]">
                          <span className="font-bold text-[#5d554a] text-xs uppercase tracking-wide">外貌描述</span>
                          {isEditing ? (
                            <Textarea
                              value={character.appearance}
                              onChange={(e) => updateCharacter(index, 'appearance', e.target.value)}
                              className="h-20 text-sm mt-2 bg-white border-[#e8e4d9] rounded-xl font-serif text-[#2c241b]"
                              placeholder="外貌描述"
                            />
                          ) : (
                            <p className="text-[#5d554a] text-sm leading-relaxed mt-1">{character.appearance}</p>
                          )}
                        </div>

                        <div className="bg-white rounded-xl p-3 border border-[#e8e4d9]">
                          <span className="font-bold text-[#5d554a] text-xs uppercase tracking-wide">背景故事</span>
                          {isEditing ? (
                            <Textarea
                              value={character.backstory}
                              onChange={(e) => updateCharacter(index, 'backstory', e.target.value)}
                              className="h-20 text-sm mt-2 bg-white border-[#e8e4d9] rounded-xl font-serif text-[#2c241b]"
                              placeholder="背景故事"
                            />
                          ) : (
                            <p className="text-[#5d554a] text-sm leading-relaxed mt-1">{character.backstory}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

          </div>

          {/* 中列：故事背景 + 主题情节 + 写作风格 */}
          <div className="space-y-6">
            {/* 故事背景 */}
            <Card className="bg-[#fffdf9] border border-[#c5a059] shadow-lg rounded-2xl overflow-hidden">
              <div className="bg-[#5d7a5d] p-6 border-b border-[#c5a059]">
                <CardTitle className="flex items-center gap-3 text-[#fffdf9] text-xl font-bold font-serif">
                  <div className="w-10 h-10 bg-[#fffdf9]/20 rounded-xl flex items-center justify-center border border-[#fffdf9]/50">
                    <Globe className="h-6 w-6 text-[#fffdf9]" />
                  </div>
                  故事背景
                </CardTitle>
                <p className="text-[#e8e4d9] text-sm mt-2 font-serif italic">构建故事世界的基础设定</p>
              </div>
              <CardContent className="p-6 space-y-4">
                <div className="bg-[#fffdf9] rounded-2xl p-4 border-l-4 border-[#c5a059] shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-[#c5a059] rounded-full flex items-center justify-center">
                      <Clock className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-bold text-[#2c241b] text-lg font-serif">时代背景</span>
                  </div>
                  {isEditing ? (
                    <Input
                      value={data.setting.time}
                      onChange={(e) => updateSetting('time', e.target.value)}
                      placeholder="时代背景"
                      className="text-sm bg-white/80 border-[#e8e4d9] rounded-xl font-serif"
                    />
                  ) : (
                    <p className="text-[#5d554a] text-sm font-medium pl-2 font-serif">{data.setting.time}</p>
                  )}
                </div>

                <div className="bg-[#faf7f2] rounded-2xl p-4 border-l-4 border-[#5d7a5d] shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-[#5d7a5d] rounded-full flex items-center justify-center">
                      <MapPin className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-bold text-[#2c241b] text-lg font-serif">地理位置</span>
                  </div>
                  {isEditing ? (
                    <Input
                      value={data.setting.place}
                      onChange={(e) => updateSetting('place', e.target.value)}
                      placeholder="地理位置"
                      className="text-sm bg-white/80 border-[#e8e4d9] rounded-xl font-serif"
                    />
                  ) : (
                    <p className="text-[#5d554a] text-sm font-medium pl-2 font-serif">{data.setting.place}</p>
                  )}
                </div>

                <div className="bg-[#fffdf9] rounded-2xl p-4 border-l-4 border-[#8a4b38] shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-[#8a4b38] rounded-full flex items-center justify-center">
                      <Globe className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-bold text-[#2c241b] text-lg font-serif">世界观</span>
                  </div>
                  {isEditing ? (
                    <Textarea
                      value={data.setting.worldBackground}
                      onChange={(e) => updateSetting('worldBackground', e.target.value)}
                      placeholder="世界观设定"
                      className="text-sm h-24 bg-white/80 border-[#e8e4d9] rounded-xl font-serif"
                    />
                  ) : (
                    <p className="text-[#5d554a] text-sm leading-relaxed pl-2 font-serif">{data.setting.worldBackground}</p>
                  )}
                </div>

                <div className="bg-[#faf7f2] rounded-2xl p-4 border-l-4 border-[#8c7b6c] shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-[#8c7b6c] rounded-full flex items-center justify-center">
                      <Heart className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-bold text-[#2c241b] text-lg font-serif">整体氛围</span>
                  </div>
                  {isEditing ? (
                    <Input
                      value={data.setting.atmosphere}
                      onChange={(e) => updateSetting('atmosphere', e.target.value)}
                      placeholder="整体氛围"
                      className="text-sm bg-white/80 border-[#e8e4d9] rounded-xl font-serif"
                    />
                  ) : (
                    <p className="text-[#5d554a] text-sm font-medium pl-2 font-serif">{data.setting.atmosphere}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 主题与情节概要 */}
            <Card className="bg-[#faf7f2] border border-[#e8e4d9] shadow-lg rounded-2xl overflow-hidden">
              <div className="bg-[#2c241b] p-6 border-b border-[#c5a059]">
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
                <p className="text-[#e8e4d9] text-sm mt-2 font-serif italic">故事的核心主题与关键情节</p>
              </div>
              <CardContent className="p-6 space-y-4">
                {/* 主要主题 */}
                <div className="bg-[#fffdf9] rounded-2xl p-4 border-l-4 border-[#c5a059] shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-[#c5a059] rounded-full flex items-center justify-center">
                      <Target className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-bold text-[#2c241b] text-base font-serif">主要主题</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {data.themes.mainThemes.slice(0, 4).map((theme, index) => (
                      <div key={index} className="flex items-center gap-1">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <Input
                              value={theme}
                              onChange={(e) => updateMainTheme(index, e.target.value)}
                              className="h-7 text-xs w-20 bg-white/80 border-[#e8e4d9] rounded-lg font-serif"
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
                          <Badge className="bg-[#c5a059] text-white px-2 py-1 text-xs rounded-full font-serif">
                            {theme}
                          </Badge>
                        )}
                      </div>
                    ))}
                    {data.themes.mainThemes.length > 4 && (
                      <span className="text-xs text-[#8c7b6c] font-serif">+{data.themes.mainThemes.length - 4}个</span>
                    )}
                  </div>
                </div>

                {/* 主要冲突 */}
                <div className="bg-[#faf7f2] rounded-2xl p-4 border-l-4 border-[#8a4b38] shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-[#8a4b38] rounded-full flex items-center justify-center">
                      <Sword className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-bold text-[#2c241b] text-base font-serif">主要冲突</span>
                  </div>
                  {isEditing ? (
                    <Textarea
                      value={data.plotElements.mainConflict}
                      onChange={(e) => updatePlotElements('mainConflict', e.target.value)}
                      placeholder="主要冲突描述"
                      className="text-sm h-16 bg-white/80 border-[#e8e4d9] rounded-xl font-serif"
                    />
                  ) : (
                    <p className="text-[#5d554a] text-sm leading-relaxed font-serif">{data.plotElements.mainConflict}</p>
                  )}
                </div>

                {/* 关键事件 */}
                <div className="bg-[#fffdf9] rounded-2xl p-4 border-l-4 border-[#5d7a5d] shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-[#5d7a5d] rounded-full flex items-center justify-center">
                      <Clock className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-bold text-[#2c241b] text-base font-serif">关键事件</span>
                  </div>
                  <div className="space-y-2">
                    {data.plotElements.keyEvents.slice(0, 3).map((event, index) => (
                      <div key={index} className="flex items-start gap-2 bg-white/60 rounded-lg p-2">
                        <div className="w-5 h-5 bg-[#5d7a5d] rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {index + 1}
                        </div>
                        {isEditing ? (
                          <div className="flex-1 flex items-center gap-1">
                            <Input
                              value={event}
                              onChange={(e) => updateKeyEvent(index, e.target.value)}
                              className="text-xs h-6 bg-white/80 border-[#e8e4d9] rounded-lg font-serif"
                              placeholder="关键事件"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeKeyEvent(index)}
                              className="h-6 w-6 p-0 text-[#8a4b38] hover:bg-[#8a4b38]/10 rounded-lg"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[#5d554a] text-xs font-medium flex-1 font-serif">{event}</span>
                        )}
                      </div>
                    ))}
                    {data.plotElements.keyEvents.length > 3 && (
                      <div className="text-center">
                        <span className="text-xs text-[#8c7b6c] font-serif">还有 {data.plotElements.keyEvents.length - 3} 个事件...</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 写作风格 */}
            <Card className="bg-[#faf7f2] border border-[#e8e4d9] shadow-lg rounded-2xl overflow-hidden">
              <div className="bg-[#2c241b] p-6 border-b border-[#c5a059]">
                <CardTitle className="flex items-center gap-3 text-white text-xl font-bold">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Palette className="h-6 w-6 text-white" />
                  </div>
                  写作风格
                </CardTitle>
                <p className="text-[#e8e4d9] text-sm mt-2 font-serif italic">作品的独特表达方式</p>
              </div>
              <CardContent className="p-6 space-y-4">
                <div className="bg-[#fffdf9] rounded-2xl p-4 border-l-4 border-[#c5a059] shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-[#c5a059] rounded-full flex items-center justify-center">
                      <Heart className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-bold text-[#2c241b] text-lg font-serif">语调风格</span>
                  </div>
                  {isEditing ? (
                    <Input
                      value={data.writingStyle.tone}
                      onChange={(e) => updateWritingStyle('tone', e.target.value)}
                      placeholder="语调风格"
                      className="text-sm bg-white/80 border-[#e8e4d9] rounded-xl font-serif"
                    />
                  ) : (
                    <p className="text-[#5d554a] text-sm font-medium pl-2 font-serif">{data.writingStyle.tone}</p>
                  )}
                </div>

                <div className="bg-[#faf7f2] rounded-2xl p-4 border-l-4 border-[#8c7b6c] shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-[#8c7b6c] rounded-full flex items-center justify-center">
                      <Eye className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-bold text-[#2c241b] text-lg font-serif">叙述视角</span>
                  </div>
                  {isEditing ? (
                    <Input
                      value={data.writingStyle.narrativePerspective}
                      onChange={(e) => updateWritingStyle('narrativePerspective', e.target.value)}
                      placeholder="叙述视角"
                      className="text-sm bg-white/80 border-[#e8e4d9] rounded-xl font-serif"
                    />
                  ) : (
                    <p className="text-[#5d554a] text-sm font-medium pl-2 font-serif">{data.writingStyle.narrativePerspective}</p>
                  )}
                </div>

                <div className="bg-[#fffdf9] rounded-2xl p-4 border-l-4 border-[#5d7a5d] shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-[#5d7a5d] rounded-full flex items-center justify-center">
                      <BookOpen className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-bold text-[#2c241b] text-lg font-serif">文体类型</span>
                  </div>
                  {isEditing ? (
                    <Input
                      value={data.writingStyle.genre}
                      onChange={(e) => updateWritingStyle('genre', e.target.value)}
                      placeholder="文体类型"
                      className="text-sm bg-white/80 border-[#e8e4d9] rounded-xl font-serif"
                    />
                  ) : (
                    <p className="text-[#5d554a] text-sm font-medium pl-2 font-serif">{data.writingStyle.genre}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右列：创意种子 */}
          <div className="space-y-6">
            <Card className="bg-[#faf7f2] border border-[#e8e4d9] shadow-lg rounded-2xl overflow-hidden">
              <div className="bg-[#2c241b] p-6 border-b border-[#c5a059]">
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
                <div className="space-y-6 p-2">
                  {data.suggestedStorySeeds.map((seed, index) => (
                    <div
                      key={index}
                      className={`group p-6 border-2 rounded-2xl ${selectedSeedIndex === index
                        ? 'border-[#c5a059] bg-[#faf7f2] shadow-lg'
                        : 'border-[#e8e4d9] bg-[#faf7f2] hover:border-[#c5a059] hover:bg-[#c5a059]/10'
                        } transition-all duration-300`}
                      onClick={!isEditing ? () => setSelectedSeedIndex(selectedSeedIndex === index ? null : index) : undefined}
                    >
                      <div className="flex items-center gap-4 mb-3">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${selectedSeedIndex === index ? 'bg-[#c5a059]' : 'bg-[#e8e4d9]'
                          } text-white shadow-md transition-colors duration-300`}>
                          <Sparkles className={`w-5 h-5 ${selectedSeedIndex === index ? 'text-white' : 'text-[#8c7b6c]'}`} />
                        </div>
                        <div className="flex-1">
                          {isEditing ? (
                            <Input
                              value={seed.title}
                              onChange={(e) => updateSuggestedSeed(index, 'title', e.target.value)}
                              className="h-10 text-lg font-bold bg-white/80 border-orange-200/50 rounded-xl"
                              placeholder="故事标题"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <div className="flex items-center justify-between">
                              <h3 className="font-bold text-[#2c241b] text-lg font-serif">{seed.title}</h3>
                            </div>
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
                        <div className="bg-white/80 rounded-2xl p-4 border border-[#e8e4d9]/50">
                          <div className="flex items-start gap-3">
                            <div className="mt-1">
                              <BookOpen className="w-4 h-4 text-[#c5a059]" />
                            </div>
                            <div className="flex-1">
                              <h4 className="text-sm font-bold text-[#5d554a] mb-1 font-serif">核心梗概</h4>
                              {isEditing ? (
                                <Textarea
                                  value={seed.premise}
                                  onChange={(e) => updateSuggestedSeed(index, 'premise', e.target.value)}
                                  className="h-20 text-sm bg-white/80 border-blue-200/50 rounded-xl"
                                  placeholder="故事前提"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <p className="text-[#2c241b] text-sm leading-relaxed font-serif">{seed.premise}</p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="bg-white/80 rounded-2xl p-4 border border-[#e8e4d9]/50">
                          <div className="flex items-start gap-3">
                            <div className="mt-1">
                              <Users className="w-4 h-4 text-[#c5a059]" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-[#5d554a] mb-1 font-serif">主要角色</h4>
                              <div className="flex flex-wrap gap-2">
                                {seed.characters.map((char, i) => (
                                  <Badge key={i} variant="secondary" className="bg-[#e8e4d9] text-[#5d554a] hover:bg-[#dcd8cc] font-serif">
                                    {char}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white/80 rounded-2xl p-4 border border-[#e8e4d9]/50">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 bg-[#5d7a5d] rounded-full flex items-center justify-center">
                              <Globe className="h-3 w-3 text-white" />
                            </div>
                            <span className="font-bold text-[#2c241b] text-sm font-serif">故事背景</span>
                          </div>
                          {isEditing ? (
                            <Textarea
                              value={seed.setting}
                              onChange={(e) => updateSuggestedSeed(index, 'setting', e.target.value)}
                              className="h-20 text-sm bg-white/80 border-[#5d7a5d]/30 rounded-xl"
                              placeholder="故事背景"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <p className="text-[#2c241b] text-sm leading-relaxed font-serif">{seed.setting}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 底部创作按钮 */}
        {!isEditing && (
          <div className="mt-12">
            <div className="bg-[#faf7f2] rounded-3xl shadow-lg border border-[#e8e4d9] p-8">
              <div className="flex flex-col items-center space-y-6">
                {selectedSeedIndex !== null ? (
                  <div className="text-center">
                    <div className="flex items-center gap-3 bg-orange-50 border-2 border-orange-200 rounded-2xl px-6 py-4 shadow-lg">
                      <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
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
                    <div className="bg-[#fffdf9] border-2 border-[#c5a059] rounded-2xl px-6 py-4 shadow-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#c5a059] rounded-full flex items-center justify-center">
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
                    className={`flex items-center gap-3 px-10 py-6 text-lg font-bold rounded-2xl ${selectedSeedIndex !== null
                      ? 'bg-[#2c241b] hover:bg-[#4a3b2a] text-[#c5a059] border border-[#c5a059] shadow-md hover:shadow-lg font-serif'
                      : 'bg-[#e8e4d9] text-[#8c7b6c] cursor-not-allowed font-serif'
                      }`}
                  >
                    <Play className="h-6 w-6" />
                    开始创作
                  </Button>


                </div>

                {selectedSeedIndex === null && (
                  <div className="max-w-md text-center">
                    <p className="text-sm text-[#8c7b6c] font-medium bg-[#e8e4d9] px-4 py-2 rounded-full font-serif">
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
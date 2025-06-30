
import React, { useState, useRef, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface AdvancedSettingsProps {
  temperature: number;
  maxTokens: number;
  customPrompt?: string;
  onTemperatureChange: (value: number) => void;
  onMaxTokensChange: (value: number) => void;
  onCustomPromptChange: (value: string) => void;
}

const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({
  temperature,
  maxTokens,
  customPrompt,
  onTemperatureChange,
  onMaxTokensChange,
  onCustomPromptChange
}) => {
  const [currentView, setCurrentView] = useState<'panel' | 'sliders'>('panel');
  const [isDragging, setIsDragging] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);

  // 获取创作风格描述
  const getStyleDescription = () => {
    if (temperature > 0.5) {
      return maxTokens < 2000 ? '创意闪电' : '史诗巨著';
    } else {
      return maxTokens < 2000 ? '严谨短篇' : '洋洋洒洒';
    }
  };

  // 更新拖拽手柄位置
  const updateHandlePosition = () => {
    if (!panelRef.current || !handleRef.current) return;
    
    const rect = panelRef.current.getBoundingClientRect();
    const x = ((maxTokens - 100) / 3900) * rect.width; // 映射到0-4000范围
    const y = (1 - temperature) * rect.height; // 反转Y轴
    
    handleRef.current.style.left = `${x}px`;
    handleRef.current.style.top = `${y}px`;
  };

  // 处理拖拽
  const handleDrag = (clientX: number, clientY: number) => {
    if (!panelRef.current) return;
    
    const rect = panelRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
    
    const newTemperature = Math.max(0, Math.min(1, (rect.height - y) / rect.height));
    const newTokens = Math.round(100 + (x / rect.width) * 3900);
    
    onTemperatureChange(Number(newTemperature.toFixed(2)));
    onMaxTokensChange(newTokens);
  };

  // 鼠标事件
  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);
  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      e.preventDefault();
      handleDrag(e.clientX, e.clientY);
    }
  };

  // 触摸事件
  const handleTouchStart = () => setIsDragging(true);
  const handleTouchEnd = () => setIsDragging(false);
  const handleTouchMove = (e: TouchEvent) => {
    if (isDragging && e.touches[0]) {
      e.preventDefault();
      handleDrag(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isDragging]);

  useEffect(() => {
    updateHandlePosition();
  }, [temperature, maxTokens]);

  const getActiveZoneClass = (zone: string) => {
    const style = getStyleDescription();
    const zoneMap = {
      'tl': '创意闪电',
      'tr': '史诗巨著', 
      'bl': '严谨短篇',
      'br': '洋洋洒洒'
    };
    return zoneMap[zone as keyof typeof zoneMap] === style ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-400';
  };

  return (
    <div className="space-y-6">
      {/* 创作平衡面板视图 */}
      {currentView === 'panel' && (
        <div className="ui-text balance-panel-fade-in">
          <div className="text-center mb-6">
            <h3 className="font-bold text-slate-700 text-lg">创作平衡面板</h3>
            <p className="text-sm text-slate-500 mt-2">拖动控制点，找到最适合你的创作风格</p>
          </div>
          
          <div 
            ref={panelRef}
            className="relative w-full h-64 bg-gray-50 rounded-lg overflow-hidden grid grid-cols-2 grid-rows-2 border border-slate-200"
          >
            {/* 四象限 */}
            <div className={`border-r border-b border-gray-200 flex items-center justify-center p-2 transition-all duration-300 ${getActiveZoneClass('tl')}`}>
              创意闪电
            </div>
            <div className={`border-b border-gray-200 flex items-center justify-center p-2 transition-all duration-300 ${getActiveZoneClass('tr')}`}>
              史诗巨著
            </div>
            <div className={`border-r border-gray-200 flex items-center justify-center p-2 transition-all duration-300 ${getActiveZoneClass('bl')}`}>
              严谨短篇
            </div>
            <div className={`flex items-center justify-center p-2 transition-all duration-300 ${getActiveZoneClass('br')}`}>
              洋洋洒洒
            </div>
            
            {/* 坐标轴标签 */}
            <span className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 pointer-events-none">
              篇幅 (短 → 长)
            </span>
            <span className="absolute left-2 top-1/2 transform -translate-y-1/2 -rotate-90 text-xs text-gray-500 pointer-events-none">
              想象力 (保守 → 奔放)
            </span>
            
            {/* 拖拽手柄 */}
            <div
              ref={handleRef}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              className={`absolute w-8 h-8 bg-indigo-600 rounded-full shadow-lg flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 ${isDragging ? 'cursor-grabbing scale-110' : 'cursor-grab hover:scale-105'} transition-transform duration-200`}
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v4m0 0h-4m4 0l-5-5" />
              </svg>
            </div>
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-lg font-semibold text-gray-800">{getStyleDescription()}</p>
            <p className="text-sm text-gray-500">
              创造性: <span className="font-mono text-indigo-600">{temperature.toFixed(2)}</span>, 
              篇幅: <span className="font-mono text-indigo-600">{maxTokens}</span>
            </p>
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-200 text-center">
            <button 
              onClick={() => setCurrentView('sliders')}
              className="text-indigo-600 font-semibold text-sm hover:underline focus:outline-none transition-colors"
            >
              切换到精细化调整
            </button>
          </div>
        </div>
      )}

      {/* 精细化调整视图 */}
      {currentView === 'sliders' && (
        <div className="ui-text balance-panel-fade-in">
          <div className="text-center mb-6">
            <h3 className="font-bold text-slate-700 text-lg">精细化调整</h3>
            <p className="text-sm text-slate-500 mt-2">精确控制AI的每一个参数</p>
          </div>
          
          <div className="space-y-8">
            {/* 创造性滑块 */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label className="font-bold text-slate-700 text-base">创作风格</Label>
                <span className="font-mono text-indigo-600 bg-indigo-100 px-2 py-1 rounded-md text-sm">
                  {temperature.toFixed(2)}
                </span>
              </div>
              <p className="text-sm text-slate-500 mb-4">
                决定AI的想象力。更低的值结果更严谨，更高的值更天马行空。
              </p>
              <input
                type="range"
                min="0"
                max="1"
                value={temperature}
                step="0.05"
                onChange={(e) => onTemperatureChange(parseFloat(e.target.value))}
                className="config-slider"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>严谨务实</span>
                <span>平衡</span>
                <span>天马行空</span>
              </div>
            </div>

            {/* 篇幅滑块 */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label className="font-bold text-slate-700 text-base">生成篇幅</Label>
                <span className="font-mono text-indigo-600 bg-indigo-100 px-2 py-1 rounded-md text-sm">
                  {maxTokens}
                </span>
              </div>
              <p className="text-sm text-slate-500 mb-4">
                控制生成内容的长度。更短的篇幅适合摘要，更长的适合完整章节。
              </p>
              <input
                type="range"
                min="100"
                max="4000"
                value={maxTokens}
                step="100"
                onChange={(e) => onMaxTokensChange(parseInt(e.target.value))}
                className="config-slider"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>短小精悍</span>
                <span>标准</span>
                <span>洋洋洒洒</span>
              </div>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-200 text-center">
            <button 
              onClick={() => setCurrentView('panel')}
              className="text-indigo-600 font-semibold text-sm hover:underline focus:outline-none transition-colors"
            >
              返回到平衡面板
            </button>
          </div>
        </div>
      )}

      {/* 自定义提示词 */}
      <div>
        <Label htmlFor="customPrompt" className="text-slate-700 font-medium">自定义系统提示词（可选）</Label>
        <Textarea
          id="customPrompt"
          value={customPrompt || ''}
          onChange={(e) => onCustomPromptChange(e.target.value)}
          placeholder="可以添加自定义的系统提示词来影响AI的创作风格..."
          className="mt-2 bg-white border-slate-300 text-slate-800 resize-none"
          rows={3}
        />
      </div>
    </div>
  );
};

export default AdvancedSettings;

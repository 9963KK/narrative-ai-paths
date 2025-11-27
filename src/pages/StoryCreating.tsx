import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Feather } from 'lucide-react';
import StoryManager from '@/components/StoryManager';
import { storyAI } from '@/services/storyAI';
import { modelConfigAdapter } from '@/services/modelConfigAdapter';
import { FadeIn } from '@/components/animations/FadeIn';

// 纹理资源
const PAPER_TEXTURE_URL = "https://www.transparenttextures.com/patterns/cream-paper.png";

// 金色波浪动画组件
interface GoldenWaveCanvasProps {
  isExiting?: boolean;
  onExitComplete?: () => void;
}

const GoldenWaveCanvas: React.FC<GoldenWaveCanvasProps> = ({ isExiting, onExitComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const separationRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width: number;
    let height: number;
    let time = 0;

    // 粒子系统
    const particles: { x: number, y: number, vx: number, vy: number, life: number, maxLife: number, size: number }[] = [];

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth * window.devicePixelRatio;
        canvas.height = parent.clientHeight * window.devicePixelRatio;
        canvas.style.width = `${parent.clientWidth}px`;
        canvas.style.height = `${parent.clientHeight}px`;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        width = parent.clientWidth;
        height = parent.clientHeight;
      }
    };

    window.addEventListener('resize', resize);
    resize();

    const createParticle = (x: number, y: number) => {
      particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        life: 0,
        maxLife: Math.random() * 100 + 50,
        size: Math.random() * 1.5
      });
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      time += 0.02;

      // 处理退出动画（波浪分离）
      if (isExiting) {
        separationRef.current += height * 0.015; // 分离速度
        if (separationRef.current > height * 0.6) {
          if (onExitComplete) onExitComplete();
          return;
        }
      }

      const centerY = height / 2;
      const separation = separationRef.current;

      // 混合模式设置为叠加，增强发光感
      ctx.globalCompositeOperation = 'lighter';

      // 绘制多条正弦波叠加
      const lines = 8;

      // 定义绘制波浪的函数
      const drawWaveBundle = (offsetY: number, direction: 1 | -1) => {
        for (let j = 0; j < lines; j++) {
          ctx.beginPath();
          const alpha = 0.1 + (Math.sin(time + j) + 1) * 0.05;
          ctx.strokeStyle = `rgba(197, 160, 89, ${alpha})`; // 金色
          ctx.lineWidth = 1.5;

          for (let x = 0; x < width; x += 2) {
            // 计算波形
            // 基础波
            const baseAmp = 30 * Math.sin(time * 0.5);
            // 叠加波
            const noise = Math.sin(x * 0.01 + time * 2 + j * 0.5) * 20 * Math.sin(time);
            // 边缘衰减 (让波浪在两端变平)
            const envelope = Math.sin((x / width) * Math.PI);

            const waveY = (Math.sin(x * 0.02 + time + j) * 40 + noise) * envelope * Math.sin(time * 0.2 + j);
            const y = offsetY + waveY;

            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);

            // 随机生成粒子
            if (Math.random() < 0.005 && envelope > 0.5) {
              createParticle(x, y);
            }
          }
          ctx.stroke();
        }

        // 绘制核心亮线
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#c5a059';
        for (let x = 0; x < width; x += 2) {
          const envelope = Math.sin((x / width) * Math.PI);
          const waveY = Math.sin(x * 0.03 + time * 2) * 10 * envelope;
          const y = offsetY + waveY;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      };

      // 绘制上下两组波浪（如果未退出，separation为0，重合）
      drawWaveBundle(centerY - separation, -1);
      if (separation > 0) {
        drawWaveBundle(centerY + separation, 1);
      }

      // 更新和绘制粒子
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;

        // 粒子跟随波浪分离（简单处理：一半向上，一半向下）
        if (isExiting) {
          if (i % 2 === 0) p.y -= height * 0.015;
          else p.y += height * 0.015;
        }

        p.y += p.vy;
        p.life++;

        const opacity = 1 - p.life / p.maxLife;
        if (opacity <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.fillStyle = `rgba(197, 160, 89, ${opacity})`;
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isExiting, onExitComplete]);

  return <canvas ref={canvasRef} className="w-full h-full" />;
};

const StoryCreating: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [aiStoryData, setAiStoryData] = useState<any>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiCompleted, setAiCompleted] = useState(false);
  const [exitComplete, setExitComplete] = useState(false);

  useEffect(() => {
    // 检查是否有待处理的故事配置
    const pendingConfigStr = localStorage.getItem('pendingStoryConfig');
    if (!pendingConfigStr) {
      // 如果没有配置，返回主页
      navigate('/app');
      return;
    }

    // 启动AI调用
    const startAIGeneration = async () => {
      const startTime = performance.now();
      try {
        const { config, modelConfig, isAdvanced } = JSON.parse(pendingConfigStr);
        console.log('🤖 开始AI故事生成...', `[${new Date().toLocaleTimeString()}]`);

        // 确保用户有可用模型
        const hasModels = await modelConfigAdapter.ensureUserHasModels();
        if (!hasModels) {
          throw new Error('用户没有可用的AI模型，请联系管理员分配模型权限');
        }

        let configToUse = modelConfig;
        if (!modelConfig.apiKey) {
          const userConfig = await modelConfigAdapter.getUserModelConfig(true);
          if (userConfig) {
            configToUse = userConfig;
            console.log('🔧 使用用户配置的模型:', userConfig.provider, userConfig.model);
          } else {
            throw new Error('无法获取有效的模型配置，请检查模型设置');
          }
        }

        // 清除对话历史，准备新故事
        storyAI.clearConversationHistory();

        // 调用AI生成初始故事
        console.log('📡 开始调用storyAI.generateInitialStory...', `[${new Date().toLocaleTimeString()}]`);
        const aiCallStart = performance.now();
        const response = await storyAI.generateInitialStory(config, isAdvanced);
        const aiCallEnd = performance.now();
        console.log('📡 storyAI.generateInitialStory完成', `[${new Date().toLocaleTimeString()}]`, `耗时: ${((aiCallEnd - aiCallStart) / 1000).toFixed(2)}秒`);

        if (!response.success) {
          throw new Error(response.error || '故事生成失败');
        }

        // 创建故事上下文
        const processedStory = {
          story_id: `auto_${Date.now()}`,
          current_scene: response.content.scene || (response.content as any).initial_scene || (response.content as any).story || '',
          characters: response.content.characters || [],
          setting: response.content.setting_details || config.setting || '',
          chapter: 1,
          chapter_title: response.content.chapter_title || '第一章',
          choices_made: [],
          achievements: [],
          mood: response.content.mood || 'mysterious',
          tension_level: response.content.tension_level || 5,
          needs_choice: true,
          scene_type: 'exploration' as const,
          is_completed: false,
          story_progress: 0,
          main_goal_status: 'in_progress' as const,
          story_goals: config.story_goals || []
        };

        // 保存AI生成的数据
        setAiStoryData({
          storyState: processedStory,
          modelConfig: configToUse,
          conversationHistory: storyAI.getConversationHistory(),
          summaryState: storyAI.getSummaryState()
        });

        const endTime = performance.now();
        const totalTime = (endTime - startTime) / 1000;

        setAiCompleted(true);
        console.log('✅ AI故事生成完成', `[${new Date().toLocaleTimeString()}]`, `耗时: ${totalTime.toFixed(2)}秒`);

      } catch (error) {
        console.error('❌ AI故事生成失败:', error);
        setAiError(error instanceof Error ? error.message : '故事生成失败，请重试');
      }
    };

    // 启动AI生成
    startAIGeneration();
  }, [navigate]);

  useEffect(() => {
    if (exitComplete) {
      // 动画完全结束后，清理本地存储
      localStorage.removeItem('pendingStoryConfig');
    }
  }, [exitComplete]);

  const handleReturnToHome = () => {
    // 清除待处理的配置
    localStorage.removeItem('pendingStoryConfig');
    navigate('/app');
  };

  // 如果有AI错误，显示错误页面
  if (aiError) {
    return (
      <div className="min-h-screen bg-[#fdfbf9] flex items-center justify-center font-serif relative">
        <div className="absolute inset-0 opacity-30 pointer-events-none mix-blend-multiply" style={{ backgroundImage: `url(${PAPER_TEXTURE_URL})` }}></div>
        <div className="max-w-md mx-auto text-center p-8 bg-white border border-[#f2f0ea] rounded-2xl shadow-lg relative z-10">
          <div className="text-[#c5a059] text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-[#2c241b] mb-4">故事生成失败</h2>
          <p className="text-[#5d554a] mb-6">{aiError}</p>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => window.location.reload()} className="bg-[#2c241b] hover:bg-[#c5a059] text-[#fdfbf9]">
              重试
            </Button>
            <Button variant="outline" onClick={handleReturnToHome} className="border-[#f2f0ea] text-[#5d554a]">
              返回主页
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#fdfbf9] font-serif overflow-hidden">
      {/* 底层：StoryManager (当数据准备好时渲染) */}
      {aiStoryData && (
        <div className="absolute inset-0 z-0 overflow-y-auto">
          <StoryManager
            preloadedContext={{
              id: aiStoryData.storyState.story_id,
              title: `基于文档分析的故事 - ${new Date().toLocaleDateString()}`,
              storyState: aiStoryData.storyState,
              modelConfig: aiStoryData.modelConfig,
              conversationHistory: aiStoryData.conversationHistory,
              summaryState: aiStoryData.summaryState,
              currentChoices: [],
              saveTime: new Date(),
              lastPlayTime: new Date(),
              version: 1,
              isAutoSave: false,
              playTime: 0
            }}
            onReturnToHome={handleReturnToHome}
            onNavigate={(path) => navigate(path)}
          />
        </div>
      )}

      {/* 顶层：加载动画覆盖层 */}
      {!exitComplete && (
        <>
          {/* 背景层：控制淡出 */}
          <div
            className={`absolute inset-0 z-10 transition-opacity duration-1000 ease-in-out ${aiCompleted ? 'opacity-0' : 'opacity-100'}`}
            style={{ transitionDelay: '200ms' }}
          >
            <div className="absolute inset-0 bg-[#fdfbf9]" />
            <div
              className="absolute inset-0 opacity-40 pointer-events-none"
              style={{ backgroundImage: `url(${PAPER_TEXTURE_URL})` }}
            />
          </div>

          {/* 动画层：波浪动画 (独立于背景淡出，保持可见直到完全退出) */}
          <div className="absolute inset-0 z-20 pointer-events-none">
            <GoldenWaveCanvas
              isExiting={aiCompleted}
              onExitComplete={() => setExitComplete(true)}
            />
          </div>

          {/* 内容层：文字信息 (最先淡出) */}
          <div className={`absolute inset-0 z-30 flex flex-col items-center justify-center transition-opacity duration-500 ${aiCompleted ? 'opacity-0' : 'opacity-100'}`}>
            <div className="text-center relative z-10 p-8">
              <h2 className="text-4xl md:text-5xl font-bold text-[#2c241b] mb-6 tracking-wide font-serif">
                AI正在织造您的专属故事
              </h2>
              <p className="text-xl text-[#5d554a] font-serif italic mb-12">
                正在根据您的配置生成故事内容...
              </p>

              <div className="flex items-center justify-center gap-8 text-[#8c7b6c] text-sm font-serif">
                <div className="flex items-center gap-2">
                  <Feather className="w-4 h-4" />
                  <span>构建世界观</span>
                </div>
                <div className="w-1 h-1 bg-[#c5a059] rounded-full" />
                <div className="flex items-center gap-2">
                  <span>塑造角色</span>
                </div>
                <div className="w-1 h-1 bg-[#c5a059] rounded-full" />
                <div className="flex items-center gap-2">
                  <span>编织情节</span>
                  <Feather className="w-4 h-4 transform rotate-180" />
                </div>
              </div>

              <div className="mt-16">
                <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-[#fffdf9] border border-[#f2f0ea] shadow-sm">
                  <div className="w-2 h-2 bg-[#c5a059] rounded-full animate-pulse" />
                  <span className="text-[#c5a059] font-bold tracking-widest text-sm">AI创作中...</span>
                </div>
              </div>
            </div>

            <div className="absolute bottom-12 text-center w-full px-4">
              <p className="text-[#8c7b6c] text-sm font-serif italic opacity-60">
                "每一个伟大的故事，都始于一个微小的火花。"
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StoryCreating;

import React, { useEffect, useRef } from 'react';

interface GoldenWaveAnimationProps {
    isExiting?: boolean;
    onExitComplete?: () => void;
    className?: string;
}

export const GoldenWaveAnimation: React.FC<GoldenWaveAnimationProps> = ({
    isExiting,
    onExitComplete,
    className
}) => {
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

    return <canvas ref={canvasRef} className={className || "w-full h-full"} />;
};

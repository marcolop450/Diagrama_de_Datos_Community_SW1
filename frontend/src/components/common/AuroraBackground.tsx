import React, { useEffect, useRef } from 'react';

export const AuroraBackground: React.FC<{ opacity?: number }> = ({ opacity = 0.75 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameId = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    let t = 0;

    // Rich Aurora light wave nodes
    const lights = [
      { baseColor: 'rgba(56, 189, 248, ', speedX: 0.0009, speedY: 0.0012, radiusRatio: 0.55, initialX: 0.2, initialY: 0.25 },
      { baseColor: 'rgba(99, 102, 241, ', speedX: 0.0007, speedY: 0.0011, radiusRatio: 0.6, initialX: 0.8, initialY: 0.35 },
      { baseColor: 'rgba(168, 85, 247, ', speedX: 0.0011, speedY: 0.0008, radiusRatio: 0.65, initialX: 0.5, initialY: 0.75 },
      { baseColor: 'rgba(16, 185, 129, ', speedX: 0.0008, speedY: 0.0014, radiusRatio: 0.48, initialX: 0.15, initialY: 0.8 },
      { baseColor: 'rgba(236, 72, 153, ', speedX: 0.0012, speedY: 0.0007, radiusRatio: 0.45, initialX: 0.85, initialY: 0.8 },
    ];

    // Background floating starlight particles
    const stars = Array.from({ length: 35 }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.6 + 0.2,
      speed: Math.random() * 0.0004 + 0.0002,
    }));

    const render = () => {
      t += 1;
      ctx.clearRect(0, 0, width, height);

      // Deep atmospheric dark base
      ctx.fillStyle = '#060911';
      ctx.fillRect(0, 0, width, height);

      // 1. Draw glowing cosmic stars
      stars.forEach((star) => {
        const currentAlpha = star.alpha + Math.sin(t * star.speed * 20) * 0.25;
        ctx.fillStyle = `rgba(224, 231, 255, ${Math.max(0.1, currentAlpha)})`;
        ctx.beginPath();
        ctx.arc(star.x * width, ((star.y + t * star.speed) % 1) * height, star.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // 2. Multi-layer Screen Aurora Mesh
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.globalCompositeOperation = 'screen';

      lights.forEach((light, i) => {
        const curX = (light.initialX + Math.sin(t * light.speedX + i * 1.4) * 0.28) * width;
        const curY = (light.initialY + Math.cos(t * light.speedY + i * 1.1) * 0.24) * height;
        const curR = (light.radiusRatio + Math.sin(t * 0.0015 + i) * 0.1) * Math.min(width, height);

        const grad = ctx.createRadialGradient(curX, curY, 0, curX, curY, Math.max(20, curR));
        grad.addColorStop(0, `${light.baseColor}0.55)`);
        grad.addColorStop(0.4, `${light.baseColor}0.25)`);
        grad.addColorStop(0.7, `${light.baseColor}0.08)`);
        grad.addColorStop(1, `${light.baseColor}0)`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(curX, curY, curR, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();

      // 3. Subtle Engineering Dot Matrix
      ctx.save();
      ctx.fillStyle = 'rgba(51, 65, 85, 0.4)';
      const step = 42;
      for (let x = 0; x < width; x += step) {
        for (let y = 0; y < height; y += step) {
          ctx.fillRect(x, y, 1.2, 1.2);
        }
      }
      ctx.restore();

      animFrameId.current = requestAnimationFrame(render);
    };

    animFrameId.current = requestAnimationFrame(render);

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [opacity]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
    />
  );
};

import React, { useEffect, useRef } from 'react';

export const AuroraBackground: React.FC<{ opacity?: number }> = ({ opacity = 0.55 }) => {
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

    // Fluid Aurora color orbs
    const orbs = [
      { x: 0.25, y: 0.3, r: 0.45, color1: 'rgba(59, 130, 246, 0.45)', color2: 'rgba(37, 99, 235, 0)', speed: 0.0006 },
      { x: 0.75, y: 0.4, r: 0.5, color1: 'rgba(99, 102, 241, 0.42)', color2: 'rgba(79, 70, 229, 0)', speed: 0.0008 },
      { x: 0.5, y: 0.75, r: 0.55, color1: 'rgba(168, 85, 247, 0.35)', color2: 'rgba(147, 51, 234, 0)', speed: 0.0005 },
      { x: 0.15, y: 0.8, r: 0.4, color1: 'rgba(14, 165, 233, 0.38)', color2: 'rgba(2, 132, 199, 0)', speed: 0.0007 },
    ];

    const render = () => {
      t += 1;
      ctx.clearRect(0, 0, width, height);

      // Dark futuristic base
      ctx.fillStyle = '#070A12';
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.globalCompositeOperation = 'screen';

      // Draw moving flowing aurora orbs
      orbs.forEach((orb, i) => {
        const angle = t * orb.speed + (i * Math.PI) / 2;
        const currentX = (orb.x + Math.sin(angle) * 0.18) * width;
        const currentY = (orb.y + Math.cos(angle * 1.2) * 0.18) * height;
        const currentRadius = (orb.r + Math.sin(t * 0.001 + i) * 0.08) * Math.min(width, height);

        const grad = ctx.createRadialGradient(
          currentX, currentY, 0,
          currentX, currentY, Math.max(10, currentRadius)
        );
        grad.addColorStop(0, orb.color1);
        grad.addColorStop(0.5, orb.color1.replace('0.45', '0.2').replace('0.42', '0.2').replace('0.35', '0.15').replace('0.38', '0.18'));
        grad.addColorStop(1, orb.color2);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(currentX, currentY, currentRadius, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();

      // Subtle futuristic grid lines
      ctx.save();
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.35)';
      ctx.lineWidth = 1;
      const gridSize = 48;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
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

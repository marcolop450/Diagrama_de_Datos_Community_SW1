import React, { useEffect, useRef } from 'react';

interface AuroraBackgroundProps {
  opacity?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseAlpha: number;
}

export const AuroraBackground: React.FC<AuroraBackgroundProps> = ({ opacity = 0.85 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameId = useRef<number | null>(null);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({ x: -1000, y: -1000, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let particles: Particle[] = [];
    const initParticles = () => {
      const count = Math.floor(Math.min(width, height) / 18);
      particles = [];
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.45,
          vy: (Math.random() - 0.5) * 0.45,
          radius: Math.random() * 1.5 + 1.2,
          baseAlpha: Math.random() * 0.4 + 0.3,
        });
      }
    };

    initParticles();

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initParticles();
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    let t = 0;

    const render = () => {
      t += 0.005;
      ctx.clearRect(0, 0, width, height);

      // 1. Deep Graphite/Obsidian Base
      ctx.fillStyle = '#0a0c10';
      ctx.fillRect(0, 0, width, height);

      // 2. Soft Ambient Vignette & Glowing Spheres of Precision
      const primaryGlowX = width * 0.3 + Math.sin(t * 0.7) * 80;
      const primaryGlowY = height * 0.25 + Math.cos(t * 0.6) * 60;
      const grad1 = ctx.createRadialGradient(primaryGlowX, primaryGlowY, 0, primaryGlowX, primaryGlowY, width * 0.45);
      grad1.addColorStop(0, 'rgba(99, 102, 241, 0.14)'); // Indigo focal glow
      grad1.addColorStop(0.5, 'rgba(99, 102, 241, 0.04)');
      grad1.addColorStop(1, 'rgba(10, 12, 16, 0)');
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, width, height);

      const secondaryGlowX = width * 0.75 + Math.cos(t * 0.5) * 90;
      const secondaryGlowY = height * 0.45 + Math.sin(t * 0.8) * 70;
      const grad2 = ctx.createRadialGradient(secondaryGlowX, secondaryGlowY, 0, secondaryGlowX, secondaryGlowY, width * 0.4);
      grad2.addColorStop(0, 'rgba(56, 189, 248, 0.09)'); // Sapphire/Cyan depth glow
      grad2.addColorStop(0.6, 'rgba(56, 189, 248, 0.02)');
      grad2.addColorStop(1, 'rgba(10, 12, 16, 0)');
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, width, height);

      // 3. Technical Blueprint Dot-Matrix Grid
      ctx.save();
      const gridStep = 48;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
      for (let x = 0; x < width; x += gridStep) {
        for (let y = 0; y < height; y += gridStep) {
          ctx.fillRect(x, y, 1, 1);
        }
      }
      ctx.restore();

      // 4. Update & Draw Dynamic UML Constellation Network
      ctx.save();
      ctx.globalAlpha = opacity;

      const maxConnectDist = 135;
      const mouseInfluenceDist = 160;

      // Update particle physics
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        // Wrap screen edges smoothly
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;

        // Gentle mouse parallax / repulsion
        if (mouseRef.current.active) {
          const dx = p.x - mouseRef.current.x;
          const dy = p.y - mouseRef.current.y;
          const dist = Math.hypot(dx, dy);
          if (dist < mouseInfluenceDist && dist > 0) {
            const force = (1 - dist / mouseInfluenceDist) * 0.6;
            p.x += (dx / dist) * force;
            p.y += (dy / dist) * force;
          }
        }
      }

      // Draw connecting relationship links
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);

          if (dist < maxConnectDist) {
            const lineAlpha = (1 - dist / maxConnectDist) * 0.22;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(129, 140, 248, ${lineAlpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }

        // Draw node entity dot
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, p1.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(165, 180, 252, ${p1.baseAlpha})`;
        ctx.fill();
      }

      ctx.restore();

      animFrameId.current = requestAnimationFrame(render);
    };

    animFrameId.current = requestAnimationFrame(render);

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [opacity]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
    />
  );
};

export default AuroraBackground;


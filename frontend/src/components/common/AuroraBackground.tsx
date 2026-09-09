import React, { useEffect, useRef } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { getAppPalette } from '../../constants/canvasThemes';

interface AuroraBackgroundProps {
  opacity?: number;
}

export const AuroraBackground: React.FC<AuroraBackgroundProps> = ({ opacity = 0.85 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameId = useRef<number | null>(null);
  const { user } = useAuthStore();
  const activePaletteId = user?.preferences?.appPalette || 'warm-titanium';
  const palette = getAppPalette(activePaletteId);

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

    // Palette-driven vibrant color waves
    const isTitanium = activePaletteId === 'warm-titanium';
    const auroraWaves = isTitanium
      ? [
          { color: '245, 158, 11', baseY: 0.22, amp: 70, freq: 0.0018, speed: 0.012, alpha: 0.55 }, // Amber Gold
          { color: '217, 119, 6', baseY: 0.35, amp: 85, freq: 0.0014, speed: 0.009, alpha: 0.45 },  // Warm Bronze
          { color: '251, 146, 60', baseY: 0.18, amp: 60, freq: 0.0022, speed: 0.015, alpha: 0.48 }, // Sunset Terracotta
          { color: '139, 92, 246', baseY: 0.45, amp: 95, freq: 0.0011, speed: 0.007, alpha: 0.35 }, // Plum Violet depth
        ]
      : [
          { color: '99, 102, 241', baseY: 0.20, amp: 75, freq: 0.0018, speed: 0.012, alpha: 0.55 }, // Electric Indigo
          { color: '168, 85, 247', baseY: 0.32, amp: 85, freq: 0.0015, speed: 0.009, alpha: 0.50 }, // Vivid Violet
          { color: '6, 182, 212', baseY: 0.16, amp: 65, freq: 0.0021, speed: 0.014, alpha: 0.52 },  // Arctic Cyan
          { color: '236, 72, 153', baseY: 0.42, amp: 90, freq: 0.0012, speed: 0.008, alpha: 0.38 }, // Magenta Glow
        ];

    const render = () => {
      t += 1;
      ctx.clearRect(0, 0, width, height);

      // 1. Rich base canvas tone from active palette (Warm Charcoal or Deep Obsidian, NOT pitch black)
      ctx.fillStyle = palette.bgBase;
      ctx.fillRect(0, 0, width, height);

      // 2. Multi-Harmonic Radiant Aurora Ribbons
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.globalCompositeOperation = 'screen';

      auroraWaves.forEach((wave, idx) => {
        // Draw fluid undulating ribbon curtain
        ctx.beginPath();
        const startY = wave.baseY * height;
        ctx.moveTo(0, startY);

        const step = 24;
        for (let x = 0; x <= width + step; x += step) {
          const y = startY + Math.sin(x * wave.freq + t * wave.speed + idx * 1.5) * wave.amp
                          + Math.cos(x * wave.freq * 0.5 + t * wave.speed * 0.7) * (wave.amp * 0.5);
          ctx.lineTo(x, y);
        }

        ctx.lineTo(width, 0);
        ctx.lineTo(0, 0);
        ctx.closePath();

        // Vertical glowing curtain gradient
        const ribbonGrad = ctx.createLinearGradient(0, startY - wave.amp, 0, startY + wave.amp * 2);
        ribbonGrad.addColorStop(0, `rgba(${wave.color}, 0)`);
        ribbonGrad.addColorStop(0.3, `rgba(${wave.color}, ${wave.alpha})`);
        ribbonGrad.addColorStop(0.65, `rgba(${wave.color}, ${wave.alpha * 0.45})`);
        ribbonGrad.addColorStop(1, `rgba(${wave.color}, 0)`);

        ctx.fillStyle = ribbonGrad;
        ctx.fill();

        // Secondary breathing orbital plume for volumetric atmospheric depth
        const plumeX = ((Math.sin(t * 0.003 + idx * 2) * 0.35) + 0.5) * width;
        const plumeY = ((Math.cos(t * 0.0025 + idx * 1.8) * 0.25) + wave.baseY) * height;
        const plumeRadius = Math.min(width, height) * 0.45;

        const orbGrad = ctx.createRadialGradient(plumeX, plumeY, 0, plumeX, plumeY, plumeRadius);
        orbGrad.addColorStop(0, `rgba(${wave.color}, ${wave.alpha * 0.6})`);
        orbGrad.addColorStop(0.4, `rgba(${wave.color}, ${wave.alpha * 0.25})`);
        orbGrad.addColorStop(1, `rgba(${wave.color}, 0)`);

        ctx.fillStyle = orbGrad;
        ctx.beginPath();
        ctx.arc(plumeX, plumeY, plumeRadius, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();

      // 3. Technical Grid Pattern for CASE Architectural Feel
      ctx.save();
      ctx.fillStyle = isTitanium ? 'rgba(82, 82, 91, 0.35)' : 'rgba(71, 85, 105, 0.35)';
      const gridStep = 40;
      for (let x = 0; x < width; x += gridStep) {
        for (let y = 0; y < height; y += gridStep) {
          ctx.fillRect(x, y, 1, 1);
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
  }, [opacity, activePaletteId, palette.bgBase]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
    />
  );
};


import React, { useEffect, useRef } from 'react';

interface Point {
  x: number;
  y: number;
}

export const CursorSpotlight: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const targetPos = useRef<Point>({ x: -100, y: -100 });
  const points = useRef<Point[]>([]);
  const isPointerActive = useRef(false);
  const animFrameId = useRef<number | null>(null);

  // Short, sleek, nimble trail (10 points max)
  const NUM_POINTS = 10;

  useEffect(() => {
    points.current = Array.from({ length: NUM_POINTS }, () => ({ x: -100, y: -100 }));

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const handleMouseMove = (e: MouseEvent) => {
      targetPos.current = { x: e.clientX, y: e.clientY };
      if (!isPointerActive.current) {
        isPointerActive.current = true;
        points.current.forEach((p) => {
          p.x = e.clientX;
          p.y = e.clientY;
        });
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        targetPos.current = { x: touch.clientX, y: touch.clientY };
        isPointerActive.current = true;
        points.current.forEach((p) => {
          p.x = touch.clientX;
          p.y = touch.clientY;
        });
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        targetPos.current = { x: touch.clientX, y: touch.clientY };
        isPointerActive.current = true;
      }
    };

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (isPointerActive.current) {
        const pts = points.current;

        // Head point chases target position quickly and responsively
        pts[0].x += (targetPos.current.x - pts[0].x) * 0.65;
        pts[0].y += (targetPos.current.y - pts[0].y) * 0.65;

        // Subsequent points chase with tight delay (short tail)
        for (let i = 1; i < NUM_POINTS; i++) {
          const factor = 0.55 - (i / NUM_POINTS) * 0.2;
          pts[i].x += (pts[i - 1].x - pts[i].x) * factor;
          pts[i].y += (pts[i - 1].y - pts[i].y) * factor;
        }

        // Draw short dynamic comet line
        if (pts.length > 1 && pts[0].x > -50) {
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);

          for (let i = 1; i < NUM_POINTS - 1; i++) {
            const xc = (pts[i].x + pts[i + 1].x) / 2;
            const yc = (pts[i].y + pts[i + 1].y) / 2;
            ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
          }

          // Compact gradient from cyan head to fading blue
          const grad = ctx.createLinearGradient(
            pts[0].x, pts[0].y,
            pts[NUM_POINTS - 1].x, pts[NUM_POINTS - 1].y
          );
          grad.addColorStop(0, 'rgba(56, 189, 248, 0.9)'); // Bright Cyan
          grad.addColorStop(0.5, 'rgba(96, 165, 250, 0.5)'); // Blue
          grad.addColorStop(1, 'rgba(99, 102, 241, 0)'); // Fast fade

          ctx.strokeStyle = grad;
          ctx.lineWidth = 2.2;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.shadowColor = 'rgba(56, 189, 248, 0.4)';
          ctx.shadowBlur = 8;
          ctx.stroke();

          // Small glowing cursor point
          ctx.beginPath();
          ctx.arc(pts[0].x, pts[0].y, 3, 0, Math.PI * 2);
          ctx.fillStyle = '#38BDF8';
          ctx.shadowColor = '#38BDF8';
          ctx.shadowBlur = 10;
          ctx.fill();

          // Subtle mini halo
          const headAura = ctx.createRadialGradient(
            pts[0].x, pts[0].y, 0,
            pts[0].x, pts[0].y, 22
          );
          headAura.addColorStop(0, 'rgba(56, 189, 248, 0.15)');
          headAura.addColorStop(1, 'rgba(56, 189, 248, 0)');
          ctx.beginPath();
          ctx.arc(pts[0].x, pts[0].y, 22, 0, Math.PI * 2);
          ctx.fillStyle = headAura;
          ctx.fill();
        }
      }

      animFrameId.current = requestAnimationFrame(render);
    };

    animFrameId.current = requestAnimationFrame(render);

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50 overflow-hidden"
    />
  );
};

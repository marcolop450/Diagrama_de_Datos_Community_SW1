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

  // Number of trail points for the elastic line
  const NUM_POINTS = 22;

  useEffect(() => {
    // Initialize trail points
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

    // Mouse events (Desktop)
    const handleMouseMove = (e: MouseEvent) => {
      targetPos.current = { x: e.clientX, y: e.clientY };
      if (!isPointerActive.current) {
        isPointerActive.current = true;
        // Snap initial points to cursor
        points.current.forEach((p) => {
          p.x = e.clientX;
          p.y = e.clientY;
        });
      }
    };

    // Touch events (Mobile & Tablet)
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

    // Animation render loop
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (isPointerActive.current) {
        const pts = points.current;

        // Head point chases target position with fast ease
        pts[0].x += (targetPos.current.x - pts[0].x) * 0.45;
        pts[0].y += (targetPos.current.y - pts[0].y) * 0.45;

        // Subsequent points chase preceding points with elastic delay
        for (let i = 1; i < NUM_POINTS; i++) {
          const factor = 0.38 - (i / NUM_POINTS) * 0.15; // smoother delay down the tail
          pts[i].x += (pts[i - 1].x - pts[i].x) * factor;
          pts[i].y += (pts[i - 1].y - pts[i].y) * factor;
        }

        // Draw elastic trailing ribbon line with gradient
        if (pts.length > 1 && pts[0].x > -50) {
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);

          for (let i = 1; i < NUM_POINTS - 1; i++) {
            const xc = (pts[i].x + pts[i + 1].x) / 2;
            const yc = (pts[i].y + pts[i + 1].y) / 2;
            ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
          }

          // Dynamic line gradient from bright cyan to deep blue-indigo fade
          const grad = ctx.createLinearGradient(
            pts[0].x, pts[0].y,
            pts[NUM_POINTS - 1].x, pts[NUM_POINTS - 1].y
          );
          grad.addColorStop(0, 'rgba(56, 189, 248, 0.85)'); // Cyan head
          grad.addColorStop(0.3, 'rgba(96, 165, 250, 0.7)'); // Blue
          grad.addColorStop(0.7, 'rgba(99, 102, 241, 0.4)'); // Indigo
          grad.addColorStop(1, 'rgba(129, 140, 248, 0)'); // Fade out

          ctx.strokeStyle = grad;
          ctx.lineWidth = 3.5;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.shadowColor = 'rgba(56, 189, 248, 0.5)';
          ctx.shadowBlur = 10;
          ctx.stroke();

          // Glowing Head Orb
          ctx.beginPath();
          ctx.arc(pts[0].x, pts[0].y, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#38BDF8';
          ctx.shadowColor = '#38BDF8';
          ctx.shadowBlur = 14;
          ctx.fill();

          // Soft Ambient Aura around Head
          const headAura = ctx.createRadialGradient(
            pts[0].x, pts[0].y, 0,
            pts[0].x, pts[0].y, 50
          );
          headAura.addColorStop(0, 'rgba(56, 189, 248, 0.18)');
          headAura.addColorStop(1, 'rgba(56, 189, 248, 0)');
          ctx.beginPath();
          ctx.arc(pts[0].x, pts[0].y, 50, 0, Math.PI * 2);
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

import React, { useEffect, useState, useRef } from 'react';

interface Ripple {
  id: number;
  x: number;
  y: number;
}

export const CursorSpotlight: React.FC = () => {
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [isPointerActive, setIsPointerActive] = useState(false);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const targetPos = useRef({ x: -100, y: -100 });
  const currentPos = useRef({ x: -100, y: -100 });
  const animFrameId = useRef<number | null>(null);

  useEffect(() => {
    // Smooth lerp loop
    const lerp = (start: number, end: number, factor: number) => start + (end - start) * factor;

    const animate = () => {
      currentPos.current.x = lerp(currentPos.current.x, targetPos.current.x, 0.18);
      currentPos.current.y = lerp(currentPos.current.y, targetPos.current.y, 0.18);
      setPos({ x: currentPos.current.x, y: currentPos.current.y });
      animFrameId.current = requestAnimationFrame(animate);
    };

    animFrameId.current = requestAnimationFrame(animate);

    // Mouse Move (Desktop)
    const handleMouseMove = (e: MouseEvent) => {
      targetPos.current = { x: e.clientX, y: e.clientY };
      if (!isPointerActive) setIsPointerActive(true);
    };

    // Touch Move / Touch Start (Mobile & Tablet)
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        targetPos.current = { x: touch.clientX, y: touch.clientY };
        setIsPointerActive(true);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        targetPos.current = { x: touch.clientX, y: touch.clientY };
        currentPos.current = { x: touch.clientX, y: touch.clientY };
        setIsPointerActive(true);
        addRipple(touch.clientX, touch.clientY);
      }
    };

    const handleTouchEnd = () => {
      // Keep position or fade
    };

    // Global Click / Tap Ripple
    const handlePointerDown = (e: PointerEvent) => {
      addRipple(e.clientX, e.clientY);
    };

    const addRipple = (x: number, y: number) => {
      const newId = Date.now() + Math.random();
      setRipples((prev) => [...prev.slice(-4), { id: newId, x, y }]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== newId));
      }, 700);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isPointerActive]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden select-none">
      {/* Dynamic Cursor Spotlight Orb */}
      {isPointerActive && (
        <div
          style={{
            transform: `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%)`,
            willChange: 'transform',
          }}
          className="absolute w-72 h-72 rounded-full bg-gradient-to-r from-blue-500/12 via-indigo-500/10 to-sky-400/8 blur-2xl transition-opacity duration-300 pointer-events-none"
        />
      )}

      {/* Small precision cursor core glow */}
      {isPointerActive && (
        <div
          style={{
            transform: `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%)`,
            willChange: 'transform',
          }}
          className="absolute w-4 h-4 rounded-full bg-blue-400/30 border border-blue-300/40 blur-xs transition-opacity duration-200 pointer-events-none hidden md:block"
        />
      )}

      {/* Click / Tap Ripple Waves */}
      {ripples.map((ripple) => (
        <div
          key={ripple.id}
          style={{
            left: `${ripple.x}px`,
            top: `${ripple.y}px`,
          }}
          className="absolute w-12 h-12 rounded-full border-2 border-blue-400/60 bg-blue-500/15 animate-ripple pointer-events-none"
        />
      ))}
    </div>
  );
};

import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { useIntroState } from './useIntroState';
import { Disintegrator } from './disintegrate';
import { ASCII_ART } from './ascii-art';
import '../../styles/ascii-intro.css';

declare global {
  interface Window {
    showMainContent?: () => void;
  }
}

export default function AsciiIntro() {
  const { phase, setPhase, shouldSkip, isVisible } = useIntroState();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const disintegratorRef = useRef<Disintegrator | null>(null);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    if (shouldSkip) {
        setRemoved(true);
        if (typeof window !== 'undefined' && (window as any).showMainContent) {
            (window as any).showMainContent();
        }
        return;
    }
    
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const originalStyle = window.getComputedStyle(document.body);
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = `-${scrollX}px`;
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    
    return () => {
        document.body.style.position = originalPosition;
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.width = '';
        document.body.style.height = '';
        
        document.body.style.overflow = originalOverflow || '';
        
        window.scrollTo(scrollX, scrollY);
        
        if (typeof window !== 'undefined' && (window as any).showMainContent) {
            (window as any).showMainContent();
        }
    };
  }, [shouldSkip]);

  useEffect(() => {
    if (shouldSkip || removed || phase === 'init') return;
    
    if (phase === 'done' || phase === '3-fade') return;
    if (document.hidden) return;

    const initCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const pxRatio = window.devicePixelRatio || 1;
      const displayWidth = window.innerWidth;
      const displayHeight = window.innerHeight;
      
      canvas.width = displayWidth * pxRatio;
      canvas.height = displayHeight * pxRatio;
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(pxRatio, pxRatio);

      const isSmall = displayWidth < 360;
      const fontSizePx = isSmall ? 8 : 10;
      const fontStr = `${fontSizePx}px "JetBrains Mono", monospace`;
      
      ctx.font = fontStr;
      const metrics = ctx.measureText('M');
      const charWidth = metrics.width;
      const charHeight = fontSizePx * 1.2;

      const onComplete = () => {
        setPhase('3-fade');
      };

      const d = new Disintegrator(
        ctx,
        displayWidth,
        displayHeight,
        ASCII_ART,
        isVisible,
        onComplete,
        '#d4d4d4',
        fontStr,
        undefined,
        charWidth,
        charHeight
      );
      
      disintegratorRef.current = d;
      
      d.drawStatic();
      disintegratorRef.current = d;
      
      if (phase === '2-scatter') {
        setTimeout(() => d.start(), 16);
      }
    };

    initCanvas();

    let resizeTimer: NodeJS.Timeout;
    const onResize = () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(initCanvas, 100);
    };
    window.addEventListener('resize', onResize, { passive: true });
    return () => {
        window.removeEventListener('resize', onResize);
        clearTimeout(resizeTimer);
    };
  }, [shouldSkip, removed, phase === 'init']);

  useEffect(() => {
    if (!disintegratorRef.current) return;
    
    if (phase === '2-scatter') {
        const timeoutId = setTimeout(() => {
            disintegratorRef.current?.start();
        }, 0);
        return () => clearTimeout(timeoutId);
    }
    
    return undefined;
  }, [phase]);

  if (removed) return null;

  return (
    <div 
      className={`ascii-overlay phase-${phase} ${phase === '3-fade' ? 'phase-3-fade' : ''}`}
      onTransitionEnd={(e) => {
        if (e.target === e.currentTarget && phase === '3-fade') {
            setRemoved(true);
            setPhase('done');
            if (typeof window !== 'undefined' && (window as any).showMainContent) {
                (window as any).showMainContent();
            }
            e.currentTarget.remove();
        }
      }}
    >
      <canvas ref={canvasRef} className="ascii-canvas" />
    </div>
  );
}

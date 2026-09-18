import React, { useEffect, useRef, useState, useCallback } from "react";
import type { Bounds, TelemetryData, SmokeParticle } from "./types";
import { useBeeBrain } from "./useBeeBrain";
import { renderBee } from "./renderBee";
import { getBeeCaption } from "./telemetryFormatters";

export interface HoneybeeAgentProps {
  isExiting?: boolean;
  onExitFinished?: () => void;
}

function createMinecraftSmoke(
  x: number,
  y: number,
  count: number,
  speedMult: number = 1.0,
): SmokeParticle[] {
  const list: SmokeParticle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = (25 + Math.random() * 85) * speedMult;
    list.push({
      x: x + (Math.random() - 0.5) * 16,
      y: y + (Math.random() - 0.5) * 16,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 18,
      size: 5 + Math.random() * 5,
      alpha: 0.9 + Math.random() * 0.1,
      life: 0,
      maxLife: 0.38 + Math.random() * 0.22,
      shade: Math.random(),
    });
  }
  return list;
}

export const HoneybeeAgent: React.FC<HoneybeeAgentProps> = ({
  isExiting = false,
  onExitFinished,
}) => {
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [hudPos, setHudPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hitBoxRef = useRef<HTMLDivElement | null>(null);
  const boundsRef = useRef<Bounds>({ width: 0, height: 0 });
  const rafIdRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number>(0);
  const isTabVisibleRef = useRef<boolean>(true);
  const hoverTimeoutRef = useRef<number | null>(null);
  const exitTimeoutRef = useRef<number | null>(null);

  const particlesRef = useRef<SmokeParticle[]>([]);
  const deathPhaseRef = useRef<{
    active: boolean;
    startTime: number;
    smokeSpawned: boolean;
  }>({
    active: false,
    startTime: 0,
    smokeSpawned: false,
  });

  const spawnX =
    typeof window !== "undefined" ? Math.round(window.innerWidth * 0.12) : 100;
  const spawnY =
    typeof window !== "undefined" ? Math.round(window.innerHeight * 0.32) : 250;

  const brain = useBeeBrain({
    initialX: spawnX,
    initialY: spawnY,
  });

  useEffect(() => {
    particlesRef.current.push(...createMinecraftSmoke(spawnX, spawnY, 18, 0.9));
  }, [spawnX, spawnY]);

  useEffect(() => {
    if (isExiting && !deathPhaseRef.current.active) {
      deathPhaseRef.current = {
        active: true,
        startTime: performance.now() / 1000,
        smokeSpawned: false,
      };

      exitTimeoutRef.current = window.setTimeout(() => {
        onExitFinished?.();
      }, 480);
    }
    return () => {
      if (exitTimeoutRef.current !== null) {
        window.clearTimeout(exitTimeoutRef.current);
      }
    };
  }, [isExiting, onExitFinished]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const cssWidth = window.innerWidth;
      const cssHeight = window.innerHeight;

      boundsRef.current = { width: cssWidth, height: cssHeight };

      canvas.width = Math.round(cssWidth * dpr);
      canvas.height = Math.round(cssHeight * dpr);
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;

      ctx.resetTransform();
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas, { passive: true });

    const startLoop = () => {
      if (rafIdRef.current !== null) return;
      lastTimestampRef.current = 0;
      rafIdRef.current = requestAnimationFrame(renderLoop);
    };

    const stopLoop = () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        isTabVisibleRef.current = false;
        stopLoop();
      } else {
        isTabVisibleRef.current = true;
        startLoop();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    const onMouseMove = (e: MouseEvent) => {
      if (!deathPhaseRef.current.active) {
        brain.handleMouseMove(e.clientX, e.clientY);
      }
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });

    const renderLoop = (timestamp: number) => {
      if (!isTabVisibleRef.current) {
        rafIdRef.current = null;
        return;
      }

      if (lastTimestampRef.current === 0) {
        lastTimestampRef.current = timestamp;
      }

      const rawDt = (timestamp - lastTimestampRef.current) / 1000;
      const dt = Math.min(rawDt, 0.1);
      lastTimestampRef.current = timestamp;

      const nowSec = performance.now() / 1000;
      const bounds = boundsRef.current;

      let deathProgress = 0;
      if (deathPhaseRef.current.active) {
        const elapsedDeath = nowSec - deathPhaseRef.current.startTime;
        deathProgress = Math.min(1.0, elapsedDeath / 0.45);

        if (elapsedDeath >= 0.13 && !deathPhaseRef.current.smokeSpawned) {
          deathPhaseRef.current.smokeSpawned = true;
          const currentKin = brain.kinematicsRef.current;
          particlesRef.current.push(
            ...createMinecraftSmoke(currentKin.x, currentKin.y, 24, 1.25),
          );
        }

        if (elapsedDeath >= 0.45) {
          onExitFinished?.();
          return;
        }
      }

      const kin = deathPhaseRef.current.active
        ? brain.kinematicsRef.current
        : brain.updateBrain(dt, nowSec, bounds);

      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.life += dt;
        if (p.life >= p.maxLife) {
          particlesRef.current.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy -= 22 * dt;
        p.vx *= Math.max(0, 1 - 2.8 * dt);
        p.alpha = Math.max(0, 1.0 - p.life / p.maxLife);
      }

      ctx.clearRect(0, 0, bounds.width, bounds.height);

      renderBee(ctx, {
        kinematics: kin,
        state: brain.stateRef.current,
        danceState: brain.danceStateRef.current,
        elapsedTime: nowSec,
        particles: particlesRef.current,
        deathProgress,
      });

      if (hitBoxRef.current) {
        if (deathPhaseRef.current.active) {
          hitBoxRef.current.style.display = "none";
        } else {
          hitBoxRef.current.style.display = "block";
          hitBoxRef.current.style.transform = `translate3d(${Math.round(kin.x - 20)}px, ${Math.round(kin.y - 20)}px, 0)`;
        }
      }

      rafIdRef.current = requestAnimationFrame(renderLoop);
    };

    startLoop();

    const handleAstroPageLoad = () => {
      resizeCanvas();
      startLoop();
    };
    document.addEventListener("astro:page-load", handleAstroPageLoad);

    return () => {
      stopLoop();
      window.removeEventListener("resize", resizeCanvas);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("astro:page-load", handleAstroPageLoad);
    };
  }, [brain, onExitFinished]);

  useEffect(() => {
    if (!isHovered || deathPhaseRef.current.active || isExiting) return;

    const interval = setInterval(() => {
      const kin = brain.kinematicsRef.current;
      setTelemetry(brain.getTelemetryData());
      setHudPos({ x: kin.x, y: kin.y });
    }, 100);

    return () => clearInterval(interval);
  }, [isHovered, brain, isExiting]);

  const handleHitBoxEnter = useCallback(() => {
    if (hoverTimeoutRef.current !== null) {
      window.clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(true);
    const nowSec = performance.now() / 1000;
    brain.handleHoverEnter(nowSec);
    const kin = brain.kinematicsRef.current;
    setTelemetry(brain.getTelemetryData());
    setHudPos({ x: kin.x, y: kin.y });
  }, [brain]);

  const handleHitBoxLeave = useCallback(() => {
    if (hoverTimeoutRef.current !== null) {
      window.clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = window.setTimeout(() => {
      setIsHovered(false);
      const nowSec = performance.now() / 1000;
      brain.handleHoverLeave(nowSec);
      hoverTimeoutRef.current = null;
    }, 200);
  }, [brain]);

  const viewportW = typeof window !== "undefined" ? window.innerWidth : 1200;
  const viewportH = typeof window !== "undefined" ? window.innerHeight : 800;

  let hudLeft = hudPos.x + 20;
  if (hudLeft + 270 > viewportW) {
    hudLeft = Math.max(16, hudPos.x - 275);
  }

  let hudTop = hudPos.y - 35;
  if (hudTop + 75 > viewportH) {
    hudTop = Math.max(16, viewportH - 85);
  }
  if (hudTop < 65) {
    hudTop = 65;
  }

  const caption = telemetry ? getBeeCaption(telemetry.state) : null;

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        role="presentation"
        className="fixed inset-0 pointer-events-none z-40 select-none"
      />

      <div
        ref={hitBoxRef}
        aria-hidden="true"
        role="presentation"
        onMouseEnter={handleHitBoxEnter}
        onMouseLeave={handleHitBoxLeave}
        className="fixed top-0 left-0 w-10 h-10 z-[45] pointer-events-auto cursor-crosshair select-none"
        style={{
          willChange: "transform",
          transform: "translate3d(-100px, -100px, 0)",
        }}
      />

      {isHovered && telemetry && !deathPhaseRef.current.active && (
        <aside
          role="status"
          aria-live="polite"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={handleHitBoxLeave}
          className="fixed z-[60] pointer-events-auto w-max max-w-[270px] rounded-[var(--radius-card)] border border-[var(--border-strong)] bg-[var(--surface-card)]/95 px-3 py-2 text-xs shadow-2xl backdrop-blur-md transition-opacity duration-150 text-[var(--text-primary)]"
          style={{
            left: `${hudLeft}px`,
            top: `${hudTop}px`,
          }}
        >
          <div className="font-semibold text-xs text-[var(--text-primary)] flex items-center gap-1.5 leading-tight">
            <span>🐝</span>
            <span className="text-[var(--accent)] font-bold">José</span>
            <span className="text-[var(--text-tertiary)]">·</span>
            <span className="text-[var(--text-secondary)] font-medium">
              {caption?.stateWord}
            </span>
          </div>

          <div className="text-[11px] text-[var(--text-secondary)] leading-snug mt-1 font-normal break-words">
            {caption?.sentence}
          </div>
        </aside>
      )}
    </>
  );
};

export default HoneybeeAgent;

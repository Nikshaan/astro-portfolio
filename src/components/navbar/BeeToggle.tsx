import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  Suspense,
} from "react";
import type { HoneybeeAgentProps } from "../honey-bee/HoneybeeAgent";

const STORAGE_KEY = "honeybee-enabled";

export const BeeToggle: React.FC = () => {
  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return (
        stored === "true" &&
        window.innerWidth >= 768 &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches
      );
    } catch {
      return false;
    }
  });
  const [isAgentMounted, setIsAgentMounted] = useState<boolean>(false);
  const [isExiting, setIsExiting] = useState<boolean>(false);

  const targetStateRef = useRef<boolean>(isEnabled);
  const AgentComponentRef =
    useRef<React.ComponentType<HoneybeeAgentProps> | null>(null);

  useEffect(() => {
    const handleResizeOrMotion = () => {
      const isMobile = window.innerWidth < 768;
      const prefersReduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if ((isMobile || prefersReduced) && targetStateRef.current) {
        targetStateRef.current = false;
        setIsEnabled(false);
        setIsAgentMounted(false);
      }
    };

    window.addEventListener("resize", handleResizeOrMotion, { passive: true });

    if (isEnabled) {
      import("../honey-bee/HoneybeeAgent")
        .then((mod) => {
          AgentComponentRef.current = mod.default || mod.HoneybeeAgent;
          if (targetStateRef.current) {
            setIsAgentMounted(true);
          }
        })
        .catch(() => {});
    }

    return () => {
      window.removeEventListener("resize", handleResizeOrMotion);
    };
  }, []);

  const handleToggle = useCallback(() => {
    if (
      window.innerWidth < 768 ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const nextState = !isEnabled;
    targetStateRef.current = nextState;
    setIsEnabled(nextState);

    try {
      localStorage.setItem(STORAGE_KEY, nextState ? "true" : "false");
    } catch {}

    if (nextState) {
      setIsExiting(false);
      if (AgentComponentRef.current) {
        setIsAgentMounted(true);
      } else {
        import("../honey-bee/HoneybeeAgent")
          .then((mod) => {
            AgentComponentRef.current = mod.default || mod.HoneybeeAgent;

            if (targetStateRef.current) {
              setIsAgentMounted(true);
            }
          })
          .catch(() => {});
      }
    } else {
      if (isAgentMounted) {
        setIsExiting(true);
      }
    }
  }, [isEnabled, isAgentMounted]);

  const handleExitFinished = useCallback(() => {
    setIsAgentMounted(false);
    setIsExiting(false);
  }, []);

  const AgentComp = AgentComponentRef.current;

  return (
    <>
      <div className="relative w-8 h-8 hidden md:flex items-center justify-center group">
        <button
          id="bee-toggle"
          type="button"
          role="switch"
          aria-checked={isEnabled}
          aria-label={
            isEnabled
              ? "Disable honeybee animation"
              : "Enable honeybee animation"
          }
          onClick={handleToggle}
          className={`relative cursor-pointer p-2 rounded-full transition-colors duration-200 flex items-center justify-center focus-visible:outline-none ${
            isEnabled
              ? "text-[var(--accent)] bg-[var(--accent-quiet)] hover:bg-[var(--accent-quiet)]"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]"
          }`}
        >
          {isEnabled ? (
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="w-4 h-4"
            >
              <ellipse
                cx="8.5"
                cy="8"
                rx="4.5"
                ry="2.8"
                transform="rotate(-30 8.5 8)"
                fill="currentColor"
                fillOpacity="0.3"
              />
              <ellipse
                cx="15.5"
                cy="8"
                rx="4.5"
                ry="2.8"
                transform="rotate(30 15.5 8)"
                fill="currentColor"
                fillOpacity="0.3"
              />
              <ellipse
                cx="12"
                cy="14"
                rx="4.2"
                ry="5.8"
                fill="#d97706"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <path d="M8.2 12.2h7.6" stroke="#1c1612" strokeWidth="1.6" />
              <path d="M8.5 15h7" stroke="#1c1612" strokeWidth="1.6" />
              <circle
                cx="12"
                cy="6.6"
                r="2.3"
                fill="#1c1612"
                stroke="currentColor"
                strokeWidth="1.4"
              />
              <path d="M10.8 4.6L9.5 2.5" />
              <path d="M13.2 4.6L14.5 2.5" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="w-4 h-4 opacity-75"
            >
              <ellipse
                cx="8.5"
                cy="8"
                rx="4"
                ry="2.5"
                transform="rotate(-30 8.5 8)"
                stroke="currentColor"
                strokeOpacity="0.6"
              />
              <ellipse
                cx="15.5"
                cy="8"
                rx="4"
                ry="2.5"
                transform="rotate(30 15.5 8)"
                stroke="currentColor"
                strokeOpacity="0.6"
              />
              <ellipse
                cx="12"
                cy="14"
                rx="3.8"
                ry="5.2"
                stroke="currentColor"
                strokeOpacity="0.8"
              />
              <path
                d="M8.8 12.5h6.4"
                stroke="currentColor"
                strokeOpacity="0.6"
              />
              <circle
                cx="12"
                cy="7"
                r="2"
                stroke="currentColor"
                strokeOpacity="0.8"
              />
              <line
                x1="3.5"
                y1="3.5"
                x2="20.5"
                y2="20.5"
                stroke="currentColor"
                strokeWidth="1.8"
                className="text-[var(--danger)]"
              />
            </svg>
          )}
        </button>

        <div
          role="tooltip"
          className="pointer-events-none absolute top-full mt-2.5 left-1/2 -translate-x-1/2 px-2.5 py-1 text-[11px] font-medium rounded-[var(--radius-control)] text-center leading-tight whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-[60] shadow-xl border border-[var(--border-strong)] bg-[var(--surface-card)] text-[var(--text-primary)]"
        >
          spawns a bee
        </div>
      </div>

      {isAgentMounted && AgentComp && (
        <Suspense fallback={null}>
          <AgentComp isExiting={isExiting} onExitFinished={handleExitFinished} />
        </Suspense>
      )}
    </>
  );
};

export default BeeToggle;

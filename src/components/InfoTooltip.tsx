import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";

const VIEWPORT_MARGIN = 12;
const TOOLTIP_GAP = 8;

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export const InfoTooltip: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [placement, setPlacement] = useState<{
    left: number;
    top: number;
    arrowLeft: number;
    above: boolean;
    maxContentHeight: number;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const tooltip = tooltipRef.current;
    if (!trigger || !tooltip) return;

    const triggerRect = trigger.getBoundingClientRect();
    const ttRect = tooltip.getBoundingClientRect();

    // Use documentElement client dimensions to account for scrollbars accurately
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    const viewportHeight = document.documentElement.clientHeight || window.innerHeight;

    // Detect navbar clearance
    const navbar = typeof document !== "undefined" ? document.getElementById("navbar") : null;
    const navBottom = navbar ? navbar.getBoundingClientRect().bottom : 56;
    const topSafeMargin = Math.max(VIEWPORT_MARGIN, navBottom + TOOLTIP_GAP);

    // If trigger button has scrolled off screen or under/behind the navbar, dismiss immediately
    if (
      triggerRect.bottom <= navBottom ||
      triggerRect.top >= viewportHeight ||
      triggerRect.right <= 0 ||
      triggerRect.left >= viewportWidth
    ) {
      setIsOpen(false);
      return;
    }

    // Center of trigger button along horizontal axis
    const px = triggerRect.left + triggerRect.width / 2;

    // Available width clamped between minimum readable width and viewport bounds
    const maxAvailableWidth = Math.max(180, viewportWidth - 2 * VIEWPORT_MARGIN);
    const ttWidth = Math.min(ttRect.width || 320, maxAvailableWidth);

    // Horizontal clamping: ensure tooltip never overflows left or right margins
    const minLeft = VIEWPORT_MARGIN;
    const maxLeft = Math.max(minLeft, viewportWidth - ttWidth - VIEWPORT_MARGIN);
    const left = Math.min(Math.max(px - ttWidth / 2, minLeft), maxLeft);

    // Arrow positioning relative to tooltip container (keep inside rounded corners)
    const arrowLeft = Math.min(Math.max(px - left, 14), Math.max(ttWidth - 14, 14));

    // Vertical space available above and below trigger, respecting topSafeMargin
    const spaceAbove = triggerRect.top - TOOLTIP_GAP - topSafeMargin;
    const spaceBelow = viewportHeight - triggerRect.bottom - TOOLTIP_GAP - VIEWPORT_MARGIN;

    // Measured natural height of the tooltip
    const naturalHeight = ttRect.height || 260;

    // Placement decision:
    // 1. If it fits cleanly below, place below
    // 2. Else if it fits cleanly above, place above
    // 3. Otherwise, place on whichever side offers more vertical room
    let above = false;
    if (spaceBelow >= naturalHeight) {
      above = false;
    } else if (spaceAbove >= naturalHeight) {
      above = true;
    } else {
      above = spaceAbove > spaceBelow;
    }

    const availableSpace = above ? spaceAbove : spaceBelow;
    // Leave a small buffer for outer padding / arrow
    const maxContentHeight = Math.max(100, Math.floor(availableSpace - 16));

    // Compute top position
    let top = 0;
    if (above) {
      const renderedHeight = Math.min(naturalHeight, Math.max(0, spaceAbove));
      top = triggerRect.top - renderedHeight - TOOLTIP_GAP;
    } else {
      top = triggerRect.bottom + TOOLTIP_GAP;
    }

    // Safety clamp: guarantees the tooltip can NEVER bleed into navbar or past bottom of viewport
    const maxTop = Math.max(
      topSafeMargin,
      viewportHeight - VIEWPORT_MARGIN - Math.min(naturalHeight, maxContentHeight + 16)
    );
    top = Math.max(topSafeMargin, Math.min(top, maxTop));

    setPlacement({
      left,
      top,
      arrowLeft,
      above,
      maxContentHeight,
    });
  }, []);

  const openTooltip = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsOpen(true);
  }, []);

  const scheduleClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = window.setTimeout(() => {
      setIsOpen(false);
      closeTimerRef.current = null;
    }, 150);
  }, []);

  const toggleTooltip = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsOpen((prev) => !prev);
  }, []);

  useIsomorphicLayoutEffect(() => {
    if (!isOpen) {
      setPlacement(null);
      return;
    }
    updatePosition();
  }, [isOpen, updatePosition]);

  // Dismiss tooltip on page scroll, update on window resize
  useEffect(() => {
    if (!isOpen) return;

    const handleScroll = (e: Event) => {
      // If the scroll happened inside the tooltip itself, don't close
      if (
        tooltipRef.current &&
        e.target instanceof Node &&
        tooltipRef.current.contains(e.target)
      ) {
        return;
      }
      setIsOpen(false);
    };

    const handleResize = () => updatePosition();

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpen, updatePosition]);

  // Re-measure if tooltip size changes (e.g. font loaded, text reflow)
  useEffect(() => {
    if (!isOpen || !tooltipRef.current || typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver(() => {
      updatePosition();
    });
    observer.observe(tooltipRef.current);
    return () => observer.disconnect();
  }, [isOpen, updatePosition]);

  // Dismiss on outside click / tap
  useEffect(() => {
    if (!isOpen) return;
    const onDocPointerDown = (e: MouseEvent | TouchEvent) => {
      const trigger = triggerRef.current;
      const tooltip = tooltipRef.current;
      const target = e.target;
      if (
        !target ||
        !(target instanceof Node) ||
        trigger?.contains(target) ||
        tooltip?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    };

    document.addEventListener("touchstart", onDocPointerDown, true);
    document.addEventListener("mousedown", onDocPointerDown, true);
    return () => {
      document.removeEventListener("touchstart", onDocPointerDown, true);
      document.removeEventListener("mousedown", onDocPointerDown, true);
    };
  }, [isOpen]);

  // Escape key listener to dismiss
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="How to read this chart"
        aria-describedby={isOpen ? "yearly-chart-info-tooltip" : undefined}
        aria-expanded={isOpen}
        onClick={toggleTooltip}
        onMouseEnter={openTooltip}
        onMouseMove={() => {
          if (!isOpen) openTooltip();
        }}
        onMouseLeave={scheduleClose}
        onFocus={openTooltip}
        onBlur={scheduleClose}
        className="cursor-pointer p-1 -mr-1 -mt-1 rounded-[var(--radius-control)] opacity-60 hover:opacity-100 focus-visible:opacity-100 transition-opacity shrink-0"
      >
        <Info className="w-4 h-4 text-[var(--text-tertiary)]" aria-hidden="true" />
      </button>

      {mounted &&
        isOpen &&
        createPortal(
          <div
            id="yearly-chart-info-tooltip"
            ref={tooltipRef}
            role="tooltip"
            onMouseEnter={openTooltip}
            onMouseLeave={scheduleClose}
            className="fixed z-40 box-border rounded-[var(--radius-control)] border border-[var(--border-subtle)] bg-[var(--surface-raised)] shadow-lg type-caption text-[var(--text-primary)]"
            style={{
              left: placement?.left ?? -9999,
              top: placement?.top ?? -9999,
              maxWidth: "min(20rem, calc(100vw - 24px))",
              opacity: placement ? 1 : 0,
              visibility: placement ? "visible" : "hidden",
              transition: "opacity 120ms ease",
              pointerEvents: "auto",
            }}
          >
            {placement && (
              <div
                aria-hidden="true"
                className="absolute h-2 w-2 rotate-45 border-[var(--border-subtle)] bg-[var(--surface-raised)] pointer-events-none"
                style={{
                  left: placement.arrowLeft - 4,
                  ...(placement.above
                    ? { bottom: -5, borderRight: "1px solid", borderBottom: "1px solid" }
                    : { top: -5, borderLeft: "1px solid", borderTop: "1px solid" }),
                }}
              />
            )}
            <div
              className="p-3 space-y-1.5 leading-relaxed text-pretty overflow-y-auto overscroll-contain"
              style={{
                maxHeight: placement?.maxContentHeight ? `${placement.maxContentHeight}px` : "70vh",
              }}
            >
              <p>This chart shows the top 10 artists I listened to the most over the last 12 months.</p>
              <p>Each ring represents an artist. The outermost ring is my most played artist of the year.</p>
              <p>
                Starting at the top and going clockwise, each slice represents one week of the year. Month names sit
                around the edge.
              </p>
              <p>
                Brighter means more plays that week, measured against that artist's own biggest
                week.
              </p>
              <p className="text-[var(--text-secondary)]">
                Hover over any slice to see what I was listening to that week.
              </p>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

export default InfoTooltip;

import React, { useCallback } from "react";
import { motion } from "framer-motion";
import { Maximize2 } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { SPANS, type SpanName } from "./spans";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const HOVER_TRANSITION = { duration: 0.22, ease: [0.25, 0.1, 0.25, 1] as const };
const HOVER_LIFT = { y: -2 };
const TAP_LIFT = { y: 0 };

export interface BentoCardProps {
  span: SpanName;
  children: React.ReactNode;
  className?: string;
  shellClassName?: string;
  expandable?: boolean;
  onActivate?: () => void;
  selected?: boolean;
  layoutId?: string;
  disableHoverMotion?: boolean;
  padded?: boolean;
  reveal?: boolean;
  href?: string;
  target?: string;
  rel?: string;
  download?: boolean | string;
  "aria-label"?: string;
}

const BentoCard = React.forwardRef<HTMLDivElement, BentoCardProps>(
  (
    {
      span,
      children,
      className,
      shellClassName,
      expandable = false,
      onActivate,
      selected = false,
      layoutId,
      disableHoverMotion = false,
      padded = true,
      reveal = true,
      href,
      target,
      rel,
      download,
      ...aria
    },
    ref,
  ) => {
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (!expandable || !onActivate) return;
        if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
          e.preventDefault();
          onActivate();
        }
      },
      [expandable, onActivate],
    );

    const isHoverable = !disableHoverMotion && (expandable || !!href) && !selected;

    const Comp: any = href ? motion.a : motion.div;
    const interactiveProps = href
      ? { href, target, rel, download }
      : expandable
        ? {
            role: "button" as const,
            tabIndex: 0,
            onClick: onActivate,
            onKeyDown: handleKeyDown,
          }
        : {};

    const body = (
      <Comp
        ref={ref as any}
        layoutId={layoutId}
        data-bento-shell=""
        data-bento-frozen={selected ? "" : undefined}
        className={cn(
          "relative block h-full w-full rounded-[var(--radius-card)] border overflow-hidden bento-card group",
          "bg-[var(--surface-card)] border-[var(--border-subtle)]",
          "text-[var(--text-primary)]",
          (expandable || href) && !selected ? "cursor-pointer" : "",
          shellClassName,
        )}
        whileHover={isHoverable ? HOVER_LIFT : undefined}
        whileTap={isHoverable ? TAP_LIFT : undefined}
        transition={isHoverable ? HOVER_TRANSITION : undefined}
        {...interactiveProps}
        {...aria}
      >
        <div className={cn("relative flex h-full w-full flex-col", padded && "p-5")}>
          {children}
        </div>
        {expandable && !selected && (
          <div className="pointer-events-none absolute top-4 right-4 z-10 opacity-60 group-hover:opacity-100 transition-opacity">
            <Maximize2 className="w-4 h-4 text-[var(--text-tertiary)]" aria-hidden="true" />
          </div>
        )}
      </Comp>
    );

    if (!reveal) {
      return (
        <div ref={ref as any} className={cn("h-full w-full", SPANS[span], className)}>
          {body}
        </div>
      );
    }

    return (
      <div
        className={cn("h-full w-full bento-reveal", SPANS[span], className)}
      >
        {body}
      </div>
    );
  },
);

BentoCard.displayName = "BentoCard";

export default BentoCard;

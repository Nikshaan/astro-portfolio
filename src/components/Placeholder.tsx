import type { CSSProperties } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type PlaceholderProps = {
  className?: string;
  style?: CSSProperties;
  as?: "div" | "span";
};

export function Placeholder({
  className,
  style,
  as: Comp = "div",
}: PlaceholderProps) {
  return (
    <Comp
      className={cn("skel rounded-[var(--radius-control)]", className)}
      style={style}
      aria-hidden="true"
    />
  );
}

export function GenreStreakPlaceholder() {
  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-wrap items-center gap-x-4 gap-y-2 px-5 py-2.5 md:px-6 md:py-3",
        "justify-between sm:justify-start",
      )}
      aria-hidden="true"
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5">
        <Placeholder className="h-3 w-16 sm:w-20" />
        <Placeholder className="h-3 w-20 sm:w-24" />
        <Placeholder className="hidden h-3 w-[4.5rem] sm:block" />
        <Placeholder className="hidden h-3 w-16 md:block" />
        <Placeholder className="hidden h-3 w-[4.75rem] lg:block" />
      </div>
      <div
        className="hidden h-[1.125rem] w-px shrink-0 self-center bg-[var(--border-subtle)] sm:block"
      />
      <div className="flex w-full shrink-0 items-center gap-2 border-t border-[var(--border-subtle)] pt-2 sm:w-auto sm:border-t-0 sm:pt-0">
        <span
          className="type-body-sm not-italic text-[var(--text-primary)]"
          aria-hidden="true"
        >
          ♪
        </span>
        <Placeholder className="h-3 w-36 max-w-full sm:w-40" />
      </div>
    </div>
  );
}

export function IndiaMapPlaceholder({
  className,
  framed = false,
  label = "Travels",
}: {
  className?: string;
  framed?: boolean;
  label?: string | null;
}) {
  const body = (
    <>
      {label ? (
        <span className="absolute top-4 left-4 z-10 type-bento-eyebrow text-[var(--text-tertiary)]">
          {label}
        </span>
      ) : null}
      <Placeholder className="absolute inset-10 sm:inset-12 rounded-[var(--radius-card)]" />
    </>
  );

  if (!framed) {
    return <div className={cn("absolute inset-0", className)}>{body}</div>;
  }

  return (
    <div
      className={cn(
        "relative h-full min-h-[184px] w-full overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-card)]",
        className,
      )}
    >
      {body}
    </div>
  );
}

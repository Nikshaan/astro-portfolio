import React, { useEffect, useState } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface BentoGridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

const BentoGrid: React.FC<BentoGridProps> = ({
  children,
  className,
  containerRef,
  ...rest
}) => {
  const [debug, setDebug] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDebug(new URLSearchParams(window.location.search).get("bento") === "debug");
  }, []);

  return (
    <div
      ref={containerRef}
      {...rest}
      data-bento-debug={debug ? "" : undefined}
      className={cn(
        "bento-grid grid grid-cols-4 lg:grid-cols-12 auto-rows-[minmax(var(--bento-row),auto)] gap-[var(--bento-gap)] w-full",
        className,
      )}
    >
      {children}
    </div>
  );
};

export default BentoGrid;

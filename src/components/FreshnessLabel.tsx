import React, { useEffect, useState } from "react";
import { useMusicStatsLive } from "../hooks/useMusicStatsLive";

export interface FreshnessLabelProps {
  fetchedAt: number | null | undefined;
  className?: string;
}

function formatAge(fetchedAt: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - fetchedAt) / 1000));
  const diffMin = Math.floor(diffSec / 60);

  if (diffMin < 1) {
    return "updated just now";
  }
  if (diffMin === 1) {
    return "updated 1 min ago";
  }
  if (diffMin < 60) {
    return `updated ${diffMin} min ago`;
  }
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours === 1) {
    return "updated 1 hour ago";
  }
  if (diffHours < 24) {
    return `updated ${diffHours} hours ago`;
  }
  return "updated 1+ day ago";
}

export const FreshnessLabel: React.FC<FreshnessLabelProps> = ({
  fetchedAt,
  className = "",
}) => {
  const [mounted, setMounted] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !fetchedAt) return;
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 30_000);
    return () => clearInterval(interval);
  }, [mounted, fetchedAt]);

  if (!mounted || !fetchedAt) {
    return null;
  }

  const label = formatAge(fetchedAt);

  return (
    <span
      className={`type-caption text-[var(--text-tertiary)] select-none whitespace-nowrap ${className}`}
      title={`Last fetched: ${new Date(fetchedAt).toLocaleTimeString()}`}
    >
      {label}
    </span>
  );
};

/**
 * Wrappers own the store subscription so poll updates re-render only the tiny
 * label, never the parent card grid (which holds the whole photo gallery).
 */
export const MusicStatsFreshness: React.FC = () => (
  <FreshnessLabel fetchedAt={useMusicStatsLive().fetchedAt} />
);

export default FreshnessLabel;

export const bentoCardHoverTransition = {
  duration: 0.22,
  ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
};

export const bentoCardHover = {
  y: -2,
};

export const bentoCardHoverCompact = {
  y: -1,
};

export const bentoCardTap = {
  y: 0,
};

export const bentoCardTapCompact = {
  y: 0,
};

export function getBentoCardHoverMotion(options?: { compact?: boolean }) {
  if (options?.compact) return bentoCardHoverCompact;
  return bentoCardHover;
}

export function getBentoCardTapMotion(options?: { compact?: boolean }) {
  if (options?.compact) return bentoCardTapCompact;
  return bentoCardTap;
}

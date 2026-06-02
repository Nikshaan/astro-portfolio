export const bentoCardHoverTransition = {
  duration: 0.26,
  ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
};

export const bentoCardHover = {
  scale: 1.008,
};

export const bentoCardHoverCompact = {
  scale: 1.012,
};

export const bentoCardTap = {
  scale: 0.996,
};

export const bentoCardTapCompact = {
  scale: 0.992,
};

export function getBentoCardHoverMotion(options?: { compact?: boolean }) {
  if (options?.compact) return bentoCardHoverCompact;
  return bentoCardHover;
}

export function getBentoCardTapMotion(options?: { compact?: boolean }) {
  if (options?.compact) return bentoCardTapCompact;
  return bentoCardTap;
}

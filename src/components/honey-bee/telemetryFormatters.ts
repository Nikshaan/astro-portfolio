import type { BeeState } from "./types";

export interface BeeCaption {
  stateWord: string;
  sentence: string;
}

export const BEE_CAPTIONS: Record<BeeState, BeeCaption> = {
  FORAGING: {
    stateWord: "Foraging",
    sentence: "Flying around looking for flowers.",
  },
  HOVER: {
    stateWord: "Hovering",
    sentence: "Noticed you watching.",
  },
  ROUND_DANCE: {
    stateWord: "Dancing",
    sentence: "Found food nearby — telling the others!",
  },
  WAGGLE_DANCE: {
    stateWord: "Dancing",
    sentence: "Found food far away — telling the others!",
  },
  GROOMING: {
    stateWord: "Grooming",
    sentence: "Taking a break to clean up.",
  },
  LOOMING_ESCAPE: {
    stateWord: "Evading",
    sentence: "Startled! Flying away fast.",
  },
};

export function getBeeCaption(state: BeeState): BeeCaption {
  return (
    BEE_CAPTIONS[state] ?? {
      stateWord: "Foraging",
      sentence: "Flying around looking for flowers.",
    }
  );
}

export interface FormattedItem {
  primary: string;
  technical: string;
}

export function formatState(state: BeeState): FormattedItem {
  switch (state) {
    case "FORAGING":
      return { primary: "Foraging", technical: "FORAGING" };
    case "GROOMING":
      return { primary: "Grooming", technical: "GROOMING" };
    case "HOVER":
      return { primary: "Investigating", technical: "HOVER" };
    case "LOOMING_ESCAPE":
      return { primary: "Evading", technical: "LOOMING_ESCAPE" };
    case "ROUND_DANCE":
      return { primary: "Signaling", technical: "ROUND_DANCE" };
    case "WAGGLE_DANCE":
      return { primary: "Signaling", technical: "WAGGLE_DANCE" };
    default:
      return { primary: state, technical: state };
  }
}

export function formatBrainRegion(
  state: BeeState,
  rawRegion?: string,
): FormattedItem {
  if (state === "FORAGING" || state === "LOOMING_ESCAPE") {
    return { primary: "Navigation", technical: "Central Complex" };
  }
  if (state === "ROUND_DANCE" || state === "WAGGLE_DANCE") {
    return { primary: "Memory & Signaling", technical: "Mushroom Bodies" };
  }
  if (state === "HOVER") {
    return { primary: "Vision", technical: "Optic Lobe" };
  }
  if (state === "GROOMING") {
    return { primary: "Motor Control", technical: "SEZ" };
  }

  if (rawRegion) {
    if (rawRegion.includes("Central Complex")) {
      return { primary: "Navigation", technical: "Central Complex" };
    }
    if (rawRegion.includes("Mushroom Bodies")) {
      return { primary: "Memory & Signaling", technical: "Mushroom Bodies" };
    }
    if (
      rawRegion.includes("Optic Lobe") ||
      rawRegion.includes("Visual") ||
      rawRegion.includes("Protocerebral")
    ) {
      return { primary: "Vision", technical: "Optic Lobe" };
    }
    if (rawRegion.includes("Subesophageal") || rawRegion.includes("SEZ")) {
      return { primary: "Motor Control", technical: "SEZ" };
    }
  }

  return { primary: "Sensorimotor", technical: rawRegion || "Brain" };
}

export function formatLooming(looming: "NOMINAL" | "ALERT"): {
  label: string;
  isAlert: boolean;
} {
  if (looming === "ALERT") {
    return { label: "Alert!", isAlert: true };
  }
  return { label: "Calm", isAlert: false };
}

export function formatCircadian(circadian: string): {
  primary: string;
  multiplier: string;
} {
  if (circadian.includes("Nocturnal") || circadian.includes("0.4")) {
    return { primary: "Night · resting", multiplier: "×0.4" };
  }
  if (circadian.includes("Crepuscular") || circadian.includes("0.7")) {
    return { primary: "Dawn / Dusk · moderate", multiplier: "×0.7" };
  }
  return { primary: "Daytime · full activity", multiplier: "×1.0" };
}

export function formatKinematics(
  speed: number,
  gait: "FLIGHT" | "WALK" | "PERCH",
): string {
  let naturalGait = "flying";
  if (gait === "WALK") naturalGait = "walking";
  else if (gait === "PERCH") naturalGait = "perched";
  return `${speed} px/s, ${naturalGait}`;
}

export function formatDanceDistance(distanceMeters: number): string {
  return `Found food ~${distanceMeters}m away`;
}

export function formatSunAzimuth(azimuthDeg: number): string {
  return `Heading ${azimuthDeg}° from the sun`;
}

export function formatTurnBanking(bankAngleDeg: number): string {
  const sign = bankAngleDeg > 0 ? "+" : "";
  return `${sign}${bankAngleDeg}° banking`;
}

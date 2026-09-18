export type BeeState =
  | "LOOMING_ESCAPE"
  | "HOVER"
  | "WAGGLE_DANCE"
  | "ROUND_DANCE"
  | "FORAGING"
  | "GROOMING";

export const STATE_PRIORITY: Record<BeeState, number> = {
  LOOMING_ESCAPE: 5,
  HOVER: 4,
  WAGGLE_DANCE: 3,
  ROUND_DANCE: 3,
  FORAGING: 2,
  GROOMING: 1,
} as const;

export interface Kinematics {
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  targetSpeed: number;
  heading: number;
  targetHeading: number;
  bankAngle: number;
  angularVelocity: number;
  elevation: number;
}

export interface DanceState {
  type: "ROUND" | "WAGGLE";
  phase: number;
  centerX: number;
  centerY: number;
  waggleAngle: number;
  waggleDuration: number;
  cycleDuration: number;
  totalDanceDuration: number;
  elapsed: number;
  waggleLateralOffset: number;
}

export interface TelemetryData {
  state: BeeState;
  headingDeg: number;
  speed: number;
  loomingReflex: "NOMINAL" | "ALERT";
  gait: "FLIGHT" | "WALK" | "PERCH";
  caste: string;
  brainRegion: string;
  circadian: string;
  bankAngleDeg: number;
  resourceDistance?: number;
  sunAzimuthDeg?: number;
}

export interface SmokeParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  shade: number;
}

export interface Bounds {
  width: number;
  height: number;
}

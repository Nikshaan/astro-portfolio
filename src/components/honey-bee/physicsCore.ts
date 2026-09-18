import type { Bounds, Kinematics } from "./types";

export const PHYSICS_CONSTANTS = {
  MAX_DELTA_TIME: 0.1,

  SPEED_CRUISE_FLIGHT: 155,
  SPEED_CRUISE_WALK: 65,
  SPEED_ESCAPE_PEAK: 360,
  SPEED_DANCE_WAGGLE: 90,
  SPEED_DANCE_RETURN: 120,

  TAKEOFF_THRESHOLD: 135,
  LANDING_THRESHOLD: 95,

  SPEED_EASING_RATE: 16.0,
  HEADING_SMOOTHING_RATE: 12.0,
  BANKING_SMOOTHING_RATE: 10.0,
  ELEVATION_SMOOTHING_RATE: 6.0,

  MAX_BANK_ANGLE: 0.35,
  BANK_GAIN: 0.12,

  BOUNDS_PADDING: 32,
} as const;

export function normalizeAngle(angle: number): number {
  let a = angle % (2 * Math.PI);
  if (a > Math.PI) a -= 2 * Math.PI;
  if (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

export function shortestAngleDifference(
  target: number,
  current: number,
): number {
  return normalizeAngle(target - current);
}

export function clampDeltaTime(
  dt: number,
  maxDt = PHYSICS_CONSTANTS.MAX_DELTA_TIME,
): number {
  if (dt < 0) return 0;
  return dt > maxDt ? maxDt : dt;
}

export function expDecay(
  current: number,
  target: number,
  decayRate: number,
  dt: number,
): number {
  return target + (current - target) * Math.exp(-decayRate * dt);
}

export function expDecayAngle(
  current: number,
  target: number,
  decayRate: number,
  dt: number,
): number {
  const diff = shortestAngleDifference(target, current);
  const smoothedDiff = diff * (1 - Math.exp(-decayRate * dt));
  return normalizeAngle(current + smoothedDiff);
}

export function stepPhysics(
  current: Readonly<Kinematics>,
  dt: number,
  bounds?: Bounds,
): Kinematics {
  const safeDt = clampDeltaTime(dt);
  if (safeDt <= 0) return { ...current };

  const nextHeading = expDecayAngle(
    current.heading,
    current.targetHeading,
    PHYSICS_CONSTANTS.HEADING_SMOOTHING_RATE,
    safeDt,
  );

  const angularVelocity =
    shortestAngleDifference(nextHeading, current.heading) / safeDt;

  const nextSpeed = expDecay(
    current.speed,
    current.targetSpeed,
    PHYSICS_CONSTANTS.SPEED_EASING_RATE,
    safeDt,
  );

  const isFlying = nextSpeed >= PHYSICS_CONSTANTS.LANDING_THRESHOLD;
  const rawTargetBank = isFlying
    ? Math.max(
        -PHYSICS_CONSTANTS.MAX_BANK_ANGLE,
        Math.min(
          PHYSICS_CONSTANTS.MAX_BANK_ANGLE,
          -angularVelocity * PHYSICS_CONSTANTS.BANK_GAIN,
        ),
      )
    : 0;

  const nextBankAngle = expDecay(
    current.bankAngle,
    rawTargetBank,
    PHYSICS_CONSTANTS.BANKING_SMOOTHING_RATE,
    safeDt,
  );

  const targetElevation =
    nextSpeed >= PHYSICS_CONSTANTS.TAKEOFF_THRESHOLD
      ? 1.0
      : nextSpeed <= PHYSICS_CONSTANTS.LANDING_THRESHOLD
        ? 0.0
        : current.elevation;
  const nextElevation = expDecay(
    current.elevation,
    targetElevation,
    PHYSICS_CONSTANTS.ELEVATION_SMOOTHING_RATE,
    safeDt,
  );

  const nextVx = Math.cos(nextHeading) * nextSpeed;
  const nextVy = Math.sin(nextHeading) * nextSpeed;
  const avgVx = 0.5 * (current.vx + nextVx);
  const avgVy = 0.5 * (current.vy + nextVy);

  let nextX = current.x + avgVx * safeDt;
  let nextY = current.y + avgVy * safeDt;

  if (bounds) {
    const pad = PHYSICS_CONSTANTS.BOUNDS_PADDING;
    const minX = pad;
    const maxX = Math.max(pad, bounds.width - pad);
    const minY = pad;
    const maxY = Math.max(pad, bounds.height - pad);

    nextX = Math.max(minX, Math.min(maxX, nextX));
    nextY = Math.max(minY, Math.min(maxY, nextY));
  }

  return {
    x: nextX,
    y: nextY,
    vx: nextVx,
    vy: nextVy,
    speed: nextSpeed,
    targetSpeed: current.targetSpeed,
    heading: nextHeading,
    targetHeading: current.targetHeading,
    bankAngle: nextBankAngle,
    angularVelocity,
    elevation: nextElevation,
  };
}

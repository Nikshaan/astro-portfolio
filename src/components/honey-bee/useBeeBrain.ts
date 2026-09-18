import { useRef, useCallback } from "react";
import type {
  BeeState,
  Bounds,
  DanceState,
  Kinematics,
  TelemetryData,
} from "./types";
import { STATE_PRIORITY } from "./types";
import { PHYSICS_CONSTANTS, normalizeAngle, stepPhysics } from "./physicsCore";
import { simplex2D } from "./noise";

interface UseBeeBrainOptions {
  initialX?: number;
  initialY?: number;
}

export function useBeeBrain(options: UseBeeBrainOptions = {}) {
  const kinematicsRef = useRef<Kinematics>({
    x:
      options.initialX ??
      (typeof window !== "undefined" ? window.innerWidth * 0.5 : 400),
    y:
      options.initialY ??
      (typeof window !== "undefined" ? window.innerHeight * 0.4 : 300),
    vx: PHYSICS_CONSTANTS.SPEED_CRUISE_FLIGHT,
    vy: 0,
    speed: PHYSICS_CONSTANTS.SPEED_CRUISE_FLIGHT,
    targetSpeed: PHYSICS_CONSTANTS.SPEED_CRUISE_FLIGHT,
    heading: 0,
    targetHeading: 0,
    bankAngle: 0,
    angularVelocity: 0,
    elevation: 1.0,
  });

  const stateRef = useRef<BeeState>("FORAGING");
  const stateTimerRef = useRef<number>(0);
  const stateDurationRef = useRef<number>(8.0);
  const isHoveredRef = useRef<boolean>(false);

  const danceStateRef = useRef<DanceState | null>(null);
  const lastResourceDistanceRef = useRef<number>(45);
  const lastSunAzimuthRef = useRef<number>(60);

  const isExitingRef = useRef<boolean>(false);

  const mousePosRef = useRef<{ x: number; y: number }>({ x: -1000, y: -1000 });
  const lastMousePosRef = useRef<{ x: number; y: number; time: number }>({
    x: -1000,
    y: -1000,
    time: 0,
  });
  const mouseVelocityRef = useRef<number>(0);

  const loomingAlertUntilRef = useRef<number>(0);

  const habituationLevelRef = useRef<number>(0);
  const lastLoomingTimeRef = useRef<number>(0);

  const noiseSeedRef = useRef<number>(Math.random() * 1000);

  const tryTransition = useCallback(
    (
      targetState: BeeState,
      currentTimeSec: number,
      durationSec = 4.0,
    ): boolean => {
      const currentState = stateRef.current;
      const currentPriority = STATE_PRIORITY[currentState];
      const targetPriority = STATE_PRIORITY[targetState];

      const stateAge = currentTimeSec - stateTimerRef.current;
      const isCurrentFinished = stateAge >= stateDurationRef.current;

      if (targetPriority > currentPriority) {
        stateRef.current = targetState;
        stateTimerRef.current = currentTimeSec;
        stateDurationRef.current = durationSec;
        return true;
      }

      if (isCurrentFinished) {
        stateRef.current = targetState;
        stateTimerRef.current = currentTimeSec;
        stateDurationRef.current = durationSec;
        return true;
      }

      return false;
    },
    [],
  );

  const handleMouseMove = useCallback((clientX: number, clientY: number) => {
    const now = performance.now();
    mousePosRef.current = { x: clientX, y: clientY };

    if (lastMousePosRef.current.time > 0) {
      const dtMs = now - lastMousePosRef.current.time;
      if (dtMs >= 1.0) {
        const dtSec = dtMs / 1000;
        const dx = clientX - lastMousePosRef.current.x;
        const dy = clientY - lastMousePosRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        mouseVelocityRef.current = dist / dtSec;
      }
    }

    lastMousePosRef.current = { x: clientX, y: clientY, time: now };
  }, []);

  const handleHoverEnter = useCallback(
    (currentTimeSec: number) => {
      isHoveredRef.current = true;
      tryTransition("HOVER", currentTimeSec, 9999);
    },
    [tryTransition],
  );

  const handleHoverLeave = useCallback(
    (currentTimeSec: number) => {
      isHoveredRef.current = false;
      if (stateRef.current === "HOVER") {
        tryTransition("FORAGING", currentTimeSec, 5.0);
      }
    },
    [tryTransition],
  );

  const triggerExit = useCallback((bounds: Bounds) => {
    isExitingRef.current = true;
    const kin = kinematicsRef.current;

    const distLeft = kin.x;
    const distRight = bounds.width - kin.x;
    const distTop = kin.y;
    const distBottom = bounds.height - kin.y;

    const minDist = Math.min(distLeft, distRight, distTop, distBottom);
    let targetAngle = 0;

    if (minDist === distLeft) targetAngle = Math.PI;
    else if (minDist === distRight) targetAngle = 0;
    else if (minDist === distTop) targetAngle = -Math.PI / 2;
    else targetAngle = Math.PI / 2;

    kin.targetHeading = targetAngle;
    kin.targetSpeed = PHYSICS_CONSTANTS.SPEED_ESCAPE_PEAK;
  }, []);

  const updateBrain = useCallback(
    (dt: number, currentTimeSec: number, bounds: Bounds): Kinematics => {
      const kin = kinematicsRef.current;
      const mouse = mousePosRef.current;

      const dxToMouse = kin.x - mouse.x;
      const dyToMouse = kin.y - mouse.y;
      const distToMouse = Math.sqrt(
        dxToMouse * dxToMouse + dyToMouse * dyToMouse,
      );

      const nowMs = currentTimeSec * 1000;
      const msSinceLastMove = nowMs - lastMousePosRef.current.time;
      const effectiveMouseVel =
        msSinceLastMove > 80 ? 0 : mouseVelocityRef.current;

      if (distToMouse < 140 && effectiveMouseVel > 900) {
        const timeSinceLastLooming =
          currentTimeSec - lastLoomingTimeRef.current;
        if (timeSinceLastLooming > 4.0) {
          habituationLevelRef.current = Math.max(
            0,
            habituationLevelRef.current -
              Math.floor(timeSinceLastLooming / 3.0),
          );
        }

        const evadeAngle = Math.atan2(dyToMouse, dxToMouse);
        if (tryTransition("LOOMING_ESCAPE", currentTimeSec, 1.0)) {
          habituationLevelRef.current = Math.min(
            4,
            habituationLevelRef.current + 1,
          );
          lastLoomingTimeRef.current = currentTimeSec;

          const habituationFactor = Math.max(
            0.58,
            1.0 - (habituationLevelRef.current - 1) * 0.14,
          );

          kin.targetHeading = evadeAngle;
          kin.targetSpeed =
            PHYSICS_CONSTANTS.SPEED_ESCAPE_PEAK * habituationFactor;
          danceStateRef.current = null;
          loomingAlertUntilRef.current = currentTimeSec + 1.2;
        }
      }

      const stateAge = currentTimeSec - stateTimerRef.current;
      const isStateExpired = stateAge >= stateDurationRef.current;

      switch (stateRef.current) {
        case "LOOMING_ESCAPE": {
          const habituationFactor = Math.max(
            0.58,
            1.0 - (habituationLevelRef.current - 1) * 0.14,
          );
          kin.targetSpeed =
            PHYSICS_CONSTANTS.SPEED_ESCAPE_PEAK * habituationFactor;
          if (isStateExpired) {
            tryTransition(
              "FORAGING",
              currentTimeSec,
              6.0 + Math.random() * 4.0,
            );
          }
          break;
        }

        case "HOVER": {
          kin.targetSpeed = 0;
          if (!isHoveredRef.current) {
            tryTransition("FORAGING", currentTimeSec, 5.0);
          }
          break;
        }

        case "ROUND_DANCE": {
          const dance = danceStateRef.current;
          if (!dance || isStateExpired) {
            danceStateRef.current = null;
            tryTransition(
              "FORAGING",
              currentTimeSec,
              6.0 + Math.random() * 4.0,
            );
            break;
          }

          kin.targetSpeed = PHYSICS_CONSTANTS.SPEED_CRUISE_WALK;
          const cycleProgress = (stateAge % 2.4) / 2.4;
          const turnSign = cycleProgress < 0.5 ? 1 : -1;
          kin.targetHeading = normalizeAngle(kin.heading + turnSign * dt * 4.2);
          break;
        }

        case "WAGGLE_DANCE": {
          const dance = danceStateRef.current;
          if (!dance || isStateExpired) {
            danceStateRef.current = null;
            tryTransition(
              "FORAGING",
              currentTimeSec,
              6.0 + Math.random() * 4.0,
            );
            break;
          }

          const cycleTime = dance.cycleDuration;
          const phaseTime = stateAge % cycleTime;
          const waggleRunDuration = dance.waggleDuration;
          const returnLoopDuration = (cycleTime - waggleRunDuration * 2) * 0.5;

          if (phaseTime < waggleRunDuration) {
            kin.targetSpeed = PHYSICS_CONSTANTS.SPEED_DANCE_WAGGLE;
            kin.targetHeading = dance.waggleAngle;
            dance.waggleLateralOffset =
              Math.sin(stateAge * 14 * Math.PI * 2) * 2.6;
          } else if (phaseTime < waggleRunDuration + returnLoopDuration) {
            kin.targetSpeed = PHYSICS_CONSTANTS.SPEED_DANCE_RETURN;
            dance.waggleLateralOffset = 0;
            const returnProgress =
              (phaseTime - waggleRunDuration) / returnLoopDuration;
            kin.targetHeading = normalizeAngle(
              dance.waggleAngle + Math.PI * returnProgress,
            );
          } else if (phaseTime < waggleRunDuration * 2 + returnLoopDuration) {
            kin.targetSpeed = PHYSICS_CONSTANTS.SPEED_DANCE_WAGGLE;
            kin.targetHeading = dance.waggleAngle;
            dance.waggleLateralOffset =
              Math.sin(stateAge * 14 * Math.PI * 2) * 2.6;
          } else {
            kin.targetSpeed = PHYSICS_CONSTANTS.SPEED_DANCE_RETURN;
            dance.waggleLateralOffset = 0;
            const returnProgress =
              (phaseTime - (waggleRunDuration * 2 + returnLoopDuration)) /
              returnLoopDuration;
            kin.targetHeading = normalizeAngle(
              dance.waggleAngle - Math.PI * returnProgress,
            );
          }
          break;
        }

        case "GROOMING": {
          kin.targetSpeed = 0;
          if (isStateExpired) {
            const currentHour = new Date().getHours();
            const restMultiplier =
              currentHour >= 20 || currentHour < 6
                ? 1.8
                : currentHour >= 17 || currentHour < 8
                  ? 1.3
                  : 1.0;
            tryTransition(
              "FORAGING",
              currentTimeSec,
              (7.0 + Math.random() * 5.0) * restMultiplier,
            );
          }
          break;
        }

        case "FORAGING":
        default: {
          const currentHour = new Date().getHours();
          const circadianSpeedFactor =
            currentHour >= 20 || currentHour < 6
              ? 0.4
              : currentHour >= 17 || currentHour < 8
                ? 0.7
                : 1.0;
          kin.targetSpeed =
            PHYSICS_CONSTANTS.SPEED_CRUISE_FLIGHT * circadianSpeedFactor;

          const timeSample = currentTimeSec * 0.14;
          const noiseVal = simplex2D(timeSample, noiseSeedRef.current);
          const wanderHeading = normalizeAngle(noiseVal * Math.PI * 2);

          const margin = 90;
          let steerX = 0;
          let steerY = 0;

          if (kin.x < margin) steerX += (margin - kin.x) / margin;
          else if (kin.x > bounds.width - margin)
            steerX -= (kin.x - (bounds.width - margin)) / margin;

          if (kin.y < margin) steerY += (margin - kin.y) / margin;
          else if (kin.y > bounds.height - margin)
            steerY -= (kin.y - (bounds.height - margin)) / margin;

          const steerMag = Math.sqrt(steerX * steerX + steerY * steerY);
          if (steerMag > 0.05) {
            const boundaryAngle = Math.atan2(steerY, steerX);
            const blendWeight = Math.min(1.0, steerMag * 1.3);
            kin.targetHeading = normalizeAngle(
              wanderHeading * (1 - blendWeight) + boundaryAngle * blendWeight,
            );
          } else {
            kin.targetHeading = wanderHeading;
          }

          if (isStateExpired && !isExitingRef.current) {
            const roll = Math.random();
            if (roll < 0.45) {
              const simulatedDistMeters = 30 + Math.random() * 250;
              lastResourceDistanceRef.current = Math.round(simulatedDistMeters);
              if (simulatedDistMeters < 80) {
                lastSunAzimuthRef.current = Math.round(
                  ((kin.heading * 180) / Math.PI + 360) % 360,
                );
                danceStateRef.current = {
                  type: "ROUND",
                  phase: 0,
                  centerX: kin.x,
                  centerY: kin.y,
                  waggleAngle: kin.heading,
                  waggleDuration: 0,
                  cycleDuration: 2.4,
                  totalDanceDuration: 4.5,
                  elapsed: 0,
                  waggleLateralOffset: 0,
                };
                tryTransition("ROUND_DANCE", currentTimeSec, 4.5);
              } else {
                const waggleAngle = Math.random() * Math.PI * 2;
                lastSunAzimuthRef.current = Math.round(
                  ((waggleAngle * 180) / Math.PI + 360) % 360,
                );
                const waggleDuration = 0.6 + (simulatedDistMeters / 300) * 0.8;
                danceStateRef.current = {
                  type: "WAGGLE",
                  phase: 0,
                  centerX: kin.x,
                  centerY: kin.y,
                  waggleAngle,
                  waggleDuration,
                  cycleDuration: waggleDuration * 2 + 2.8,
                  totalDanceDuration: 5.5,
                  elapsed: 0,
                  waggleLateralOffset: 0,
                };
                tryTransition("WAGGLE_DANCE", currentTimeSec, 5.5);
              }
            } else if (roll < 0.65) {
              tryTransition(
                "GROOMING",
                currentTimeSec,
                2.5 + Math.random() * 2.0,
              );
            } else {
              stateTimerRef.current = currentTimeSec;
              stateDurationRef.current = 6.0 + Math.random() * 6.0;
            }
          }
          break;
        }
      }

      const activeBounds = isExitingRef.current ? undefined : bounds;
      const updatedKin = stepPhysics(kin, dt, activeBounds);
      kinematicsRef.current = updatedKin;

      return updatedKin;
    },
    [tryTransition],
  );

  const getTelemetryData = useCallback((): TelemetryData => {
    const kin = kinematicsRef.current;
    const state = stateRef.current;
    const nowSec = performance.now() / 1000;
    const isAlert = nowSec < loomingAlertUntilRef.current;

    let headingDeg = (kin.heading * 180) / Math.PI;
    if (headingDeg < 0) headingDeg += 360;

    let brainRegion = "Central Complex (CX Steering)";
    if (state === "LOOMING_ESCAPE" || isAlert) {
      brainRegion = "Lobula Plate (LPTC Threat Reflex)";
    } else if (state === "WAGGLE_DANCE") {
      brainRegion = "Mushroom Bodies (MB Vector Memory)";
    } else if (state === "ROUND_DANCE") {
      brainRegion = "Mushroom Bodies (MB Near Resource)";
    } else if (state === "HOVER") {
      brainRegion = "Protocerebral Visual Integration";
    } else if (state === "GROOMING") {
      brainRegion = "Subesophageal Zone (SEZ)";
    }

    const hour = new Date().getHours();
    let circadian = "Diurnal Peak (1.0x)";
    if (hour >= 20 || hour < 6) {
      circadian = "Nocturnal Quiescence (0.4x)";
    } else if (hour >= 17 || hour < 8) {
      circadian = "Crepuscular (0.7x)";
    }

    const gait: "FLIGHT" | "WALK" | "PERCH" =
      kin.elevation > 0.4 ? "FLIGHT" : kin.speed > 5 ? "WALK" : "PERCH";

    const bankAngleDeg = Number(((kin.bankAngle * 180) / Math.PI).toFixed(1));
    const isDancing = state === "ROUND_DANCE" || state === "WAGGLE_DANCE";

    return {
      state,
      headingDeg: Math.round(headingDeg),
      speed: Math.round(kin.speed),
      loomingReflex: isAlert ? "ALERT" : "NOMINAL",
      gait,
      caste: "Female Worker (Forager)",
      brainRegion,
      circadian,
      bankAngleDeg,
      resourceDistance: isDancing ? lastResourceDistanceRef.current : undefined,
      sunAzimuthDeg: isDancing ? lastSunAzimuthRef.current : undefined,
    };
  }, []);

  return {
    kinematicsRef,
    stateRef,
    danceStateRef,
    isExitingRef,
    updateBrain,
    handleMouseMove,
    handleHoverEnter,
    handleHoverLeave,
    triggerExit,
    getTelemetryData,
  };
}

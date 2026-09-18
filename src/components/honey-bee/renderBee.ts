import type { BeeState, DanceState, Kinematics, SmokeParticle } from "./types";
import { PHYSICS_CONSTANTS } from "./physicsCore";

const BEE_PALETTE = {
  head: "#1a1410",
  eye: "#0d0906",
  eyeHighlight: "rgba(255, 255, 255, 0.28)",
  antennae: "#140e0a",
  thoraxBase: "#784a22",
  thoraxFuzz: "#b87d3b",
  thoraxHighlight: "#c98f48",
  abdomenAmber: "#d98e32",
  abdomenBlack: "#16100b",
  wingMembrane: "rgba(230, 242, 252, 0.44)",
  wingEdge: "rgba(130, 168, 198, 0.72)",
  wingVein: "rgba(110, 145, 175, 0.38)",
  leg: "#2a1c12",
  legJoint: "#18100a",
  pollenPellet: "rgba(234, 179, 8, 0.75)",
} as const;

export interface RenderBeeOptions {
  kinematics: Kinematics;
  state: BeeState;
  danceState?: DanceState | null;
  elapsedTime: number;
  scale?: number;
  particles?: SmokeParticle[];
  deathProgress?: number;
}

function drawDropShadow(
  ctx: CanvasRenderingContext2D,
  elevation: number,
  scale: number,
) {
  if (elevation <= 0.05) return;

  ctx.save();

  const shadowOffsetY = 10 * elevation * scale;
  const shadowRadiusX = (14 + 6 * elevation) * scale;
  const shadowRadiusY = (7 + 3 * elevation) * scale;
  const alpha = 0.32 * (1.0 - elevation * 0.35);

  const isLight =
    typeof document !== "undefined" &&
    document.documentElement.getAttribute("data-theme") === "light";

  if (isLight) {
    ctx.beginPath();
    ctx.ellipse(
      0,
      shadowOffsetY,
      shadowRadiusX,
      shadowRadiusY,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = `rgba(29, 27, 38, ${alpha})`;
    ctx.filter = `blur(${Math.round(3 * elevation + 1)}px)`;
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.ellipse(
      0,
      shadowOffsetY,
      shadowRadiusX * 1.15,
      shadowRadiusY * 1.15,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = `rgba(167, 139, 250, ${alpha * 0.38})`;
    ctx.filter = `blur(${Math.round(4 * elevation + 2)}px)`;
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(
      0,
      shadowOffsetY,
      shadowRadiusX * 0.75,
      shadowRadiusY * 0.75,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.75})`;
    ctx.filter = `blur(${Math.round(2 * elevation + 1)}px)`;
    ctx.fill();
  }

  ctx.filter = "none";
  ctx.restore();
}

function drawBeeLeg(
  ctx: CanvasRenderingContext2D,
  coxaX: number,
  coxaY: number,
  angleRad: number,
  lengthFemur: number,
  lengthTibia: number,
  tibiaBend: number,
  isHindLeg = false,
) {
  const kneeX = coxaX + Math.cos(angleRad) * lengthFemur;
  const kneeY = coxaY + Math.sin(angleRad) * lengthFemur;
  const tipX = kneeX + Math.cos(angleRad + tibiaBend) * lengthTibia;
  const tipY = kneeY + Math.sin(angleRad + tibiaBend) * lengthTibia;

  ctx.beginPath();
  ctx.moveTo(coxaX, coxaY);
  ctx.lineTo(kneeX, kneeY);
  ctx.lineTo(tipX, tipY);
  ctx.strokeStyle = BEE_PALETTE.leg;
  ctx.lineWidth = isHindLeg ? 1.4 : 1.1;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();

  if (isHindLeg) {
    const midTibiaX = (kneeX + tipX) * 0.5;
    const midTibiaY = (kneeY + tipY) * 0.5;
    ctx.beginPath();
    ctx.arc(midTibiaX, midTibiaY, 1.3, 0, Math.PI * 2);
    ctx.fillStyle = BEE_PALETTE.pollenPellet;
    ctx.fill();
  }
}

function drawBeeLegs(
  ctx: CanvasRenderingContext2D,
  state: BeeState,
  speed: number,
  elevation: number,
  elapsedTime: number,
) {
  const isAirborne =
    elevation > 0.4 || speed >= PHYSICS_CONSTANTS.TAKEOFF_THRESHOLD;
  const isGrooming = state === "GROOMING";

  if (isAirborne) {
    drawBeeLeg(ctx, 3.5, -3.2, -Math.PI * 0.58, 4.5, 4.5, -0.7);
    drawBeeLeg(ctx, 3.5, 3.2, Math.PI * 0.58, 4.5, 4.5, 0.7);
    drawBeeLeg(ctx, 0, -3.8, -Math.PI * 0.68, 5.0, 4.8, -0.55);
    drawBeeLeg(ctx, 0, 3.8, Math.PI * 0.68, 5.0, 4.8, 0.55);
    drawBeeLeg(ctx, -3.5, -3.4, -Math.PI * 0.82, 6.2, 5.8, -0.4, true);
    drawBeeLeg(ctx, -3.5, 3.4, Math.PI * 0.82, 6.2, 5.8, 0.4, true);
    return;
  }

  if (isGrooming) {
    const rub = Math.sin(elapsedTime * 7 * Math.PI * 2) * 0.3;
    drawBeeLeg(ctx, 3.5, -2.8, -0.25 + rub, 5.5, 5.5, 1.1);
    drawBeeLeg(ctx, 3.5, 2.8, 0.25 - rub, 5.5, 5.5, -1.1);

    drawBeeLeg(ctx, 0, -3.8, -Math.PI * 0.5, 6.5, 6.5, -0.85);
    drawBeeLeg(ctx, 0, 3.8, Math.PI * 0.5, 6.5, 6.5, 0.85);
    drawBeeLeg(ctx, -3.5, -3.4, -Math.PI * 0.75, 8.0, 7.5, -0.75, true);
    drawBeeLeg(ctx, -3.5, 3.4, Math.PI * 0.75, 8.0, 7.5, 0.75, true);
    return;
  }

  const walkFreq = Math.max(3, (speed / 65) * 8);
  const cycle = elapsedTime * walkFreq * Math.PI * 2;
  const swingA = Math.sin(cycle) * 0.32;
  const swingB = Math.sin(cycle + Math.PI) * 0.32;

  drawBeeLeg(ctx, 3.5, -2.8, -0.65 + swingA, 5.8, 5.8, -0.75);
  drawBeeLeg(ctx, 3.5, 2.8, 0.65 + swingB, 5.8, 5.8, 0.75);

  drawBeeLeg(ctx, 0, -3.8, -Math.PI * 0.5 + swingB, 6.8, 6.8, -0.85);
  drawBeeLeg(ctx, 0, 3.8, Math.PI * 0.5 + swingA, 6.8, 6.8, 0.85);

  drawBeeLeg(ctx, -3.5, -3.4, -Math.PI * 0.76 + swingA, 8.2, 7.8, -0.75, true);
  drawBeeLeg(ctx, -3.5, 3.4, Math.PI * 0.76 + swingB, 8.2, 7.8, 0.75, true);
}

function drawBeeAbdomen(ctx: CanvasRenderingContext2D, waggleOffset: number) {
  ctx.save();

  ctx.translate(-1, waggleOffset);

  ctx.beginPath();
  ctx.ellipse(-11, 0, 11.5, 6.2, 0, 0, Math.PI * 2);
  ctx.fillStyle = BEE_PALETTE.abdomenAmber;
  ctx.fill();

  const bands = [
    { x: -5, width: 3.2, color: BEE_PALETTE.abdomenBlack },
    { x: -9, width: 3.4, color: BEE_PALETTE.abdomenBlack },
    { x: -13.5, width: 3.5, color: BEE_PALETTE.abdomenBlack },
    { x: -18, width: 3.0, color: BEE_PALETTE.abdomenBlack },
  ];

  for (const b of bands) {
    const halfH =
      Math.sqrt(Math.max(0, 1 - Math.pow((b.x + 11) / 11.5, 2))) * 6.0;
    if (halfH > 0.8) {
      ctx.beginPath();
      ctx.ellipse(b.x, 0, b.width * 0.5, halfH, 0, 0, Math.PI * 2);
      ctx.fillStyle = b.color;
      ctx.fill();
    }
  }

  ctx.beginPath();
  ctx.moveTo(-21, -1.8);
  ctx.lineTo(-23.5, 0);
  ctx.lineTo(-21, 1.8);
  ctx.fillStyle = BEE_PALETTE.abdomenBlack;
  ctx.fill();

  ctx.restore();
}

function drawBeeThorax(ctx: CanvasRenderingContext2D) {
  ctx.save();

  ctx.strokeStyle = "rgba(184, 125, 59, 0.65)";
  ctx.lineWidth = 0.8;
  const hairCount = 20;
  for (let i = 0; i < hairCount; i++) {
    const angle = (i / hairCount) * Math.PI * 2;
    const innerX = Math.cos(angle) * 6.8;
    const innerY = Math.sin(angle) * 5.4;
    const outerX = Math.cos(angle) * (8.2 + (i % 3) * 0.7);
    const outerY = Math.sin(angle) * (6.6 + (i % 3) * 0.6);
    ctx.beginPath();
    ctx.moveTo(innerX, innerY);
    ctx.lineTo(outerX, outerY);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.ellipse(0, 0, 7.0, 5.6, 0, 0, Math.PI * 2);
  const grad = ctx.createRadialGradient(-1, -1, 1.2, 0, 0, 7.0);
  grad.addColorStop(0, BEE_PALETTE.thoraxHighlight);
  grad.addColorStop(0.5, BEE_PALETTE.thoraxFuzz);
  grad.addColorStop(1, BEE_PALETTE.thoraxBase);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.restore();
}

function drawBeeHead(ctx: CanvasRenderingContext2D) {
  ctx.save();

  ctx.beginPath();
  ctx.ellipse(8.5, 0, 4.4, 4.0, 0, 0, Math.PI * 2);
  ctx.fillStyle = BEE_PALETTE.head;
  ctx.fill();

  const eyes = [
    { x: 8.2, y: -3.4, rot: -0.25 },
    { x: 8.2, y: 3.4, rot: 0.25 },
  ];

  for (const eye of eyes) {
    ctx.save();
    ctx.translate(eye.x, eye.y);
    ctx.rotate(eye.rot);
    ctx.beginPath();
    ctx.ellipse(0, 0, 2.6, 2.0, 0, 0, Math.PI * 2);
    ctx.fillStyle = BEE_PALETTE.eye;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0.4, -0.4, 0.7, 0, Math.PI * 2);
    ctx.fillStyle = BEE_PALETTE.eyeHighlight;
    ctx.fill();
    ctx.restore();
  }

  ctx.strokeStyle = BEE_PALETTE.antennae;
  ctx.lineWidth = 0.8;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(11.5, -1.2);
  ctx.lineTo(15.2, -3.2);
  ctx.lineTo(18.0, -2.0);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(11.5, 1.2);
  ctx.lineTo(15.2, 3.2);
  ctx.lineTo(18.0, 2.0);
  ctx.stroke();

  ctx.restore();
}

function drawBeeWing(
  ctx: CanvasRenderingContext2D,
  attachX: number,
  attachY: number,
  angleRad: number,
  length: number,
  width: number,
  flipY: boolean,
) {
  ctx.save();
  ctx.translate(attachX, attachY);
  ctx.rotate(angleRad);
  if (flipY) ctx.scale(1, -1);

  ctx.beginPath();
  ctx.moveTo(0, 0);

  ctx.bezierCurveTo(
    -length * 0.35,
    -width * 0.95,
    -length * 0.75,
    -width * 0.88,
    -length,
    -width * 0.15,
  );

  ctx.bezierCurveTo(
    -length * 1.05,
    0,
    -length * 1.02,
    width * 0.35,
    -length * 0.88,
    width * 0.55,
  );

  ctx.bezierCurveTo(
    -length * 0.55,
    width * 0.88,
    -length * 0.25,
    width * 0.45,
    0,
    0,
  );
  ctx.closePath();

  ctx.fillStyle = BEE_PALETTE.wingMembrane;
  ctx.fill();

  ctx.strokeStyle = BEE_PALETTE.wingEdge;
  ctx.lineWidth = 0.7;
  ctx.stroke();

  ctx.strokeStyle = BEE_PALETTE.wingVein;
  ctx.lineWidth = 0.45;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(
    -length * 0.48,
    -width * 0.35,
    -length * 0.94,
    -width * 0.08,
  );
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(
    -length * 0.45,
    width * 0.22,
    -length * 0.82,
    width * 0.38,
  );
  ctx.stroke();

  ctx.restore();
}

function drawBeeWings(
  ctx: CanvasRenderingContext2D,
  speed: number,
  elevation: number,
  elapsedTime: number,
) {
  const isAirborne =
    elevation > 0.35 || speed >= PHYSICS_CONSTANTS.TAKEOFF_THRESHOLD;

  if (isAirborne) {
    const flapPhase = elapsedTime * 24 * Math.PI * 2;
    const foreFlap = Math.sin(flapPhase) * 0.55;
    const hindFlap = Math.sin(flapPhase - 0.2) * 0.45;

    drawBeeWing(ctx, 1.0, -3.0, -0.45 + foreFlap, 18, 6.2, false);
    drawBeeWing(ctx, -1.8, -2.6, -0.32 + hindFlap, 13, 4.8, false);

    drawBeeWing(ctx, 1.0, 3.0, 0.45 - foreFlap, 18, 6.2, true);
    drawBeeWing(ctx, -1.8, 2.6, 0.32 - hindFlap, 13, 4.8, true);
  } else {
    const breath = Math.sin(elapsedTime * 3.5) * 0.035;

    drawBeeWing(ctx, 1.0, -2.4, -0.18 + breath, 18, 5.8, false);
    drawBeeWing(ctx, -1.8, -2.0, -0.12 + breath, 13, 4.4, false);

    drawBeeWing(ctx, 1.0, 2.4, 0.18 - breath, 18, 5.8, true);
    drawBeeWing(ctx, -1.8, 2.0, 0.12 - breath, 13, 4.4, true);
  }
}

export function drawMinecraftSmoke(
  ctx: CanvasRenderingContext2D,
  particles: SmokeParticle[],
): void {
  ctx.save();
  for (const p of particles) {
    if (p.alpha <= 0.02) continue;

    const baseColor = Math.round(245 - p.shade * 110);
    const alpha = Math.max(0, Math.min(1, p.alpha));

    const progress = p.life / p.maxLife;
    const growth = 1.0 + progress * 0.85;
    const s = Math.round(p.size * growth);

    ctx.fillStyle = `rgba(${baseColor}, ${baseColor}, ${baseColor}, ${alpha})`;

    ctx.fillRect(Math.round(p.x - s * 0.5), Math.round(p.y - s * 0.5), s, s);

    const nib = Math.max(2, Math.round(s * 0.38));
    ctx.fillRect(
      Math.round(p.x - nib * 0.5),
      Math.round(p.y - s * 0.5 - nib),
      nib,
      nib,
    );
    ctx.fillRect(
      Math.round(p.x - nib * 0.5),
      Math.round(p.y + s * 0.5),
      nib,
      nib,
    );
    ctx.fillRect(
      Math.round(p.x - s * 0.5 - nib),
      Math.round(p.y - nib * 0.5),
      nib,
      nib,
    );
    ctx.fillRect(
      Math.round(p.x + s * 0.5),
      Math.round(p.y - nib * 0.5),
      nib,
      nib,
    );

    const coreColor = Math.max(0, baseColor - 40);
    ctx.fillStyle = `rgba(${coreColor}, ${coreColor}, ${coreColor}, ${alpha * 0.85})`;
    const coreS = Math.max(2, Math.round(s * 0.5));
    ctx.fillRect(
      Math.round(p.x - coreS * 0.5),
      Math.round(p.y - coreS * 0.5),
      coreS,
      coreS,
    );
  }
  ctx.restore();
}

export function renderBee(
  ctx: CanvasRenderingContext2D,
  options: RenderBeeOptions,
): void {
  const {
    kinematics,
    state,
    danceState,
    elapsedTime,
    scale = 1.4,
    particles = [],
    deathProgress = 0,
  } = options;

  if (particles.length > 0) {
    drawMinecraftSmoke(ctx, particles);
  }

  if (deathProgress >= 0.35) {
    return;
  }

  ctx.save();
  ctx.translate(kinematics.x, kinematics.y);
  ctx.rotate(kinematics.heading);
  drawDropShadow(ctx, kinematics.elevation * (1 - deathProgress * 2.8), scale);
  ctx.restore();

  ctx.save();
  ctx.translate(kinematics.x, kinematics.y);
  ctx.rotate(kinematics.heading);

  if (deathProgress > 0) {
    const tumbleAngle = (deathProgress / 0.35) * (Math.PI * 0.5);
    ctx.rotate(tumbleAngle);
  } else if (kinematics.bankAngle !== 0) {
    ctx.rotate(kinematics.bankAngle);
  }
  ctx.scale(scale, scale);

  const waggleOffset = danceState?.waggleLateralOffset ?? 0;

  drawBeeLegs(ctx, state, kinematics.speed, kinematics.elevation, elapsedTime);

  drawBeeAbdomen(ctx, waggleOffset);

  drawBeeThorax(ctx);

  drawBeeHead(ctx);

  drawBeeWings(ctx, kinematics.speed, kinematics.elevation, elapsedTime);

  if (deathProgress > 0) {
    ctx.save();
    ctx.globalCompositeOperation = "source-atop";
    const hurtAlpha = Math.min(0.75, (deathProgress / 0.35) * 0.85);
    ctx.fillStyle = `rgba(239, 68, 68, ${hurtAlpha})`;
    ctx.fillRect(-30, -25, 60, 50);
    ctx.restore();
  }

  ctx.restore();
}

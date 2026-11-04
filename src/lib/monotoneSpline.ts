export interface SplinePoint {
  x: number;
  y: number;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function emit(value: number): string {
  return round2(value).toFixed(2);
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

export function smoothMonotonePath(
  points: readonly SplinePoint[],
  minY: number,
  maxY: number,
): string {
  const finite = points.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  const n = finite.length;
  if (n === 0 || !(maxY > minY)) return "";

  const yOf = (y: number) => round2(clamp(y, minY, maxY));
  const xs = finite.map((p) => round2(p.x));
  const ys = finite.map((p) => yOf(p.y));

  if (n === 1) return `M${emit(xs[0])},${emit(ys[0])}`;

  const delta = new Array<number>(n - 1);
  for (let i = 0; i < n - 1; i++) {
    const dx = xs[i + 1] - xs[i];
    delta[i] = dx === 0 ? 0 : (ys[i + 1] - ys[i]) / dx;
  }

  const slope = new Array<number>(n).fill(0);
  slope[0] = delta[0];
  slope[n - 1] = delta[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (delta[i - 1] * delta[i] <= 0) slope[i] = 0;
    else slope[i] = (delta[i - 1] + delta[i]) / 2;
  }

  for (let i = 0; i < n - 1; i++) {
    const d = delta[i];
    if (d === 0) {
      slope[i] = 0;
      slope[i + 1] = 0;
      continue;
    }
    const alpha = slope[i] / d;
    const beta = slope[i + 1] / d;
    const mag = alpha * alpha + beta * beta;
    if (mag > 9) {
      const tau = 3 / Math.sqrt(mag);
      slope[i] = tau * alpha * d;
      slope[i + 1] = tau * beta * d;
    }
  }

  let path = `M${emit(xs[0])},${emit(ys[0])}`;
  for (let i = 0; i < n - 1; i++) {
    const x0 = xs[i];
    const x1 = xs[i + 1];
    const y0 = ys[i];
    const y1 = ys[i + 1];
    const dx = x1 - x0;
    if (dx === 0) {
      path += ` L${emit(x1)},${emit(y1)}`;
      continue;
    }
    const lo = Math.min(y0, y1);
    const hi = Math.max(y0, y1);
    const cp1y = clamp(round2(y0 + (slope[i] * dx) / 3), lo, hi);
    const cp2y = clamp(round2(y1 - (slope[i + 1] * dx) / 3), lo, hi);
    path += ` C${emit(x0 + dx / 3)},${emit(cp1y)} ${emit(x1 - dx / 3)},${emit(cp2y)} ${emit(x1)},${emit(y1)}`;
  }
  return path;
}

import { prefetchRadialHeatmapPayload } from "../utils/radialHeatmapClient";

let started = false;

export function scheduleRadialHeatmapWarmup() {
  if (started) return;
  started = true;
  const kick = () => prefetchRadialHeatmapPayload();
  if (typeof requestIdleCallback !== "undefined") {
    requestIdleCallback(kick, { timeout: 2800 });
  } else {
    setTimeout(kick, 0);
  }
}

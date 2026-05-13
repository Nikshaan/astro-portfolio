import { prefetchRadialHeatmapPayload } from "../utils/radialHeatmapClient";

let started = false;

export function scheduleRadialHeatmapWarmup() {
  if (started) return;
  started = true;
  queueMicrotask(() => {
    void prefetchRadialHeatmapPayload();
  });
}

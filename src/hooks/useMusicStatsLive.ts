import { useSyncExternalStore } from "react";
import {
  subscribeMusicStats,
  getMusicStatsSnapshot,
  getMusicStatsServerSnapshot,
  type MusicStatsSnapshot,
} from "../utils/musicStatsClient";

function subscribe(onStoreChange: () => void) {
  return subscribeMusicStats(() => onStoreChange());
}

export function useMusicStatsLive(): MusicStatsSnapshot {
  return useSyncExternalStore(
    subscribe,
    getMusicStatsSnapshot,
    getMusicStatsServerSnapshot,
  );
}

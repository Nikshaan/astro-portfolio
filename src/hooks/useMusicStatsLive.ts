import { useEffect, useState } from "react";
import {
  subscribeMusicStats,
  type MusicStatsSnapshot,
} from "../utils/musicStatsClient";

export function useMusicStatsLive(): MusicStatsSnapshot {
  const [state, setState] = useState<MusicStatsSnapshot>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => subscribeMusicStats(setState), []);

  return state;
}

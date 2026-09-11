import { useEffect, useState } from "react";
import {
  subscribeMusicStats,
  getMusicStatsSnapshot,
  type MusicStatsSnapshot,
} from "../utils/musicStatsClient";

export function useMusicStatsLive(): MusicStatsSnapshot {
  const [state, setState] = useState<MusicStatsSnapshot>(getMusicStatsSnapshot);

  useEffect(() => subscribeMusicStats(setState), []);

  return state;
}

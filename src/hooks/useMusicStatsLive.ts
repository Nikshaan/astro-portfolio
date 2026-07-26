import { useCallback, useEffect, useState } from "react";
import {
  loadMusicStatsData,
  readMusicStatsCache,
  subscribeMusicStatsLiveRefresh,
  type MusicStatsData,
} from "../utils/musicStatsClient";

export function useMusicStatsLive() {
  const [data, setData] = useState<MusicStatsData | null>(() =>
    readMusicStatsCache(),
  );
  const [loading, setLoading] = useState(() => !readMusicStatsCache());
  const [error, setError] = useState<string | null>(null);

  const applyPayload = useCallback((musicData: MusicStatsData) => {
    setData(musicData);
    setError(null);
    setLoading(false);
  }, []);

  const pull = useCallback(
    async (options?: { force?: boolean; silent?: boolean }) => {
      const force = options?.force === true;
      const silent = options?.silent === true;

      if (!force) {
        const hit = readMusicStatsCache();
        if (hit) {
          applyPayload(hit);
          return;
        }
      }

      if (!silent) setLoading(true);

      try {
        const musicData = await loadMusicStatsData(
          force ? { force: true } : undefined,
        );
        applyPayload(musicData);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to load music stats";
        const fallback = readMusicStatsCache();
        if (fallback) {
          applyPayload(fallback);
        } else {
          setError(message);
          setLoading(false);
        }
      }
    },
    [applyPayload],
  );

  useEffect(() => {
    void pull();
  }, [pull]);

  useEffect(() => subscribeMusicStatsLiveRefresh(applyPayload), [applyPayload]);

  return { data, loading, error, refresh: pull };
}

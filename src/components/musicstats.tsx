import { useEffect, useState, useCallback, memo } from "react";
import MusicCharts from "./musiccharts";
import {
  loadMusicStatsData,
  readMusicStatsCache,
  type MusicStatsData,
} from "../utils/musicStatsClient";
import {
  MUSIC_STATS_SHELL,
  MUSIC_STATS_UPPER,
  MusicStatsLoadingShell,
} from "./musicStatsLoadingShell";

export type { GenreEntry } from "../utils/musicStatsClient";

export default memo(function MusicStatsClient() {
  const [data, setData] = useState<MusicStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const hit = readMusicStatsCache();
    if (hit) {
      setData(hit);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const musicData = await loadMusicStatsData();
      setData(musicData);
      setError(null);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load music stats";
      setError(errorMessage);
      const fallback = readMusicStatsCache();
      if (fallback) {
        setData(fallback);
        setError(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading && !data) {
    return <MusicStatsLoadingShell />;
  }

  if (error && !data) {
    return (
      <div
        className={`${MUSIC_STATS_SHELL} shrink-0 items-center justify-center`}
      >
        <div className="type-body-sm text-red-400">{error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div
        className={`${MUSIC_STATS_SHELL} shrink-0 items-center justify-center`}
      >
        <div className="type-body-sm text-gray-400">No data available</div>
      </div>
    );
  }

  const bgStyle: React.CSSProperties = data.topArtistImageUrl
    ? {
        backgroundImage: `linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.65)), url(${data.topArtistImageUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        borderRadius: "1.25rem",
        transition: "background-image 0.4s ease",
      }
    : {};

  return (
    <div className={MUSIC_STATS_SHELL}>
      <div
        className={`${MUSIC_STATS_UPPER} shrink-0 items-center md:items-start`}
        style={bgStyle}
      >
        <div className="w-full text-center">
          <p className="type-stats-label mb-3 text-center !text-white [html[data-theme=light]_&]:!text-white">
            Total music scrobbles
          </p>
          <div className="flex w-full flex-col items-center gap-2 type-body-sm">
            <p>
              <span className="font-medium !text-white [html[data-theme=light]_&]:!text-white">
                Play count:
              </span>{" "}
              <span className="!text-white opacity-80 [html[data-theme=light]_&]:!text-white">
                {data.upperStatsArray[0]?.toLocaleString()}
              </span>
            </p>
            <p>
              <span className="font-medium !text-white [html[data-theme=light]_&]:!text-white">
                Track count:
              </span>{" "}
              <span className="!text-white opacity-80 [html[data-theme=light]_&]:!text-white">
                {data.upperStatsArray[1]?.toLocaleString()}
              </span>
            </p>
            <p>
              <span className="font-medium !text-white [html[data-theme=light]_&]:!text-white">
                Artist count:
              </span>{" "}
              <span className="!text-white opacity-80 [html[data-theme=light]_&]:!text-white">
                {data.upperStatsArray[2]?.toLocaleString()}
              </span>
            </p>
            <p>
              <span className="font-medium !text-white [html[data-theme=light]_&]:!text-white">
                Album count:
              </span>{" "}
              <span className="!text-white opacity-80 [html[data-theme=light]_&]:!text-white">
                {data.upperStatsArray[3]?.toLocaleString()}
              </span>
            </p>
          </div>
        </div>

        <div className="w-full text-center">
          <p className="type-stats-label mb-3 text-center !text-white [html[data-theme=light]_&]:!text-white">
            Top artists of the week
          </p>
          <div className="type-body-sm">
            {data.artistsInfo.length > 0 ? (
              data.artistsInfo.map((artist, index) => (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row justify-center items-center h-full w-full gap-1 sm:gap-2 mb-2"
                >
                  <div className="flex gap-2">
                    <p className="font-medium !text-white [html[data-theme=light]_&]:!text-white">
                      {artist.name}
                    </p>
                    <p className="!text-white opacity-70 [html[data-theme=light]_&]:!text-white">
                      plays: {artist.count}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="!text-white opacity-60 type-caption italic [html[data-theme=light]_&]:!text-white">
                  No recent listening data available
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1" aria-hidden />

      <div className="flex h-[180px] w-full shrink-0 flex-col lg:h-[250px]">
        <p className="type-stats-label mb-3 text-center [html[data-theme=light]_&]:!text-[#2D1B4E]">
          Daily music scrobbles
        </p>
        <div className="min-h-0 w-full flex-1 select-none">
          <MusicCharts data={data.weeklyScrobbles} />
        </div>
      </div>
    </div>
  );
});

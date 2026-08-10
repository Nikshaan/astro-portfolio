import { memo, useEffect, useRef, useState } from "react";
import { isSlowConnection } from "../utils/networkAware";

export interface DemoVideoSource {
  src: string;
  /** Full MIME type incl. codecs, so the browser can pick without downloading. */
  type: string;
}

interface ProjectDemoVideoProps {
  sources: DemoVideoSource[];
  poster: string;
  /** Intrinsic size of the *fallback* render, used to reserve layout space. */
  width: number;
  height: number;
  label: string;
}

/**
 * Demo videos are heavy relative to everything else in an expanded card, so
 * nothing is fetched until the element is near the viewport; until then the
 * poster stands in for it. On metered connections we go further and attach the
 * sources without preloading, so bytes move only if the user hits play.
 */
export default memo(function ProjectDemoVideo({
  sources,
  poster,
  width,
  height,
  label,
}: ProjectDemoVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  // Both start false so the server and first client render agree.
  const [attachSources, setAttachSources] = useState(false);
  const [preloadMetadata, setPreloadMetadata] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || attachSources) return;

    const activate = () => {
      setAttachSources(true);
      setPreloadMetadata(!isSlowConnection());
    };

    // Without IntersectionObserver, fall back to activating immediately.
    if (typeof IntersectionObserver === "undefined") {
      activate();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          activate();
          observer.disconnect();
        }
      },
      // Start slightly early so the first frames are ready by the time it lands.
      { rootMargin: "300px 0px" },
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [attachSources]);

  // Adding <source> children only re-runs resource selection while the element
  // is still NETWORK_EMPTY; load() makes picking them up unconditional.
  useEffect(() => {
    if (attachSources) videoRef.current?.load();
  }, [attachSources]);

  return (
    <div
      ref={containerRef}
      className="my-6 overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900/40"
    >
      <video
        ref={videoRef}
        className="project-demo-video block h-auto w-full"
        poster={poster}
        width={width}
        height={height}
        loop
        playsInline
        controls
        controlsList="nodownload"
        disablePictureInPicture
        preload={preloadMetadata ? "metadata" : "none"}
        aria-label={label}
      >
        {attachSources &&
          sources.map((source) => (
            <source key={source.src} src={source.src} type={source.type} />
          ))}
      </video>
    </div>
  );
});

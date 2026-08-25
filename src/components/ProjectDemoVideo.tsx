import { memo, useEffect, useRef, useState } from "react";
import { isSlowConnection } from "../utils/networkAware";

export interface DemoVideoSource {
  src: string;
  type: string;
}

interface ProjectDemoVideoProps {
  sources: DemoVideoSource[];
  poster: string;
  width: number;
  height: number;
  label: string;
}

export default memo(function ProjectDemoVideo({
  sources,
  poster,
  width,
  height,
  label,
}: ProjectDemoVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [attachSources, setAttachSources] = useState(false);
  const [preloadMetadata, setPreloadMetadata] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || attachSources) return;

    const activate = () => {
      setAttachSources(true);
      setPreloadMetadata(!isSlowConnection());
    };

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
      { rootMargin: "300px 0px" },
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [attachSources]);

  useEffect(() => {
    if (attachSources) videoRef.current?.load();
  }, [attachSources]);

  return (
    <div
      ref={containerRef}
      className="my-6 overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)]"
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

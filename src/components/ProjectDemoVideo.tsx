import { memo, useEffect, useRef } from "react";

interface ProjectDemoVideoProps {
  src: string;
  label: string;
  isActive: boolean;
}

export default memo(function ProjectDemoVideo({
  src,
  label,
  isActive,
}: ProjectDemoVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!isActive) {
      video.pause();
      video.removeAttribute("src");
      video.load();
      return;
    }

    if (video.getAttribute("src") !== src) {
      video.src = src;
      video.load();
    }
  }, [isActive, src]);

  return (
    <div className="my-6 overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900/40">
      <video
        ref={videoRef}
        className="project-demo-video block h-auto w-full"
        loop
        playsInline
        controls
        controlsList="nodownload"
        disablePictureInPicture
        preload={isActive ? "metadata" : "none"}
        aria-label={label}
      />
    </div>
  );
});

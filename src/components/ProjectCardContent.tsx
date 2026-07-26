import { memo, useMemo } from "react";
import ProjectDemoVideo from "./ProjectDemoVideo";

const DEMO_VIDEOS: Record<string, { src: string; label: string }> = {
  "{{VOCALOPS_DEMO_VIDEO}}": {
    src: `${import.meta.env.BASE_URL}videos/vocalops-demo.mp4`.replace(/\/{2,}/g, "/"),
    label: "VocalOps demo video",
  },
  "{{PRODUCTWIZZ_DEMO_VIDEO}}": {
    src: `${import.meta.env.BASE_URL}videos/productwizz-demo.mp4`.replace(/\/{2,}/g, "/"),
    label: "ProductWizz demo video",
  },
};

const SLOT_PATTERN = /(\{\{[A-Z_]+\}\})/g;

interface ProjectCardContentProps {
  html: string;
  isActive: boolean;
}

export default memo(function ProjectCardContent({
  html,
  isActive,
}: ProjectCardContentProps) {
  const parts = useMemo(() => html.split(SLOT_PATTERN).filter(Boolean), [html]);

  return (
    <>
      {parts.map((part, index) => {
        const video = DEMO_VIDEOS[part];
        if (video) {
          return (
            <ProjectDemoVideo
              key={`${part}-${index}`}
              src={video.src}
              label={video.label}
              isActive={isActive}
            />
          );
        }

        return (
          <div
            key={`html-${index}`}
            dangerouslySetInnerHTML={{ __html: part }}
          />
        );
      })}
    </>
  );
});

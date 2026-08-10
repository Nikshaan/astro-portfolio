import { memo, useMemo } from "react";
import ProjectDemoVideo, { type DemoVideoSource } from "./ProjectDemoVideo";
import vocalopsPoster from "../data/vocalops-poster.webp";
import productwizzPoster from "../data/productwizz-poster.webp";

const asset = (path: string) =>
  `${import.meta.env.BASE_URL}${path}`.replace(/\/{2,}/g, "/");

// AV1 first: browsers pick the first source they can decode, and fall through
// to H.264 on their own if they can't.
const AV1_MP4 = 'video/mp4; codecs="av01.0.05M.08"';
const H264_MP4 = 'video/mp4; codecs="avc1.640028"';

interface DemoVideo {
  sources: DemoVideoSource[];
  poster: string;
  width: number;
  height: number;
  label: string;
}

const DEMO_VIDEOS: Record<string, DemoVideo> = {
  "{{VOCALOPS_DEMO_VIDEO}}": {
    sources: [
      { src: asset("videos/vocalops-demo.v2.av1.mp4"), type: AV1_MP4 },
      { src: asset("videos/vocalops-demo.v2.mp4"), type: H264_MP4 },
    ],
    poster: vocalopsPoster.src,
    width: 2520,
    height: 1080,
    label: "VocalOps demo video",
  },
  "{{PRODUCTWIZZ_DEMO_VIDEO}}": {
    sources: [{ src: asset("videos/productwizz-demo.mp4"), type: H264_MP4 }],
    poster: productwizzPoster.src,
    width: 1280,
    height: 720,
    label: "ProductWizz demo video",
  },
};

const SLOT_PATTERN = /(\{\{[A-Z_]+\}\})/g;

interface ProjectCardContentProps {
  html: string;
}

export default memo(function ProjectCardContent({
  html,
}: ProjectCardContentProps) {
  const parts = useMemo(() => html.split(SLOT_PATTERN).filter(Boolean), [html]);

  return (
    <>
      {parts.map((part, index) => {
        const video = DEMO_VIDEOS[part];
        if (video) {
          return <ProjectDemoVideo key={`${part}-${index}`} {...video} />;
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

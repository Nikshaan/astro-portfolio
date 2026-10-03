import { memo, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ProjectDemoVideo, { type DemoVideoSource } from "./ProjectDemoVideo";
import vocalopsPoster from "../data/vocalops-poster.webp";
import productwizzPoster from "../data/productwizz-poster.webp";

const asset = (path: string) =>
  `${import.meta.env.BASE_URL}${path}`.replace(/\/{2,}/g, "/");

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

const SLOT_PATTERN = /\{\{[A-Z_]+\}\}/g;
const SLOT_ATTR = "data-demo-video-slot";

interface ProjectCardContentProps {
  html: string;
}

export default memo(function ProjectCardContent({
  html,
}: ProjectCardContentProps) {
  const markedHtml = useMemo(
    () =>
      html.replace(SLOT_PATTERN, (token) =>
        DEMO_VIDEOS[token] ? `<div ${SLOT_ATTR}="${token}"></div>` : token,
      ),
    [html],
  );
  const innerHtml = useMemo(() => ({ __html: markedHtml }), [markedHtml]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [slots, setSlots] = useState<{ node: Element; token: string }[]>([]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    setSlots(
      Array.from(container.querySelectorAll(`[${SLOT_ATTR}]`)).map((node) => ({
        node,
        token: node.getAttribute(SLOT_ATTR) ?? "",
      })),
    );
  }, [markedHtml]);

  return (
    <>
      <div ref={containerRef} dangerouslySetInnerHTML={innerHtml} />
      {slots.map(({ node, token }, index) => {
        const video = DEMO_VIDEOS[token];
        return video
          ? createPortal(<ProjectDemoVideo {...video} />, node, `${token}-${index}`)
          : null;
      })}
    </>
  );
});

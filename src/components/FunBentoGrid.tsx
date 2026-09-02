import React, { useEffect, Suspense, lazy, useState, useRef } from "react";
import { LazyMotion, domAnimation } from "framer-motion";
import { isSlowConnection } from "../utils/networkAware";
import { scheduleRadialHeatmapWarmup } from "./musicRadialHeatmapWarmup";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import BentoGrid from "./bento/BentoGrid";
import BentoCard from "./bento/BentoCard";
import { SPANS } from "./bento/spans";

const MusicStatsClient = lazy(() => import("./musicstats"));
const RadialArtistHeatmap = lazy(() => import("./RadialArtistHeatmap"));
const MusicGenreStreakBar = lazy(() => import("./MusicGenreStreakBar"));
import IndiaMapCard from "./IndiaMapCard";
import ErrorBoundary from "./ErrorBoundary";
import {
  MusicStatsLoadingShell,
  YearlyScrobblesLoadingShell,
} from "./musicStatsLoadingShell";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const FUN_MUSIC_YEARLY_PAIR_BODY =
  "flex min-w-0 w-full max-w-full flex-1 flex-col px-2 pb-5 pt-0 sm:px-4 md:px-6";

interface Image {
  id: string;
  src: string;
  srcSet?: string;
  fullSrc?: string;
  width: number;
  height: number;
  title: string;
  alt: string;
  placeholderDataUrl?: string;
}

interface FunBentoGridProps {
  images: Image[];
  galleryImageCount: number;
}

const VISITED_PLACES = [
  { name: "Mumbai", lat: 19.076, lng: 72.8777 },
  { name: "Delhi", lat: 28.7041, lng: 77.1025 },
  { name: "Agra", lat: 27.1767, lng: 78.0081 },
  { name: "Manali", lat: 32.2432, lng: 77.1892 },
  { name: "Manikaran", lat: 32.0167, lng: 77.35 },
  { name: "Goa", lat: 15.2993, lng: 74.124 },
  { name: "Fort Kochi", lat: 9.9658, lng: 76.2427 },
  { name: "Ernakulam", lat: 9.9816, lng: 76.2999 },
  { name: "Kunnukara", lat: 10.35, lng: 76.0833 },
  { name: "Udupi", lat: 13.3409, lng: 74.7421 },
  { name: "Mangaluru", lat: 12.9141, lng: 74.856 },
  { name: "Mulki", lat: 13.0908, lng: 74.7941 },
  { name: "Padubidri", lat: 13.1333, lng: 74.7667 },
  { name: "Pune", lat: 18.5204, lng: 73.8567 },
  { name: "Wada", lat: 19.68, lng: 73.25 },
  { name: "Amritsar", lat: 31.634, lng: 74.8723 },
  { name: "Chandigarh", lat: 30.7333, lng: 76.7794 },
  { name: "Udaipur", lat: 24.5854, lng: 73.7125 },
  { name: "Jaipur", lat: 26.9124, lng: 75.7873 },
  { name: "Ranthambore", lat: 26.0173, lng: 76.5026 },
  { name: "Ahmedabad", lat: 23.0225, lng: 72.5714 },
  { name: "Coorg", lat: 12.4244, lng: 75.7382 },
  { name: "Daman", lat: 20.4142, lng: 72.8328 },
  { name: "Pilikula", lat: 12.9245, lng: 74.8907 },
];

const FunBentoGrid: React.FC<FunBentoGridProps> = ({
  images,
  galleryImageCount,
}) => {
  const [visibleCount, setVisibleCount] = useState(12);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const initPromiseRef = useRef<Promise<any> | null>(null);
  const galleryDataRef = useRef<any[]>([]);
  const fancyboxLoadedRef = useRef(false);

  useEffect(() => {
    scheduleRadialHeatmapWarmup();

    const handleUnhandledRejection = (e: PromiseRejectionEvent) => {
      if (e.reason && e.reason.name === "EncodingError") {
        e.preventDefault();
      }
    };
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    const batchSize = isSlowConnection() ? 6 : 12;
    setVisibleCount((prev) => Math.max(prev, batchSize));

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + batchSize, images.length));
        }
      },
      { rootMargin: isSlowConnection() ? "200px" : "400px" },
    );

    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [images.length]);

  useEffect(() => {
    if (isSlowConnection()) return;
    const prefetch = () => void import("./RadialArtistHeatmap");
    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(prefetch, { timeout: 2800 });
      return () => cancelIdleCallback(id);
    }
    const t = window.setTimeout(prefetch, 250);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!document.getElementById("fun-gallery-style")) {
      const style = document.createElement("style");
      style.id = "fun-gallery-style";
      style.textContent = `
                .gallery-photo-zoom {
                    transform: scale(1);
                    transition: transform 300ms cubic-bezier(0.25, 0.1, 0.25, 1), opacity 220ms ease-out;
                }
                .gallery-photo-link:hover .gallery-photo-zoom,
                .gallery-photo-link:focus-visible .gallery-photo-zoom {
                    transform: scale(1.05);
                }
                @media (prefers-reduced-motion: reduce) {
                    .gallery-photo-zoom {
                        transition: none !important;
                    }
                    .gallery-photo-link:hover .gallery-photo-zoom {
                        transform: scale(1);
                    }
                }
            `;
      document.head.appendChild(style);
    }
  }, []);

  const initFancybox = async () => {
    if (initPromiseRef.current) return initPromiseRef.current;

    initPromiseRef.current = (async () => {
      const [, , response] = await Promise.all([
        import("@fancyapps/ui"),
        import("@fancyapps/ui/dist/fancybox/fancybox.css"),
        fetch("/api/gallery.json").then((res) => (res.ok ? res.json() : [])),
      ]);
      galleryDataRef.current = response;
      fancyboxLoadedRef.current = true;
    })();

    return initPromiseRef.current;
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let preloadObserver: IntersectionObserver | null = null;

    if (!isSlowConnection()) {
      const maxPrefetchImages = 3;
      preloadObserver = new IntersectionObserver(
        (entries) => {
          if (!entries[0]?.isIntersecting) return;
          preloadObserver?.disconnect();

          const scheduleBatch =
            typeof requestIdleCallback === "function"
              ? () =>
                requestIdleCallback(
                  () => {
                    const n = Math.min(images.length, maxPrefetchImages);
                    for (let i = 0; i < n; i++) {
                      const img = images[i];
                      const url = img.fullSrc || img.src;
                      if (!url) continue;
                      const link = document.createElement("link");
                      link.rel = "prefetch";
                      link.as = "image";
                      link.href = url;
                      document.head.appendChild(link);
                    }
                  },
                  { timeout: 2400 },
                )
              : () =>
                queueMicrotask(() => {
                  const n = Math.min(images.length, maxPrefetchImages);
                  for (let i = 0; i < n; i++) {
                    const img = images[i];
                    const url = img.fullSrc || img.src;
                    if (!url) continue;
                    const link = document.createElement("link");
                    link.rel = "prefetch";
                    link.as = "image";
                    link.href = url;
                    document.head.appendChild(link);
                  }
                });
          scheduleBatch();
        },
        { rootMargin: "200px" },
      );
      preloadObserver.observe(container);
    }

    const loadOnInteraction = () => {
      initFancybox();
      container.removeEventListener("mouseenter", loadOnInteraction, true);
      container.removeEventListener("focus", loadOnInteraction, true);
    };

    container.addEventListener("mouseenter", loadOnInteraction, {
      once: true,
      capture: true,
    });
    container.addEventListener("focus", loadOnInteraction, {
      once: true,
      capture: true,
    });

    const handleClick = async (e: Event) => {
      const target = (e.target as Element).closest(
        '[data-fancybox="gallery"]',
      ) as HTMLAnchorElement;
      if (!target) return;

      e.preventDefault();
      const src = target.getAttribute("href");

      if (!fancyboxLoadedRef.current) {
        await initFancybox();
      }

      const { Fancybox } = await import("@fancyapps/ui");

      const startIndex = galleryDataRef.current.findIndex(
        (img: any) => img.src === src,
      );

      Fancybox.show(
        galleryDataRef.current.map((img: any) => ({
          src: img.src,
          thumb: img.src,
          caption: img.title || img.caption || "",
          width: img.width,
          height: img.height,
        })),
        {
          startIndex: startIndex >= 0 ? startIndex : 0,
          dragToClose: false,
          origin: (_fancybox: any, slide: any) => {
            const link = document.querySelector(
              `a[href="${slide.src}"]`,
            ) as HTMLAnchorElement;
            return link;
          },
          Thumbs: { type: "classic" },
          Images: { zoom: true },
          on: {
            close: () => {
              (document.activeElement as HTMLElement | null)?.blur();
            },
          },
        } as any,
      );
    };

    container.addEventListener("click", handleClick);

    return () => {
      import("@fancyapps/ui").then(({ Fancybox }) => {
        Fancybox.close();
      });
      preloadObserver?.disconnect();
      container.removeEventListener("click", handleClick);
      container.removeEventListener("mouseenter", loadOnInteraction, true);
      container.removeEventListener("focus", loadOnInteraction, true);
    };
  }, [images]);

  return (
    <LazyMotion features={domAnimation}>
    <div className="w-full max-w-[1400px] mx-auto px-4">
      <h2 id="fun-heading" className="mb-8 text-[var(--text-primary)]">
        Fun
      </h2>

      <BentoGrid id="fun-grid" containerRef={containerRef}>
        <BentoCard span="half" disableHoverMotion padded={false}>
          <div className="flex h-full min-h-0 w-full flex-col">
            <h3 className="mb-3 shrink-0 p-5 pb-0 md:p-6 md:pb-0">Music Stats</h3>
            <div className={FUN_MUSIC_YEARLY_PAIR_BODY}>
              <Suspense fallback={<MusicStatsLoadingShell />}>
                <ErrorBoundary>
                  <MusicStatsClient />
                </ErrorBoundary>
              </Suspense>
            </div>
          </div>
        </BentoCard>

        <BentoCard span="half" disableHoverMotion padded={false}>
          <div className="flex h-full min-h-0 w-full flex-col">
            <h3 className="mb-3 shrink-0 p-5 pb-0 md:p-6 md:pb-0">
              Yearly scrobbles (week-wise)
            </h3>
            <div className={FUN_MUSIC_YEARLY_PAIR_BODY}>
              <Suspense fallback={<YearlyScrobblesLoadingShell />}>
                <ErrorBoundary>
                  <RadialArtistHeatmap />
                </ErrorBoundary>
              </Suspense>
            </div>
          </div>
        </BentoCard>

        <BentoCard span="wideShort" disableHoverMotion padded={false}>
          <div className="flex h-full w-full items-center">
            <Suspense
              fallback={
                <div className="flex min-h-[64px] w-full items-center justify-center rounded-2xl border border-transparent type-caption text-[var(--text-tertiary)]">
                  Loading genre streak…
                </div>
              }
            >
              <ErrorBoundary>
                <MusicGenreStreakBar />
              </ErrorBoundary>
            </Suspense>
          </div>
        </BentoCard>

        <IndiaMapCard
          className={SPANS.quarter}
          visitedPlaces={VISITED_PLACES}
        />

        {images.slice(0, visibleCount).map((image: Image, i: number) => (
          <div key={image.id} className={cn("h-full w-full", SPANS.quarter)}>
            <a
              href={image.fullSrc || image.src}
              className="gallery-photo-link group/photo relative block h-full w-full cursor-pointer overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)]"
              data-fancybox="gallery"
              data-caption={image.title}
              aria-label={`View photo: ${image.title}`}
            >
              <div className="absolute inset-0 z-10 overflow-hidden">
                <img
                  src={image.src}
                  srcSet={image.srcSet}
                  width={image.width}
                  height={image.height}
                  alt={image.alt}
                  loading={i < 2 ? "eager" : "lazy"}
                  fetchPriority={i < 2 ? "high" : "auto"}
                  decoding="async"
                  sizes="(max-width: 1024px) 50vw, 25vw"
                  className={cn(
                    "gallery-photo-zoom h-full w-full origin-center object-cover",
                    image.placeholderDataUrl?.startsWith("data:")
                      ? "opacity-0"
                      : "opacity-100",
                  )}
                  style={{
                    backgroundImage: image.placeholderDataUrl?.startsWith("data:")
                      ? `url(${image.placeholderDataUrl})`
                      : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                  onLoad={(e) => {
                    const el = e.currentTarget;
                    el.style.backgroundImage = "";
                    el.classList.remove("opacity-0");
                    el.classList.add("opacity-100");
                  }}
                  onError={(e) => {
                    const img = e.currentTarget;
                    img.style.backgroundImage = "";
                    img.style.backgroundColor = "var(--surface-raised)";
                    img.classList.remove("opacity-0");
                    img.classList.add("opacity-100");
                  }}
                />
              </div>
              <div className="pointer-events-none absolute inset-0 z-20 flex items-end bg-black/0 p-4 transition-colors duration-300 ease-out group-hover/photo:bg-black/30 group-focus-visible/photo:bg-black/30 motion-reduce:transition-none">
                <p
                  className={cn(
                    "w-full truncate type-body-sm font-medium !text-white opacity-0 transition-opacity duration-300 drop-shadow-md group-hover/photo:opacity-100 group-focus-visible/photo:opacity-100",
                    "motion-reduce:transition-none",
                  )}
                >
                  {image.title}
                </p>
              </div>
            </a>
          </div>
        ))}
        {visibleCount < images.length && (
          <div ref={sentinelRef} className="col-span-full h-4" aria-hidden="true" />
        )}
      </BentoGrid>
      {galleryImageCount > 0 && (
        <p className="mt-4 text-center type-caption text-[var(--text-tertiary)]">
          Click any photo to open the full gallery of {galleryImageCount}{" "}
          {galleryImageCount === 1 ? "image" : "images"}.
        </p>
      )}
    </div>
    </LazyMotion>
  );
};

export default FunBentoGrid;

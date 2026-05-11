import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { geoMercator, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import { X, Loader2, Maximize2 } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface VisitedPlace {
  name: string;
  lat: number;
  lng: number;
}

interface IndiaMapCardProps {
  visitedPlaces?: VisitedPlace[];
  className?: string;
  index?: number;
}

let cachedTopology: any = null;
let topologyInflight: Promise<any> | null = null;

async function loadIndiaTopology(): Promise<any> {
  if (cachedTopology) return cachedTopology;
  if (topologyInflight) return topologyInflight;
  topologyInflight = (async () => {
    const response = await fetch("/india-topo.json");
    if (!response.ok) throw new Error("Failed to load map data");
    const data = await response.json();
    cachedTopology = data;
    return data;
  })();
  try {
    return await topologyInflight;
  } finally {
    topologyInflight = null;
  }
}

const IndiaMapCard: React.FC<IndiaMapCardProps> = ({
  visitedPlaces = [],
  className,
  index = 0,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [topology, setTopology] = useState<any>(cachedTopology);
  const [loading, setLoading] = useState(!cachedTopology);
  const [hoveredPlace, setHoveredPlace] = useState<VisitedPlace | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(
    null,
  );

  const [isLightTheme, setIsLightTheme] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const readTheme = () =>
      document.documentElement.getAttribute("data-theme") === "light";
    setIsLightTheme(readTheme());

    const obs = new MutationObserver(() => {
      setIsLightTheme(readTheme());
    });

    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (cachedTopology) {
      setTopology(cachedTopology);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const data = await loadIndiaTopology();
        setTopology(data);
      } catch {
        setTopology(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (!expanded) return;

    document.documentElement.style.setProperty(
      "--scrollbar-width",
      `${window.innerWidth - document.documentElement.clientWidth}px`,
    );
    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = "var(--scrollbar-width, 0px)";

    if (typeof window !== "undefined" && (window as any).lenis) {
      (window as any).lenis.stop();
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.code === "Escape" || e.keyCode === 27) {
        setExpanded(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
      if (typeof window !== "undefined" && (window as any).lenis) {
        (window as any).lenis.start();
      }
      window.removeEventListener("keydown", handleEscape);
    };
  }, [expanded]);

  const baseMap = useMemo(() => {
    if (!topology || !topology.objects) {
      return {
        pathGenerator: null as any,
        projection: null as any,
        features: [] as any[],
        viewBox: "0 0 800 800",
      };
    }

    const objectNames = Object.keys(topology.objects);
    if (!objectNames.length) {
      return {
        pathGenerator: null as any,
        projection: null as any,
        features: [] as any[],
        viewBox: "0 0 800 800",
      };
    }

    const pickBestObjectKey = () => {
      const lower = objectNames.map((k) => k.toLowerCase());
      const preferred = [
        /states?/,
        /admin/,
        /adm/,
        /india/,
        /subunits?/,
        /districts?/,
        /geometr(?:y|ies)/,
      ];

      for (const rx of preferred) {
        const idx = lower.findIndex((k) => rx.test(k));
        if (idx !== -1) return objectNames[idx];
      }

      return objectNames[0];
    };

    const objectKey = pickBestObjectKey();
    const featureCollection = feature(
      topology,
      topology.objects[objectKey],
    ) as any;
    const features = Array.isArray(featureCollection?.features)
      ? featureCollection.features
      : [];

    const proj = geoMercator();
    proj.fitSize([1000, 1000], featureCollection);

    const pathGen = geoPath().projection(proj);
    const bounds = pathGen.bounds(featureCollection);
    const minX = bounds[0][0];
    const minY = bounds[0][1];
    const width = bounds[1][0] - minX;
    const height = bounds[1][1] - minY;

    const safeViewBox =
      isFinite(minX) &&
      isFinite(minY) &&
      isFinite(width) &&
      isFinite(height) &&
      width > 0 &&
      height > 0
        ? `${minX} ${minY} ${width} ${height}`
        : "0 0 800 800";

    return {
      pathGenerator: pathGen,
      projection: proj,
      features,
      viewBox: safeViewBox,
    };
  }, [topology]);

  const svgRef = React.useRef<SVGSVGElement>(null);
  const [svgScale, setSvgScale] = useState<number>(1);

  useEffect(() => {
    if (!svgRef.current || !baseMap.viewBox) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      const { width, height } = entry.contentRect;
      if (width === 0 || height === 0) return;

      const parts = baseMap.viewBox.split(" ");
      if (parts.length < 4) return;
      const vbWidth = parseFloat(parts[2]);
      const vbHeight = parseFloat(parts[3]);

      const scaleX = width / vbWidth;
      const scaleY = height / vbHeight;
      const scale = Math.min(scaleX, scaleY);

      if (scale > 0 && !isNaN(scale) && isFinite(scale)) {
        setSvgScale(scale);
      }
    });

    observer.observe(svgRef.current);
    return () => observer.disconnect();
  }, [baseMap.viewBox, expanded]);

  const handleCardClick = () => {
    if (!expanded) {
      setExpanded(true);
    }
  };

  return (
    <>
      <div className={cn("h-full w-full", className)}>
        <motion.div
          layoutId="india-map-card"
          className={cn(
            "relative h-full w-full rounded-3xl overflow-hidden cursor-pointer group transition-colors duration-300 ease-in-out",
            "bg-neutral-50 dark:bg-[#171717] border-white dark:border-white/20 shadow-sm",
            "[html[data-theme=light]_&]:!bg-[#dbeafe] [html[data-theme=light]_&]:!border-[#93c5fd]",
            expanded ? "opacity-0 pointer-events-none" : "opacity-100",
          )}
          onClick={handleCardClick}
        >
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center text-neutral-400">
              <Loader2 className="animate-spin w-5 h-5" />
            </div>
          )}

          {!loading && baseMap.pathGenerator && (
            <div className="w-full h-full p-4 flex flex-col items-center justify-center pointer-events-none">
              <div className="absolute top-4 left-4 z-10">
                <span
                  className={cn(
                    "text-base md:text-lg font-bold",
                    "text-neutral-500 dark:text-neutral-400",
                  )}
                >
                  Travels
                </span>
              </div>

              <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <Maximize2 className="w-4 h-4 text-neutral-400" />
              </div>

              <svg
                ref={svgRef}
                width="100%"
                height="100%"
                viewBox={baseMap.viewBox || "0 0 800 800"}
                preserveAspectRatio="xMidYMid meet"
                className="overflow-visible"
              >
                <g>
                  {isLightTheme &&
                    baseMap.features.map((feature: any, i: number) => (
                      <path
                        key={`collapsed-shadow-light-${i}`}
                        d={baseMap.pathGenerator!(feature) as string}
                        strokeWidth={0}
                        fill="#1e3a8a"
                        opacity={0.14}
                        transform={`translate(${1.5 / svgScale}, ${2.2 / svgScale})`}
                        style={{ filter: `blur(${2.4 / svgScale}px)` }}
                      />
                    ))}
                  {!isLightTheme &&
                    baseMap.features.map((feature: any, i: number) => (
                      <path
                        key={`collapsed-shadow-dark-${i}`}
                        d={baseMap.pathGenerator!(feature) as string}
                        strokeWidth={0}
                        fill="#000000"
                        opacity={0.28}
                        transform={`translate(${1.35 / svgScale}, ${2.1 / svgScale})`}
                        style={{ filter: `blur(${2.6 / svgScale}px)` }}
                      />
                    ))}
                </g>

                <g>
                  {baseMap.features.map((feature: any, i: number) => {
                    const isLight = isLightTheme;
                    return (
                      <path
                        key={`collapsed-${i}`}
                        d={baseMap.pathGenerator!(feature) as string}
                        className="transition-colors duration-300"
                        fill={isLight ? "#bfdbfe" : "#27272a"}
                        stroke={isLight ? "rgba(30,58,138,0.45)" : "#3f3f46"}
                        strokeWidth={1 / svgScale}
                        style={
                          isLight
                            ? {
                                filter:
                                  "drop-shadow(0px 2px 3px rgba(2,6,23,0.22))",
                              }
                            : {
                                filter:
                                  "drop-shadow(0px 2px 3px rgba(0,0,0,0.35))",
                              }
                        }
                      />
                    );
                  })}
                </g>

                <g>
                  {visitedPlaces.map((place, i) => {
                    const coords = baseMap.projection!([place.lng, place.lat]);
                    if (!coords) return null;
                    return (
                      <g
                        key={i}
                        transform={`translate(${coords[0]}, ${coords[1]})`}
                      >
                        <circle
                          r={7}
                          className="fill-purple-500 dark:fill-purple-400"
                        />
                        <circle
                          r={7}
                          className="fill-purple-500 dark:fill-purple-400 animate-ping opacity-75"
                          style={{
                            willChange: "transform, opacity",
                            backfaceVisibility: "hidden",
                          }}
                        />
                      </g>
                    );
                  })}
                </g>
              </svg>
            </div>
          )}
        </motion.div>
      </div>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {expanded && (
              <motion.div
                key="india-map-modal"
                layoutId="india-map-card"
                className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 md:p-10 bg-white/0"
              >
                <motion.div
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setExpanded(false)}
                />

                <motion.div
                  className={cn(
                    "relative w-full h-full max-w-6xl max-h-[95vh] md:max-h-[90vh] rounded-[2rem] overflow-hidden shadow-2xl flex flex-col",
                    "bg-neutral-50 dark:bg-[#171717]",
                  )}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="absolute top-4 right-4 md:top-6 md:right-6 z-20 flex gap-2">
                    <button
                      onClick={() => setExpanded(false)}
                      aria-label="Close map view"
                      className="p-2 cursor-pointer rounded-full bg-neutral-100 dark:bg-zinc-800 hover:bg-neutral-200 dark:hover:bg-zinc-700 transition-colors"
                    >
                      <X
                        className="w-5 h-5 text-neutral-900 dark:text-white cursor-pointer"
                        aria-hidden="true"
                      />
                    </button>
                  </div>

                  <div className="absolute top-4 left-4 md:top-6 md:left-6 z-20 pointer-events-none">
                    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
                      India
                    </h2>
                    <p className="text-neutral-500 dark:text-neutral-400">
                      {visitedPlaces.length} Cities Visited
                    </p>
                  </div>

                  <div className="flex-1 w-full h-full relative p-0 sm:p-2 md:p-4">
                    {!loading && baseMap.pathGenerator && (
                      <motion.svg
                        ref={svgRef}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.15 }}
                        width="100%"
                        height="100%"
                        viewBox={baseMap.viewBox || "0 0 800 800"}
                        preserveAspectRatio="xMidYMid meet"
                        className="w-full h-full touch-pan-x touch-pan-y"
                        onClick={() => {
                          setHoveredPlace(null);
                          setTooltipPos(null);
                        }}
                      >
                        <g>
                          {isLightTheme &&
                            baseMap.features.map((feature: any, i: number) => (
                              <path
                                key={`expanded-shadow-light-${i}`}
                                d={baseMap.pathGenerator!(feature) as string}
                                strokeWidth={0}
                                fill="#1e3a8a"
                                opacity={0.14}
                                transform={`translate(${1.5 / svgScale}, ${2.2 / svgScale})`}
                                style={{ filter: `blur(${2.4 / svgScale}px)` }}
                              />
                            ))}
                          {!isLightTheme &&
                            baseMap.features.map((feature: any, i: number) => (
                              <path
                                key={`expanded-shadow-dark-${i}`}
                                d={baseMap.pathGenerator!(feature) as string}
                                strokeWidth={0}
                                fill="#000000"
                                opacity={0.28}
                                transform={`translate(${1.35 / svgScale}, ${2.1 / svgScale})`}
                                style={{ filter: `blur(${2.6 / svgScale}px)` }}
                              />
                            ))}
                        </g>
                        <g>
                          {baseMap.features.map((feature: any, i: number) => {
                            const isLight = isLightTheme;
                            return (
                              <path
                                key={`expanded-${i}`}
                                d={baseMap.pathGenerator!(feature) as string}
                                strokeWidth={1 / svgScale}
                                className={
                                  isLight
                                    ? "transition-colors duration-300"
                                    : "cursor-pointer transition-colors duration-300"
                                }
                                fill={isLight ? "#bfdbfe" : "#27272a"}
                                stroke={
                                  isLight ? "rgba(30,58,138,0.45)" : "#3f3f46"
                                }
                                style={
                                  isLight
                                    ? {
                                        filter:
                                          "drop-shadow(0px 2px 3px rgba(2,6,23,0.22))",
                                      }
                                    : {
                                        filter:
                                          "drop-shadow(0px 2px 3px rgba(0,0,0,0.35))",
                                      }
                                }
                              />
                            );
                          })}
                        </g>

                        <g>
                          {visitedPlaces.map((place) => {
                            const coords = baseMap.projection!([
                              place.lng,
                              place.lat,
                            ]);
                            if (!coords) return null;

                            const isHovered = hoveredPlace?.name === place.name;
                            const baseRadius = 6 / svgScale;
                            const hoverRadius = baseRadius * 1.5;
                            const tapTargetRadius = Math.max(
                              14 / svgScale,
                              baseRadius * 2.2,
                            );

                            return (
                              <g key={place.name}>
                                <circle
                                  cx={coords[0]}
                                  cy={coords[1]}
                                  r={tapTargetRadius}
                                  className="fill-transparent cursor-pointer pointer-events-auto"
                                  onPointerEnter={(e) => {
                                    if (e.pointerType === "mouse") {
                                      const rect =
                                        e.currentTarget.getBoundingClientRect();
                                      setTooltipPos({
                                        x: rect.left + rect.width / 2,
                                        y: rect.top + rect.height / 2,
                                      });
                                      setHoveredPlace(place);
                                    }
                                  }}
                                  onPointerLeave={(e) => {
                                    if (e.pointerType === "mouse") {
                                      setTooltipPos(null);
                                      setHoveredPlace(null);
                                    }
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (hoveredPlace?.name === place.name) {
                                      setHoveredPlace(null);
                                      setTooltipPos(null);
                                    } else {
                                      const rect =
                                        e.currentTarget.getBoundingClientRect();
                                      setTooltipPos({
                                        x: rect.left + rect.width / 2,
                                        y: rect.top + rect.height / 2,
                                      });
                                      setHoveredPlace(place);
                                    }
                                  }}
                                />

                                <g
                                  transform={`translate(${coords[0]}, ${coords[1]})`}
                                  pointerEvents="none"
                                >
                                  <circle
                                    r={baseRadius}
                                    className="fill-purple-500 dark:fill-purple-400 opacity-30 animate-ping pointer-events-none"
                                  />
                                  <circle
                                    r={isHovered ? hoverRadius : baseRadius}
                                    className={
                                      isHovered
                                        ? "fill-purple-600 dark:fill-purple-300 transition-all duration-300 pointer-events-none"
                                        : "fill-purple-500 dark:fill-purple-400 transition-all duration-300 pointer-events-none"
                                    }
                                  />
                                  {isHovered && (
                                    <circle
                                      r={hoverRadius + 2}
                                      className="fill-none stroke-purple-600 dark:stroke-purple-300 stroke-2 pointer-events-none"
                                    />
                                  )}
                                </g>
                              </g>
                            );
                          })}
                        </g>
                      </motion.svg>
                    )}
                  </div>
                </motion.div>

                {hoveredPlace && tooltipPos && (
                  <div
                    className="fixed z-[10000] pointer-events-none flex items-center justify-center transform -translate-x-1/2 -translate-y-full"
                    style={{
                      left: tooltipPos.x,
                      top: tooltipPos.y - 16,
                    }}
                  >
                    <div className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-3 py-1.5 md:px-4 md:py-2 rounded-md shadow-lg text-sm md:text-base font-medium whitespace-nowrap">
                      {hoveredPlace.name}
                    </div>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-neutral-900 dark:border-t-white"></div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
};

export default IndiaMapCard;

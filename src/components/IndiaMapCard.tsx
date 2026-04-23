import React, { useState, useEffect, useMemo, useRef } from "react";
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

const IndiaMapCard: React.FC<IndiaMapCardProps> = ({
    visitedPlaces = [],
    className,
    index = 0,
}) => {
    const [expanded, setExpanded] = useState(false);
    const staggerDelay = index * 0.025;
    const [topology, setTopology] = useState<any>(cachedTopology);
    const [loading, setLoading] = useState(!cachedTopology);
    const containerRef = useRef<HTMLDivElement>(null);
    const expandedContainerRef = useRef<HTMLDivElement>(null);
    const [collapsedDimensions, setCollapsedDimensions] = useState({ width: 0, height: 0 });
    const [expandedDimensions, setExpandedDimensions] = useState({ width: 0, height: 0 });
    const [hoveredPlace, setHoveredPlace] = useState<VisitedPlace | null>(null);

    useEffect(() => {
        if (cacheDataAvailable()) {
            setTopology(cachedTopology);
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                const response = await fetch("/india-topo.json");
                if (!response.ok) throw new Error("Failed to load map data");
                const data = await response.json();
                cachedTopology = data;
                setTopology(data);
            } catch {
                setTopology(null);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    function cacheDataAvailable() {
        return !!cachedTopology;
    }

    useEffect(() => {
        if (!containerRef.current) return;

        const updateDimensions = () => {
            if (containerRef.current) {
                const width = containerRef.current.clientWidth;
                const height = containerRef.current.clientHeight;
                if (width > 0 && height > 0) {
                    setCollapsedDimensions({ width, height });
                }
            }
        };

        updateDimensions();

        const resizeObserver = new ResizeObserver(updateDimensions);
        resizeObserver.observe(containerRef.current);

        return () => resizeObserver.disconnect();
    }, []);

    useEffect(() => {
        if (!expanded) return;

        document.body.style.overflow = "hidden";
        if (typeof window !== "undefined" && (window as any).lenis) {
            (window as any).lenis.stop();
        }

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setExpanded(false);
            }
        };

        window.addEventListener("keydown", handleEscape);
        return () => {
            document.body.style.overflow = "";
            if (typeof window !== "undefined" && (window as any).lenis) {
                (window as any).lenis.start();
            }
            window.removeEventListener("keydown", handleEscape);
        };
    }, [expanded]);

    useEffect(() => {
        if (!expanded || !expandedContainerRef.current) return;

        const updateExpandedDimensions = () => {
            if (expandedContainerRef.current) {
                const width = expandedContainerRef.current.clientWidth;
                const height = expandedContainerRef.current.clientHeight;
                if (width > 0 && height > 0) {
                    setExpandedDimensions({ width, height });
                }
            }
        };

        updateExpandedDimensions();

        const resizeObserver = new ResizeObserver(updateExpandedDimensions);
        resizeObserver.observe(expandedContainerRef.current);

        return () => resizeObserver.disconnect();
    }, [expanded]);

    const collapsedMap = useMemo(() => {
        if (!topology || collapsedDimensions.width === 0 || collapsedDimensions.height === 0) {
            return { pathGenerator: null, projection: null, features: [] };
        }

        const objectKey = Object.keys(topology.objects)[0];
        const featureCollection = feature(
            topology,
            topology.objects[objectKey]
        ) as any;
        const features = featureCollection.features;

        const proj = geoMercator();
        const padding = 20;

        proj.fitExtent(
            [
                [padding, padding],
                [collapsedDimensions.width - padding, collapsedDimensions.height - padding],
            ],
            featureCollection
        );

        const pathGen = geoPath().projection(proj);

        return { pathGenerator: pathGen, projection: proj, features };
    }, [topology, collapsedDimensions]);

    const expandedMap = useMemo(() => {
        if (!topology || expandedDimensions.width === 0 || expandedDimensions.height === 0) {
            return { pathGenerator: null, projection: null, features: [] };
        }

        const objectKey = Object.keys(topology.objects)[0];
        const featureCollection = feature(
            topology,
            topology.objects[objectKey]
        ) as any;
        const features = featureCollection.features;

        const proj = geoMercator();
        const padding = 0;

        proj.fitExtent(
            [
                [padding, padding],
                [expandedDimensions.width - padding, expandedDimensions.height - padding],
            ],
            featureCollection
        );

        const pathGen = geoPath().projection(proj);

        return { pathGenerator: pathGen, projection: proj, features };
    }, [topology, expandedDimensions]);

    const handleCardClick = () => {
        if (!expanded) {
            setExpanded(true);
        }
    };

    const sortedPlaces = useMemo(() => {
        return visitedPlaces;
    }, [visitedPlaces]);

    return (
        <>
            <motion.div
                className={cn("h-full w-full", className)}
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                whileInView={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: {
                        duration: 0.4,
                        ease: [0.25, 0.1, 0.25, 1],
                        delay: staggerDelay,
                    }
                }}
                viewport={{ once: true, amount: 0.1 }}
            >
                <motion.div
                    layoutId="india-map-card"
                    className={cn(
                        "relative h-full w-full rounded-3xl overflow-hidden cursor-pointer group border transition-colors duration-300 ease-in-out",
                        "bg-neutral-50 dark:bg-[#171717]",
                        "border-white dark:border-white/20",
                        "[.data-theme='light']_&:!bg-[#dbeafe] [.data-theme='light']_&:!border-[#93c5fd]",
                        expanded ? "opacity-0 pointer-events-none" : "opacity-100"
                    )}
                    onClick={handleCardClick}
                    ref={containerRef}
                >
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center text-neutral-400">
                            <Loader2 className="animate-spin w-5 h-5" />
                        </div>
                    )}

                    {!loading && collapsedMap.pathGenerator && (
                        <div className="w-full h-full p-4 flex flex-col items-center justify-center pointer-events-none">
                            <div className="absolute top-4 left-4 z-10">
                                <span className={cn(
                                    "text-base md:text-lg font-bold",
                                    "text-neutral-500 dark:text-neutral-400"
                                )}>
                                    Travels
                                </span>
                            </div>

                            <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Maximize2 className="w-4 h-4 text-neutral-400" />
                            </div>

                            <svg
                                width="100%"
                                height="100%"
                                viewBox={`0 0 ${collapsedDimensions.width} ${collapsedDimensions.height}`}
                                className="overflow-visible"
                            >
                                <g className="opacity-50 dark:opacity-30">
                                    {collapsedMap.features.map((feature: any, i: number) => (
                                        <path
                                            key={`collapsed-${i}`}
                                            d={collapsedMap.pathGenerator!(feature) as string}
                                            className="stroke-[0.5] fill-neutral-200 dark:fill-zinc-700 stroke-neutral-300 dark:stroke-zinc-600 transition-colors duration-300"
                                        />
                                    ))}
                                </g>
                                <g>
                                    {visitedPlaces.map((place, i) => {
                                        const coords = collapsedMap.projection!([place.lng, place.lat]);
                                        if (!coords) return null;
                                        const pinRadius = Math.max(1.2, Math.min(3, collapsedDimensions.width / 150));
                                        return (
                                            <g key={i} transform={`translate(${coords[0]}, ${coords[1]})`}>
                                                <circle r={pinRadius} className="fill-purple-500 dark:fill-purple-400" />
                                                <circle r={pinRadius} className="fill-purple-500 dark:fill-purple-400 animate-ping opacity-75" />
                                            </g>
                                        );
                                    })}
                                </g>
                            </svg>
                        </div>
                    )}
                </motion.div>
            </motion.div>

            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {expanded && (
                        <motion.div
                            layoutId="india-map-card"
                            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-10 bg-white/0"
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
                                "relative w-full h-full max-w-6xl max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col",
                                "bg-neutral-50 dark:bg-[#171717]"
                            )}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="absolute top-6 right-6 z-20 flex gap-2">
                                <button
                                    onClick={() => setExpanded(false)}
                                    aria-label="Close map view"
                                    className="p-2 cursor-pointer rounded-full bg-neutral-100 dark:bg-zinc-800 hover:bg-neutral-200 dark:hover:bg-zinc-700 transition-colors"
                                >
                                    <X className="w-5 h-5 text-neutral-900 dark:text-white cursor-pointer" aria-hidden="true" />
                                </button>
                            </div>

                            <div className="absolute top-6 left-6 z-20 pointer-events-none">
                                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">India</h2>
                                <p className="text-neutral-500 dark:text-neutral-400">
                                    {visitedPlaces.length} Cities Visited
                                </p>
                            </div>

                            <div className="flex-1 w-full h-full relative" ref={expandedContainerRef}>
                                {!loading && expandedMap.pathGenerator && (
                                    <svg
                                        width="100%"
                                        height="100%"
                                        viewBox={`0 0 ${expandedDimensions.width} ${expandedDimensions.height}`}
                                        className="w-full h-full touch-pan-x touch-pan-y"
                                    >
                                        <g>
                                            {expandedMap.features.map((feature: any, i: number) => {
                                                return (
                                                    <motion.path
                                                        key={`expanded-${i}`}
                                                        d={expandedMap.pathGenerator!(feature) as string}
                                                        initial={{ pathLength: 0, opacity: 0 }}
                                                        animate={{ pathLength: 1, opacity: 1 }}
                                                        transition={{ duration: 1, delay: i * 0.01 }}
                                                        className="stroke-neutral-300 dark:stroke-zinc-700 stroke-1 fill-neutral-50 dark:fill-zinc-800 hover:fill-blue-50 dark:hover:fill-zinc-700 cursor-pointer transition-colors duration-300"
                                                    />
                                                );
                                            })}
                                        </g>
                                        
                                        <g>
                                            {visitedPlaces.map((place, index) => {
                                                const coords = expandedMap.projection!([place.lng, place.lat]);
                                                if (!coords) return null;

                                                const isHovered = hoveredPlace?.name === place.name;
                                                const baseRadius = Math.max(2.5, Math.min(5, expandedDimensions.width / 220));
                                                const hoverRadius = baseRadius * 1.5;
                                                const pingRadius = baseRadius * 2;
                                                const tapTargetRadius = Math.max(15, baseRadius * 4);

                                                return (
                                                    <g key={place.name}>
                                                        <circle
                                                            cx={coords[0]}
                                                            cy={coords[1]}
                                                            r={tapTargetRadius}
                                                            className="fill-transparent cursor-pointer"
                                                            onMouseEnter={() => setHoveredPlace(place)}
                                                            onMouseLeave={() => setHoveredPlace(null)}
                                                            onClick={() => setHoveredPlace(hoveredPlace?.name === place.name ? null : place)}
                                                        />
                                                        
                                                        <g transform={`translate(${coords[0]}, ${coords[1]})`}>
                                                       
                                                            <circle
                                                                r={baseRadius}
                                                                className="fill-purple-500 dark:fill-purple-400 opacity-30 animate-ping pointer-events-none"
                                                            />
                                                            <circle
                                                                r={isHovered ? hoverRadius : baseRadius}
                                                                className={isHovered ? "fill-purple-600 dark:fill-purple-300 transition-all duration-300 pointer-events-none" : "fill-purple-500 dark:fill-purple-400 transition-all duration-300 pointer-events-none"}
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
                                        
                                        <g>
                                            {visitedPlaces.map((place) => {
                                                const coords = expandedMap.projection!([place.lng, place.lat]);
                                                if (!coords) return null;

                                                const isHovered = hoveredPlace?.name === place.name;
                                                const baseRadius = Math.max(2.5, Math.min(5, expandedDimensions.width / 220));

                                                return (
                                                    <g key={`tooltip-${place.name}`}>
                                                        {isHovered && (
                                                            <g transform={`translate(${coords[0]}, ${coords[1]})`}>
                                                                <rect
                                                                    x={-80}
                                                                    y={-(baseRadius * 2 + 45)}
                                                                    width={160}
                                                                    height={40}
                                                                    rx={4}
                                                                    className="fill-neutral-900 dark:fill-white shadow-lg"
                                                                />
                                                                <text
                                                                    x={0}
                                                                    y={-(baseRadius * 2 + 22)}
                                                                    textAnchor="middle"
                                                                    className="fill-white dark:fill-neutral-900 text-[clamp(11px,1.5vw,15px)] font-medium pointer-events-none select-none"
                                                                >
                                                                    {place.name}
                                                                </text>
                                                                <path
                                                                    d={`M0,${-(baseRadius * 2 + 5)} L-6,${-(baseRadius * 2 - 3)} L6,${-(baseRadius * 2 - 3)} Z`}
                                                                    className="fill-neutral-900 dark:fill-white pointer-events-none"
                                                                />
                                                            </g>
                                                        )}
                                                    </g>
                                                );
                                            })}
                                        </g>
                                    </svg>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>,
            document.body
        )}
        </>
    );
};

export default IndiaMapCard;

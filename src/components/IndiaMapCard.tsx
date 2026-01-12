import React, { useState, useEffect, useMemo, useRef } from "react";
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
}

let cachedTopology: any = null;

const IndiaMapCard: React.FC<IndiaMapCardProps> = ({
    visitedPlaces = [],
    className,
}) => {
    const [expanded, setExpanded] = useState(false);
    const [topology, setTopology] = useState<any>(cachedTopology);
    const [loading, setLoading] = useState(!cachedTopology);
    const containerRef = useRef<HTMLDivElement>(null);
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
            } catch (error) {
                console.error("Error fetching India TopoJSON:", error);
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
                const { width, height } = containerRef.current.getBoundingClientRect();
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

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setExpanded(false);
            }
        };

        window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
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
        const padding = 50;

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

    return (
        <>
            <motion.div
                layoutId="india-map-card"
                className={cn(
                    "relative h-full w-full rounded-3xl overflow-hidden cursor-pointer group border transition-colors",
                    "bg-neutral-50 dark:bg-[#171717]",
                    "border-white dark:border-white/20",
                    expanded ? "opacity-0 pointer-events-none" : "opacity-100",
                    className
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
                                "text-sm font-medium uppercase tracking-wider",
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
                                        className="stroke-[0.5] transition-colors fill-neutral-200 dark:fill-zinc-700 stroke-neutral-300 dark:stroke-zinc-600"
                                    />
                                ))}
                            </g>

                            {visitedPlaces.map((place, i) => {
                                const coords = collapsedMap.projection!([place.lng, place.lat]);
                                if (!coords) return null;
                                return (
                                    <g key={i} transform={`translate(${coords[0]}, ${coords[1]})`}>
                                        <circle r="3" className="fill-purple-500 dark:fill-purple-400" />
                                        <circle
                                            r="3"
                                            className="fill-purple-500 dark:fill-purple-400 animate-ping opacity-75"
                                        />
                                    </g>
                                );
                            })}
                        </svg>
                    </div>
                )}
            </motion.div>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        layoutId="india-map-card"
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 bg-white/0"
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
                                    className="p-2 cursor-pointer rounded-full bg-neutral-100 dark:bg-zinc-800 hover:bg-neutral-200 dark:hover:bg-zinc-700 transition-colors"
                                >
                                    <X className="w-5 h-5 text-neutral-900 dark:text-white cursor-pointer" />
                                </button>
                            </div>

                            <div className="absolute top-6 left-6 z-20 pointer-events-none">
                                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">India</h2>
                                <p className="text-neutral-500 dark:text-neutral-400">
                                    {visitedPlaces.length} Cities Visited
                                </p>
                            </div>

                            <div className="flex-1 w-full h-full relative" ref={(el) => {
                                if (el) {
                                    const { width, height } = el.getBoundingClientRect();
                                    if (Math.abs(width - expandedDimensions.width) > 5 || Math.abs(height - expandedDimensions.height) > 5) {
                                        setExpandedDimensions({ width, height });
                                    }
                                }
                            }}>
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
                                                        className="stroke-neutral-300 dark:stroke-zinc-700 stroke-1 transition-colors duration-300 fill-neutral-50 dark:fill-zinc-800 hover:fill-blue-50 dark:hover:fill-zinc-700 cursor-pointer"
                                                    />
                                                );
                                            })}
                                        </g>

                                        {visitedPlaces.map((place, i) => {
                                            const coords = expandedMap.projection!([place.lng, place.lat]);
                                            if (!coords) return null;

                                            const isHovered = hoveredPlace?.name === place.name;

                                            return (
                                                <g
                                                    key={i}
                                                    transform={`translate(${coords[0]}, ${coords[1]})`}
                                                    onMouseEnter={() => setHoveredPlace(place)}
                                                    onMouseLeave={() => setHoveredPlace(null)}
                                                    className="cursor-pointer"
                                                >
                                                    <circle
                                                        r={isHovered ? 8 : 4}
                                                        className="fill-purple-500 dark:fill-purple-400 transition-all duration-300"
                                                    />
                                                    <circle
                                                        r={isHovered ? 12 : 4}
                                                        className="fill-purple-500 dark:fill-purple-400 opacity-30 animate-ping"
                                                    />
                                                    {isHovered && (
                                                        <g transform={`translate(0, -15)`}>
                                                            <rect
                                                                x="-50" y="-25" width="100" height="25" rx="4"
                                                                className="fill-neutral-900 dark:fill-white"
                                                            />
                                                            <text
                                                                textAnchor="middle" dy="-8"
                                                                className="fill-white dark:fill-neutral-900 text-xs font-bold"
                                                            >
                                                                {place.name}
                                                            </text>
                                                            <path d="M -5 -0.5 L 0 5 L 5 -0.5 Z" className="fill-neutral-900 dark:fill-white" />
                                                        </g>
                                                    )}
                                                </g>
                                            );
                                        })}
                                    </svg>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default IndiaMapCard;

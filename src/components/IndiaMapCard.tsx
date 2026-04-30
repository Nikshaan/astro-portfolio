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

const IndiaMapCard: React.FC<IndiaMapCardProps> = ({
    visitedPlaces = [],
    className,
    index = 0,
}) => {
    const [expanded, setExpanded] = useState(false);
    const [topology, setTopology] = useState<any>(cachedTopology);
    const [loading, setLoading] = useState(!cachedTopology);
    const [hoveredPlace, setHoveredPlace] = useState<VisitedPlace | null>(null);

    useEffect(() => {
        if (cachedTopology) {
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

    useEffect(() => {
        if (!expanded) return;

        document.documentElement.style.setProperty('--scrollbar-width', `${window.innerWidth - document.documentElement.clientWidth}px`);
        document.body.style.overflow = "hidden";
        document.body.style.paddingRight = "var(--scrollbar-width, 0px)";

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
            document.body.style.paddingRight = "";
            if (typeof window !== "undefined" && (window as any).lenis) {
                (window as any).lenis.start();
            }
            window.removeEventListener("keydown", handleEscape);
        };
    }, [expanded]);

    const baseMap = useMemo(() => {
        if (!topology) {
            return { pathGenerator: null, projection: null, features: [] };
        }

        const objectKey = Object.keys(topology.objects)[0];
        const featureCollection = feature(
            topology,
            topology.objects[objectKey]
        ) as any;
        const features = featureCollection.features;

        const proj = geoMercator();
        
        proj.fitExtent(
            [
                [10, 10],
                [790, 790],
            ],
            featureCollection
        );

        const pathGen = geoPath().projection(proj);

        return { pathGenerator: pathGen, projection: proj, features };
    }, [topology]);

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
                        "[.data-theme='light']_&:!bg-[#dbeafe] [.data-theme='light']_&:!border-[#93c5fd]",
                        expanded ? "opacity-0 pointer-events-none" : "opacity-100"
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
                                viewBox="0 0 800 800"
                                preserveAspectRatio="xMidYMid meet"
                                className="overflow-visible"
                            >
                                <g className="opacity-50 dark:opacity-30">
                                    {baseMap.features.map((feature: any, i: number) => (
                                        <path
                                            key={`collapsed-${i}`}
                                            d={baseMap.pathGenerator!(feature) as string}
                                            className="stroke-[0.5] fill-neutral-200 dark:fill-zinc-700 stroke-black dark:stroke-zinc-600 transition-colors duration-300"
                                        />
                                    ))}
                                </g>
                                <g>
                                    {visitedPlaces.map((place, i) => {
                                        const coords = baseMap.projection!([place.lng, place.lat]);
                                        if (!coords) return null;
                                        return (
                                            <g key={i} transform={`translate(${coords[0]}, ${coords[1]})`}>
                                                <circle r={7} className="fill-purple-500 dark:fill-purple-400" />
                                                <circle r={7} className="fill-purple-500 dark:fill-purple-400 animate-ping opacity-75" style={{ willChange: 'transform, opacity', backfaceVisibility: 'hidden' }} />
                                            </g>
                                        );
                                    })}
                                </g>
                            </svg>
                        </div>
                    )}
                </motion.div>
            </div>

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

                            <div className="flex-1 w-full h-full relative p-4">
                                {!loading && baseMap.pathGenerator && (
                                    <motion.svg
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ duration: 0.5, delay: 0.15 }}
                                        width="100%"
                                        height="100%"
                                        viewBox="0 0 800 800"
                                        preserveAspectRatio="xMidYMid meet"
                                        className="w-full h-full touch-pan-x touch-pan-y"
                                    >
                                        <g>
                                            {baseMap.features.map((feature: any, i: number) => {
                                                return (
                                                    <path
                                                        key={`expanded-${i}`}
                                                        d={baseMap.pathGenerator!(feature) as string}
                                                        strokeWidth={1}
                                                        className="stroke-black dark:stroke-zinc-700 fill-neutral-50 dark:fill-zinc-800 hover:fill-blue-50 dark:hover:fill-zinc-700 cursor-pointer transition-colors duration-300"
                                                    />
                                                );
                                            })}
                                        </g>
                                        
                                        <g>
                                            {visitedPlaces.map((place) => {
                                                const coords = baseMap.projection!([place.lng, place.lat]);
                                                if (!coords) return null;

                                                const isHovered = hoveredPlace?.name === place.name;
                                                const baseRadius = 6;
                                                const hoverRadius = baseRadius * 1.5;
                                                const tapTargetRadius = Math.max(15, baseRadius * 4);

                                                return (
                                                    <g key={place.name}>
                                                        <circle
                                                            cx={coords[0]}
                                                            cy={coords[1]}
                                                            r={tapTargetRadius}
                                                            className="fill-transparent cursor-pointer pointer-events-auto"
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
                                        
                                        <g className="pointer-events-none">
                                            {visitedPlaces.map((place) => {
                                                const coords = baseMap.projection!([place.lng, place.lat]);
                                                if (!coords) return null;

                                                const isHovered = hoveredPlace?.name === place.name;
                                                const baseRadius = 6;

                                                return (
                                                    <g key={`tooltip-${place.name}`}>
                                                        {isHovered && (
                                                            <g transform={`translate(${coords[0]}, ${coords[1]})`}>
                                                                <rect
                                                                    x={-50}
                                                                    y={-(baseRadius * 2 + 30)}
                                                                    width={100}
                                                                    height={25}
                                                                    rx={4}
                                                                    className="fill-neutral-900 dark:fill-white shadow-lg pointer-events-none"
                                                                />
                                                                <text
                                                                    x={0}
                                                                    y={-(baseRadius * 2 + 13)}
                                                                    textAnchor="middle"
                                                                    className="fill-white dark:fill-neutral-900 text-[12px] font-medium pointer-events-none"
                                                                >
                                                                    {place.name}
                                                                </text>
                                                                <path
                                                                    d={`M0,${-(baseRadius * 2 + 5)} L-4,${-(baseRadius * 2)} L4,${-(baseRadius * 2)} Z`}
                                                                    className="fill-neutral-900 dark:fill-white pointer-events-none"
                                                                />
                                                            </g>
                                                        )}
                                                    </g>
                                                );
                                            })}
                                        </g>
                                    </motion.svg>
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

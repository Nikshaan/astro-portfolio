import React, { useEffect, Suspense, lazy, memo, useState, useRef, useSyncExternalStore } from 'react';
import { isSlowConnection } from '../utils/networkAware';
import { m, type HTMLMotionProps, LazyMotion, domAnimation } from 'framer-motion';
import { Maximize2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

const MusicStatsClient = lazy(() => import('./musicstats'));
const YearlyArtistArc = lazy(() => import('./YearlyArtistArc'));
import IndiaMapCard from './IndiaMapCard';
import MusicExtrasCard from './MusicExtrasCard';
import ErrorBoundary from './ErrorBoundary';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const mobileQuery = typeof window !== 'undefined' ? window.matchMedia('(max-width: 1024px)') : null;
function useIsMobile() {
    return useSyncExternalStore(
        (cb) => { mobileQuery?.addEventListener('change', cb); return () => mobileQuery?.removeEventListener('change', cb); },
        () => mobileQuery?.matches ?? false,
        () => false
    );
}


interface Image {
    id: string;
    src: string;
    fullSrc?: string;
    width: number;
    height: number;
    title: string;
    alt: string;
    placeholderDataUrl?: string;
}

interface FunBentoGridProps {
    images: Image[];
    allImages?: Image[];
}

interface CardWrapperProps extends HTMLMotionProps<"div"> {
    children: React.ReactNode;
    className?: string;
    isExpandable?: boolean;
    index?: number;
}

const CardWrapper: React.FC<CardWrapperProps> = memo(({ children, className, isExpandable = false, index = 0, onClick, ...props }) => {
    const isMobile = useIsMobile();
    const staggerDelay = 0;

    return (
        <div className={cn("h-full w-full", className)}>
            <m.div
                className={cn(
                    "relative rounded-3xl border overflow-hidden h-full flex flex-col",
                    "bg-neutral-50 dark:bg-[#171717] border-white dark:border-white/20 shadow-sm",
                    "[.data-theme='light']_&:!bg-[#dbeafe] [.data-theme='light']_&:!border-[#93c5fd]",
                    isExpandable ? "cursor-pointer group hover:border-neutral-600" : ""
                )}
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                whileInView={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: {
                        duration: isMobile ? 0.25 : 0.4,
                        ease: [0.25, 0.1, 0.25, 1],
                        delay: isMobile ? 0 : staggerDelay,
                    }
                }}
                viewport={{ once: true, amount: isMobile ? 0 : 0.01 }}
                whileHover={isExpandable ? {
                    scale: 1.02,
                    transition: { duration: 0.2, ease: "easeOut" }
                } : {}}
                whileTap={isExpandable ? { scale: 0.98 } : {}}
                onClick={onClick}
                {...props}
            >
                {children}
                {isExpandable && (
                    <div className={cn(
                        "absolute bottom-4 right-4 transition-opacity duration-300 z-10",
                        "opacity-0 group-hover:opacity-100"
                    )}>
                        <Maximize2 size={16} className="!text-white drop-shadow-md" />
                    </div>
                )}
            </m.div>
        </div>
    );
});

const VISITED_PLACES = [
    { name: "Mumbai", lat: 19.0760, lng: 72.8777 },
    { name: "Delhi", lat: 28.7041, lng: 77.1025 },
    { name: "Agra", lat: 27.1767, lng: 78.0081 },
    { name: "Manali", lat: 32.2432, lng: 77.1892 },
    { name: "Manikaran", lat: 32.0167, lng: 77.3500 },
    { name: "Goa", lat: 15.2993, lng: 74.1240 },
    { name: "Fort Kochi", lat: 9.9658, lng: 76.2427 },
    { name: "Ernakulam", lat: 9.9816, lng: 76.2999 },
    { name: "Kunnukara", lat: 10.3500, lng: 76.0833 },
    { name: "Udupi", lat: 13.3409, lng: 74.7421 },
    { name: "Mangaluru", lat: 12.9141, lng: 74.8560 },
    { name: "Mulki", lat: 13.0908, lng: 74.7941 },
    { name: "Padubidri", lat: 13.1333, lng: 74.7667 },
    { name: "Pune", lat: 18.5204, lng: 73.8567 },
    { name: "Wada", lat: 19.6800, lng: 73.2500 },
    { name: "Amritsar", lat: 31.6340, lng: 74.8723 },
    { name: "Chandigarh", lat: 30.7333, lng: 76.7794 },
    { name: "Udaipur", lat: 24.5854, lng: 73.7125 },
    { name: "Jaipur", lat: 26.9124, lng: 75.7873 },
    { name: "Ranthambore", lat: 26.0173, lng: 76.5026 },
    { name: "Ahmedabad", lat: 23.0225, lng: 72.5714 },
    { name: "Coorg", lat: 12.4244, lng: 75.7382 },
    { name: "Daman", lat: 20.4142, lng: 72.8328 }
];

const FunBentoGrid: React.FC<FunBentoGridProps> = ({ images, allImages }) => {
    const [visibleCount, setVisibleCount] = useState(12);
    const sentinelRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const initPromiseRef = useRef<Promise<any> | null>(null);
    const galleryDataRef = useRef<any[]>([]);
    const fancyboxLoadedRef = useRef(false);

    useEffect(() => {
        const batchSize = isSlowConnection() ? 6 : 12;
        setVisibleCount(prev => Math.max(prev, batchSize));

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                setVisibleCount(prev => Math.min(prev + batchSize, images.length));
            }
        }, { rootMargin: isSlowConnection() ? '200px' : '400px' });

        if (sentinelRef.current) observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [images.length]);

    useEffect(() => {
        if (!document.getElementById('gallery-shimmer-style')) {
            const style = document.createElement('style');
            style.id = 'gallery-shimmer-style';
            style.textContent = `
                @keyframes galleryShimmer {
                    0%   { background-position: -600px 0; }
                    100% { background-position: 600px 0; }
                }
                [data-theme="light"] .gallery-shimmer {
                    background-image: linear-gradient(90deg, #bfdbfe 25%, #93c5fd 50%, #bfdbfe 75%) !important;
                }
            `;
            document.head.appendChild(style);
        }
        const cleanupBlur = setTimeout(() => {
            const galleryImages = document.querySelectorAll('.group-hover\\:scale-110');
            galleryImages.forEach((img: any) => {
                if (img.style.filter || img.style.backgroundImage) {
                    img.style.filter = '';
                    img.style.backgroundImage = '';
                }
            });
        }, 3000);

        return () => clearTimeout(cleanupBlur);
    }, []);

    const initFancybox = async () => {
        if (initPromiseRef.current) return initPromiseRef.current;

        initPromiseRef.current = (async () => {
            const [, , response] = await Promise.all([
                import('@fancyapps/ui'),
                import('@fancyapps/ui/dist/fancybox/fancybox.css'),
                fetch('/api/gallery.json').then(res => res.ok ? res.json() : [])
            ]);
            galleryDataRef.current = response;
            fancyboxLoadedRef.current = true;
        })();

        return initPromiseRef.current;
    };

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const preloadObserver = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                images.forEach((img) => {
                    const url = img.fullSrc || img.src;
                    if (!url) return;
                    const link = document.createElement('link');
                    link.rel = 'prefetch';
                    link.as = 'image';
                    link.href = url;
                    document.head.appendChild(link);
                });
                preloadObserver.disconnect();
            }
        }, { rootMargin: '200px' });
        preloadObserver.observe(container);

        const loadOnInteraction = () => {
            initFancybox();
            container.removeEventListener('mouseenter', loadOnInteraction, true);
            container.removeEventListener('focus', loadOnInteraction, true);
        };

        container.addEventListener('mouseenter', loadOnInteraction, { once: true, capture: true });
        container.addEventListener('focus', loadOnInteraction, { once: true, capture: true });

        const handleClick = async (e: Event) => {
            const target = (e.target as Element).closest('[data-fancybox="gallery"]') as HTMLAnchorElement;
            if (!target) return;

            e.preventDefault();
            const src = target.getAttribute('href');

            if (!fancyboxLoadedRef.current) {
                await initFancybox();
            }

            const { Fancybox } = await import('@fancyapps/ui');

            const startIndex = galleryDataRef.current.findIndex((img: any) => img.src === src);

            Fancybox.show(galleryDataRef.current.map((img: any) => ({
                src: img.src,
                thumb: img.src,
                caption: img.title || img.caption || '',
                width: img.width,
                height: img.height
            })), {
                startIndex: startIndex >= 0 ? startIndex : 0,
                dragToClose: false,
                origin: (_fancybox: any, slide: any) => {
                    const link = document.querySelector(`a[href="${slide.src}"]`) as HTMLAnchorElement;
                    return link;
                },
                Thumbs: {
                    type: 'classic',
                },
                Images: {
                    zoom: true,
                },
            } as any);
        };

        container.addEventListener('click', handleClick);

        return () => {
            import('@fancyapps/ui').then(({ Fancybox }) => {
                Fancybox.close();
            });
            preloadObserver.disconnect();
            container.removeEventListener('click', handleClick);
            container.removeEventListener('mouseenter', loadOnInteraction, true);
            container.removeEventListener('focus', loadOnInteraction, true);
        };
    }, [images]);

    return (
        <LazyMotion features={domAnimation}>
            <div className="w-full max-w-[1400px] mx-auto p-4 pt-16">
                <h2 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight mb-8 px-2">F.U.N</h2>

                <m.div
                    ref={containerRef}
                    className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[minmax(200px,auto)]"
                >
                    <CardWrapper key="music-stats" index={0} className="col-span-2 md:col-span-2 lg:col-span-2 row-span-2 min-h-[400px]">
                        <div className="h-full flex flex-col w-full">
                            <h3 className="text-xl font-medium mb-4 p-5 md:p-6 pb-0">Music Stats</h3>
                            <div className="flex-1 overflow-y-auto custom-scrollbar px-2 w-full">
                                <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">Loading music stats...</div>}>
                                    <ErrorBoundary>
                                        <MusicStatsClient />
                                    </ErrorBoundary>
                                </Suspense>
                            </div>
                        </div>
                    </CardWrapper>

                    <CardWrapper key="music-extras" index={1} className="col-span-2 lg:col-span-2 row-span-2 min-h-[400px]">
                        <MusicExtrasCard />
                    </CardWrapper>

                    <CardWrapper key="yearly-arc" index={2} className="col-span-2 lg:col-span-4 min-h-[360px] sm:min-h-[420px] md:min-h-[440px]">
                        <div className="h-full flex flex-col w-full">
                            <h3 className="text-xl font-medium mb-2 p-5 md:p-6 pb-0 shrink-0">Yearly listening arc</h3>
                            <div className="flex-1 flex flex-col min-h-0 min-w-0 w-full max-w-full overflow-x-hidden pb-6 px-2 sm:px-4 md:px-6 pt-0">
                                <Suspense fallback={
                                    <div className="flex-1 min-h-[200px] flex items-center justify-center text-neutral-400 text-sm rounded-xl border border-transparent">
                                        Loading listening arc...
                                    </div>
                                }>
                                    <ErrorBoundary>
                                        <YearlyArtistArc />
                                    </ErrorBoundary>
                                </Suspense>
                            </div>
                        </div>
                    </CardWrapper>

                    <CardWrapper key="india-map" index={3} className="col-span-1 row-span-1 aspect-[4/3] w-full">
                        <IndiaMapCard
                            className="col-span-1 row-span-1 aspect-[4/3] w-full"
                            visitedPlaces={VISITED_PLACES}
                            index={2}
                        />
                    </CardWrapper>

                    {images.slice(0, visibleCount).map((image: Image, i: number) => (
                        <CardWrapper
                            key={image.id}
                            isExpandable={true}
                            index={i + 2}
                            className="col-span-1 row-span-1"
                        >
                            <a
                                href={image.fullSrc || image.src}
                                className="w-full h-full block relative group overflow-hidden rounded-3xl cursor-pointer"
                                style={{ aspectRatio: '4/3', display: 'block' }}
                                data-fancybox="gallery"
                                data-caption={image.title}
                                aria-label={`View photo: ${image.title}`}
                            >
                                <div
                                    className="absolute inset-0 rounded-3xl gallery-shimmer"
                                    style={{
                                        backgroundImage: 'linear-gradient(90deg, var(--shimmer-from, #1e1e1e) 25%, var(--shimmer-to, #2d2d2d) 50%, var(--shimmer-from, #1e1e1e) 75%)',
                                        backgroundSize: '600px 100%',
                                        animation: 'galleryShimmer 1.6s infinite linear',
                                    }}
                                    aria-hidden="true"
                                />
                                <img
                                    src={image.src}
                                    width={image.width}
                                    height={image.height}
                                    alt={image.alt}
                                    loading={i < 2 ? 'eager' : 'lazy'}
                                    fetchPriority={i < 2 ? 'high' : 'auto'}
                                    decoding="async"
                                    sizes="(max-width: 1024px) 50vw, 25vw"
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 relative z-10 flex items-center justify-center text-center"
                                    style={{
                                        backgroundImage: image.placeholderDataUrl && image.placeholderDataUrl.startsWith('data:') ? `url(${image.placeholderDataUrl})` : undefined,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        filter: image.placeholderDataUrl && image.placeholderDataUrl.startsWith('data:') ? 'blur(20px)' : undefined,
                                    }}
                                    onLoad={(e) => {
                                        const img = e.currentTarget as HTMLImageElement;
                                        const shimmer = img.previousElementSibling as HTMLElement | null;
                                        if (shimmer) shimmer.style.display = 'none';
                                        
                                        img.style.filter = '';
                                        img.style.backgroundImage = '';
                                    }}
                                    onError={(e) => {
                                        const img = e.currentTarget as HTMLImageElement;
                                        img.style.filter = '';
                                        img.style.backgroundImage = '';
                                        img.style.backgroundColor = '#f3f4f6';
                                    }}
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-end p-4 z-20">
                                    <p className="!text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-sm font-medium truncate w-full drop-shadow-md">
                                        {image.title}
                                    </p>
                                </div>
                            </a>
                        </CardWrapper>
                    ))}
                    {visibleCount < images.length && (
                        <div ref={sentinelRef} className="col-span-full h-4" aria-hidden="true" />
                    )}
                </m.div>
            </div>
        </LazyMotion>
    );
};

export default FunBentoGrid;

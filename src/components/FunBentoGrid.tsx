import React, { useEffect, Suspense, lazy, memo } from 'react';
import { m, type HTMLMotionProps, LazyMotion, domAnimation } from 'framer-motion';
import { Maximize2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

const MusicStatsClient = lazy(() => import('./musicstats'));
const IndiaMapCard = lazy(() => import('./IndiaMapCard'));

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface Image {
    id: string;
    src: string;
    fullSrc?: string;
    width: number;
    height: number;
    title: string;
    alt: string;
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
    const staggerDelay = index * 0.025;

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
                        duration: 0.4,
                        ease: [0.25, 0.1, 0.25, 1],
                        delay: staggerDelay,
                    }
                }}
                viewport={{ once: true, amount: 0.1 }}
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

const FunBentoGrid: React.FC<FunBentoGridProps> = ({ images }) => {
    useEffect(() => {
        let fancyboxLoaded = false;
        let galleryData: any[] = [];
        let initPromise: Promise<void> | null = null;

        const initFancybox = async () => {
            if (initPromise) return initPromise;

            initPromise = (async () => {
                const [, , response] = await Promise.all([
                    import('@fancyapps/ui'),
                    import('@fancyapps/ui/dist/fancybox/fancybox.css'),
                    fetch('/api/gallery.json').then(res => res.ok ? res.json() : [])
                ]);
                galleryData = response;
                fancyboxLoaded = true;
            })();

            return initPromise;
        };

        const galleryItems = document.querySelectorAll('[data-fancybox="gallery"]');

        const loadOnInteraction = () => {
            initFancybox();
            galleryItems.forEach(item => {
                item.removeEventListener('mouseenter', loadOnInteraction);
                item.removeEventListener('focus', loadOnInteraction);
            });
        };

        galleryItems.forEach(item => {
            item.addEventListener('mouseenter', loadOnInteraction, { once: true });
            item.addEventListener('focus', loadOnInteraction, { once: true });
        });

        const handleClick = async (e: Event) => {
            e.preventDefault();
            const target = e.currentTarget as HTMLAnchorElement;
            const src = target.getAttribute('href');

            if (!fancyboxLoaded) {
                await initFancybox();
            }

            const { Fancybox } = await import('@fancyapps/ui');

            const startIndex = galleryData.findIndex((img: any) => img.src === src);

            Fancybox.show(galleryData.map((img: any) => ({
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
                    if (link) {
                        return link.querySelector('img') || link;
                    }
                    return null;
                },
                Toolbar: {
                    display: {
                        left: ["infobar"],
                        middle: [],
                        right: ["slideshow", "thumbs", "close"],
                    },
                },
                Images: {
                    zoom: true,
                },
            } as any);
        };

        galleryItems.forEach(item => item.addEventListener('click', handleClick));

        return () => {
            import('@fancyapps/ui').then(({ Fancybox }) => {
                Fancybox.close();
            });
            galleryItems.forEach(item => item.removeEventListener('click', handleClick));
        };
    }, []);

    return (
        <LazyMotion features={domAnimation}>
            <div className="w-full max-w-[1400px] mx-auto p-4 pt-16">
                <h2 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight mb-8 px-2">Fun Stuff</h2>

                <m.div
                    className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[minmax(200px,auto)]"
                >
                    <CardWrapper key="music-stats" index={0} className="col-span-2 md:col-span-2 lg:col-span-2 row-span-2 min-h-[400px]">
                        <div className="h-full flex flex-col w-full">
                            <h3 className="text-xl font-medium mb-4 p-5 md:p-6 pb-0">Music Stats</h3>
                            <div className="flex-1 overflow-y-auto custom-scrollbar px-2 w-full">
                                <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">Loading music stats...</div>}>
                                    <MusicStatsClient />
                                </Suspense>
                            </div>
                        </div>
                    </CardWrapper>

                    <Suspense fallback={
                        <div className="col-span-1 row-span-1 h-[200px] md:h-auto rounded-3xl border bg-neutral-50 dark:bg-[#171717] border-white dark:border-white/20 flex items-center justify-center">
                            <div className="text-gray-400 text-sm">Loading map...</div>
                        </div>
                    }>
                        <IndiaMapCard
                            className="col-span-1 row-span-1 h-full"
                            visitedPlaces={VISITED_PLACES}
                            index={1}
                        />
                    </Suspense>

                    {images.map((image: Image, i: number) => (
                        <CardWrapper
                            key={image.id}
                            isExpandable={true}
                            index={i + 2}
                            className="col-span-1 row-span-1"
                        >
                            <a
                                href={image.fullSrc || image.src}
                                className="w-full h-full block relative group overflow-hidden rounded-3xl cursor-pointer"
                                data-fancybox="gallery"
                                data-caption={image.title}
                                aria-label={`View photo: ${image.title}`}
                            >
                                <img
                                    src={image.src}
                                    width={image.width}
                                    height={image.height}
                                    alt={image.alt}
                                    loading="lazy"
                                    decoding="async"
                                    sizes="(max-width: 1024px) 50vw, 25vw"
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-end p-4">
                                    <p className="!text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-sm font-medium truncate w-full drop-shadow-md">
                                        {image.title}
                                    </p>
                                </div>
                            </a>
                        </CardWrapper>
                    ))}
                </m.div>
            </div>
        </LazyMotion>
    );
};

export default FunBentoGrid;

import React, { useEffect, Suspense, lazy } from 'react';
import { m, type HTMLMotionProps, LazyMotion, domAnimation } from 'framer-motion';
import { Maximize2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

const MusicStatsClient = lazy(() => import('./musicstats'));

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

const CardWrapper: React.FC<CardWrapperProps> = ({ children, className, isExpandable = false, index = 0, onClick, ...props }) => {
    return (
        <div className={cn("h-full w-full", className)}>
            <m.div
                className={cn(
                    "relative rounded-3xl border overflow-hidden h-full flex flex-col transition-colors duration-300 ease-in-out",
                    "bg-neutral-50 dark:bg-[#171717] border-white dark:border-white/20 shadow-sm",
                    "[.data-theme='light']_&:!bg-[#dbeafe] [.data-theme='light']_&:!border-[#93c5fd]",
                    isExpandable ? "cursor-pointer group hover:border-neutral-600" : ""
                )}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{
                    opacity: 1,
                    y: 0,
                    transition: {
                        duration: 0.5,
                        ease: "easeOut",
                        delay: index * 0.05
                    }
                }}
                viewport={{ once: true, margin: "0px" }}
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
};

const FunBentoGrid: React.FC<FunBentoGridProps> = ({ images }) => {
    useEffect(() => {
        let fancyboxLoaded = false;
        let galleryData: any[] = [];
        let initPromise: Promise<void> | null = null;

        const initFancybox = async () => {
            if (initPromise) return initPromise;

            initPromise = (async () => {
                const [_, css, response] = await Promise.all([
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

                    {images.map((image: Image, i: number) => (
                        <CardWrapper
                            key={image.id}
                            isExpandable={true}
                            className="col-span-1 row-span-1"
                            index={i + 1}
                        >
                            <a
                                href={image.fullSrc || image.src}
                                className="w-full h-full block relative group overflow-hidden rounded-3xl cursor-pointer"
                                data-fancybox="gallery"
                                data-caption={image.title}
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

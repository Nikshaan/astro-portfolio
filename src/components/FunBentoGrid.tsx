import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Maximize2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import MusicStatsClient from './musicstats';
import '@fancyapps/ui/dist/fancybox/fancybox.css';

const photoModules = import.meta.glob('../data/photos/photo*.webp', { eager: true });
const photoTitles: Record<number, string> = {
    1: 'Manali', 2: 'Manali', 3: 'Mulki Station, Karnataka', 4: 'Padubidri beach, Udupi',
    5: 'Marine drive, Mumbai', 6: 'Mall road, Manali', 7: 'Fort Kochi, Kerala', 8: 'Basilica of Bom Jesus, Goa', 9: 'Manali',
    10: "Humayun's tomb, Delhi", 11: "Humayun's tomb, Delhi", 12: "Humayun's tomb, Delhi", 13: "Humayun's tomb, Delhi",
    14: 'Jama masjid, Delhi', 15: 'Jama masjid, Delhi', 16: 'Red fort, Delhi',
    17: 'Darwaza-i-rauza, Agra', 18: 'Darwaza-i-rauza, Agra',
    19: 'Taj mahal, Agra', 20: 'Taj mahal, Agra', 21: 'Taj mahal, Agra', 22: 'Taj mahal, Agra',
    23: 'Fort kochi, Kerala', 24: 'St. Francis church, Fort kochi, Kerala', 25: 'Padubidri beach, Udupi',
    26: 'Kerala', 27: 'Fort kochi, Kerala', 28: 'Kerala', 29: 'Kunnukara, Kerala', 30: 'Kunnukara, Kerala', 31: 'Kunnukara, Kerala', 32: 'Manali', 33: 'Kerala', 34: 'Kerala',
    35: 'Mangluru', 36: 'Mangluru', 37: 'Mangluru', 38: 'Mangluru', 39: 'Mangluru',
    40: 'Wada, Maharashtra', 41: 'Mumbai, Maharashtra', 42: 'Mangluru', 43: 'Maharashtra',
    44: 'Mangluru', 45: 'Mangluru', 46: 'Mangluru', 47: 'Mangluru',
    48: 'Padubidri beach, Udupi', 49: 'Padubidri beach, Udupi', 50: 'Padubidri beach, Udupi',
    51: 'Marine Drive, Mumbai', 52: 'Padubidri beach, Udupi', 53: 'Padubidri beach, Udupi',
    54: 'Manali', 55: 'Padubidri beach, Udupi', 56: 'Padubidri beach, Udupi',
    57: 'Padubidri beach, Udupi', 58: 'Hadimba temple, Manali', 59: 'Kerala', 60: 'Kerala',
    61: 'Padubidri beach, Udupi', 62: 'Padubidri beach, Udupi', 63: 'Mumbai, Maharashtra',
    64: 'Mumbai, Maharashtra', 66: 'Pune, Maharashtra', 67: 'Pune, Maharashtra', 71: 'Padubidri beach, Udupi',
    72: 'Manali', 73: 'Marine Drive, Mumbai', 74: 'Marine Drive, Mumbai', 75: 'Marine Drive, Mumbai',
    76: 'Taj hotel, Mumbai', 77: 'Gurudwara Shri Manikaran Sahib, Manikaran', 78: 'Manikaran',
    79: 'Manali', 80: 'Kunnukara, Kerala', 81: 'Manali', 82: 'Hadimba temple, Manali',
    83: 'Ugrasen ki Baoli, New Delhi', 84: 'Red fort, Delhi', 85: 'Manikaran',
    86: 'Manikaran', 87: 'Manikaran', 88: 'Manali', 89: 'Manali', 90: 'Manali',
    91: 'Manali', 92: 'Manali', 93: 'Mall road, Manali', 94: 'Manali', 95: 'Manali',
    96: 'Attari - Wagah Border, Punjab', 97: 'Attari - Wagah Border, Punjab',
    98: 'Manali', 99: 'Mangluru', 100: 'Mangluru', 101: 'Mangluru',
    102: 'Padubidri beach, Udupi', 103: 'Mumbai, Maharashtra', 104: 'Goa',
    105: 'Basilica of bom jesus, Goa', 106: 'Manali',
};

const allImages = Object.entries(photoModules)
    .sort(([a], [b]) => {
        const aNum = parseInt(a.match(/photo(\d+)/)?.[1] || '0');
        const bNum = parseInt(b.match(/photo(\d+)/)?.[1] || '0');
        return aNum - bNum;
    })
    .map(([path, module]) => {
        const photoNumber = parseInt(path.match(/photo(\d+)/)?.[1] || '0');
        const imageModule = module as any;
        if (!imageModule.default) return null;
        return {
            id: `photo-${photoNumber}`,
            src: imageModule.default,
            title: photoTitles[photoNumber] || `Photo ${photoNumber}`,
            alt: `Photography - ${photoTitles[photoNumber] || 'Photo ' + photoNumber}`
        };
    })
    .filter(Boolean);

const gridImages = allImages.slice(0, 8);
const hiddenImages = allImages.slice(8);

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface FunBentoGridProps {
    apiKey: string;
    username: string;
}

const FunBentoGrid: React.FC<FunBentoGridProps> = ({ apiKey, username }) => {
    useEffect(() => {
        const initFancybox = async () => {
            const { Fancybox } = await import('@fancyapps/ui');
            Fancybox.bind("[data-fancybox='gallery']", {
                Toolbar: {
                    display: {
                        left: ["infobar"],
                        middle: [],
                        right: ["slideshow", "thumbs", "close"],
                    },
                },
            } as any);
        };
        initFancybox();

        return () => {
            import('@fancyapps/ui').then(({ Fancybox }) => {
                Fancybox.destroy();
            });
        };
    }, []);

    const CardWrapper = ({ children, className, isExpandable = false }: { children: React.ReactNode, className?: string, isExpandable?: boolean }) => {
        return (
            <div className={cn("h-full w-full", className)}>
                <motion.div
                    className={cn(
                        "relative rounded-3xl border overflow-hidden h-full flex flex-col transition-all duration-300 ease-in-out",
                        "bg-neutral-50 dark:bg-[#171717] border-white dark:border-white/20 shadow-sm",
                        "[.data-theme='light']_&:!bg-[#dbeafe] [.data-theme='light']_&:!border-[#93c5fd]",
                        isExpandable ? "cursor-pointer group hover:border-neutral-600 transition-colors" : ""
                    )}
                    whileHover={isExpandable ? { scale: 1.02 } : {}}
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
                </motion.div>
            </div>
        );
    };

    return (
        <div className="w-full max-w-[1400px] mx-auto p-4 pt-16">
            <h2 className="text-4xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight mb-8 px-2">Fun Stuff</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[minmax(200px,auto)]">
                <CardWrapper className="col-span-1 md:col-span-2 lg:col-span-2 row-span-2 min-h-[400px]">
                    <div className="h-full flex flex-col w-full">
                        <h3 className="text-xl font-medium mb-4 p-6 pb-0">Music Stats</h3>
                        <div className="flex-1 overflow-y-auto custom-scrollbar px-2 w-full">
                            <MusicStatsClient apiKey={apiKey} username={username} />
                        </div>
                    </div>
                </CardWrapper>

                {gridImages.map((image: any) => (
                    <CardWrapper key={image.id} isExpandable={true} className="col-span-1 row-span-1">
                        <a
                            href={image.src.src}
                            data-fancybox="gallery"
                            data-caption={image.title}
                            aria-label={`View full size photo taken at ${image.title}`}
                            className="w-full h-full block relative group overflow-hidden rounded-3xl"
                        >
                            <img
                                src={image.src.src}
                                width={image.src.width}
                                height={image.src.height}
                                alt={image.alt}
                                loading="lazy"
                                decoding="async"
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
            </div>

            <div className="hidden">
                {hiddenImages.map((image: any) => (
                    <a
                        key={image.id}
                        href={image.src.src}
                        data-fancybox="gallery"
                        data-caption={image.title}
                        aria-label={`View full size photo taken at ${image.title}`}
                    >
                        <img
                            src={image.src.src}
                            width={image.src.width}
                            height={image.src.height}
                            alt={image.alt}
                            loading="lazy"
                            decoding="async"
                        />
                    </a>
                ))}
            </div>
        </div>
    );
};

export default FunBentoGrid;

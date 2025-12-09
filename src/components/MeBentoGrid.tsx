import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Maximize2, MapPin, Github, Linkedin, Mail } from 'lucide-react';
import cardsData from '../data/cardsdata.json';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Clock from './clock';
import beeImage from '../data/bee.avif';
import collegeLogo from '../data/djsce-logo.avif';
import aryaLogo from '../data/arya.avif';
import codeAIlogo from '../data/codeai.avif';
import varakLogo from '../data/varak.avif';
import gssocLogo from '../data/gssoc.avif';
import trophy from '../data/trophy.png';

const defaultImages: Record<string, any> = {
    beeImage: beeImage,
    collegeLogo: collegeLogo,
    aryaLogo: aryaLogo,
    codeAIlogo: codeAIlogo,
    varakLogo: varakLogo,
    gssocLogo: gssocLogo,
    trophy: trophy,
};

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const renderCardContent = (card: any, images: Record<string, any>) => {
    switch (card.type) {
        case 'intro':
            return (
                <div className="flex flex-col-reverse md:flex-row h-full justify-between gap-4 items-center md:items-stretch">
                    <div className="flex flex-col gap-2 w-full md:w-[60%] h-full justify-between text-base md:text-lg text-center md:text-left">
                        <div className="font-light text-pretty">
                            <p dangerouslySetInnerHTML={{ __html: card.data.text }} />
                            <p className="mt-2">My interest lies in:</p>
                            <ul className="list-disc list-inside inline-block text-left md:block">
                                {card.data.interests.map((interest: string, i: number) => (
                                    <li key={i}>{interest}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    <div className="flex justify-center items-center w-full md:w-[40%] lg:w-[50%] h-full">
                        <img
                            src={images[card.data.image].src}
                            width={images[card.data.image].width}
                            height={images[card.data.image].height}
                            alt="profile"
                            loading={card.type === 'intro' ? "eager" : "lazy"}
                            fetchPriority={card.type === 'intro' ? "high" : "auto"}
                            decoding="async"
                            className="w-auto border rounded-full max-h-[150px] lg:max-h-[300px] select-none object-cover profile-image-border border-white dark:border-white/20"
                        />
                    </div>
                </div>
            );
        case 'education':
            return (
                <div className="flex flex-col md:flex-row h-full items-center justify-center md:justify-between gap-4 text-sm md:text-base text-center md:text-right">
                    <div className="w-full md:w-[20%] flex justify-center items-center">
                        <img
                            src={images[card.data.image].src}
                            width={images[card.data.image].width}
                            height={images[card.data.image].height}
                            alt="logo"
                            loading="lazy"
                            decoding="async"
                            className="select-none transition-all transform duration-200 h-[80px] w-auto object-contain"
                        />
                    </div>
                    <div className="font-light w-full md:w-[80%]">
                        <p className="font-medium">{card.data.school}</p>
                        <p className="italic text-xs md:text-sm" dangerouslySetInnerHTML={{ __html: card.data.degree }} />
                        <p className="italic text-xs md:text-sm">{card.data.date}</p>
                    </div>
                </div>
            );
        case 'extracurr':
            return (
                <div className="flex flex-col gap-4 text-sm md:text-base">
                    {card.data.items.map((item: any, i: number) => (
                        <div key={i} className="flex">
                            <div className="w-[20%] flex justify-center items-center">
                                <img
                                    src={images[item.image].src}
                                    width={images[item.image].width}
                                    height={images[item.image].height}
                                    alt="logo"
                                    loading="lazy"
                                    decoding="async"
                                    className="select-none transition-all transform duration-200 w-[60px] md:w-[90px]"
                                />
                            </div>
                            <div className="w-[80%] flex flex-col items-end text-right">
                                <p className="font-medium text-sm md:text-base">{item.title}</p>
                                <p className="text-xs md:text-sm font-light italic">{item.subtitle}</p>
                                <p className="text-xs md:text-sm font-light">{item.role}</p>
                                <p className="text-xs md:text-sm font-light italic">{item.date}</p>
                            </div>
                        </div>
                    ))}
                </div>
            );
        case 'location':
            return (
                <div className="flex flex-col md:flex-row justify-between items-center w-full h-full gap-2 md:gap-0">
                    <div className="flex flex-col w-full md:w-[60%] h-full justify-center items-center md:items-start md:pl-6">
                        <div className="flex justify-center md:justify-start items-center mb-2">
                            <MapPin className="w-6 h-6 md:w-[1.125rem] md:h-[1.125rem] mr-2" />
                            <p className="text-sm md:text-base mt-2 font-medium text-center md:text-left">Mumbai, India</p>
                        </div>
                        <div className="flex justify-center md:justify-start items-center w-full md:w-auto scale-75 md:scale-100 origin-center md:origin-left">
                            <Clock />
                        </div>
                    </div>
                    <div className="flex justify-center items-center gap-4 md:gap-6 w-full md:w-[40%]">
                        <a href={card.data.links.github} target="_blank" rel="noopener noreferrer" aria-label="Visit Nikshaan's GitHub profile" data-title="Github" className="tooltip-trigger relative">
                            <Github className="w-6 h-6 md:w-10 md:h-10 cursor-pointer hover:scale-90 transition-transform" />
                        </a>
                        <a href={card.data.links.linkedin} target="_blank" rel="noopener noreferrer" aria-label="Connect with Nikshaan on LinkedIn" data-title="LinkedIn" className="tooltip-trigger relative">
                            <Linkedin className="w-6 h-6 md:w-10 md:h-10 cursor-pointer hover:scale-90 transition-transform" />
                        </a>
                        <a href={card.data.links.email} aria-label="Send an email to Nikshaan" data-title="Gmail" className="tooltip-trigger relative">
                            <Mail className="w-6 h-6 md:w-10 md:h-10 cursor-pointer hover:scale-90 transition-transform" />
                        </a>
                    </div>
                </div>
            );
        case 'win':
            return (
                <div className="flex justify-center items-center w-full h-full">
                    <img
                        src={images[card.data.image].src}
                        width={images[card.data.image].width}
                        height={images[card.data.image].height}
                        alt="win"
                        loading="lazy"
                        decoding="async"
                        className="select-none w-full h-full object-contain"
                    />
                </div>
            );
        case 'experience':
            return (
                <div className="flex flex-col gap-4 text-sm md:text-base">
                    {card.data.items.map((item: any, i: number) => (
                        <div key={i} className="flex">
                            <div className="w-[20%] flex justify-center items-center">
                                <img
                                    src={images[item.image].src}
                                    width={images[item.image].width}
                                    height={images[item.image].height}
                                    alt="logo"
                                    loading="lazy"
                                    decoding="async"
                                    className="select-none transition-all transform duration-200 rounded-full w-[50px] md:w-[70px]"
                                />
                            </div>
                            <div className="w-[80%] flex flex-col items-end text-right">
                                <p className="font-medium text-sm md:text-base">{item.title}</p>
                                <p className="text-xs md:text-sm">{item.company}</p>
                                <p className="text-xs md:text-sm font-light italic">{item.date}</p>
                            </div>
                        </div>
                    ))}
                    <div className="text-xs md:text-sm text-right mt-2">
                        <p className="italic text-sm md:text-base mb-1 font-bold text-left">certification</p>
                        <p className="font-light text-left"><span className="font-medium">{card.data.certification.title}</span> - {card.data.certification.issuer}</p>
                    </div>
                </div>
            );
        default:
            return null;
    }
};

interface CardWrapperProps {
    card: any;
    className?: string;
    index?: number;
    selectedId: string | null;
    setSelectedId: (id: string | null) => void;
    images: Record<string, any>;
}

const CardWrapper: React.FC<CardWrapperProps> = ({ card, className, index = 0, selectedId, setSelectedId, images }) => {
    const shouldAnimate = selectedId === null || selectedId === card.id;

    return (
        <motion.div
            className={cn("h-full w-full", className)}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{
                opacity: 1,
                y: 0,
                transition: {
                    duration: 0.5,
                    ease: "easeOut",
                    delay: index * 0.1
                }
            }}
            viewport={{ once: true, margin: "-50px" }}
        >
            <motion.div
                layoutId={shouldAnimate ? `card-${card.id}` : undefined}
                onClick={() => card.isExpandable && setSelectedId(card.id)}
                className={cn(
                    "relative p-5 rounded-3xl border overflow-hidden h-full flex flex-col justify-between group transition-colors me-card-hover",
                    "bg-neutral-50 dark:bg-[#171717] border-white dark:border-white/20",
                    "[.data-theme='light']_&:!bg-[#dbeafe] [.data-theme='light']_&:!border-[#1e3a8a]",
                    card.isExpandable && !selectedId ? "cursor-pointer" : ""
                )}
                whileHover={card.isExpandable && !selectedId ? { scale: 1.02 } : {}}
                whileTap={card.isExpandable && !selectedId ? { scale: 0.98 } : {}}
            >
                {renderCardContent(card, images)}
                {card.isExpandable && (
                    <div className={cn(
                        "absolute bottom-4 right-4 transition-opacity duration-300",
                        !selectedId ? "opacity-0 group-hover:opacity-100" : "opacity-0"
                    )}>
                        <Maximize2 size={16} className={card.id === 'win' ? "text-white drop-shadow-md" : "text-neutral-400"} />
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
};

interface MeBentoGridProps {
    optimizedImages?: Record<string, any>;
}

const MeBentoGrid: React.FC<MeBentoGridProps> = ({ optimizedImages }) => {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const selectedItem = cardsData.find((item) => item.id === selectedId);
    const images = optimizedImages || defaultImages;

    const introCard = cardsData.find(c => c.id === 'intro');
    const extracurrCard = cardsData.find(c => c.id === 'extracurr');
    const educationCard = cardsData.find(c => c.id === 'education');
    const locationCard = cardsData.find(c => c.id === 'location');
    const winCard = cardsData.find(c => c.id === 'win');
    const experienceCard = cardsData.find(c => c.id === 'experience');

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setSelectedId(null);
            }
        };

        if (selectedId) {
            // Use CSS custom property instead of calculating scrollbar width
            document.documentElement.style.setProperty('--scrollbar-width', `${window.innerWidth - document.documentElement.clientWidth}px`);
            document.body.style.overflow = 'hidden';
            document.body.style.paddingRight = 'var(--scrollbar-width, 0px)';
            window.addEventListener('keydown', handleKeyDown);
        } else {
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        }
        return () => {
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [selectedId]);



    return (
        <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full auto-rows-auto">
                {introCard && <CardWrapper card={introCard} index={0} className="col-span-2 lg:col-span-2 lg:row-span-2 min-h-[300px]" selectedId={selectedId} setSelectedId={setSelectedId} images={images} />}
                {educationCard && <CardWrapper card={educationCard} index={1} className="col-span-2 lg:col-span-2 lg:row-span-1 min-h-[150px]" selectedId={selectedId} setSelectedId={setSelectedId} images={images} />}
                {locationCard && <CardWrapper card={locationCard} index={3} className="col-span-1 lg:col-span-1 lg:row-span-1 min-h-[140px]" selectedId={selectedId} setSelectedId={setSelectedId} images={images} />}
                {winCard && <CardWrapper card={winCard} index={4} className="col-span-1 lg:col-span-1 lg:row-span-1 min-h-[140px] !p-0" selectedId={selectedId} setSelectedId={setSelectedId} images={images} />}
                {extracurrCard && <CardWrapper card={extracurrCard} index={2} className="col-span-2 lg:col-span-2 lg:row-span-2 h-auto" selectedId={selectedId} setSelectedId={setSelectedId} images={images} />}
                {experienceCard && <CardWrapper card={experienceCard} index={5} className="col-span-2 lg:col-span-2 lg:row-span-2 h-auto" selectedId={selectedId} setSelectedId={setSelectedId} images={images} />}
            </div>

            <AnimatePresence>
                {selectedId && selectedItem && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedId(null)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-md"
                        />

                        <motion.div
                            layoutId={`card-${selectedId}`}
                            className={cn(
                                "relative w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-3xl border shadow-2xl flex flex-col",
                                "bg-neutral-50 dark:bg-[#171717] border-white dark:border-white/20",
                                "[.data-theme='light']_&:!bg-[#dbeafe] [.data-theme='light']_&:!border-[#1e3a8a]"
                            )}
                        >
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedId(null);
                                }}
                                className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-20 cursor-pointer"
                            >
                                <X size={20} />
                            </button>

                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                <div className="prose prose-invert prose-lg max-w-none">
                                    <div dangerouslySetInnerHTML={{ __html: selectedItem.content || '' }} />
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            <style>{`
                [data-theme="light"] .me-card-hover:hover {
                    border-color: #3b82f6 !important;
                }
                .me-card-hover:hover {
                    border-color: #c084fc !important;
                }
                [data-theme="light"] .profile-image-border {
                    border-color: #1e3a8a !important;
                }
            `}</style>
        </>
    );
};

export default MeBentoGrid;

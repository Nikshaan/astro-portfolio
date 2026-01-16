import React, { useEffect, useState, useCallback, useMemo, memo } from 'react';
import { m, motion, AnimatePresence, LazyMotion, domAnimation } from 'framer-motion';
import { X, Maximize2, MapPin } from 'lucide-react';
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
import winIcon from '../data/winIcon.avif';
import githubColor from '../data/github-color.svg';
import linkedinColor from '../data/linkedin-color.svg';
import gmailColor from '../data/gmail-color.svg';

const defaultImages: Record<string, any> = {
    beeImage: beeImage,
    collegeLogo: collegeLogo,
    aryaLogo: aryaLogo,
    codeAIlogo: codeAIlogo,
    varakLogo: varakLogo,
    gssocLogo: gssocLogo,
    winIcon: winIcon,
};

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const renderCardContent = (card: any, images: Record<string, any>) => {
    switch (card.type) {
        case 'intro':
            return (
                <div className="flex flex-col-reverse md:flex-row h-full justify-between gap-4 items-center md:items-stretch">
                    <div className="flex flex-col gap-2 w-full md:w-[60%] h-full justify-between text-sm md:text-base text-center md:text-left">
                        <div className="font-light text-pretty">
                            <p dangerouslySetInnerHTML={{ __html: card.data.text }} />
                            <p className="my-2">My interest lies in:</p>
                            <ul className="list-disc list-inside text-left inline-block min-[440px]:grid min-[440px]:grid-cols-2 min-[440px]:gap-x-4 min-[440px]:w-fit min-[440px]:mx-auto md:block md:w-full md:mx-0">
                                {card.data.interests.map((interest: string, i: number) => (
                                    <li className='text-left' key={i}>{interest}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    <div className="flex justify-center items-center w-full md:w-[40%] lg:w-[50%] h-full lg:aspect-square lg:self-center">
                        <img
                            src={images[card.data.image].src}
                            srcSet={images[card.data.image].srcSet?.attribute || images[card.data.image].attributes?.srcset}
                            sizes={images[card.data.image].attributes?.sizes || "(max-width: 768px) 100vw, (max-width: 1280px) 40vw, 25vw"}
                            width={images[card.data.image].attributes?.width || images[card.data.image].width}
                            height={images[card.data.image].attributes?.height || images[card.data.image].height}
                            alt="profile"
                            loading={card.type === 'intro' ? "eager" : "lazy"}
                            fetchPriority={card.type === 'intro' ? "high" : "auto"}
                            decoding="async"
                            className="w-auto max-h-[150px] md:w-full md:h-auto md:max-h-full lg:w-full lg:h-full lg:object-cover border rounded-full select-none object-cover profile-image-border border-white dark:border-white/20"
                        />
                    </div>
                </div>
            );
        case 'education':
            return (
                <div className="flex flex-col md:flex-row h-full items-center justify-center md:justify-between gap-4 text-center md:text-right">
                    <div className="w-full md:w-[20%] flex justify-center items-center">
                        <img
                            src={images[card.data.image].src}
                            srcSet={images[card.data.image].srcSet?.attribute || images[card.data.image].attributes?.srcset}
                            sizes="180px"
                            width={images[card.data.image].width}
                            height={images[card.data.image].height}
                            alt="logo"
                            loading="lazy"
                            decoding="async"
                            className="select-none transition-all transform duration-200 w-[120px] md:w-[180px] h-auto object-contain"
                        />
                    </div>
                    <div className="font-light w-full md:w-[80%] text-sm md:text-base">
                        <p className="font-bold text-base">{card.data.school}</p>
                        <p className="font-light text-sm" dangerouslySetInnerHTML={{ __html: card.data.degree }} />
                        <p className="font-light text-sm">{card.data.date}</p>
                    </div>
                </div>
            );
        case 'extracurr':
            return (
                <div className="flex flex-col justify-center lg:justify-between gap-4 lg:gap-0 h-full text-sm md:text-base">
                    {card.data.items.map((item: any, i: number) => (
                        <div key={i} className="flex">
                            <div className="w-[20%] flex justify-center items-center">
                                <img
                                    src={images[item.image].src}
                                    srcSet={images[item.image].srcSet?.attribute || images[item.image].attributes?.srcset}
                                    sizes="90px"
                                    width={images[item.image].width}
                                    height={images[item.image].height}
                                    alt="logo"
                                    loading="lazy"
                                    decoding="async"
                                    className="select-none transition-all transform duration-200 w-[60px] md:w-[90px]"
                                />
                            </div>
                            <div className="w-[80%] flex flex-col items-end text-right">
                                <p className="font-bold text-base">{item.title}</p>
                                <p className="font-light text-sm">{item.subtitle}</p>
                                <p className="font-light text-sm">{item.role}</p>
                                <p className="font-light text-sm">{item.date}</p>
                            </div>
                        </div>
                    ))}
                </div>
            );
        case 'location':
            return (
                <div className="flex flex-col min-[425px]:flex-row lg:flex-col min-[1150px]:!flex-row justify-center items-center w-full h-full gap-4 p-4 text-sm md:text-base">
                    <div className="flex flex-col justify-center items-center w-full min-[425px]:flex-1 lg:w-full min-[1150px]:flex-1 gap-1 md:gap-2">
                        <div className="flex justify-center items-center gap-1 md:gap-2">
                            <MapPin className="w-5 h-5 mb-1 lg:w-6 lg:h-6" />
                            <p className="font-bold text-center text-nowrap">Mumbai, India</p>
                        </div>
                        <div className="flex justify-center items-center w-full md:w-auto mt-1 md:mt-0">
                            <Clock />
                        </div>
                    </div>
                    <div className="flex justify-center items-center gap-4 md:gap-6 w-full min-[425px]:flex-1 lg:w-full min-[1150px]:flex-1 h-full">
                        <a href={card.data.links.github} target="_blank" rel="noopener noreferrer" aria-label="Visit Nikshaan's GitHub profile" data-title="GitHub" className="tooltip-trigger relative">
                            <img src={githubColor.src} alt="GitHub" className="w-6 h-6 md:w-7 md:h-7 cursor-pointer hover:scale-90 transition-transform" />
                        </a>
                        <a href={card.data.links.linkedin} target="_blank" rel="noopener noreferrer" aria-label="Connect with Nikshaan on LinkedIn" data-title="LinkedIn" className="tooltip-trigger relative">
                            <img src={linkedinColor.src} alt="LinkedIn" className="w-6 h-6 md:w-7 md:h-7 cursor-pointer hover:scale-90 transition-transform" />
                        </a>
                        <a href={card.data.links.email} aria-label="Send an email to Nikshaan" data-title="Email" className="tooltip-trigger relative">
                            <img src={gmailColor.src} alt="Email" className="w-6 h-6 md:w-7 md:h-7 cursor-pointer hover:scale-90 transition-transform" />
                        </a>
                    </div>
                </div>
            );
        case 'win':
            return (
                <img
                    src={images[card.data.image].src}
                    srcSet={images[card.data.image].srcSet?.attribute || images[card.data.image].attributes?.srcset}
                    sizes="100px"
                    width={images[card.data.image].width}
                    height={images[card.data.image].height}
                    alt="win"
                    loading="lazy"
                    decoding="async"
                    className="select-none w-[60px] h-[60px] sm:w-[80px] sm:h-[80px] md:w-[100px] md:h-[100px] lg:w-[100px] lg:h-[100px] object-contain"
                />
            );
        case 'experience':
            return (
                <div className="flex flex-col gap-4 text-sm md:text-base">
                    {card.data.items.map((item: any, i: number) => (
                        <div key={i} className="flex">
                            <div className="w-[20%] flex justify-center items-center">
                                <img
                                    src={images[item.image].src}
                                    srcSet={images[item.image].srcSet?.attribute || images[item.image].attributes?.srcset}
                                    sizes="70px"
                                    width={images[item.image].width}
                                    height={images[item.image].height}
                                    alt="logo"
                                    loading="lazy"
                                    decoding="async"
                                    className="select-none transition-all transform duration-200 rounded-full w-[50px] md:w-[70px]"
                                />
                            </div>
                            <div className="w-[80%] flex flex-col items-end text-right">
                                <p className="font-bold text-base">{item.title}</p>
                                <p className='text-sm'>{item.company}</p>
                                <p className="font-light text-sm">{item.date}</p>
                            </div>
                        </div>
                    ))}
                    <div className="text-right mt-2">
                        <p className="mb-1 font-bold text-left">certification</p>
                        <p className="font-light text-left"><span className="font-medium">{card.data.certification.title}</span> - {card.data.certification.issuer}</p>
                    </div>
                </div>
            );
        case 'resume':
            return (
                <div className="flex justify-center items-center h-full w-full">
                    <p className="text-4xl font-bold uppercase tracking-widest text-neutral-300 dark:text-neutral-600 [writing-mode:vertical-lr] rotate-180 max-lg:rotate-0 max-lg:[writing-mode:horizontal-tb]">
                        resume
                    </p>
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

const CardWrapper: React.FC<CardWrapperProps> = memo(({ card, className, index = 0, selectedId, setSelectedId, images }) => {
    const shouldAnimate = selectedId === null || selectedId === card.id;
    const isResume = card.id === 'resume';

    const handleClick = useCallback(() => {
        if (isResume) {
            window.open(card.data.link, '_blank');
        } else if (card.isExpandable) {
            setSelectedId(card.id);
        }
    }, [isResume, card.data.link, card.isExpandable, card.id, setSelectedId]);

    return (
        <m.div
            className={cn("h-full w-full", className)}
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            whileInView={{
                opacity: 1,
                y: 0,
                scale: 1,
                transition: {
                    duration: 0.5,
                    ease: [0.25, 0.1, 0.25, 1],
                    delay: index * 0.08,
                }
            }}
            viewport={{ once: true, amount: 0.15 }}
        >
            <motion.div
                layoutId={shouldAnimate ? `card-${card.id}` : undefined}
                onClick={handleClick}
                className={cn(
                    "relative rounded-3xl border flex flex-col group me-card-hover",
                    card.id === 'win' ? "justify-center items-center h-full w-fit" : card.id === 'resume' ? "justify-center items-center h-full w-full" : "p-5 justify-between h-full",
                    "bg-neutral-50 dark:bg-[#171717] border-white dark:border-white/20",
                    "[.data-theme='light']_&:!bg-[#dbeafe] [.data-theme='light']_&:!border-[#1e3a8a]",
                    card.id === 'intro' || card.id === 'win' || card.id === 'resume' ? "overflow-hidden" : "overflow-visible",
                    (card.isExpandable || isResume) && !selectedId ? "cursor-pointer" : ""
                )}
                whileHover={(card.isExpandable || isResume) && !selectedId ? { scale: 1.02 } : {}}
                whileTap={(card.isExpandable || isResume) && !selectedId ? { scale: 0.98 } : {}}
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
        </m.div>
    );
});

interface MeBentoGridProps {
    optimizedImages?: Record<string, any>;
}

const MeBentoGrid: React.FC<MeBentoGridProps> = ({ optimizedImages }) => {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const images = useMemo(() => optimizedImages || defaultImages, [optimizedImages]);
    
    const selectedItem = useMemo(() => 
        cardsData.find((item) => item.id === selectedId),
        [selectedId]
    );

    const { introCard, extracurrCard, educationCard, locationCard, winCard, experienceCard, resumeCard } = useMemo(() => ({
        introCard: cardsData.find(c => c.id === 'intro'),
        extracurrCard: cardsData.find(c => c.id === 'extracurr'),
        educationCard: cardsData.find(c => c.id === 'education'),
        locationCard: cardsData.find(c => c.id === 'location'),
        winCard: cardsData.find(c => c.id === 'win'),
        experienceCard: cardsData.find(c => c.id === 'experience'),
        resumeCard: cardsData.find(c => c.id === 'resume'),
    }), []);

    const handleClose = useCallback(() => setSelectedId(null), []);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setSelectedId(null);
            }
        };

        if (selectedId) {
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
        <LazyMotion features={domAnimation}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full auto-rows-auto">
                {introCard && <CardWrapper card={introCard} index={0} className="col-span-2 lg:col-span-2 lg:row-span-2 min-h-[300px]" selectedId={selectedId} setSelectedId={setSelectedId} images={images} />}
                {educationCard && <CardWrapper card={educationCard} index={1} className="col-span-2 lg:col-span-2 lg:row-span-1 min-h-[150px]" selectedId={selectedId} setSelectedId={setSelectedId} images={images} />}
                <div className="col-span-2 lg:col-span-2 flex gap-4 w-full">
                    {locationCard && <CardWrapper card={locationCard} index={2} className="flex-1 w-auto min-w-0" selectedId={selectedId} setSelectedId={setSelectedId} images={images} />}
                    {winCard && <CardWrapper card={winCard} index={3} className="w-fit shrink-0" selectedId={selectedId} setSelectedId={setSelectedId} images={images} />}
                </div>

                <div className="col-span-2 lg:col-span-4 flex flex-col lg:flex-row gap-4 w-full h-auto">
                    {resumeCard && (
                        <div className="block h-full w-full lg:w-fit col-span-2 lg:col-span-1">
                            <CardWrapper
                                card={resumeCard}
                                index={4}
                                className="h-[100px] lg:h-full w-full lg:w-[100px]"
                                selectedId={selectedId}
                                setSelectedId={setSelectedId}
                                images={images}
                            />
                        </div>
                    )}
                    <div className="grid grid-cols-2 lg:grid-cols-2 gap-4 w-full">
                        {extracurrCard && <CardWrapper card={extracurrCard} index={5} className="col-span-2 lg:col-span-1 lg:row-span-2 h-auto" selectedId={selectedId} setSelectedId={setSelectedId} images={images} />}
                        {experienceCard && <CardWrapper card={experienceCard} index={6} className="col-span-2 lg:col-span-1 lg:row-span-2 h-auto" selectedId={selectedId} setSelectedId={setSelectedId} images={images} />}
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {selectedId && selectedItem && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
                        <m.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={handleClose}
                            className="absolute inset-0 bg-black/60 backdrop-blur-md"
                        />

                        <motion.div
                            layoutId={`card-${selectedId}`}
                            className={cn(
                                "relative w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-3xl border shadow-2xl flex flex-col mt-12",
                                "bg-neutral-50 dark:bg-[#171717] border-white dark:border-white/20",
                                "[.data-theme='light']_&:!bg-[#dbeafe] [.data-theme='light']_&:!border-[#1e3a8a]"
                            )}
                        >
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleClose();
                                }}
                                aria-label="Close details"
                                className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-20 cursor-pointer"
                            >
                                <X size={20} aria-hidden="true" />
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
        </LazyMotion>
    );
};

export default MeBentoGrid;

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

const images: Record<string, ImageMetadata> = {
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

const MeBentoGrid: React.FC = () => {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const selectedItem = cardsData.find((item) => item.id === selectedId);

    useEffect(() => {
        if (selectedId) {
            const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
            document.body.style.overflow = 'hidden';
            document.body.style.paddingRight = `${scrollbarWidth}px`;
        } else {
            document.body.style.overflow = 'unset';
            document.body.style.paddingRight = '0px';
        }
        return () => {
            document.body.style.overflow = 'unset';
            document.body.style.paddingRight = '0px';
        };
    }, [selectedId]);

    const renderCardContent = (card: any) => {
        switch (card.type) {
            case 'intro':
                return (
                    <div className="flex h-full justify-between gap-4">
                        <div className="flex flex-col gap-2 w-[60%] h-full justify-between text-lg">
                            <div className="font-light">
                                <p dangerouslySetInnerHTML={{ __html: card.data.text }} />
                                <p className="mt-2">My interest lies in:</p>
                                <ul className="list-disc list-inside">
                                    {card.data.interests.map((interest: string, i: number) => (
                                        <li key={i}>{interest}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                        <div className="flex justify-center items-center w-[40%] lg:w-[50%] h-full">
                            <img
                                src={images[card.data.image].src}
                                width={images[card.data.image].width}
                                height={images[card.data.image].height}
                                alt="profile"
                                loading="eager"
                                className="w-auto border rounded-full max-h-[150px] lg:max-h-[300px] select-none object-cover"
                            />
                        </div>
                    </div>
                );
            case 'education':
                return (
                    <div className="flex h-full items-center text-lg">
                        <div className="w-[20%] flex justify-center items-center">
                            <img
                                src={images[card.data.image].src}
                                width={images[card.data.image].width}
                                height={images[card.data.image].height}
                                alt="logo"
                                loading="eager"
                                decoding="async"
                                className="select-none transition-all transform duration-200"
                            />
                        </div>
                        <div className="text-right font-light w-[80%]">
                            <p className="font-medium">{card.data.school}</p>
                            <p className="italic text-sm" dangerouslySetInnerHTML={{ __html: card.data.degree }} />
                            <p className="italic text-sm">{card.data.date}</p>
                        </div>
                    </div>
                );
            case 'extracurr':
                return (
                    <div className="flex flex-col gap-4 h-full justify-between text-lg">
                        {card.data.items.map((item: any, i: number) => (
                            <div key={i} className="flex">
                                <div className="w-[20%] flex justify-center items-center">
                                    <img
                                        src={images[item.image].src}
                                        width={images[item.image].width}
                                        height={images[item.image].height}
                                        alt="logo"
                                        loading="eager"
                                        decoding="async"
                                        className="select-none transition-all transform duration-200 w-[90px]"
                                    />
                                </div>
                                <div className="w-[80%] flex flex-col items-end text-right">
                                    <p className="font-medium">{item.title}</p>
                                    <p className="text-sm font-light italic">{item.subtitle}</p>
                                    <p className="text-sm font-light">{item.role}</p>
                                    <p className="text-sm font-light italic">{item.date}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                );
            case 'location':
                return (
                    <div className="flex justify-between items-center w-full h-full">
                        <div className="flex flex-col w-[60%] h-full justify-center">
                            <div className="flex justify-center items-center mb-2">
                                <MapPin className="w-[30px] h-[30px] mr-2" />
                                <p className="text-xl lg:text-2xl mt-2 font-medium">Mumbai, India</p>
                            </div>
                            <div className="flex justify-center items-center">
                                <Clock />
                            </div>
                        </div>
                        <div className="flex justify-center items-center gap-6 w-[40%]">
                            <a href={card.data.links.github} target="_blank" rel="noopener noreferrer" aria-label="Visit Nikshaan's GitHub profile" data-title="Github" className="tooltip-trigger relative">
                                <Github className="w-10 h-10 cursor-pointer hover:scale-90 transition-transform" />
                            </a>
                            <a href={card.data.links.linkedin} target="_blank" rel="noopener noreferrer" aria-label="Connect with Nikshaan on LinkedIn" data-title="LinkedIn" className="tooltip-trigger relative">
                                <Linkedin className="w-10 h-10 cursor-pointer hover:scale-90 transition-transform" />
                            </a>
                            <a href={card.data.links.email} aria-label="Send an email to Nikshaan" data-title="Gmail" className="tooltip-trigger relative">
                                <Mail className="w-10 h-10 cursor-pointer hover:scale-90 transition-transform" />
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
                            loading="eager"
                            decoding="async"
                            className="select-none w-full h-full object-cover"
                        />
                    </div>
                );
            case 'experience':
                return (
                    <div className="flex flex-col gap-4 h-full justify-between text-lg">
                        {card.data.items.map((item: any, i: number) => (
                            <div key={i} className="flex">
                                <div className="w-[20%] flex justify-center items-center">
                                    <img
                                        src={images[item.image].src}
                                        width={images[item.image].width}
                                        height={images[item.image].height}
                                        alt="logo"
                                        loading="eager"
                                        decoding="async"
                                        className="select-none transition-all transform duration-200 rounded-full w-[70px]"
                                    />
                                </div>
                                <div className="w-[80%] flex flex-col items-end text-right">
                                    <p className="font-medium">{item.title}</p>
                                    <p className="text-sm">{item.company}</p>
                                    <p className="text-sm font-light italic">{item.date}</p>
                                </div>
                            </div>
                        ))}
                        <div className="text-sm mt-auto text-right">
                            <p className="italic text-base mb-1 font-bold text-left">certification</p>
                            <p className="font-light text-left"><span className="font-medium">{card.data.certification.title}</span> - {card.data.certification.issuer}</p>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

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
            window.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [selectedId]);

    const CardWrapper = ({ card, className }: { card: any, className?: string }) => {
        const shouldAnimate = selectedId === null || selectedId === card.id;

        return (
            <div className={cn("h-full w-full", className)}>
                <motion.div
                    layoutId={shouldAnimate ? `card-${card.id}` : undefined}
                    onClick={() => card.isExpandable && setSelectedId(card.id)}
                    className={cn(
                        "relative p-5 rounded-3xl border overflow-hidden h-full flex flex-col justify-between group transition-colors me-card-hover",
                        "bg-neutral-50 dark:bg-[#171717] border-white dark:border-white/20",
                        "[.data-theme='light']_&:!bg-[#dbeafe] [.data-theme='light']_&:!border-[#93c5fd]",
                        card.isExpandable && !selectedId ? "cursor-pointer" : ""
                    )}
                    whileHover={card.isExpandable && !selectedId ? { scale: 1.02 } : {}}
                    whileTap={card.isExpandable && !selectedId ? { scale: 0.98 } : {}}
                >
                    {renderCardContent(card)}
                    {card.isExpandable && (
                        <div className={cn(
                            "absolute bottom-4 right-4 transition-opacity duration-300",
                            !selectedId ? "opacity-0 group-hover:opacity-100" : "opacity-0"
                        )}>
                            <Maximize2 size={16} className={card.id === 'win' ? "text-white drop-shadow-md" : "text-neutral-400"} />
                        </div>
                    )}
                </motion.div>
            </div>
        );
    };

    return (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full auto-rows-fr">
                <div className="flex flex-col gap-4 h-full">
                    {introCard && <CardWrapper card={introCard} className="flex-1 min-h-[300px]" />}
                    {extracurrCard && <CardWrapper card={extracurrCard} className="flex-1 min-h-[300px]" />}
                </div>

                <div className="flex flex-col gap-4 h-full">
                    {educationCard && <CardWrapper card={educationCard} className="min-h-[150px]" />}
                    <div className="flex gap-4">
                        {locationCard && <CardWrapper card={locationCard} className="flex-1" />}
                        {winCard && <CardWrapper card={winCard} className="w-28 shrink-0" />}
                    </div>
                    {experienceCard && <CardWrapper card={experienceCard} className="flex-1 min-h-[300px]" />}
                </div>
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
                                "[.data-theme='light']_&:!bg-[#dbeafe] [.data-theme='light']_&:!border-[#93c5fd]"
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
                    border-color: #1e3a8a !important;
                }
                .me-card-hover:hover {
                    border-color: #c084fc !important;
                }
            `}</style>
        </>
    );
};

export default MeBentoGrid;

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { m, motion, AnimatePresence, LazyMotion, domAnimation } from 'framer-motion';
import { X, Maximize2, Github, ExternalLink } from 'lucide-react';
import cardsData from '../data/cardsdata.json';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import reactjs from '../data/react.svg';
import nextjs from '../data/next.svg';
import nodejs from '../data/node.svg';
import fastapi from '../data/fastapi.svg';
import redux from '../data/redux.svg';
import expressjs from '../data/express.svg';
import mongodb from '../data/mongodb.svg';
import postgresql from '../data/postgresql.svg';
import motionIcon from '../data/framer.svg';
import chartjs from '../data/chartjs.svg';
import typescript from '../data/typescript.svg';
import tailwindcss from '../data/tailwind.svg';
import langchain from '../data/LangChain_Logo.svg';
import huggingface from '../data/huggingface.svg';
import chromadb from '../data/chroma.svg';

const techstackIcons: Record<string, any> = {
    'ReactJS': reactjs,
    'NextJS': nextjs,
    'NodeJS': nodejs,
    'FastAPI': fastapi,
    'Redux': redux,
    'ExpressJS': expressjs,
    'MongoDB': mongodb,
    'PostgreSQL': postgresql,
    'Motion': motionIcon,
    'ChartJS': chartjs,
    'TypeScript': typescript,
    'TailwindCSS': tailwindcss,
    'Langchain': langchain,
    'HuggingFace': huggingface,
    'ChromaDB': chromadb,
};

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface CardWrapperProps {
    card: any;
    className?: string;
    index?: number;
    selectedId: string | null;
    setSelectedId: (id: string | null) => void;
}

const CardWrapper: React.FC<CardWrapperProps> = memo(({ card, className, index = 0, selectedId, setSelectedId }) => {
    const shouldAnimate = selectedId === null || selectedId === card.id;

    const handleClick = useCallback(() => {
        if (card.isExpandable) {
            setSelectedId(card.id);
        }
    }, [card.isExpandable, card.id, setSelectedId]);

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
                    "relative p-5 md:p-6 rounded-3xl border flex flex-col justify-between h-full",
                    "bg-neutral-50 dark:bg-[#171717] border-white dark:border-white/20 shadow-sm",
                    "[.data-theme='light']_&:!bg-[#dbeafe] [.data-theme='light']_&:!border-[#93c5fd]",
                    card.isExpandable && !selectedId ? "cursor-pointer group hover:border-neutral-600" : ""
                )}
                whileHover={card.isExpandable && !selectedId ? { scale: 1.02 } : {}}
                whileTap={card.isExpandable && !selectedId ? { scale: 0.98 } : {}}
            >
                <div className="flex flex-col h-full justify-between">
                    <div>
                        <h3 className="text-lg md:text-xl font-medium mb-2">{card.data.name}</h3>
                        <p className="text-sm md:text-base font-light text-neutral-600 dark:text-neutral-400 text-pretty">{card.data.summary}</p>
                    </div>
                    <div className="flex flex-col gap-4 mt-auto pt-4">
                        <div className="grid grid-cols-4 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-2 w-full">
                            {card.data.techstack?.map((tech: string, i: number) => {
                                const needsWhiteBg = ['Langchain', 'HuggingFace', 'ChromaDB'].includes(tech);
                                const icon = techstackIcons[tech];
                                return (
                                    <div key={i} data-title={tech} className={cn(
                                        "flex items-center justify-center p-1 rounded-md border border-neutral-200 dark:border-neutral-700 w-full h-12 min-[500px]:max-md:h-9 tooltip-trigger relative",
                                        needsWhiteBg ? "bg-white special-badge" : "bg-neutral-100 dark:bg-neutral-800"
                                    )}>
                                        {icon && <img src={icon.src} width={icon.width} height={icon.height} alt={tech} className="w-full h-full object-contain" loading="lazy" decoding="async" />}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex gap-4 text-sm md:text-base font-medium">
                            {card.data.live && (
                                <a href={card.data.live} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="cursor-pointer hover:text-blue-500 transition-colors flex items-center gap-1" aria-label={`View live demo of ${card.data.name}`}>
                                    <ExternalLink size={16} /> Live
                                </a>
                            )}
                            {card.data.github && (
                                <a href={card.data.github} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="cursor-pointer hover:text-blue-500 transition-colors flex items-center gap-1" aria-label={`View source code of ${card.data.name} on GitHub`}>
                                    <Github size={16} /> GitHub
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                {card.isExpandable && (
                    <div className={cn(
                        "absolute bottom-4 right-4 transition-opacity duration-300",
                        !selectedId ? "opacity-0 group-hover:opacity-100" : "opacity-0"
                    )}>
                        <Maximize2 size={16} className="text-neutral-400" />
                    </div>
                )}
            </motion.div>
        </m.div>
    );
});

const ProjectsBentoGrid: React.FC = () => {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState<'web' | 'aiml'>('aiml');
    
    const selectedItem = useMemo(() => 
        cardsData.find((item) => item.id === selectedId),
        [selectedId]
    );

    const projects = useMemo(() => 
        cardsData.filter(item => item.type === 'project' && item.category === activeCategory),
        [activeCategory]
    );

    const handleClose = useCallback(() => setSelectedId(null), []);
    const handleSetAiml = useCallback(() => setActiveCategory('aiml'), []);
    const handleSetWeb = useCallback(() => setActiveCategory('web'), []);

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
            <div className="w-full max-w-[1400px] mx-auto p-4 pt-16">
                <div className="flex justify-between items-end mb-8 px-2">
                    <h2 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">Projects</h2>
                    <div className="flex gap-1 bg-neutral-200 dark:bg-neutral-800 p-1 rounded-full" role="tablist" aria-label="Project categories">
                        <button
                            onClick={handleSetAiml}
                            role="tab"
                            aria-selected={activeCategory === 'aiml'}
                            aria-label="Show AI and Machine Learning projects"
                            className={cn(
                                "px-4 py-1.5 cursor-pointer rounded-full text-sm font-medium transition-all",
                                activeCategory === 'aiml'
                                    ? "bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-neutral-100"
                                    : "text-neutral-700 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
                            )}
                        >
                            AI/ML
                        </button>
                        <button
                            onClick={handleSetWeb}
                            role="tab"
                            aria-selected={activeCategory === 'web'}
                            aria-label="Show Web Development projects"
                            className={cn(
                                "px-4 py-1.5 cursor-pointer rounded-full text-sm font-medium transition-all",
                                activeCategory === 'web'
                                    ? "bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-neutral-100"
                                    : "text-neutral-700 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
                            )}
                        >
                            Web
                        </button>
                    </div>
                </div>

                <m.div
                    key={activeCategory}
                    className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-fr"
                >
                    {projects.map((project, i) => (
                        <CardWrapper key={project.id} card={project} index={i} className="col-span-2 md:col-span-1 lg:col-span-1 min-h-[250px]" selectedId={selectedId} setSelectedId={setSelectedId} />
                    ))}
                </m.div>

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
                                    "relative w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-3xl border shadow-2xl flex flex-col",
                                    "bg-neutral-50 dark:bg-[#171717] border-white dark:border-white/20",
                                    "[.data-theme='light']_&:!bg-[#dbeafe] [.data-theme='light']_&:!border-[#93c5fd]"
                                )}
                            >
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleClose();
                                    }}
                                    aria-label="Close project details"
                                    className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-20 cursor-pointer"
                                >
                                    <X size={20} aria-hidden="true" />
                                </button>

                                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                    <div className="flex flex-col gap-6">
                                        <div className="flex flex-col md:flex-row justify-between items-start gap-4 md:gap-0 md:pr-12">
                                            <h2 className="text-3xl font-bold">{selectedItem.data.name}</h2>
                                            <div className="flex gap-2">
                                                {selectedItem.data.live && (
                                                    <a href={selectedItem.data.live} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors" aria-label={`View live demo of ${selectedItem.data.name}`} title="View Live Demo">
                                                        <ExternalLink size={24} />
                                                    </a>
                                                )}
                                                {selectedItem.data.github && (
                                                    <a href={selectedItem.data.github} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors" aria-label={`View source code of ${selectedItem.data.name} on GitHub`} title="View on GitHub">
                                                        <Github size={24} />
                                                    </a>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 w-full">
                                            {selectedItem.data.techstack?.map((tech: string, i: number) => {
                                                const needsWhiteBg = ['Langchain', 'HuggingFace', 'ChromaDB'].includes(tech);
                                                const icon = techstackIcons[tech];
                                                return (
                                                    <div key={i} title={tech} data-tooltip-placement="bottom" className={cn(
                                                        "flex items-center justify-center p-1 rounded-md border border-neutral-200 dark:border-neutral-700 w-full h-12",
                                                        needsWhiteBg ? "bg-white special-badge" : "bg-neutral-100 dark:bg-neutral-800"
                                                    )}>
                                                        {icon && <img src={icon.src} width={icon.width} height={icon.height} alt={tech} className="w-full h-full object-contain" loading="lazy" decoding="async" />}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="prose prose-invert prose-lg max-w-none">
                                            <div dangerouslySetInnerHTML={{ __html: selectedItem.content || '' }} />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </LazyMotion>
    );
};

export default ProjectsBentoGrid;

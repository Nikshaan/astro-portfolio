import React, { useCallback, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LazyMotion, domAnimation } from "framer-motion";
import { Github, ExternalLink, ArrowRight } from "lucide-react";
import cardsData from "../data/cardsdata.json";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import reactjs from "../data/React.svg";
import nextjs from "../data/Next.js.svg";
import nodejs from "../data/Node.js.svg";
import fastapi from "../data/FastAPI.svg";
import redux from "../data/Redux.svg";
import expressjs from "../data/Express.svg";
import mongodb from "../data/MongoDB.svg";
import postgresql from "../data/PostgresSQL.svg";
import motionIcon from "../data/Brand-Framer-Motion--Streamline-Tabler.svg";
import chartjs from "../data/Chartjs.svg";
import typescript from "../data/TypeScript.svg";
import tailwindcss from "../data/Tailwind CSS.svg";
import langchain from "../data/LangChain.svg";
import huggingface from "../data/huggingface-color.svg";
import chromadb from "../data/chroma.svg";
import pytorch from "../data/PyTorch.svg";
import python from "../data/python.svg";
import pandas from "../data/Pandas.svg";
import matplotlib from "../data/Matplotlib.svg";
import langgraph from "../data/langgraph.svg";
import sqlite from "../data/SQLite.svg";
import docker from "../data/Docker.svg";
import vocalopsArchImg from "../data/vocalops-arch.webp";
import cliDemoImg from "../data/cli_demo.webp";
import webApprovalImg from "../data/web_approval.webp";
import classificationLossImg from "../data/classification_loss.webp";
import instructionFinetuningLossImg from "../data/instruction_finetuning_loss.webp";
import ProjectCardContent from "./ProjectCardContent";
import BentoGrid from "./bento/BentoGrid";
import BentoCard from "./bento/BentoCard";
import BentoModal from "./bento/Modal";

const techstackIcons: Record<string, any> = {
  ReactJS: reactjs,
  NextJS: nextjs,
  NodeJS: nodejs,
  FastAPI: fastapi,
  Redux: redux,
  ExpressJS: expressjs,
  MongoDB: mongodb,
  PostgreSQL: postgresql,
  Motion: motionIcon,
  ChartJS: chartjs,
  TypeScript: typescript,
  TailwindCSS: tailwindcss,
  Langchain: langchain,
  HuggingFace: huggingface,
  ChromaDB: chromadb,
  PyTorch: pytorch,
  Python: python,
  Pandas: pandas,
  Matplotlib: matplotlib,
  LangGraph: langgraph,
  SQLite: sqlite,
  Docker: docker,
};

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const content_cache = new Map<string, string>();

const getProcessedContent = (content: string) => {
  if (content_cache.has(content)) {
    return content_cache.get(content) || content;
  }
  const processed = content
    .replace("{{VOCALOPS_ARCH_IMAGE}}", vocalopsArchImg.src)
    .replace("{{CLI_DEMO_IMAGE}}", cliDemoImg.src)
    .replace("{{WEB_APPROVAL_IMAGE}}", webApprovalImg.src)
    .replace("{{CLASSIFICATION_LOSS_IMAGE}}", classificationLossImg.src)
    .replace(
      "{{INSTRUCTION_FINETUNING_LOSS_IMAGE}}",
      instructionFinetuningLossImg.src,
    );
  content_cache.set(content, processed);
  return processed;
};

function TechStack({ techstack }: { techstack?: string[] }) {
  const [hovered, setHovered] = useState<{ tech: string; x: number; y: number } | null>(null);

  const showTooltip = useCallback((e: React.SyntheticEvent<HTMLDivElement>, tech: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHovered({ tech, x: rect.left + rect.width / 2, y: rect.bottom });
  }, []);
  const hideTooltip = useCallback(() => setHovered(null), []);

  return (
    <div className="grid grid-cols-4 lg:grid-cols-3 gap-2 w-full">
      {techstack?.map((tech, i) => {
        const icon = techstackIcons[tech];
        return (
          <div
            key={i}
            tabIndex={0}
            onMouseEnter={(e) => showTooltip(e, tech)}
            onMouseLeave={hideTooltip}
            onFocus={(e) => showTooltip(e, tech)}
            onBlur={hideTooltip}
            aria-label={tech}
            className="flex items-center justify-center p-1 rounded-[var(--radius-control)] border border-[var(--border-subtle)] bg-[var(--surface-raised)] w-full h-12 relative hover:border-[var(--accent)] transition-colors"
          >
            {icon && (
              <img
                src={icon.src}
                width={icon.width}
                height={icon.height}
                alt=""
                className="w-full h-full object-contain"
                loading="lazy"
                decoding="async"
              />
            )}
          </div>
        );
      })}
      {typeof document !== "undefined" &&
        hovered &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[10000] -translate-x-1/2 translate-y-2 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-2.5 py-1 type-caption text-[var(--text-primary)] shadow-lg whitespace-nowrap"
            style={{ left: hovered.x, top: hovered.y }}
          >
            {hovered.tech}
          </div>,
          document.body,
        )}
    </div>
  );
}

const ProjectsBentoGrid: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<"web" | "aiml">("aiml");
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedItem: any = useMemo(
    () => cardsData.find((item) => item.id === selectedId),
    [selectedId],
  );

  const projects: any[] = useMemo(
    () =>
      cardsData.filter(
        (item) => item.type === "project" && item.category === activeCategory,
      ),
    [activeCategory],
  );

  const handleClose = useCallback(() => setSelectedId(null), []);

  return (
    <LazyMotion features={domAnimation}>
      <div className="w-full max-w-[1400px] mx-auto px-4">
        <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
          <h2 id="projects-heading" className="text-[var(--text-primary)]">
            Projects
          </h2>
          <div
            className="flex gap-1 border-b border-[var(--border-subtle)]"
            role="tablist"
            aria-label="Project categories"
          >
            {(["aiml", "web"] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                role="tab"
                aria-selected={activeCategory === cat}
                id={`tab-${cat}`}
                aria-controls="projects-panel"
                className={cn(
                  "px-4 py-2 cursor-pointer type-ui font-medium transition-colors border-b-2 -mb-px",
                  activeCategory === cat
                    ? "border-[var(--accent)] text-[var(--text-primary)]"
                    : "border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]",
                )}
              >
                {cat === "aiml" ? "AI/ML" : "Web"}
              </button>
            ))}
          </div>
        </div>

        <BentoGrid id="projects-panel" role="tabpanel" aria-labelledby={`tab-${activeCategory}`}>
          {projects.map((project) => (
            <BentoCard
              key={project.id}
              span="third"
              expandable
              onActivate={() => setSelectedId(project.id)}
              selected={selectedId === project.id}
              layoutId={`card-${project.id}`}
              aria-label={`View case study for ${project.data.name}`}
            >
              <div className="flex flex-col h-full justify-between gap-4">
                <div>
                  <h3 className="font-bold mb-2">{project.data.name}</h3>
                  <p
                    className="type-body-sm text-[var(--text-secondary)]"
                    dangerouslySetInnerHTML={{ __html: project.data.summary }}
                  />
                </div>
                <div className="flex flex-col gap-3">
                  <TechStack techstack={project.data.techstack} />
                  <div className="flex items-center justify-between type-body-sm font-medium">
                    <div className="flex gap-4">
                      {project.data.live && (
                        <a
                          href={project.data.live}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="project-link"
                          aria-label={`View live demo of ${project.data.name}`}
                        >
                          <ExternalLink size={15} aria-hidden="true" /> Live
                        </a>
                      )}
                      {project.data.github && (
                        <a
                          href={project.data.github}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="project-link"
                          aria-label={`View source code of ${project.data.name} on GitHub`}
                        >
                          <Github size={15} aria-hidden="true" /> GitHub
                        </a>
                      )}
                    </div>
                    <span className="flex items-center gap-1 text-[var(--text-tertiary)] group-hover:text-[var(--accent)] transition-colors">
                      Details <ArrowRight size={14} aria-hidden="true" />
                    </span>
                  </div>
                </div>
              </div>
            </BentoCard>
          ))}
        </BentoGrid>

        <BentoModal
          open={!!selectedId && !!selectedItem}
          onClose={handleClose}
          layoutId={selectedId ? `card-${selectedId}` : undefined}
          titleId="project-modal-title"
          closeLabel="Close project details"
          contentRef={wrapperRef}
          headerActions={
            selectedItem ? (
              <>
                {selectedItem.data.live && (
                  <a
                    href={selectedItem.data.live}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="project-link-icon"
                    aria-label={`View live demo of ${selectedItem.data.name}`}
                    title="View Live Demo"
                  >
                    <ExternalLink size={20} aria-hidden="true" />
                  </a>
                )}
                {selectedItem.data.github && (
                  <a
                    href={selectedItem.data.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="project-link-icon"
                    aria-label={`View source code of ${selectedItem.data.name} on GitHub`}
                    title="View on GitHub"
                  >
                    <Github size={20} aria-hidden="true" />
                  </a>
                )}
              </>
            ) : undefined
          }
        >
          {selectedItem && (
            <div className="flex flex-col gap-6">
              <h2 id="project-modal-title" className="pr-24">
                {selectedItem.data.name}
              </h2>
              <TechStack techstack={selectedItem.data.techstack} />
              <div className="prose max-w-none">
                <ProjectCardContent html={getProcessedContent(selectedItem.content || "")} />
              </div>
            </div>
          )}
        </BentoModal>
      </div>
    </LazyMotion>
  );
};

export default ProjectsBentoGrid;

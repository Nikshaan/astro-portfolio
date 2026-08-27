import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LazyMotion, domAnimation } from "framer-motion";
import { Github, ExternalLink, ArrowRight, Star, MessageCircle } from "lucide-react";
import cardsData from "../data/cardsdata.json";
import {
  fetchOssContributionsData,
  readOssContributionsCache,
  type Contribution,
} from "../utils/ossContributionsClient";
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
            role="img"
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

const OSS_MODAL_ID = "oss-contributions";

function formatContributionDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function OssShimmerBar({ width }: { width: number }) {
  return (
    <div
      className="h-3 rounded-md"
      style={{
        width,
        backgroundImage:
          "linear-gradient(90deg, var(--shimmer-from) 25%, var(--shimmer-to) 50%, var(--shimmer-from) 75%)",
        backgroundSize: "400px 100%",
        animation: "genreStreakShimmer 1.6s infinite linear",
      }}
    />
  );
}

const ProjectsBentoGrid: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<"web" | "aiml">("aiml");
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [contributions, setContributions] = useState<Contribution[] | null>(
    () => readOssContributionsCache(),
  );
  const [ossError, setOssError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchOssContributionsData()
      .then((data) => {
        if (!cancelled) setContributions(data);
      })
      .catch(() => {
        if (!cancelled) setOssError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const orgLogos = useMemo(() => {
    if (!contributions) return [];
    const seen = new Set<string>();
    const logos: string[] = [];
    for (const c of contributions) {
      const org = c.repoName.split("/")[0];
      if (seen.has(org)) continue;
      seen.add(org);
      logos.push(c.orgLogo);
    }
    return logos;
  }, [contributions]);

  const orgCount = orgLogos.length;

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
              aria-label={`${project.data.name} — view case study`}
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

          <BentoCard
            span="wide"
            expandable
            onActivate={() => setSelectedId(OSS_MODAL_ID)}
            selected={selectedId === OSS_MODAL_ID}
            layoutId={`card-${OSS_MODAL_ID}`}
            aria-label="Open Source Contributions — view all"
          >
            <div className="flex h-full flex-col justify-between gap-6 md:flex-row md:items-stretch">
              <div className="flex shrink-0 flex-col justify-between gap-4 md:w-64">
                <div>
                  <h3 className="font-bold mb-2">Open Source</h3>
                  <p className="type-body-sm text-[var(--text-secondary)]">
                    Merged contributions to organization-owned repos.
                  </p>
                </div>
                {!contributions && !ossError ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="w-8 h-8 rounded-full shrink-0"
                          style={{
                            backgroundImage:
                              "linear-gradient(90deg, var(--shimmer-from) 25%, var(--shimmer-to) 50%, var(--shimmer-from) 75%)",
                            backgroundSize: "400px 100%",
                            animation: "genreStreakShimmer 1.6s infinite linear",
                          }}
                        />
                      ))}
                    </div>
                    <OssShimmerBar width={140} />
                  </div>
                ) : ossError || contributions?.length === 0 ? (
                  <p className="type-body-sm text-[var(--text-tertiary)] italic">
                    No contributions yet — check back soon.
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center -space-x-2">
                      {orgLogos.slice(0, 5).map((logo, i) => (
                        <img
                          key={i}
                          src={logo}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="w-8 h-8 rounded-full object-cover border-2 border-[var(--surface-card)] bg-[var(--surface-raised)]"
                        />
                      ))}
                    </div>
                    <div className="flex items-center justify-between type-body-sm font-medium">
                      <span className="text-[var(--text-secondary)]">
                        {contributions!.length} contribution
                        {contributions!.length === 1 ? "" : "s"} · {orgCount} org
                        {orgCount === 1 ? "" : "s"}
                      </span>
                      <span className="flex items-center gap-1 text-[var(--text-tertiary)] group-hover:text-[var(--accent)] transition-colors">
                        Details <ArrowRight size={14} aria-hidden="true" />
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {contributions && contributions.length > 0 && (
                <div className="grid min-w-0 flex-1 grid-cols-1 content-center gap-x-6 gap-y-3 border-t border-[var(--border-subtle)] pt-4 sm:grid-cols-2 md:border-l md:border-t-0 md:pl-6 md:pt-0 xl:grid-cols-3">
                  {contributions.slice(0, 6).map((c) => (
                    <div key={c.id} className="flex min-w-0 items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <img
                          src={c.orgLogo}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="w-7 h-7 rounded-full shrink-0 object-cover bg-[var(--surface-raised)]"
                        />
                        <p className="type-body-sm font-medium truncate">{c.title}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3 type-caption text-[var(--text-tertiary)]">
                        <span className="max-w-24 truncate">{c.repoName}</span>
                        <span className="flex items-center gap-1 shrink-0">
                          <Star size={11} aria-hidden="true" />
                          {c.repoStars.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </BentoCard>
        </BentoGrid>

        <BentoModal
          open={
            (!!selectedId && !!selectedItem) || selectedId === OSS_MODAL_ID
          }
          onClose={handleClose}
          layoutId={selectedId ? `card-${selectedId}` : undefined}
          titleId="project-modal-title"
          closeLabel={
            selectedId === OSS_MODAL_ID
              ? "Close open source contributions"
              : "Close project details"
          }
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
          {selectedId === OSS_MODAL_ID ? (
            <div className="flex flex-col gap-6">
              <div className="pr-24">
                <h2 id="project-modal-title">Open Source Contributions</h2>
                <p className="type-body-sm text-[var(--text-tertiary)] mt-1">
                  Merged pull requests and closed issues on organization-owned repos.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                {contributions?.map((c) => (
                  <a
                    key={c.id}
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/row flex items-center gap-3 p-3 rounded-[var(--radius-control)] border border-[var(--border-subtle)] hover:border-[var(--accent)] transition-colors"
                  >
                    <img
                      src={c.orgLogo}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="w-9 h-9 rounded-full shrink-0 object-cover bg-[var(--surface-raised)]"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="type-body-sm font-medium truncate group-hover/row:text-[var(--accent)] transition-colors">
                        {c.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 type-caption text-[var(--text-tertiary)] mt-1">
                        <span className="truncate">{c.repoName}</span>
                        <span className="flex items-center gap-1 shrink-0">
                          <Star size={12} aria-hidden="true" />
                          {c.repoStars.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1 shrink-0">
                          <MessageCircle size={12} aria-hidden="true" />
                          {c.commentCount}
                        </span>
                        <span className="shrink-0">
                          {formatContributionDate(c.createdAt)}
                        </span>
                      </div>
                    </div>
                    <ExternalLink
                      size={14}
                      className="shrink-0 text-[var(--text-tertiary)] group-hover/row:text-[var(--accent)] transition-colors"
                      aria-hidden="true"
                    />
                  </a>
                ))}
              </div>
            </div>
          ) : (
            selectedItem && (
              <div className="flex flex-col gap-6">
                <h2 id="project-modal-title" className="pr-24">
                  {selectedItem.data.name}
                </h2>
                <TechStack techstack={selectedItem.data.techstack} />
                <div className="prose max-w-none">
                  <ProjectCardContent html={getProcessedContent(selectedItem.content || "")} />
                </div>
              </div>
            )
          )}
        </BentoModal>
      </div>
    </LazyMotion>
  );
};

export default ProjectsBentoGrid;

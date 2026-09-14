import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LazyMotion, domAnimation } from "framer-motion";
import { Github, ExternalLink, Star, MessageCircle } from "lucide-react";
import cardsData from "../data/cardsdata.json";
import {
  readOssContributionsCache,
  subscribeOssContributions,
  type Contribution,
} from "../utils/ossContributionsClient";
import {
  readLlmRepoStarsCache,
  startLlmRepoStarsPolling,
} from "../utils/llmRepoStarsClient";
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
      {mounted &&
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
const LLM_FROM_SCRATCH_ID = "project-llm-from-scratch";

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
  const [llmStars, setLlmStars] = useState<number | null>(() =>
    readLlmRepoStarsCache(),
  );

  useEffect(() => {
    return subscribeOssContributions((snap) => {
      if (snap.data) {
        setContributions(snap.data);
        setOssError(false);
      } else if (snap.error && !snap.loading) {
        setOssError(true);
      }
    });
  }, []);

  useEffect(() => {
    return startLlmRepoStarsPolling(setLlmStars);
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
                  "px-4 py-2 cursor-pointer type-ui font-bold transition-colors border-b-2 -mb-px",
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
              <div className="project-card">
                <div className="project-card__main">
                  <h3 className="mb-2 pr-8 font-bold">{project.data.name}</h3>
                  <p
                    className="type-body-sm text-[var(--text-secondary)]"
                    dangerouslySetInnerHTML={{ __html: project.data.summary }}
                  />
                </div>
                <div className="project-card__foot">
                  <TechStack techstack={project.data.techstack} />
                  <div className="project-card-footer">
                    <div className="project-card-footer__links">
                      {project.data.live && (
                        <a
                          href={project.data.live}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="project-card-action project-card-action--link"
                          aria-label={`Live demo: ${project.data.name}`}
                        >
                          <span className="project-card-action__icon" aria-hidden="true">
                            <ExternalLink size={14} />
                          </span>
                          Live
                        </a>
                      )}
                      {project.data.github && (
                        <span className="project-card-footer__github">
                          <a
                            href={project.data.github}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="project-card-action project-card-action--link"
                            aria-label={`GitHub repository: ${project.data.name}`}
                          >
                            <span className="project-card-action__icon" aria-hidden="true">
                              <Github size={14} />
                            </span>
                            GitHub
                          </a>
                          {project.id === LLM_FROM_SCRATCH_ID &&
                            llmStars !== null && (
                              <span className="project-card-action project-card-action--meta tabular-nums">
                                <span className="project-card-action__icon" aria-hidden="true">
                                  <Star size={14} />
                                </span>
                                {llmStars.toLocaleString()}
                                <span className="sr-only"> GitHub stars</span>
                              </span>
                            )}
                        </span>
                      )}
                    </div>
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
            <div className="flex h-full flex-col gap-6">
              <div className="min-w-0 space-y-2">
                  <h3 className="font-bold">Open Source</h3>
                  <p className="type-body-sm text-[var(--text-secondary)]">
                    Merged contributions to organization-owned repos.
                  </p>
                  {!contributions && !ossError ? (
                    <OssShimmerBar width={180} />
                  ) : ossError || contributions?.length === 0 ? (
                    <p className="type-body-sm text-[var(--text-tertiary)] italic">
                      No contributions yet — check back soon.
                    </p>
                  ) : (
                    <p className="type-body-sm text-[var(--text-secondary)]">
                      {contributions!.length} contribution
                      {contributions!.length === 1 ? "" : "s"} · {orgCount} org
                      {orgCount === 1 ? "" : "s"}
                    </p>
                  )}
                </div>

              {!contributions && !ossError ? (
                <div className="flex flex-col gap-4">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div
                        className="h-9 w-9 shrink-0 rounded-full"
                        style={{
                          backgroundImage:
                            "linear-gradient(90deg, var(--shimmer-from) 25%, var(--shimmer-to) 50%, var(--shimmer-from) 75%)",
                          backgroundSize: "400px 100%",
                          animation: "genreStreakShimmer 1.6s infinite linear",
                        }}
                      />
                      <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <OssShimmerBar width={220} />
                        <OssShimmerBar width={120} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {contributions && contributions.length > 0 ? (
                <div className="grid min-w-0 flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
                  {contributions.slice(0, 4).map((c) => (
                    <div
                      key={c.id}
                      className="flex min-w-0 items-start gap-3 rounded-[var(--radius-control)] bg-[var(--surface-raised)]/40 p-3"
                    >
                      <img
                        src={c.orgLogo}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-9 w-9 shrink-0 rounded-full object-cover bg-[var(--surface-raised)]"
                      />
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="type-body-sm font-bold truncate text-[var(--text-primary)]">
                          {c.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 type-caption text-[var(--text-tertiary)]">
                          <span className="truncate">{c.repoName}</span>
                          <span className="flex shrink-0 items-center gap-1">
                            <Star size={11} aria-hidden="true" />
                            {c.repoStars.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
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
                      <p className="type-body-sm font-bold truncate group-hover/row:text-[var(--accent)] transition-colors">
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

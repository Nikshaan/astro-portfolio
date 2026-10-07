import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LazyMotion, domAnimation } from "framer-motion";
import { Github, MapPin, FileText } from "lucide-react";
import cardsData from "../data/cardsdata.json";
import Clock from "./clock";
import BentoGrid from "./bento/BentoGrid";
import BentoCard from "./bento/BentoCard";
import BentoModal from "./bento/Modal";
import GithubContributions from "./githubContributions";
import { SPANS } from "./bento/spans";
import beeImage from "../data/bee.avif";
import collegeLogo from "../data/djsce-logo.avif";
import aryaLogo from "../data/arya.avif";
import codeAIlogo from "../data/codeai.avif";
import varakLogo from "../data/varak.avif";
import mentoriaLogo from "../data/mentoria.avif";
import winIcon from "../data/winIcon.avif";
import linkedinColor from "../data/linkedin-color.svg";
import gmailColor from "../data/gmail-color.svg";

import certificateImg from "../data/Nikshaan Shetty Certificate.webp";
import lorImg from "../data/Nikshaan Shetty LOR.webp";
import { BEE_IMAGE_SIZES } from "../lib/imageSizes";
import { takeRestoredModal } from "../utils/restoredPageState";

const defaultImages: Record<string, any> = {
  beeImage: beeImage,
  collegeLogo: collegeLogo,
  aryaLogo: aryaLogo,
  codeAIlogo: codeAIlogo,
  varakLogo: varakLogo,
  mentoriaLogo: mentoriaLogo,
  winIcon: winIcon,
};

const content_cache = new Map<string, string>();

const getProcessedContent = (content: string) => {
  if (content_cache.has(content)) {
    return content_cache.get(content) || content;
  }
  const processed = content
    .replace("{{CERTIFICATE_IMAGE}}", certificateImg.src)
    .replace("{{LOR_IMAGE}}", lorImg.src);
  content_cache.set(content, processed);
  return processed;
};

function CardImage({
  image,
  alt,
  sizes,
  className,
  eager = false,
}: {
  image: any;
  alt: string;
  sizes: string;
  className?: string;
  eager?: boolean;
}) {
  return (
    <img
      src={image.src}
      srcSet={image.srcSet?.attribute || image.attributes?.srcset}
      sizes={sizes}
      width={image.attributes?.width}
      height={image.attributes?.height}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={className}
    />
  );
}

interface MeBentoGridProps {
  optimizedImages?: Record<string, any>;
}

const MeBentoGrid: React.FC<MeBentoGridProps> = ({ optimizedImages }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [restoredScroll, setRestoredScroll] = useState(0);
  const images = useMemo(() => optimizedImages || defaultImages, [optimizedImages]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const {
    introCard,
    extracurrCard,
    educationCard,
    locationCard,
    winCard,
    experienceCard,
  }: Record<string, any> = useMemo(
    () => ({
      introCard: cardsData.find((c) => c.id === "intro"),
      extracurrCard: cardsData.find((c) => c.id === "extracurr"),
      educationCard: cardsData.find((c) => c.id === "education"),
      locationCard: cardsData.find((c) => c.id === "location"),
      winCard: cardsData.find((c) => c.id === "win"),
      experienceCard: cardsData.find((c) => c.id === "experience"),
    }),
    [],
  );

  const selectedItem: any = useMemo(
    () => cardsData.find((item) => item.id === selectedId),
    [selectedId],
  );

  useEffect(() => {
    const restored = takeRestoredModal((modal) =>
      cardsData.some((card) => `card-${card.id}` === modal && ["experience", "win"].includes(card.id)),
    );
    if (!restored?.modal) return;
    setRestoredScroll(restored.modalScroll ?? 0);
    setSelectedId(restored.modal.slice("card-".length));
  }, []);

  const handleClose = useCallback(() => {
    setSelectedId(null);
    setRestoredScroll(0);
  }, []);

  if (!introCard) return null;

  return (
    <LazyMotion features={domAnimation}>
      <BentoGrid id="me-grid">
        <BentoCard span="hero" eager>
          <div className="flex flex-col-reverse md:flex-row h-full justify-between gap-6 xl:gap-8 items-center md:items-stretch">
            <div className="flex flex-col gap-4 w-full md:flex-1 h-full justify-center type-body text-center md:text-left">
              <div>
                <p
                  className="text-pretty"
                  dangerouslySetInnerHTML={{ __html: introCard.data.text }}
                />
                <p className="type-lead font-bold text-[var(--accent)] mt-1">
                  Applied AI and software developer
                </p>
              </div>
              <div className="h-px w-full bg-[var(--border-subtle)]" />
              <div>
                <p className="mb-3 text-[var(--text-secondary)]">My interest lies in:</p>
                <ul className="flex flex-wrap justify-center md:justify-start gap-2">
                  {introCard.data.interests?.map((interest: string, i: number) => (
                    <li
                      key={i}
                      className="px-3 py-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-raised)] type-body-sm text-[var(--text-secondary)]"
                    >
                      {interest}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="flex justify-center items-center w-full md:w-auto h-full lg:self-center">
              <div className="intro-card-image relative w-[140px] sm:w-[160px] md:w-[180px] lg:w-[160px] xl:w-[190px] 2xl:w-[210px] aspect-square flex-shrink-0">
                <img
                  src={images[introCard.data.image].src}
                  srcSet={
                    images[introCard.data.image].srcSet?.attribute ||
                    images[introCard.data.image].attributes?.srcset
                  }
                  sizes={BEE_IMAGE_SIZES}
                  width={images[introCard.data.image].attributes?.width || 210}
                  height={images[introCard.data.image].attributes?.height || 210}
                  alt="Nikshaan's profile avatar"
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover border rounded-full select-none profile-image-border border-[var(--border-strong)]"
                  style={{ backgroundColor: "var(--surface-raised)" }}
                />
              </div>
            </div>
          </div>
        </BentoCard>

        {educationCard && (
          <BentoCard span="eduRight">
            <div className="flex flex-col md:flex-row h-full items-center justify-center md:justify-start gap-4 text-center md:text-left">
              <div className="w-full md:w-[22%] flex justify-center items-center">
                <CardImage
                  image={images[educationCard.data.image]}
                  alt="Dwarkadas J. Sanghvi College of Engineering logo"
                  sizes="90px"
                  eager
                  className="select-none w-[70px] h-[70px] sm:w-[90px] sm:h-[90px] object-contain"
                />
              </div>
              <div className="flex-1">
                <h3 className="font-heading font-bold">{educationCard.data.school}</h3>
                <p
                  className="type-body-sm text-[var(--text-secondary)] mt-1"
                  dangerouslySetInnerHTML={{ __html: educationCard.data.degree }}
                />
                <p className="type-caption text-[var(--text-tertiary)] mt-1">
                  {educationCard.data.date}
                </p>
              </div>
            </div>
          </BentoCard>
        )}

        {experienceCard && (
          <BentoCard
            span="eduRight"
            expandable
            onActivate={() => setSelectedId("experience")}
            selected={selectedId === "experience"}
            layoutId="card-experience"
            aria-label="Work Experience — view full details"
          >
            <h3 className="font-heading font-bold mb-3">Work Experience</h3>
            <div className="flex flex-col gap-3 flex-1 justify-center">
              {experienceCard.data.items?.map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <CardImage
                    image={images[item.image]}
                    alt=""
                    sizes="32px"
                    className="w-8 h-8 rounded-full object-contain shrink-0 bg-[var(--surface-raised)]"
                  />
                  <div className="min-w-0">
                    <p className="type-body-sm truncate">{item.title}</p>
                    <p className="type-caption text-[var(--text-tertiary)] truncate">
                      {item.company} · {item.date}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </BentoCard>
        )}

        {extracurrCard && (
          <BentoCard span="third">
            <h3 className="font-heading font-bold mb-3">{extracurrCard.data.title}</h3>
            <div className="flex flex-col gap-3 flex-1 justify-center">
              {extracurrCard.data.items?.map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <CardImage
                    image={images[item.image]}
                    alt=""
                    sizes="32px"
                    className="w-8 h-8 rounded-md object-contain shrink-0 bg-[var(--surface-raised)]"
                  />
                  <div className="min-w-0">
                    <p className="type-body-sm truncate">{item.title}</p>
                    {item.subtitle && (
                      <p className="type-caption text-[var(--text-secondary)] truncate">
                        {item.subtitle}
                      </p>
                    )}
                    <p className="type-caption text-[var(--text-tertiary)] truncate">
                      {item.role} · {item.date}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p className="type-caption text-[var(--text-tertiary)] mt-3 pt-3 border-t border-[var(--border-subtle)]">
              Certification: {extracurrCard.data.certification?.title} —{" "}
              {extracurrCard.data.certification?.issuer}
            </p>
          </BentoCard>
        )}

        <div className={`relative min-h-0 min-w-0 self-stretch ${SPANS.third}`}>
          <div className="grid min-h-0 grid-rows-[auto_auto] gap-[var(--bento-gap)] lg:absolute lg:inset-0 lg:h-auto lg:grid-rows-2">
            <div className="grid h-full min-h-0 min-w-0 grid-cols-2 gap-[var(--bento-gap)]">
              <BentoCard
                span="subTile"
                className="relative z-0 hover:z-10"
                shellClassName="overflow-visible tile-hover"
                disableHoverMotion
                href="/Nikshaan_Shetty_resume.pdf"
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="flex h-full min-h-0 flex-col items-center justify-center gap-1.5 text-center">
                  <FileText size={28} strokeWidth={1.5} className="h-7 w-7 shrink-0 text-[var(--text-secondary)] sm:h-8 sm:w-8" aria-hidden="true" />
                  <h3 className="font-heading text-sm font-bold leading-tight">Resume</h3>
                </div>
              </BentoCard>

              {winCard && (
                <BentoCard
                  span="subTile"
                  className="relative z-0 hover:z-10"
                  shellClassName="overflow-visible"
                  expandable
                  onActivate={() => setSelectedId("win")}
                  selected={selectedId === "win"}
                  layoutId="card-win"
                  aria-label="View hackathons"
                >
                  <div className="flex h-full min-h-0 flex-col items-center justify-center gap-1.5 text-center">
                    <CardImage
                      image={images.winIcon}
                      alt=""
                      sizes="40px"
                      eager
                      className="h-8 w-8 max-h-full shrink-0 select-none object-contain sm:h-10 sm:w-10"
                    />
                    <h3 className="font-heading text-sm font-bold leading-tight">
                      Hackathons
                    </h3>
                  </div>
                </BentoCard>
              )}
            </div>
            <div className="h-full min-h-0 min-w-0">
              <GithubContributions compact />
            </div>
          </div>
        </div>

        {locationCard && (
          <BentoCard span="third">
            <h3 className="font-heading font-bold mb-3">{locationCard.data.title || "Contact"}</h3>
            <div className="flex flex-col gap-3 flex-1 justify-center">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-[var(--surface-raised)]">
                  <MapPin size={16} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="type-body-sm truncate">{locationCard.data.location}</p>
                  <p className="type-caption text-[var(--text-tertiary)]">
                    Local time: <Clock inline />
                  </p>
                </div>
              </div>
              <a
                href={locationCard.data.links.github}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 group/link"
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-[var(--surface-raised)] group-hover/link:text-[var(--accent)] transition-colors">
                  <Github size={16} aria-hidden="true" />
                </div>
                <p className="type-body-sm truncate group-hover/link:text-[var(--accent)] transition-colors">
                  github.com/Nikshaan
                </p>
              </a>
              <a
                href={locationCard.data.links.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 group/link"
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-[var(--surface-raised)]">
                  <img src={linkedinColor.src} alt="" className="w-4 h-4" />
                </div>
                <p className="type-body-sm truncate group-hover/link:text-[var(--accent)] transition-colors">
                  linkedin.com/in/nikshaan-shetty
                </p>
              </a>
              <a
                href={locationCard.data.links.email}
                className="flex items-center gap-3 group/link"
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-[var(--surface-raised)]">
                  <img src={gmailColor.src} alt="" className="w-4 h-4" />
                </div>
                <p className="type-body-sm truncate group-hover/link:text-[var(--accent)] transition-colors">
                  nikshaanshetty06@gmail.com
                </p>
              </a>
            </div>
          </BentoCard>
        )}
      </BentoGrid>

      <BentoModal
        open={!!selectedId && !!selectedItem}
        onClose={handleClose}
        layoutId={selectedId ? `card-${selectedId}` : undefined}
        titleId="me-modal-title"
        closeLabel="Close details"
        contentRef={wrapperRef}
        initialScrollTop={restoredScroll}
      >
        {selectedItem && (
          <div className="flex flex-col gap-6">
            <h2 id="me-modal-title" className="pr-12">
              {selectedItem.id === "win" ? "Hackathons" : "Work Experience"}
            </h2>
            <div className="prose max-w-none">
              <div
                dangerouslySetInnerHTML={{
                  __html: getProcessedContent(selectedItem.content || ""),
                }}
              />
            </div>
          </div>
        )}
      </BentoModal>
    </LazyMotion>
  );
};

export default MeBentoGrid;

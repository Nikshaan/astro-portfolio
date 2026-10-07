import React, { memo } from "react";
import { LazyMotion, domAnimation } from "framer-motion";
import BentoGrid from "./bento/BentoGrid";
import BentoCard from "./bento/BentoCard";
import type { SpanName } from "./bento/spans";
import { ArrowRight, BookOpen } from "lucide-react";
import { BLOG_ARCHIVE_ENABLED } from "../lib/blogArchive";

export interface WritingPostSummary {
  id: string;
  title: string;
  description: string;
  pubDate: string;
  readingTime: string;
  tags: string[];
}

interface WritingBentoGridProps {
  posts: WritingPostSummary[];
}

const WritingBentoGrid: React.FC<WritingBentoGridProps> = memo(({ posts }) => {
  if (!posts || posts.length === 0) {
    return null;
  }

  const showCtaCard = BLOG_ARCHIVE_ENABLED && posts.length < 3;
  const span: SpanName =
    posts.length >= 3 || (showCtaCard && posts.length !== 1)
      ? "third"
      : showCtaCard
        ? "half"
        : posts.length === 1
          ? "wide"
          : "half";
  const displayPosts = posts.slice(0, 3);

  return (
    <LazyMotion features={domAnimation}>
      <div className="w-full max-w-[1400px] mx-auto px-4">
        <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
          <div>
            <h2 id="blogs-heading" className="text-[var(--text-primary)] font-bold">
              Blogs
            </h2>
          </div>
          {BLOG_ARCHIVE_ENABLED && (
            <a
              href="/blog/"
              className="text-xs font-mono uppercase tracking-wider text-[var(--accent)] hover:underline flex items-center gap-1.5 focus-visible:outline-none"
              aria-label="View all blogs"
            >
              <span>View all blogs</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          )}
        </div>

        <BentoGrid id="blogs-panel" aria-labelledby="blogs-heading">
          {displayPosts.map((post) => (
            <BentoCard
              key={post.id}
              span={span}
              href={`/blog/${post.id}/`}
              prefetch="viewport"
              aria-label={`Read ${post.title}`}
              className="flex flex-col justify-between"
            >
              <div className="flex flex-col h-full justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-tertiary)] mb-2.5">
                    <span>{post.pubDate}</span>
                    <span>•</span>
                    <span>{post.readingTime}</span>
                  </div>

                  <h3 className="font-heading font-bold text-base sm:text-lg mb-2 text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors leading-snug line-clamp-2">
                    {post.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] line-clamp-2 leading-relaxed mb-4 font-normal">
                    {post.description}
                  </p>
                </div>

                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-auto pt-2">
                    {post.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="text-[11px] px-2 py-0.5 rounded-[var(--radius-control)] border border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--text-secondary)] font-mono"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </BentoCard>
          ))}

          {showCtaCard && (
            <BentoCard
              span={span}
              href="/blog/"
              aria-label="Browse full blog archive"
              className="flex flex-col justify-between"
              shellClassName="border-dashed hover:border-[var(--accent)]"
            >
              <div className="flex flex-col h-full justify-between">
                <div>
                  <div className="w-8 h-8 rounded-[var(--radius-control)] bg-[var(--accent-quiet)] border border-[var(--accent-quiet)] text-[var(--accent)] flex items-center justify-center mb-3">
                    <BookOpen className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <h3 className="font-heading font-bold text-base sm:text-lg text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors mb-2">
                    All Blogs &amp; Notes
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed font-normal">
                    Browse the complete archive of articles, tag directories, and deep-dive notes.
                  </p>
                </div>

                <div className="mt-4 flex items-center gap-1.5 text-xs font-mono text-[var(--accent)] group-hover:translate-x-0.5 transition-transform">
                  <span>Browse archive</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </div>
              </div>
            </BentoCard>
          )}
        </BentoGrid>
      </div>
    </LazyMotion>
  );
});

WritingBentoGrid.displayName = "WritingBentoGrid";

export default WritingBentoGrid;

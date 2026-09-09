import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import { toggleThemeWithTransition } from "../hooks/useTheme";
import { motion, useReducedMotion } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import beeImage from "../data/bee.avif";

interface NavbarProps {
  sections?: Array<{ id: string; label: string }>;
}

const DEFAULT_SECTIONS = [
  { id: "me", label: "me" },
  { id: "projects", label: "projects" },
  { id: "fun", label: "fun" },
];

const Navbar: React.FC<NavbarProps> = memo(({ sections = DEFAULT_SECTIONS }) => {
  const [activeSection, setActiveSection] = useState<string>("me");
  const shellRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const observerOptions: IntersectionObserverInit = {
      rootMargin: "-20% 0px -70% 0px",
      threshold: 0,
    };

    const sectionVisibility = new Map<string, number>();

    const observerCallback: IntersectionObserverCallback = (entries) => {
      entries.forEach((entry) => {
        const sectionId = entry.target.id;

        if (entry.isIntersecting) {
          sectionVisibility.set(sectionId, entry.intersectionRatio);
        } else {
          sectionVisibility.delete(sectionId);
        }
      });

      let maxVisibility = 0;
      let mostVisibleSection = "me";

      sectionVisibility.forEach((ratio, id) => {
        if (ratio > maxVisibility) {
          maxVisibility = ratio;
          mostVisibleSection = id;
        }
      });

      if (sectionVisibility.size > 0) {
        setActiveSection(mostVisibleSection);
      }
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    sections.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [sections]);

  // Passive rAF scroll listener: toggles data-scrolled and updates scroll progress
  useEffect(() => {
    let ticking = false;
    const threshold = 8;
    const shell = shellRef.current;

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const isScrolled = window.scrollY > threshold;
          if (shell) {
            shell.setAttribute("data-scrolled", isScrolled ? "true" : "false");
            const total = document.documentElement.scrollHeight - window.innerHeight;
            const progress =
              total > 0 ? Math.min(100, Math.max(0, (window.scrollY / total) * 100)) : 0;
            shell.style.setProperty("--nav-progress", `${progress}%`);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    onScroll();

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }

    const handleHashChange = () => {
      if (window.location.hash) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    };

    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  const handleNavClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
      e.preventDefault();

      if (sectionId === "me") {
        window.scrollTo({ top: 0, behavior: "smooth" });
        setActiveSection(sectionId);

        setTimeout(() => {
          if (window.location.hash) {
            window.history.replaceState(null, "", window.location.pathname + window.location.search);
          }
        }, 10);
        return;
      }

      const targetSection = document.getElementById(sectionId);
      if (targetSection) {
        targetSection.scrollIntoView({ behavior: "smooth", block: "start" });
        setActiveSection(sectionId);

        setTimeout(() => {
          if (window.location.hash) {
            window.history.replaceState(null, "", window.location.pathname + window.location.search);
          }
        }, 10);
      }
    },
    [],
  );

  const handleThemeToggle = useCallback(() => {
    toggleThemeWithTransition();
  }, []);

  return (
    <header id="navbar" className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      <div ref={shellRef} data-scrolled="false" className="nav-shell pointer-events-auto">
        <nav
          aria-label="Primary"
          className="nav-card relative flex items-center justify-between h-14 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-card)] overflow-hidden"
        >
          <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-5 flex items-center justify-between">
            <a
              href="#me"
              onClick={(e) => handleNavClick(e, "me")}
              className="nav-brand flex items-center gap-2.5 rounded-full focus-visible:outline-none"
              aria-label="Nikshaan Shetty, back to top"
            >
              <img
                src={beeImage.src}
                alt=""
                width={32}
                height={32}
                className="w-8 h-8 rounded-full object-cover border border-[var(--border-subtle)] shrink-0"
              />
              <span className="nav-wordmark hidden sm:inline font-semibold tracking-tight text-[var(--text-primary)]">
                Nikshaan
              </span>
            </a>

            <div className="flex items-center gap-1 sm:gap-1.5">
              {sections.map(({ id, label }) => {
                const isActive = activeSection === id;
                return (
                  <a
                    key={id}
                    href={`#${id}`}
                    onClick={(e) => handleNavClick(e, id)}
                    aria-label={`Navigate to ${label} section`}
                    aria-current={isActive ? "page" : undefined}
                    className={`nav-link relative cursor-pointer px-3 py-2 transition-colors duration-200${isActive ? " active" : ""
                      }`}
                    data-section={id}
                  >
                    <span>{label}</span>
                    {isActive && (
                      <motion.span
                        layoutId="nav-caret"
                        className="absolute bottom-1.5 left-1/2 -translate-x-1/2 h-[3px] w-2.5 rounded-[1px] bg-[var(--accent)] pointer-events-none"
                        transition={
                          shouldReduceMotion
                            ? { duration: 0 }
                            : { type: "spring", stiffness: 380, damping: 30 }
                        }
                      />
                    )}
                  </a>
                );
              })}

              <div className="h-5 w-px bg-[var(--border-subtle)] mx-1.5 sm:mx-2" aria-hidden="true" />

              <button
                id="theme-toggle"
                type="button"
                aria-label="Toggle theme"
                className="theme-toggle-btn relative cursor-pointer p-2 rounded-full hover:bg-[var(--surface-raised)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-200 flex items-center justify-center focus-visible:outline-none"
                onClick={handleThemeToggle}
              >
                <Sun className="w-4 h-4 theme-toggle-sun" aria-hidden="true" />
                <Moon className="w-4 h-4 theme-toggle-moon" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="nav-progress-indicator" aria-hidden="true" />
        </nav>
      </div>
    </header>
  );
});

Navbar.displayName = "Navbar";

export default Navbar;

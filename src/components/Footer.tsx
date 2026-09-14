import { useCallback } from "react";
import { MoveRight, Github, Linkedin, Mail } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const handleNavClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
      e.preventDefault();

      const notHandled = window.dispatchEvent(
        new CustomEvent("nav:navigate", { detail: sectionId, cancelable: true }),
      );

      if (notHandled) {
        if (sectionId === "me") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          const targetSection = document.getElementById(sectionId);
          if (targetSection) {
            targetSection.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }
      }

      setTimeout(() => {
        if (window.location.hash) {
          window.history.replaceState(
            null,
            "",
            window.location.pathname + window.location.search,
          );
        }
      }, 10);
    },
    [],
  );

  return (
    <footer className="w-full p-4 pt-0 text-[var(--text-secondary)] bg-[var(--surface-page)]">
      <div
        id="main-footer"
        className="bento-reveal w-full max-w-[1400px] mx-auto rounded-[var(--radius-card)] border bg-[var(--surface-card)] border-[var(--border-subtle)] overflow-hidden footer-transition bento-card"
      >
        <div className="p-8 md:p-12 border-b border-[var(--border-subtle)] footer-transition">
          <h2 className="type-footer-display uppercase text-[var(--text-primary)] footer-transition">
            Let's Connect
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="p-8 md:p-12 flex flex-col justify-between gap-8 border-b lg:border-b-0 lg:border-r border-[var(--border-subtle)] overflow-hidden footer-transition">
            <div>
              <a
                href="mailto:nikshaanshetty06@gmail.com"
                className="group inline-flex items-center gap-2 md:gap-4 type-footer-contact text-[var(--text-primary)] hover:text-[var(--text-secondary)] footer-transition max-w-full min-w-0"
              >
                <span className="truncate">nikshaanshetty06@gmail.com</span>
                <span className="bg-[var(--text-primary)] text-[var(--surface-page)] p-2 rounded-full group-hover:rotate-[-45deg] footer-transform-transition shrink-0 footer-transition">
                  <MoveRight className="w-3 h-3 md:w-5 md:h-5" />
                </span>
              </a>
            </div>

            <div className="flex gap-2">
              <a
                href="https://github.com/Nikshaan"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Visit Nikshaan's GitHub profile"
                className="p-4 rounded-full border border-[var(--border-subtle)] hover:bg-[var(--surface-raised)] footer-transition"
              >
                <Github className="w-5 h-5 text-[var(--text-primary)]" aria-hidden="true" />
              </a>
              <a
                href="https://www.linkedin.com/in/nikshaan-shetty/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Connect with Nikshaan on LinkedIn"
                className="p-4 rounded-full border border-[var(--border-subtle)] hover:bg-[var(--surface-raised)] footer-transition"
              >
                <Linkedin className="w-5 h-5 text-[var(--text-primary)]" aria-hidden="true" />
              </a>
              <a
                href="mailto:nikshaanshetty06@gmail.com"
                aria-label="Send an email to Nikshaan"
                className="p-4 rounded-full border border-[var(--border-subtle)] hover:bg-[var(--surface-raised)] footer-transition"
              >
                <Mail className="w-5 h-5 text-[var(--text-primary)]" aria-hidden="true" />
              </a>
            </div>
          </div>

          <div className="p-6 md:p-12 flex flex-col justify-between gap-8">
            <div className="flex flex-col gap-2">
              <p className="type-body text-[var(--text-tertiary)] mb-2">Navigation</p>
              <nav aria-label="Footer navigation" className="flex flex-wrap gap-2 md:gap-3">
                {[
                  { name: "me", href: "me" },
                  { name: "projects", href: "projects" },
                  { name: "fun", href: "fun" },
                ].map((link) => (
                  <a
                    key={link.name}
                    href={`#${link.href}`}
                    onClick={(e) => handleNavClick(e, link.href)}
                    aria-label={`${link.name} section`}
                    className="px-4 md:px-6 py-2 rounded-full border border-[var(--border-subtle)] type-ui text-[var(--text-primary)] font-bold hover:bg-[var(--accent)] hover:text-[var(--accent-contrast)] hover:border-[var(--accent)] footer-transition"
                  >
                    {link.name}
                  </a>
                ))}
              </nav>
            </div>

            <div className="flex flex-row flex-wrap justify-between items-center gap-x-4 gap-y-2">
              <p className="type-caption text-[var(--text-tertiary)]">
                &copy; {currentYear} Nikshaan Shetty.
              </p>
              <div className="type-caption text-[var(--text-tertiary)] flex items-center gap-1">
                <span>Built with</span>
                <span className="text-[var(--text-primary)]">Astro</span>
                <span className="text-[var(--border-strong)]">/</span>
                <span className="text-[var(--text-primary)]">React</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

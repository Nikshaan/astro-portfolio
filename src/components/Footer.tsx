import { useCallback } from "react";
import { MoveRight, Github, Linkedin, Mail } from "lucide-react";
import { motion } from "framer-motion";
import useIsMobile from "../hooks/useIsMobile";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const isMobile = useIsMobile();

  const handleNavClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
      e.preventDefault();

      const targetSection = document.getElementById(sectionId);
      if (targetSection) {
        targetSection.scrollIntoView({ behavior: "smooth", block: "start" });

        setTimeout(() => {
          if (window.location.hash) {
            window.history.replaceState(
              null,
              "",
              window.location.pathname + window.location.search,
            );
          }
        }, 10);
      }
    },
    [],
  );

  const containerVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: isMobile ? 0.3 : 0.5,
        ease: [0.22, 1, 0.36, 1] as const,
        staggerChildren: isMobile ? 0.05 : 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: isMobile ? 0.3 : 0.5,
        ease: [0.22, 1, 0.36, 1] as const,
      },
    },
  };

  return (
    <footer className="w-full p-4 pt-0 text-[var(--text-secondary)] bg-[var(--surface-page)]">
      <motion.div
        id="main-footer"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2, margin: "0px 0px -10% 0px" }}
        className="w-full max-w-[1400px] mx-auto rounded-[var(--radius-card)] border bg-[var(--surface-card)] border-[var(--border-subtle)] overflow-hidden footer-transition bento-card"
      >
        <motion.div
          variants={itemVariants}
          className="p-8 md:p-12 border-b border-[var(--border-subtle)] footer-transition"
        >
          <h2 className="type-footer-display uppercase text-[var(--text-primary)] footer-transition whitespace-nowrap">
            Let's Connect
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2">
          <motion.div
            variants={itemVariants}
            className="p-8 md:p-12 flex flex-col justify-between gap-8 border-b lg:border-b-0 lg:border-r border-[var(--border-subtle)] overflow-hidden footer-transition"
          >
            <div>
              <a
                href="mailto:nikshaanshetty06@gmail.com"
                className="group flex items-center gap-2 md:gap-4 type-footer-contact text-[var(--text-primary)] hover:text-[var(--text-secondary)] whitespace-nowrap footer-transition"
              >
                nikshaanshetty06@gmail.com
                <span className="bg-[var(--text-primary)] text-[var(--surface-page)] p-2 rounded-full group-hover:rotate-[-45deg] footer-transform-transition flex-shrink-0 footer-transition">
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
          </motion.div>

          <motion.div variants={itemVariants} className="p-6 md:p-12 flex flex-col justify-between gap-8">
            <div className="flex flex-col gap-2">
              <p className="type-body font-medium text-[var(--text-tertiary)] mb-2">Navigation</p>
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
                    aria-label={`Navigate to ${link.name} section`}
                    className="px-4 md:px-6 py-2 rounded-full border border-[var(--border-subtle)] type-ui text-[var(--text-primary)] font-medium hover:bg-[var(--accent)] hover:text-[var(--accent-contrast)] hover:border-[var(--accent)] footer-transition"
                  >
                    {link.name}
                  </a>
                ))}
              </nav>
            </div>

            <div className="flex flex-row flex-wrap justify-between items-center gap-x-4 gap-y-2">
              <p className="type-caption font-medium text-[var(--text-tertiary)]">
                &copy; {currentYear} Nikshaan Shetty.
              </p>
              <div className="type-caption font-medium text-[var(--text-tertiary)] flex items-center gap-1">
                <span>Built with</span>
                <span className="text-[var(--text-primary)]">Astro</span>
                <span className="text-[var(--border-strong)]">/</span>
                <span className="text-[var(--text-primary)]">React</span>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </footer>
  );
};

export default Footer;

import React, { useEffect } from "react";
import { m, motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useFocusTrap } from "../../hooks/useFocusTrap";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface BentoModalProps {
  open: boolean;
  onClose: () => void;
  layoutId?: string;
  titleId: string;
  closeLabel: string;
  contentRef?: React.RefObject<HTMLDivElement | null>;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}

export default function BentoModal({
  open,
  onClose,
  layoutId,
  titleId,
  closeLabel,
  contentRef,
  headerActions,
  children,
}: BentoModalProps) {
  const trapRef = useFocusTrap(open);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.documentElement.style.setProperty(
      "--scrollbar-width",
      `${window.innerWidth - document.documentElement.clientWidth}px`,
    );
    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = "var(--scrollbar-width, 0px)";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <m.div
          key="modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
        >
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[var(--surface-overlay)] backdrop-blur-md"
          />

          <motion.div
            ref={trapRef}
            layoutId={layoutId}
            data-bento-shell=""
            data-bento-frozen=""
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={cn(
              "relative w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-[var(--radius-card)] border shadow-2xl flex flex-col",
              "bg-[var(--surface-card)] border-[var(--border-strong)] text-[var(--text-primary)]",
            )}
          >
            <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
              {headerActions}
              <button
                data-autofocus
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                aria-label={closeLabel}
                className="p-2 rounded-full bg-[var(--surface-raised)] hover:bg-[var(--border-subtle)] transition-colors cursor-pointer"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <div
              ref={contentRef}
              className="flex-1 overflow-y-auto p-8 custom-scrollbar min-h-0"
            >
              {children}
            </div>
          </motion.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}

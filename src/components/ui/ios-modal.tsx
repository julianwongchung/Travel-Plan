"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { GlassButton } from "@/components/ui/glass-button";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function IOSModal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open || typeof document === "undefined") return undefined;

    const previousActiveElement = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusableElements = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector))
        .filter((element) => element.offsetParent !== null || element === closeButtonRef.current);
      const firstElement = focusableElements[0];
      const lastElement = focusableElements.at(-1);

      if (!firstElement || !lastElement) return;

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (previousActiveElement?.isConnected) previousActiveElement.focus();
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] grid min-w-0 place-items-center overflow-hidden bg-slate-950/35 p-4 backdrop-blur-md sm:p-6"
      data-ios-modal-overlay
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-ios-modal
        className="glass-surface-strong flex max-h-[min(82dvh,42rem)] w-full min-w-0 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-[28px] border border-white/35 shadow-[0_24px_80px_rgba(15,23,42,0.24)] sm:max-w-lg sm:rounded-[32px]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-4 sm:px-5">
          <h2 className="min-w-0 truncate text-xl font-bold tracking-[-0.03em]">{title}</h2>
          <GlassButton
            ref={closeButtonRef}
            variant="secondary"
            className="size-10 shrink-0 p-0"
            type="button"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </GlassButton>
        </div>
        <div className="min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5">
          {children}
        </div>
      </section>
    </div>,
    document.body,
  );
}

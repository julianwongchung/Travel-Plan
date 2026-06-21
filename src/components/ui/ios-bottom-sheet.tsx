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

export function IOSBottomSheet({
  open,
  title,
  children,
  onClose,
  placement = "bottom",
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  placement?: "bottom" | "center";
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open || typeof document === "undefined") return undefined;

    const previousActiveElement = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
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
  }, [onClose, open]);

  if (!open || typeof document === "undefined") return null;

  const centered = placement === "center";

  return createPortal(
    <div
      className={`fixed inset-0 z-[110] flex min-w-0 justify-center overflow-hidden bg-black/30 backdrop-blur-sm ${
        centered ? "items-center p-4 sm:p-6" : "items-end p-0 sm:items-center sm:p-6"
      }`}
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`glass-surface-strong safe-area-bottom max-h-[88dvh] w-full min-w-0 max-w-full overscroll-contain overflow-y-auto p-4 sm:max-w-lg sm:p-6 ${
          centered ? "rounded-[30px]" : "rounded-t-[30px] sm:rounded-[30px]"
        }`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="min-w-0 text-xl font-bold tracking-[-0.02em]">{title}</h2>
          <GlassButton ref={closeButtonRef} variant="secondary" className="size-11 p-0" type="button" onClick={onClose} aria-label="Close">
            <X size={19} />
          </GlassButton>
        </div>
        {children}
      </section>
    </div>,
    document.body,
  );
}

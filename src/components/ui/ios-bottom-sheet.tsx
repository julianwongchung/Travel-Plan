"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { GlassButton } from "@/components/ui/glass-button";

export function IOSBottomSheet({
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
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[110] flex min-w-0 items-end justify-center overflow-hidden bg-black/30 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="presentation" onMouseDown={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="glass-surface-strong safe-area-bottom max-h-[88dvh] w-full min-w-0 max-w-full overscroll-contain overflow-y-auto rounded-t-[30px] p-4 sm:max-w-lg sm:rounded-[30px] sm:p-6"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="min-w-0 text-xl font-bold tracking-[-0.02em]">{title}</h2>
          <GlassButton variant="secondary" className="size-11 p-0" type="button" onClick={onClose} aria-label="Close">
            <X size={19} />
          </GlassButton>
        </div>
        {children}
      </section>
    </div>,
    document.body,
  );
}

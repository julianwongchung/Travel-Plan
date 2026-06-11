import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export type IOSSegment = {
  value: string;
  label: string;
  href: string;
};

export function IOSSegmentedControl({
  value,
  segments,
  className,
}: {
  value: string;
  segments: IOSSegment[];
  className?: string;
}) {
  return (
    <div className={cn("max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", className)}>
      <div className="grid min-w-full rounded-full bg-[var(--muted)] p-1" style={{ gridTemplateColumns: `repeat(${segments.length}, minmax(5.5rem, 1fr))` }}>
        {segments.map((segment) => (
          <Link
            key={segment.value}
            href={segment.href}
            aria-current={segment.value === value ? "page" : undefined}
            className={cn(
              "ios-pressable rounded-full px-3 py-2 text-center text-sm font-semibold text-[var(--muted-foreground)]",
              segment.value === value && "bg-[var(--card-strong)] text-[var(--foreground)] shadow-sm",
            )}
          >
            {segment.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

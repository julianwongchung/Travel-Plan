import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

function ListItemContent({
  icon,
  title,
  description,
  trailing,
  href,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  trailing?: ReactNode;
  href?: string;
}) {
  return (
    <>
      {icon ? <span className="grid size-10 shrink-0 place-items-center rounded-[14px] bg-[var(--primary-soft)] text-[var(--primary)]">{icon}</span> : null}
      <span className="min-w-0 flex-1">
        <span className="block break-words font-semibold text-[var(--foreground)]">{title}</span>
        {description ? <span className="mt-0.5 block text-sm leading-5 text-[var(--muted-foreground)]">{description}</span> : null}
      </span>
      {trailing ? <span className="max-w-[42%] shrink-0 break-words text-right text-sm font-medium text-[var(--muted-foreground)]">{trailing}</span> : null}
      {href ? <ChevronRight className="shrink-0 text-[var(--muted-foreground)]" size={18} /> : null}
    </>
  );
}

export function IOSListItem({
  icon,
  title,
  description,
  trailing,
  href,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  trailing?: ReactNode;
  href?: string;
  className?: string;
}) {
  const content = <ListItemContent icon={icon} title={title} description={description} trailing={trailing} href={href} />;
  const classes = cn(
    "ios-pressable flex min-h-16 items-center gap-3 border-b border-[var(--border)] px-1 py-3 last:border-b-0",
    href && "hover:text-[var(--primary)]",
    className,
  );

  return href ? <Link href={href} className={classes}>{content}</Link> : <div className={classes}>{content}</div>;
}

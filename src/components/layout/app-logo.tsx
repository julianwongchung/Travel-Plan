import Image from "next/image";
import Link from "next/link";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function AppLogo({
  className,
  imageClassName,
  href = "/trips",
  ...props
}: HTMLAttributes<HTMLAnchorElement> & {
  href?: string;
  imageClassName?: string;
}) {
  return (
    <Link
      href={href}
      aria-label="GoGoPlan home"
      className={cn("ios-pressable inline-flex min-w-0 shrink-0 items-center rounded-[14px]", className)}
      {...props}
    >
      <Image
        src="/brand/gogoplan-logo-cropped.png"
        alt="GoGoPlan"
        width={1173}
        height={457}
        priority
        className={cn("h-auto w-[138px] max-w-full object-contain", imageClassName)}
      />
    </Link>
  );
}

import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function AccessDenied({
  title = "Access denied",
  description = "Your account is read-only for this area.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <main className="mx-auto grid min-h-screen w-full max-w-lg place-items-center px-4 py-10">
      <Card className="w-full rounded-[30px]">
        <CardContent className="grid gap-5 p-6 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-[var(--danger-soft)] text-[var(--danger)]">
            <LockKeyhole size={24} />
          </span>
          <div className="grid gap-2">
            <h1 className="text-2xl font-bold tracking-[-0.03em]">{title}</h1>
            <p className="text-sm font-medium leading-6 text-[var(--muted-foreground)]">{description}</p>
          </div>
          <div className="grid gap-2">
            <ButtonLink href="/trips">Back to Trips</ButtonLink>
            <Link href="/login" className="text-sm font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
              Switch account
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

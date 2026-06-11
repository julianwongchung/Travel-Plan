import { Suspense } from "react";
import { Plane } from "lucide-react";
import { login } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-fields";
import { GlassCard, GlassCardContent } from "@/components/ui/glass-card";

function LoginError({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="rounded-[16px] border border-[rgba(255,69,58,0.2)] bg-[var(--danger-soft)] px-4 py-3 text-sm font-semibold text-[var(--danger)]">{error}</p>;
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;

  return (
    <main className="relative grid min-h-dvh w-full place-items-center overflow-hidden px-3 py-6 sm:px-4 sm:py-10">
      <div className="pointer-events-none absolute left-[-8rem] top-[-8rem] size-80 rounded-full bg-[var(--primary-soft)] blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-8rem] right-[-7rem] size-72 rounded-full bg-[rgba(175,82,222,0.12)] blur-3xl" />
      <GlassCard variant="glass" className="w-full max-w-md rounded-[26px] sm:rounded-[30px]">
        <GlassCardContent className="p-5 sm:p-8">
          <div className="mb-6 flex min-w-0 items-center gap-3 sm:mb-8 sm:gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-[18px] bg-[var(--primary)] text-white shadow-[0_12px_30px_rgba(10,132,255,0.28)] sm:size-14 sm:rounded-[20px]">
              <Plane size={22} />
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-[-0.04em] sm:text-3xl">Travel OS</h1>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">Your private trip workspace</p>
            </div>
          </div>
          <form action={login} className="grid gap-5">
            <Suspense>
              <LoginError error={params.error} />
            </Suspense>
            <Field label="Email">
              <Input name="email" type="email" autoComplete="email" required />
            </Field>
            <Field label="Password">
              <Input name="password" type="password" autoComplete="current-password" required />
            </Field>
            <Button type="submit" className="mt-1 w-full">Log in</Button>
          </form>
          <p className="mt-6 text-center text-xs leading-5 text-[var(--muted-foreground)]">Private by default. Trips are shared only when you invite someone.</p>
        </GlassCardContent>
      </GlassCard>
    </main>
  );
}

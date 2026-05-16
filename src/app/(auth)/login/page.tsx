import { Suspense } from "react";
import { Plane } from "lucide-react";
import { login } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form-fields";

function LoginError({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>;
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-lg bg-[var(--primary)] text-white">
              <Plane size={22} />
            </span>
            <div>
              <h1 className="text-2xl font-bold">Travel OS</h1>
              <p className="text-sm text-slate-500">Private trip planning workspace</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form action={login} className="grid gap-4">
            <Suspense>
              <LoginError error={params.error} />
            </Suspense>
            <Field label="Email">
              <Input name="email" type="email" autoComplete="email" required />
            </Field>
            <Field label="Password">
              <Input name="password" type="password" autoComplete="current-password" required />
            </Field>
            <Button type="submit" className="w-full">Log in</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

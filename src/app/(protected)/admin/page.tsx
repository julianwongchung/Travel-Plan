import { ShieldCheck, Trash2, UserRoundPlus, UsersRound } from "lucide-react";
import { createAppUser, deleteAppUser, updateAppUserActive, updateAppUserRole } from "@/lib/actions/admin";
import { AccessDenied } from "@/components/auth/access-denied";
import { AppLogo } from "@/components/layout/app-logo";
import { WorkspaceMobileNav } from "@/components/layout/workspace-mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form-fields";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAppUsers, getCurrentProfile } from "@/lib/db/queries";
import { hasSupabaseAdminEnv } from "@/lib/supabase/env";
import { canAccessAdmin } from "@/lib/utils/permissions";

export default async function AdminPage() {
  const profile = await getCurrentProfile();

  if (!canAccessAdmin(profile.app_role)) {
    return <AccessDenied description="Only Admin users can manage accounts and permissions." />;
  }

  const users = await getAppUsers();
  const adminEnvConfigured = hasSupabaseAdminEnv();

  return (
    <>
      <main className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-5 pb-32 sm:px-6 sm:py-8">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <AppLogo imageClassName="w-[150px] sm:w-[174px]" />
          <StatusBadge status="Admin" tone="primary" />
        </div>

        <section className="grid gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">Admin</p>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-[-0.04em] text-slate-950 dark:text-[var(--foreground)]">
            <ShieldCheck size={28} />
            User Management
          </h1>
          <p className="max-w-2xl text-sm font-medium leading-6 text-[var(--muted-foreground)]">
            Create app users, assign Admin or Viewer access, and deactivate or delete accounts when needed.
          </p>
        </section>

        <Card className="rounded-[28px]">
          <CardContent className="grid gap-5 p-5">
            <div className="flex items-center gap-2">
              <UserRoundPlus size={18} />
              <h2 className="text-lg font-bold tracking-[-0.02em]">Create user</h2>
            </div>
            {!adminEnvConfigured ? (
              <div className="rounded-[18px] border border-[var(--border)] bg-[var(--muted)] p-4 text-sm font-semibold leading-6 text-[var(--muted-foreground)]">
                Admin user management needs a server-only Supabase admin key: <code>SUPABASE_SERVICE_ROLE_KEY</code> or <code>SUPABASE_SECRET_KEY</code>. Add one to <code>.env.local</code> and your deployment environment to create users or change account status.
              </div>
            ) : null}
            <form action={adminEnvConfigured ? createAppUser : undefined} className="grid gap-4 md:grid-cols-2">
              <Field label="Email">
                <Input name="email" type="email" required placeholder="user@example.com" disabled={!adminEnvConfigured} />
              </Field>
              <Field label="Full name">
                <Input name="full_name" placeholder="Optional" disabled={!adminEnvConfigured} />
              </Field>
              <Field label="Temporary password">
                <Input name="password" type="password" required minLength={8} placeholder="At least 8 characters" disabled={!adminEnvConfigured} />
              </Field>
              <Field label="Account type">
                <Select name="app_role" defaultValue="viewer" disabled={!adminEnvConfigured}>
                  <option value="viewer">Viewer</option>
                  <option value="admin">Admin</option>
                </Select>
              </Field>
              <div className="md:col-span-2">
                <Button type="submit" className="w-full sm:w-auto" disabled={!adminEnvConfigured}>Create user</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-[28px]">
          <CardContent className="grid gap-5 p-5">
            <div className="flex items-center gap-2">
              <UsersRound size={18} />
              <h2 className="text-lg font-bold tracking-[-0.02em]">Users</h2>
            </div>

            <div className="grid gap-3">
              {users.map((user) => (
                <article
                  key={user.id}
                  className="grid gap-4 rounded-[22px] border border-[var(--border)] bg-[var(--muted)] p-4 md:grid-cols-[1fr_auto_auto_auto] md:items-center"
                >
                  <div className="min-w-0">
                    <h3 className="break-words text-sm font-bold">{user.full_name || user.email}</h3>
                    <p className="mt-1 break-words text-xs font-medium text-[var(--muted-foreground)]">{user.email}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <StatusBadge status={user.app_role} tone={user.app_role === "admin" ? "primary" : "neutral"} className="min-h-6 px-2 py-0.5 text-[10px]" />
                      <StatusBadge status={user.is_active ? "Active" : "Inactive"} tone={user.is_active ? "success" : "danger"} className="min-h-6 px-2 py-0.5 text-[10px]" />
                    </div>
                  </div>

                  <form action={adminEnvConfigured ? updateAppUserRole.bind(null, user.id) : undefined} className="flex min-w-0 gap-2">
                    <Select name="app_role" defaultValue={user.app_role} aria-label={`Account type for ${user.email}`} className="min-h-10 rounded-[14px] py-2 text-sm" disabled={!adminEnvConfigured}>
                      <option value="viewer">Viewer</option>
                      <option value="admin">Admin</option>
                    </Select>
                    <Button type="submit" variant="secondary" className="min-h-10 px-3 text-xs" disabled={!adminEnvConfigured}>Save</Button>
                  </form>

                  <form action={adminEnvConfigured ? updateAppUserActive.bind(null, user.id, !user.is_active) : undefined}>
                    <Button
                      type="submit"
                      variant={user.is_active ? "danger" : "secondary"}
                      className="min-h-10 w-full px-3 text-xs md:w-auto"
                      disabled={!adminEnvConfigured || user.id === profile.id}
                    >
                      {user.is_active ? "Deactivate" : "Reactivate"}
                    </Button>
                  </form>

                  <form action={adminEnvConfigured ? deleteAppUser.bind(null, user.id) : undefined}>
                    <Button
                      type="submit"
                      variant="danger"
                      className="min-h-10 w-full gap-2 px-3 text-xs md:w-auto"
                      disabled={!adminEnvConfigured || user.id === profile.id}
                      title={user.id === profile.id ? "You cannot delete your own account." : "Delete user"}
                    >
                      <Trash2 size={15} />
                      Delete user
                    </Button>
                  </form>
                </article>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
      <WorkspaceMobileNav appRole={profile.app_role} />
    </>
  );
}

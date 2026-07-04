import { describe, expect, it, vi } from "vitest";
import { ensureCurrentProfile } from "@/lib/db/profiles";

function user() {
  return {
    id: "user-1",
    email: "OLD@EXAMPLE.COM",
    user_metadata: {
      full_name: "Old User",
      avatar_url: "https://example.com/avatar.png",
    },
  } as unknown as Parameters<typeof ensureCurrentProfile>[1];
}

describe("ensureCurrentProfile", () => {
  it("returns an existing active profile with a normalized app role", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "user-1",
        email: "old@example.com",
        full_name: "Old User",
        avatar_url: null,
        app_role: "admin",
        is_active: true,
        created_at: "2026-06-21T00:00:00Z",
        updated_at: null,
      },
      error: null,
    });
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle })),
        })),
      })),
    } as unknown as Parameters<typeof ensureCurrentProfile>[0];

    await expect(ensureCurrentProfile(supabase, user())).resolves.toMatchObject({
      app_role: "admin",
      is_active: true,
    });
  });

  it("creates a viewer profile when an old auth user has no profile row", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const single = vi.fn().mockResolvedValue({
      data: {
        id: "user-1",
        email: "old@example.com",
        full_name: "Old User",
        avatar_url: "https://example.com/avatar.png",
        app_role: "viewer",
        is_active: true,
        created_at: "2026-06-21T00:00:00Z",
        updated_at: null,
      },
      error: null,
    });
    const insert = vi.fn(() => ({
      select: vi.fn(() => ({ single })),
    }));
    const from = vi.fn()
      .mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle })),
        })),
      })
      .mockReturnValueOnce({ insert });
    const supabase = { from } as unknown as Parameters<typeof ensureCurrentProfile>[0];

    await expect(ensureCurrentProfile(supabase, user())).resolves.toMatchObject({
      app_role: "viewer",
      email: "old@example.com",
      is_active: true,
    });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      id: "user-1",
      email: "old@example.com",
      app_role: "viewer",
      is_active: true,
    }));
  });
});

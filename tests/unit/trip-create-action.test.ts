import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authedAdminClient,
  redirect,
  revalidatePath,
  rpc,
} = vi.hoisted(() => ({
  authedAdminClient: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath,
}));

vi.mock("next/navigation", () => ({
  redirect,
}));

vi.mock("@/lib/actions/helpers", () => ({
  authedAdminClient,
  value: (formData: FormData, key: string, fallback = "") => String(formData.get(key) ?? fallback).trim(),
  nullable: (formData: FormData, key: string) => {
    const text = String(formData.get(key) ?? "").trim();
    return text.length > 0 ? text : null;
  },
}));

import { createTripFromModal } from "@/lib/actions/trips";

function tripFormData(overrides: Record<string, string> = {}) {
  const formData = new FormData();
  formData.set("name", "Guangzhou Trip");
  formData.set("start_date", "2026-06-22");
  formData.set("end_date", "2026-06-29");
  formData.set("country", "China");
  formData.set("city", "Guangzhou");
  formData.set("travelers", " Clarrie \n Julian \n Clarrie ");

  for (const [key, value] of Object.entries(overrides)) {
    formData.set(key, value);
  }

  return formData;
}

describe("create trip action", () => {
  beforeEach(() => {
    authedAdminClient.mockReset();
    redirect.mockReset();
    revalidatePath.mockReset();
    rpc.mockReset();
    authedAdminClient.mockResolvedValue({
      rpc,
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin-user-1" } } }),
      },
    });
    rpc.mockResolvedValue({ data: "trip-1", error: null });
  });

  it("creates China trips through the admin RPC with CNY and trimmed travelers", async () => {
    await expect(createTripFromModal(tripFormData())).resolves.toEqual({ ok: true, tripId: "trip-1" });

    expect(authedAdminClient).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith("create_trip_with_travelers", {
      p_name: "Guangzhou Trip",
      p_start_date: "2026-06-22",
      p_end_date: "2026-06-29",
      p_default_currency: "CNY",
      p_traveler_names: ["Clarrie", "Julian"],
    });
    expect(revalidatePath).toHaveBeenCalledWith("/trips");
  });

  it("rejects invalid date ranges before calling the RPC", async () => {
    await expect(createTripFromModal(tripFormData({
      start_date: "2026-06-29",
      end_date: "2026-06-22",
    }))).resolves.toEqual({
      ok: false,
      error: "Trip end date must be on or after start date.",
    });

    expect(rpc).not.toHaveBeenCalled();
  });

  it("returns safe database errors to the modal without bypassing the RPC boundary", async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: { code: "08006", message: "connection failure" },
    });

    await expect(createTripFromModal(tripFormData())).resolves.toEqual({
      ok: false,
      error: "Something went wrong. Please try again.",
    });
  });

  it("keeps China trips on CNY and reports a migration error when the database has not enabled CNY yet", async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: {
        code: "23514",
        message: 'new row for relation "trips" violates check constraint "trips_currency_check"',
      },
    });

    await expect(createTripFromModal(tripFormData())).resolves.toEqual({
      ok: false,
      error: "This currency is not enabled in the database yet. Apply the latest Supabase migration and try again.",
    });

    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith("create_trip_with_travelers", expect.objectContaining({
      p_default_currency: "CNY",
    }));
  });

  it("reports missing trip creation RPCs instead of writing protected tables directly", async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: {
        code: "PGRST202",
        message: "Could not find the function public.create_trip_with_travelers in the schema cache",
      },
    });

    await expect(createTripFromModal(tripFormData())).resolves.toEqual({
      ok: false,
      error: "The database is missing the latest Supabase migrations. Apply the latest migrations and try again.",
    });

    expect(rpc).toHaveBeenCalledOnce();
  });
});

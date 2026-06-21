import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/011_expense_details.sql", "utf8");
const validationMigration = readFileSync("supabase/migrations/013_trip_mutation_rpcs_and_validation.sql", "utf8");
const actions = readFileSync("src/lib/actions/expenses.ts", "utf8");

describe("expense detail persistence", () => {
  it("adds nullable date, time, and notes without changing original amounts", () => {
    expect(migration).toContain("add column if not exists expense_date date");
    expect(migration).toContain("add column if not exists expense_time time");
    expect(migration).toContain("add column if not exists notes text");
    expect(migration).not.toContain("drop column");
    expect(migration).not.toContain("update public.trip_expenses set total_amount");
  });

  it("extends create and update RPCs with the new metadata", () => {
    expect(migration).toContain("p_expense_date date");
    expect(migration).toContain("p_expense_time time");
    expect(migration).toContain("p_notes text");
    expect(migration).toContain("private.can_edit_trip");
    expect(migration).not.toContain("drop function if exists public.create_expense");
    expect(migration).not.toContain("drop function if exists public.update_expense");
  });

  it("passes selected category and metadata through the existing expense actions", () => {
    expect(actions).toContain('p_category: categorySchema.parse');
    expect(actions).toContain("p_expense_date");
    expect(actions).toContain("p_expense_time");
    expect(actions).toContain("p_notes");
  });

  it("falls back when Supabase has not refreshed the extended RPC signature", () => {
    expect(actions).toContain("isMissingExpenseMetadataRpc");
    expect(actions).toContain("PGRST202");
    expect(actions).toContain("legacyCreateExpenseArgs");
    expect(actions).toContain("legacyUpdateExpenseArgs");
  });

  it("requires positive expense totals in the latest validation migration", () => {
    expect(validationMigration).toContain("drop constraint if exists trip_expenses_total_amount_check");
    expect(validationMigration).toContain("check (total_amount > 0)");
  });
});

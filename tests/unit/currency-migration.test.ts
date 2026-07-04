import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const initialSchema = readFileSync("supabase/migrations/001_schema.sql", "utf8");
const cnyMigration = readFileSync("supabase/migrations/021_add_cny_currency.sql", "utf8");

describe("currency schema migrations", () => {
  it("allows CNY for trips and expenses in fresh schemas", () => {
    expect(initialSchema).toContain("'HKD','CNY'");
    expect(initialSchema).toContain("trips_currency_check");
    expect(initialSchema).toContain("currency text not null check");
  });

  it("replaces existing currency checks before adding CNY", () => {
    expect(cnyMigration).toContain("pg_get_constraintdef(con.oid) ilike '%default_currency%'");
    expect(cnyMigration).toContain("pg_get_constraintdef(con.oid) ilike '%currency%'");
    expect(cnyMigration).toContain("add constraint trips_currency_check");
    expect(cnyMigration).toContain("add constraint trip_expenses_currency_check");
    expect(cnyMigration).toContain("'HKD','CNY'");
  });
});

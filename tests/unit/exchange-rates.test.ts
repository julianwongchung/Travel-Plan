import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseMyrExchangeRateResponse } from "@/lib/utils/exchange-rates";

const serverSource = readFileSync("src/lib/exchange-rates/server.ts", "utf8");

const validResponse = {
  result: "success",
  provider: "https://www.exchangerate-api.com",
  documentation: "https://www.exchangerate-api.com/docs/free",
  terms_of_use: "https://www.exchangerate-api.com/terms",
  time_last_update_unix: 1_718_323_200,
  time_last_update_utc: "Fri, 14 Jun 2024 00:00:00 +0000",
  time_next_update_unix: 1_718_409_600,
  time_next_update_utc: "Sat, 15 Jun 2024 00:00:00 +0000",
  time_eol_unix: 0,
  base_code: "MYR",
  rates: {
    MYR: 1,
    SGD: 0.286,
    USD: 0.212,
    JPY: 33.43,
  },
};

describe("MYR exchange rate responses", () => {
  it("normalizes a valid provider response", () => {
    expect(parseMyrExchangeRateResponse(validResponse)).toEqual({
      rates: validResponse.rates,
      updatedAt: "2024-06-14T00:00:00.000Z",
      attributionUrl: "https://www.exchangerate-api.com",
    });
  });

  it("rejects unsuccessful or non-MYR responses", () => {
    expect(() => parseMyrExchangeRateResponse({ ...validResponse, result: "error" })).toThrow();
    expect(() => parseMyrExchangeRateResponse({ ...validResponse, base_code: "USD" })).toThrow();
  });

  it("rejects missing or nonpositive rates", () => {
    expect(() => parseMyrExchangeRateResponse({ ...validResponse, rates: { SGD: 0.286 } })).toThrow();
    expect(() => parseMyrExchangeRateResponse({ ...validResponse, rates: { MYR: 1, SGD: 0 } })).toThrow();
  });

  it("keeps provider access server-only and cached for one day", () => {
    expect(serverSource).toContain('import "server-only"');
    expect(serverSource).toContain("https://open.er-api.com/v6/latest/MYR");
    expect(serverSource).toContain("unstable_cache");
    expect(serverSource).toContain('cache: "no-store"');
    expect(serverSource).toMatch(/revalidate:\s*86_?400/);
  });
});

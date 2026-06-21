import { describe, expect, it } from "vitest";
import { getCurrencyForCountry } from "@/lib/utils/country-currency";

describe("country currency defaults", () => {
  it("maps common trip countries to their default currencies", () => {
    expect(getCurrencyForCountry("Japan")).toBe("JPY");
    expect(getCurrencyForCountry("Vietnam")).toBe("VND");
    expect(getCurrencyForCountry("Malaysia")).toBe("MYR");
    expect(getCurrencyForCountry("Singapore")).toBe("SGD");
  });

  it("falls back safely for unsupported country values", () => {
    expect(getCurrencyForCountry("")).toBe("MYR");
    expect(getCurrencyForCountry("Atlantis")).toBe("MYR");
  });
});

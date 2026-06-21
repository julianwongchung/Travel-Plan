import type { Currency } from "@/lib/db/types";

export type CountryCurrencyOption = {
  country: string;
  currency: Currency;
};

export const countryCurrencyOptions = [
  { country: "Malaysia", currency: "MYR" },
  { country: "Singapore", currency: "SGD" },
  { country: "Japan", currency: "JPY" },
  { country: "Vietnam", currency: "VND" },
  { country: "Thailand", currency: "THB" },
  { country: "Indonesia", currency: "IDR" },
  { country: "Philippines", currency: "PHP" },
  { country: "South Korea", currency: "KRW" },
  { country: "Taiwan", currency: "TWD" },
  { country: "Hong Kong", currency: "HKD" },
  { country: "United States", currency: "USD" },
] as const satisfies readonly CountryCurrencyOption[];

export type SupportedTripCountry = (typeof countryCurrencyOptions)[number]["country"];

export function getCurrencyForCountry(country: string): Currency {
  return countryCurrencyOptions.find((option) => option.country === country)?.currency ?? "MYR";
}

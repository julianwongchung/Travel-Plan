import { z } from "zod";

export const EXCHANGE_RATE_ATTRIBUTION_URL = "https://www.exchangerate-api.com";

export type MyrExchangeRates = {
  rates: Record<string, number>;
  updatedAt: string;
  attributionUrl: string;
};

const exchangeRateResponseSchema = z.object({
  result: z.literal("success"),
  base_code: z.literal("MYR"),
  time_last_update_unix: z.number().int().positive(),
  rates: z.record(z.string(), z.number().positive()),
}).refine((response) => response.rates.MYR === 1, {
  message: "MYR base rate must equal 1",
  path: ["rates", "MYR"],
});

export function parseMyrExchangeRateResponse(value: unknown): MyrExchangeRates {
  const response = exchangeRateResponseSchema.parse(value);

  return {
    rates: response.rates,
    updatedAt: new Date(response.time_last_update_unix * 1000).toISOString(),
    attributionUrl: EXCHANGE_RATE_ATTRIBUTION_URL,
  };
}

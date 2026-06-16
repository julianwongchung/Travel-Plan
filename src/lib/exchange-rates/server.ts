import "server-only";

import { unstable_cache } from "next/cache";
import {
  EXCHANGE_RATE_ATTRIBUTION_URL,
  parseMyrExchangeRateResponse,
  type MyrExchangeRates,
} from "@/lib/utils/exchange-rates";

const MYR_EXCHANGE_RATE_URL = "https://open.er-api.com/v6/latest/MYR";

export type MyrExchangeRateResult =
  | ({ available: true } & MyrExchangeRates)
  | {
      available: false;
      rates: null;
      updatedAt: null;
      attributionUrl: string;
    };

const getCachedMyrExchangeRates = unstable_cache(
  async () => {
    const response = await fetch(MYR_EXCHANGE_RATE_URL, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Exchange rate request failed with status ${response.status}`);
    }

    return parseMyrExchangeRateResponse(await response.json());
  },
  ["myr-exchange-rates"],
  { revalidate: 86_400 },
);

export async function getMyrExchangeRates(): Promise<MyrExchangeRateResult> {
  try {
    return {
      available: true,
      ...await getCachedMyrExchangeRates(),
    };
  } catch {
    return {
      available: false,
      rates: null,
      updatedAt: null,
      attributionUrl: EXCHANGE_RATE_ATTRIBUTION_URL,
    };
  }
}

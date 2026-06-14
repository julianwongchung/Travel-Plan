# Expense MYR Estimate Design

## Goal

Update the Expense page so it keeps every expense in its original currency and amount while showing a prominent estimated total converted to Malaysian ringgit (MYR).

## Scope

This change affects only Expense page calculations, server-side exchange-rate fetching, presentation, and tests.

It does not change:

- Existing expense records
- Expense creation or split behavior
- Supabase schema, RLS, or RPC functions
- Authentication or trip access
- Original expense currencies or amounts

## Exchange Rate Provider

Use the ExchangeRate-API open access endpoint:

```txt
https://open.er-api.com/v6/latest/MYR
```

The endpoint:

- Requires no API key
- Updates once per day
- Permits caching
- Returns the source update time
- Supports every currency currently allowed by Travel OS
- Requires attribution on the page that displays its rates

The application will fetch rates only from server code. No provider URL or request logic is needed in a Client Component.

## Architecture

### Exchange Rate Service

Add a server-only exchange-rate module that:

1. Fetches the latest MYR-based rate table.
2. Validates the provider response before exposing it to the page.
3. Uses Next.js fetch caching with a 24-hour revalidation interval.
4. Returns a small normalized result containing:
   - MYR-based rates
   - Provider update timestamp
   - Provider attribution URL
5. Returns an unavailable result when no valid current or cached response can be read.

The provider reports how many units of each foreign currency equal one MYR. Therefore, conversion from a source currency into MYR is:

```txt
MYR amount = original amount / rate[source currency]
```

MYR itself always has a rate of `1`.

### Calculation Utility

Extend the expense calculation utility with pure functions that:

- Group original totals by currency.
- Convert each expense independently into MYR.
- Sum converted values.
- Round the final total to two decimal places.
- Return an unavailable result if any expense currency has no valid rate.

The conversion must not silently omit unsupported or missing currencies because a partial total would be misleading.

### Expense Page

The existing Expense page remains a Server Component. It loads expense data and exchange rates concurrently, then renders a summary card before the traveler summary and expense form.

The Expense page must continue rendering normally if the provider fails.

## Cache And Failure Behavior

Use a 24-hour Next.js fetch cache because the selected provider updates once per day.

Expected behavior:

1. Within 24 hours, requests reuse the cached response.
2. After 24 hours, Next.js attempts to revalidate the provider response.
3. The server service uses Next.js's persistent Data Cache so the last successful response remains the cached value when a later revalidation attempt fails.
4. If no valid response is available, the page shows:

```txt
MYR estimate unavailable. Please check exchange rate.
```

The Expense page, original currency totals, expense history, and mutation controls remain usable during an exchange-rate failure.

## UI Design

Place a prominent Liquid Glass summary card at the top of the Expense page.

The card contains:

- Heading: `Total Expenses`
- Original grouped totals, such as `SGD 200.00` and `JPY 15,000`
- Prominent value: `Estimated in MYR: RM 1,234.56`
- Supporting text: `Estimated using rates updated <formatted time>`
- Discreet link: `Rates by Exchange Rate API`

When the estimate is unavailable, replace the MYR amount and update time with the warning state.

Formatting rules:

- MYR estimate always uses two decimal places.
- Original totals use locale-aware grouping.
- Zero-decimal currencies may display without forced decimal places where appropriate, while currencies with fractional amounts retain up to two decimal places.
- The estimate is clearly labeled as approximate and is never presented as a stored accounting value.

Responsive behavior:

- Mobile stacks the MYR estimate and original totals within one full-width card.
- Desktop uses a balanced internal grid while keeping the MYR estimate visually dominant.
- Existing Liquid Glass surfaces, color tokens, rounded corners, dark mode, reduced transparency, and touch target rules remain intact.

## Data Integrity And Security

- No database field is added for converted amounts.
- No expense record is updated by the conversion feature.
- No service-role key or provider key is introduced.
- The provider call does not include user, trip, or expense data.
- Existing Supabase membership and RLS behavior remains unchanged.

## Testing

Add Vitest coverage for:

- Mixed currencies converted and summed into MYR.
- MYR expenses using a rate of `1`.
- Final MYR rounding to two decimal places.
- Missing or invalid required rates producing an unavailable estimate.
- Exchange-rate provider response validation.
- Original grouped totals remaining independent from conversion.
- Summary-card success, empty, and unavailable states.

Keep the existing responsive Expense page contract tests passing. Add direct summary-card component tests for success, empty, and unavailable states, plus a page contract test that keeps the summary before the expense form.

## Acceptance Criteria

- Every non-deleted expense contributes to the MYR estimate when its rate is available.
- Multiple source currencies are converted separately and summed.
- The estimate always displays in MYR with two decimal places.
- Original expense currencies and amounts remain visible and unchanged.
- The rate update time is shown when available.
- Provider failures do not crash or block the Expense page.
- A clear warning appears when no usable rates exist.
- Provider requests are server-side and cached for 24 hours.
- Mobile and desktop retain the Travel OS Liquid Glass visual style.
- No migration, RLS update, or RPC update is required.

## Assumptions

- Daily reference rates are acceptable for an explicitly estimated trip total.
- The application continues to support the currencies currently defined in `Currency`.
- The deployment supports Next.js's persistent Data Cache. When no successful cached response exists, the explicit unavailable state is used.

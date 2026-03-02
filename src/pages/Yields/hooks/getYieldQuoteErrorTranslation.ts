import type { AxiosError } from "axios";
import { isAxiosError } from "axios";

type StakeKitErrorResponse = {
  message?: string;
  error?: string;
  code?: string;
};

type QuoteErrorTranslation = {
  key: string;
  params?: Record<string, string>;
};

// Known token symbols to extract from error messages
const TOKEN_SYMBOLS = [
  "SOL",
  "ETH",
  "BNB",
  "AVAX",
  "MATIC",
  "FTM",
  "ATOM",
  "OSMO",
  "ADA",
  "DOT",
  "NEAR",
  "SUI",
  "APT",
  "SEI",
  "INJ",
  "TIA",
  "DYDX",
  "RUNE",
  "BTC",
  "USDT",
  "USDC",
  "DAI",
  "WETH",
  "ARB",
  "OP",
  "BASE",
  "MNT",
  "CELO",
];

/**
 * Extracts a token symbol from a StakeKit error message.
 * E.g. "Insufficient SOL for account creation" → "SOL"
 */
const extractSymbolFromError = (message: string): string | undefined => {
  const upper = message.toUpperCase();
  // Sort by length descending to match longer symbols first (e.g. "DYDX" before "DY")
  const sortedSymbols = [...TOKEN_SYMBOLS].sort((a, b) => b.length - a.length);

  // Match "Insufficient <SYMBOL>" pattern
  const insufficientMatch = upper.match(/INSUFFICIENT\s+(\w+)/);
  if (insufficientMatch) {
    const candidate = insufficientMatch[1];
    if (TOKEN_SYMBOLS.includes(candidate)) return candidate;
  }
  // Match concatenated API error names, e.g. "DriftLendingInsufficientSolForRentError"
  const concatenatedMatch = sortedSymbols.find((sym) =>
    upper.includes(`INSUFFICIENT${sym}`),
  );
  if (concatenatedMatch) return concatenatedMatch;

  // Match any known token symbol in the message
  return sortedSymbols.find((sym) => new RegExp(`\\b${sym}\\b`).test(upper));
};

/**
 * Maps StakeKit API quote errors to short, human-readable button text.
 * Follows the same pattern as getQuoteErrorTranslation in trade.
 *
 * Returns a translation key + optional params for interpolation.
 */
export const getYieldQuoteErrorTranslation = (
  error: unknown,
): QuoteErrorTranslation => {
  const axiosError: AxiosError<StakeKitErrorResponse> | undefined =
    isAxiosError(error) ? error : undefined;
  const data = axiosError?.response?.data;
  const message = data?.message ?? data?.error ?? "";
  const errorMessage = error instanceof Error ? error.message : "";
  const combined = `${message} ${errorMessage}`;
  const combinedLower = combined.toLowerCase();

  // Insufficient funds / balance / gas / rent patterns — extract the asset symbol
  if (combinedLower.includes("insufficient")) {
    const symbol = extractSymbolFromError(combined);
    if (symbol) {
      return {
        key: "yieldXYZ.errors.insufficientAssetForGas",
        params: { symbol },
      };
    }
    return { key: "common.insufficientFunds" };
  }

  // Minimum stake / deposit / amount not met
  const isBelowMinimum =
    combinedLower.includes("below minimum") ||
    (combinedLower.includes("minimum") &&
      (combinedLower.includes("stake") ||
        combinedLower.includes("deposit") ||
        combinedLower.includes("amount")));

  if (isBelowMinimum) {
    return { key: "earn.belowMinimum" };
  }

  // Network / chain not supported
  if (
    combinedLower.includes("unsupported") ||
    combinedLower.includes("not supported")
  ) {
    return { key: "yieldXYZ.errors.unsupportedNetworkTitle" };
  }

  // Rate limit / too many requests
  if (
    combinedLower.includes("rate limit") ||
    combinedLower.includes("too many")
  ) {
    return { key: "yieldXYZ.errors.rateLimited" };
  }

  // Generic fallback
  return { key: "yieldXYZ.errors.quoteFailedTitle" };
};

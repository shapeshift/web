import { useQuery } from "@tanstack/react-query";
import type { ApiClient } from "../api/client";
import type { AssetId, QuoteResponse, SwapperName } from "../types";

export type UseSwapQuoteParams = {
  sellAssetId: AssetId | undefined;
  buyAssetId: AssetId | undefined;
  sellAmountCryptoBaseUnit: string | undefined;
  receiveAddress: string | undefined;
  swapperName: SwapperName | undefined;
  slippageTolerancePercentageDecimal?: string;
  enabled?: boolean;
};

export const useSwapQuote = (
  apiClient: ApiClient,
  params: UseSwapQuoteParams,
) => {
  const {
    sellAssetId,
    buyAssetId,
    sellAmountCryptoBaseUnit,
    receiveAddress,
    swapperName,
    slippageTolerancePercentageDecimal,
    enabled = true,
  } = params;

  return useQuery({
    queryKey: [
      "swapQuote",
      sellAssetId,
      buyAssetId,
      sellAmountCryptoBaseUnit,
      receiveAddress,
      swapperName,
    ],
    queryFn: async (): Promise<QuoteResponse | null> => {
      if (
        !sellAssetId ||
        !buyAssetId ||
        !sellAmountCryptoBaseUnit ||
        !receiveAddress ||
        !swapperName
      ) {
        return null;
      }
      return apiClient.getQuote({
        sellAssetId,
        buyAssetId,
        sellAmountCryptoBaseUnit,
        receiveAddress,
        swapperName,
        slippageTolerancePercentageDecimal,
      });
    },
    enabled:
      enabled &&
      !!sellAssetId &&
      !!buyAssetId &&
      !!sellAmountCryptoBaseUnit &&
      !!receiveAddress &&
      !!swapperName,
    staleTime: 30_000,
  });
};

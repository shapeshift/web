import { useQuery } from "@tanstack/react-query";
import type { ApiClient } from "../api/client";
import type { AssetId, TradeRate } from "../types";

export type UseSwapRatesParams = {
  sellAssetId: AssetId | undefined;
  buyAssetId: AssetId | undefined;
  sellAmountCryptoBaseUnit: string | undefined;
  enabled?: boolean;
};

export const useSwapRates = (
  apiClient: ApiClient,
  params: UseSwapRatesParams,
) => {
  const {
    sellAssetId,
    buyAssetId,
    sellAmountCryptoBaseUnit,
    enabled = true,
  } = params;

  return useQuery({
    queryKey: ["swapRates", sellAssetId, buyAssetId, sellAmountCryptoBaseUnit],
    queryFn: async (): Promise<TradeRate[]> => {
      if (!sellAssetId || !buyAssetId || !sellAmountCryptoBaseUnit) {
        return [];
      }
      const response = await apiClient.getRates({
        sellAssetId,
        buyAssetId,
        sellAmountCryptoBaseUnit,
      });

      return response.rates
        .filter((rate) => !rate.error && rate.buyAmountCryptoBaseUnit !== "0")
        .map((rate, index) => ({
          ...rate,
          id: rate.id ?? `${rate.swapperName}-${index}`,
        }))
        .sort((a, b) => {
          const aAmount = parseFloat(a.buyAmountCryptoBaseUnit);
          const bAmount = parseFloat(b.buyAmountCryptoBaseUnit);
          return bAmount - aAmount;
        });
    },
    enabled:
      enabled && !!sellAssetId && !!buyAssetId && !!sellAmountCryptoBaseUnit,
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
};

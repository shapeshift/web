import { useQuery } from "@tanstack/react-query";
import { adapters } from "@shapeshiftoss/caip";
import type { AssetId } from "../types";

const MARKET_DATA_STALE_TIME = 5 * 60 * 1000;
const COINGECKO_API_URL = "https://api.coingecko.com/api/v3";

type MarketData = {
  price: string;
  marketCap: string;
  volume: string;
  changePercent24Hr: number;
};

export type MarketDataById = Record<AssetId, MarketData>;

type CoinGeckoMarketCap = {
  id: string;
  symbol: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  price_change_percentage_24h: number;
};

const fetchAllMarketData = async (): Promise<MarketDataById> => {
  const result: MarketDataById = {};
  const maxPerPage = 250;
  const totalPages = 4;

  try {
    const allData = await Promise.all(
      Array.from({ length: totalPages }, (_, i) => i + 1).map(async (page) => {
        const response = await fetch(
          `${COINGECKO_API_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${maxPerPage}&page=${page}&sparkline=false`,
        );
        if (!response.ok) return [];
        return response.json() as Promise<CoinGeckoMarketCap[]>;
      }),
    );

    const flatData = allData.flat();

    for (const asset of flatData) {
      const assetIds = adapters.coingeckoToAssetIds(asset.id);
      if (!assetIds?.length) continue;

      const marketData: MarketData = {
        price: asset.current_price?.toString() ?? "0",
        marketCap: asset.market_cap?.toString() ?? "0",
        volume: asset.total_volume?.toString() ?? "0",
        changePercent24Hr: asset.price_change_percentage_24h ?? 0,
      };

      for (const assetId of assetIds) {
        result[assetId] = marketData;
      }
    }
  } catch (error) {
    console.error("Failed to fetch market data:", error);
  }

  return result;
};

export const useAllMarketData = () => {
  return useQuery({
    queryKey: ["allMarketData"],
    queryFn: fetchAllMarketData,
    staleTime: MARKET_DATA_STALE_TIME,
    gcTime: 30 * 60 * 1000,
  });
};

export const useMarketData = (assetIds: AssetId[]) => {
  const { data: allMarketData, ...rest } = useAllMarketData();

  const filteredData = (() => {
    if (!allMarketData) return {};

    const result: MarketDataById = {};
    for (const assetId of assetIds) {
      if (allMarketData[assetId]) {
        result[assetId] = allMarketData[assetId];
      }
    }
    return result;
  })();

  return { data: filteredData, ...rest };
};

export const useAssetPrice = (assetId: AssetId | undefined) => {
  const { data: allMarketData, ...rest } = useAllMarketData();

  return {
    data: assetId ? allMarketData?.[assetId]?.price : undefined,
    ...rest,
  };
};

export const formatUsdValue = (
  cryptoAmount: string,
  precision: number,
  usdPrice: string | undefined,
): string => {
  if (!usdPrice || usdPrice === "0") return "$0.00";

  const amount = Number(cryptoAmount) / Math.pow(10, precision);
  const usdValue = amount * Number(usdPrice);

  if (usdValue < 0.01) return "< $0.01";
  if (usdValue < 1000) return `$${usdValue.toFixed(2)}`;
  if (usdValue < 1000000) return `$${(usdValue / 1000).toFixed(2)}K`;
  return `$${(usdValue / 1000000).toFixed(2)}M`;
};

export type { MarketData };

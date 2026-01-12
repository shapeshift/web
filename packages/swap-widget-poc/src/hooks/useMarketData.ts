import { useQuery } from "@tanstack/react-query";
import type { AssetId } from "../types";

const MARKET_DATA_STALE_TIME = 10 * 60 * 1000;
const MARKET_DATA_GC_TIME = 60 * 60 * 1000;

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

const COINGECKO_PROXY_URL = "https://api.proxy.shapeshift.com/api/v1/markets";
const COINGECKO_DIRECT_URL = "https://api.coingecko.com/api/v3";

const SYMBOL_TO_COINGECKO_ID: Record<string, string> = {
  ETH: "ethereum",
  BTC: "bitcoin",
  USDC: "usd-coin",
  USDT: "tether",
  DAI: "dai",
  WETH: "weth",
  WBTC: "wrapped-bitcoin",
  MATIC: "matic-network",
  POL: "matic-network",
  AVAX: "avalanche-2",
  BNB: "binancecoin",
  ARB: "arbitrum",
  OP: "optimism",
  SOL: "solana",
  ATOM: "cosmos",
  RUNE: "thorchain",
  FOX: "shapeshift-fox-token",
  LINK: "chainlink",
  UNI: "uniswap",
  AAVE: "aave",
  CRV: "curve-dao-token",
  LDO: "lido-dao",
  MKR: "maker",
  SNX: "havven",
  COMP: "compound-governance-token",
  GRT: "the-graph",
  ENS: "ethereum-name-service",
  SHIB: "shiba-inu",
  PEPE: "pepe",
  APE: "apecoin",
  DOGE: "dogecoin",
  LTC: "litecoin",
  BCH: "bitcoin-cash",
  XRP: "ripple",
  ADA: "cardano",
  DOT: "polkadot",
  TRX: "tron",
  NEAR: "near",
  FTM: "fantom",
  GNO: "gnosis",
  XDAI: "xdai",
};

const fetchWithRetry = async (
  url: string,
  retries = 2,
  delay = 1000,
): Promise<Response> => {
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
      if (response.status === 429 && i < retries) {
        await new Promise((r) => setTimeout(r, delay * (i + 1)));
        continue;
      }
      return response;
    } catch (error) {
      if (i === retries) throw error;
      await new Promise((r) => setTimeout(r, delay * (i + 1)));
    }
  }
  throw new Error("Failed after retries");
};

const fetchMarketsPage = async (
  baseUrl: string,
  page: number,
  perPage: number,
): Promise<CoinGeckoMarketCap[]> => {
  const url = `${baseUrl}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=${page}&sparkline=false`;
  const response = await fetchWithRetry(url);
  if (!response.ok) return [];
  return response.json();
};

const fetchAllMarketData = async (): Promise<MarketDataById> => {
  const result: MarketDataById = {};
  const perPage = 250;
  const totalPages = 2;

  let baseUrl = COINGECKO_PROXY_URL;

  const testResponse = await fetch(
    `${COINGECKO_PROXY_URL}/coins/markets?vs_currency=usd&per_page=1&page=1`,
  ).catch(() => null);

  if (!testResponse?.ok) {
    baseUrl = COINGECKO_DIRECT_URL;
  }

  try {
    const allData: CoinGeckoMarketCap[] = [];

    for (let page = 1; page <= totalPages; page++) {
      const pageData = await fetchMarketsPage(baseUrl, page, perPage);
      allData.push(...pageData);

      if (page < totalPages) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    const coingeckoIdToMarketData = new Map<string, MarketData>();
    for (const asset of allData) {
      coingeckoIdToMarketData.set(asset.id, {
        price: asset.current_price?.toString() ?? "0",
        marketCap: asset.market_cap?.toString() ?? "0",
        volume: asset.total_volume?.toString() ?? "0",
        changePercent24Hr: asset.price_change_percentage_24h ?? 0,
      });
    }

    for (const [symbol, coingeckoId] of Object.entries(
      SYMBOL_TO_COINGECKO_ID,
    )) {
      const marketData = coingeckoIdToMarketData.get(coingeckoId);
      if (marketData) {
        result[`symbol:${symbol.toLowerCase()}`] = marketData;
      }
    }

    for (const asset of allData) {
      result[`coingecko:${asset.id}`] = {
        price: asset.current_price?.toString() ?? "0",
        marketCap: asset.market_cap?.toString() ?? "0",
        volume: asset.total_volume?.toString() ?? "0",
        changePercent24Hr: asset.price_change_percentage_24h ?? 0,
      };
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
    gcTime: MARKET_DATA_GC_TIME,
    retry: 1,
    retryDelay: 5000,
  });
};

export const useMarketData = (
  assetIds: AssetId[],
  symbols?: Record<AssetId, string>,
) => {
  const { data: allMarketData, ...rest } = useAllMarketData();

  const filteredData = (() => {
    if (!allMarketData) return {};

    const result: MarketDataById = {};
    for (const assetId of assetIds) {
      const symbol = symbols?.[assetId];
      if (symbol) {
        const symbolKey = `symbol:${symbol.toLowerCase()}`;
        if (allMarketData[symbolKey]) {
          result[assetId] = allMarketData[symbolKey];
          continue;
        }
      }
      if (allMarketData[assetId]) {
        result[assetId] = allMarketData[assetId];
      }
    }
    return result;
  })();

  return { data: filteredData, ...rest };
};

export const useAssetPrice = (
  assetId: AssetId | undefined,
  symbol?: string,
) => {
  const { data: allMarketData, ...rest } = useAllMarketData();

  const price = (() => {
    if (!assetId || !allMarketData) return undefined;
    if (symbol) {
      const symbolKey = `symbol:${symbol.toLowerCase()}`;
      if (allMarketData[symbolKey]) {
        return allMarketData[symbolKey].price;
      }
    }
    return allMarketData[assetId]?.price;
  })();

  return { data: price, ...rest };
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

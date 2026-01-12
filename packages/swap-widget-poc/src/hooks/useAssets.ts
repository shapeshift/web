import { useQuery } from "@tanstack/react-query";
import type { Asset, AssetId, ChainId } from "../types";

const SHAPESHIFT_ASSET_CDN = "https://app.shapeshift.com";
const ASSET_QUERY_STALE_TIME = 5 * 60 * 1000;

type AssetManifest = {
  assetData: string;
  relatedAssetIndex: string;
};

type RawAssetData = {
  byId: Record<AssetId, Asset>;
  ids: AssetId[];
};

const fetchAssetManifest = async (): Promise<AssetManifest> => {
  const response = await fetch(
    `${SHAPESHIFT_ASSET_CDN}/generated/asset-manifest.json`,
  );
  if (!response.ok) {
    return { assetData: Date.now().toString(), relatedAssetIndex: "" };
  }
  return response.json();
};

const fetchAssetData = async (): Promise<RawAssetData> => {
  const manifest = await fetchAssetManifest();
  const response = await fetch(
    `${SHAPESHIFT_ASSET_CDN}/generated/generatedAssetData.json?v=${manifest.assetData}`,
  );

  if (!response.ok) {
    throw new Error("Failed to fetch asset data");
  }

  return response.json();
};

export const useAssetData = () => {
  return useQuery({
    queryKey: ["assetData"],
    queryFn: fetchAssetData,
    staleTime: ASSET_QUERY_STALE_TIME,
    gcTime: 30 * 60 * 1000,
  });
};

export const useAssets = () => {
  const { data, ...rest } = useAssetData();

  const assets = data
    ? data.ids.map((id) => data.byId[id]).filter(Boolean)
    : [];

  return { data: assets, ...rest };
};

export const useAssetsById = () => {
  const { data, ...rest } = useAssetData();
  return { data: data?.byId ?? {}, ...rest };
};

export const useAssetById = (assetId: AssetId | undefined) => {
  const { data: assetsById, ...rest } = useAssetsById();
  return {
    data: assetId ? assetsById[assetId] : undefined,
    ...rest,
  };
};

export type ChainInfo = {
  chainId: ChainId;
  name: string;
  icon?: string;
  color?: string;
  nativeAsset: Asset;
};

export const useChains = () => {
  const { data: assets, ...rest } = useAssets();

  const chains = (() => {
    if (!assets.length) return [];

    const chainMap = new Map<ChainId, ChainInfo>();

    for (const asset of assets) {
      if (chainMap.has(asset.chainId)) continue;

      const isNativeAsset =
        asset.assetId.includes("/slip44:") || asset.assetId.endsWith("/native");

      if (isNativeAsset) {
        chainMap.set(asset.chainId, {
          chainId: asset.chainId,
          name: asset.networkName ?? asset.name,
          icon:
            (asset as Asset & { networkIcon?: string }).networkIcon ??
            asset.icon,
          color:
            (asset as Asset & { networkColor?: string }).networkColor ??
            asset.color,
          nativeAsset: asset,
        });
      }
    }

    return Array.from(chainMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  })();

  return { data: chains, ...rest };
};

export const useChainInfo = (chainId: ChainId | undefined) => {
  const { data: chains, ...rest } = useChains();
  const chainInfo = chainId
    ? chains.find((c) => c.chainId === chainId)
    : undefined;
  return { data: chainInfo, ...rest };
};

export const useAssetsByChainId = (chainId: ChainId | undefined) => {
  const { data: assets, ...rest } = useAssets();

  const filteredAssets = chainId
    ? assets.filter((asset) => asset.chainId === chainId)
    : assets;

  return { data: filteredAssets, ...rest };
};

const isNativeAsset = (assetId: string): boolean => {
  return assetId.includes("/slip44:") || assetId.endsWith("/native");
};

const scoreAsset = (asset: Asset, query: string): number => {
  const lowerQuery = query.toLowerCase();
  const symbolLower = asset.symbol.toLowerCase();
  const nameLower = asset.name.toLowerCase();

  let score = 0;

  if (symbolLower === lowerQuery) score += 1000;
  else if (symbolLower.startsWith(lowerQuery)) score += 500;
  else if (symbolLower.includes(lowerQuery)) score += 100;

  if (nameLower === lowerQuery) score += 800;
  else if (nameLower.startsWith(lowerQuery)) score += 300;
  else if (nameLower.includes(lowerQuery)) score += 50;

  if (isNativeAsset(asset.assetId)) score += 200;

  return score;
};

export const useAssetSearch = (query: string, chainId?: ChainId) => {
  const { data: assets, ...rest } = useAssets();

  const searchResults = (() => {
    let filtered = chainId
      ? assets.filter((a) => a.chainId === chainId)
      : assets;

    if (!query.trim()) {
      const natives = filtered.filter((a) => isNativeAsset(a.assetId));
      const others = filtered
        .filter((a) => !isNativeAsset(a.assetId))
        .slice(0, 50 - natives.length);
      return [...natives, ...others];
    }

    const lowerQuery = query.toLowerCase();

    const matched = filtered
      .filter((asset) => {
        return (
          asset.symbol.toLowerCase().includes(lowerQuery) ||
          asset.name.toLowerCase().includes(lowerQuery) ||
          asset.assetId.toLowerCase().includes(lowerQuery)
        );
      })
      .map((asset) => ({ asset, score: scoreAsset(asset, query) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 100)
      .map((item) => item.asset);

    return matched;
  })();

  return { data: searchResults, ...rest };
};

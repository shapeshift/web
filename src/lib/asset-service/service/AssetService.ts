import type { AssetId } from "@shapeshiftoss/caip";
import {
  adapters,
  arbitrumChainId,
  arbitrumNovaChainId,
  baseChainId,
  bscChainId,
  gnosisChainId,
  hyperEvmChainId,
  mayachainChainId,
  megaethChainId,
  monadChainId,
  optimismChainId,
  polygonChainId,
  solanaChainId,
  starknetChainId,
  suiChainId,
  tronChainId,
  zecChainId,
} from "@shapeshiftoss/caip";
import type { Asset, AssetsById } from "@shapeshiftoss/types";
import { getBaseAsset } from "@shapeshiftoss/utils";
import axios from "axios";
import Polyglot from "node-polyglot";

import { descriptions } from "./descriptions";

import { getConfig } from "@/config";

type DescriptionData = Readonly<{ description: string; isTrusted?: boolean }>;

// Don't export me, access me through the getter because instantiation is extremely expensive
class _AssetService {
  private _assetsById: AssetsById = {};
  private _relatedAssetIndex: Record<AssetId, AssetId[]> = {};
  private _assetIds: AssetId[] = [];
  private _assets: Asset[] = [];
  private initialized = false;

  get assetsById() {
    return this._assetsById;
  }
  get relatedAssetIndex() {
    return this._relatedAssetIndex;
  }
  get assetIds() {
    return this._assetIds;
  }
  get assets() {
    return this._assets;
  }

  async init(): Promise<void> {
    if (this.initialized) return; // Already initialized

    const [assetDataJson, relatedAssetIndex] = await (async () => {
      if (typeof window === "undefined") {
        // Node.js environment (generation scripts)
        const fs = await import("fs");
        const path = await import("path");
        const assetDataPath = path.join(
          process.cwd(),
          "public/generated/generatedAssetData.json",
        );
        const relatedAssetIndexPath = path.join(
          process.cwd(),
          "public/generated/relatedAssetIndex.json",
        );
        return Promise.all([
          JSON.parse(fs.readFileSync(assetDataPath, "utf8")),
          JSON.parse(fs.readFileSync(relatedAssetIndexPath, "utf8")),
        ]);
      } else {
        // Browser environment - fetch with cache-busting hash
        const manifest = await (async () => {
          try {
            const { data } = await axios.get<{
              assetData: string;
              relatedAssetIndex: string;
            }>("/generated/asset-manifest.json");
            return data;
          } catch {
            console.warn(
              "asset-manifest.json not found, using timestamp for cache busting",
            );
            return {
              assetData: Date.now().toString(),
              relatedAssetIndex: Date.now().toString(),
            };
          }
        })();

        const [{ data: assetData }, { data: relatedData }] = await Promise.all([
          axios.get(
            `/generated/generatedAssetData.json?v=${manifest.assetData}`,
          ),
          axios.get(
            `/generated/relatedAssetIndex.json?v=${manifest.relatedAssetIndex}`,
          ),
        ]);

        return [assetData, relatedData];
      }
    })();

    const localAssetData = assetDataJson.byId;
    const sortedAssetIds = assetDataJson.ids;

    // Compute isPrimary and isChainSpecific for each asset
    Object.values(localAssetData).forEach((asset) => {
      if (asset) {
        const assetTyped = asset as Asset;
        assetTyped.isPrimary =
          assetTyped.relatedAssetKey === null ||
          assetTyped.relatedAssetKey === assetTyped.assetId;
        assetTyped.isChainSpecific = assetTyped.relatedAssetKey === null;
      }
    });

    const config = getConfig();

    // Filter asset data while preserving sorting
    const filteredAssetIds = sortedAssetIds.filter((assetId: AssetId) => {
      const asset = localAssetData[assetId];
      if (!config.VITE_FEATURE_OPTIMISM && asset.chainId === optimismChainId)
        return false;
      if (!config.VITE_FEATURE_BNBSMARTCHAIN && asset.chainId === bscChainId)
        return false;
      if (!config.VITE_FEATURE_POLYGON && asset.chainId === polygonChainId)
        return false;
      if (!config.VITE_FEATURE_GNOSIS && asset.chainId === gnosisChainId)
        return false;
      if (!config.VITE_FEATURE_ARBITRUM && asset.chainId === arbitrumChainId)
        return false;
      if (
        !config.VITE_FEATURE_ARBITRUM_NOVA &&
        asset.chainId === arbitrumNovaChainId
      )
        return false;
      if (!config.VITE_FEATURE_BASE && asset.chainId === baseChainId)
        return false;
      if (!config.VITE_FEATURE_SOLANA && asset.chainId === solanaChainId)
        return false;
      if (!config.VITE_FEATURE_SUI && asset.chainId === suiChainId)
        return false;
      if (!config.VITE_FEATURE_TRON && asset.chainId === tronChainId)
        return false;
      if (!config.VITE_FEATURE_MONAD && asset.chainId === monadChainId)
        return false;
      if (!config.VITE_FEATURE_HYPEREVM && asset.chainId === hyperEvmChainId)
        return false;
      if (!config.VITE_FEATURE_MEGAETH && asset.chainId === megaethChainId)
        return false;
      if (!config.VITE_FEATURE_MAYACHAIN && asset.chainId === mayachainChainId)
        return false;
      if (!config.VITE_FEATURE_ZCASH && asset.chainId === zecChainId)
        return false;
      if (!config.VITE_FEATURE_STARKNET && asset.chainId === starknetChainId)
        return false;
      return true;
    });

    // Enrich assets with chain-level data (networkName, explorer URLs)
    const enrichedAssetsById = Object.fromEntries(
      filteredAssetIds.map((assetId: AssetId) => {
        const asset = localAssetData[assetId];
        const baseAsset = getBaseAsset(asset.chainId);
        return [
          assetId,
          {
            ...asset,
            networkName: baseAsset.networkName,
            explorer: baseAsset.explorer,
            explorerAddressLink: baseAsset.explorerAddressLink,
            explorerTxLink: baseAsset.explorerTxLink,
          },
        ];
      }),
    );

    // Assign to private properties
    this._assetIds = filteredAssetIds;
    this._assets = filteredAssetIds.map(
      (assetId: AssetId) => enrichedAssetsById[assetId],
    );
    this._assetsById = enrichedAssetsById;
    this._relatedAssetIndex = relatedAssetIndex;

    this.initialized = true;
  }

  getRelatedAssetIds(assetId: AssetId): AssetId[] {
    const { relatedAssetKey } = this.assetsById[assetId] ?? {};
    return this.relatedAssetIndex[relatedAssetKey ?? ""] ?? [];
  }

  async description(assetId: AssetId, locale = "en"): Promise<DescriptionData> {
    const localeDescriptions = descriptions[locale];
    // Return overridden asset description if it exists and add isTrusted for description links
    if (localeDescriptions[assetId] || descriptions.en[assetId]) {
      const polyglot = new Polyglot({
        phrases: localeDescriptions,
        allowMissing: true,
        onMissingKey: (key) => descriptions.en[key], // fallback to English overridden description, which should always be added as a base translation
      });
      const overriddenDescription = polyglot.t(assetId);

      return { description: overriddenDescription, isTrusted: true };
    }

    try {
      type CoinData = { description: { [locale: string]: string } };

      const url = adapters.makeCoingeckoAssetUrl(assetId);
      if (!url) throw new Error();

      const { data } = await axios.get<CoinData>(url);

      if (!data?.description) return { description: "" };

      const description =
        (data.description[locale] || data.description.en) ?? "";

      return { description };
    } catch (e) {
      const errorMessage = `AssetService:description: no description available for ${assetId}`;
      throw new Error(errorMessage);
    }
  }
}

// Export the public interface of the AssetService class while keeping the implementation private
export type AssetService = _AssetService;

// Don't export me, access me through the getter
let _assetService: AssetService | undefined = undefined;

// Initialize asset service - call once at app bootstrap
export const initAssetService = async (): Promise<void> => {
  if (!_assetService) {
    _assetService = new _AssetService();
    await _assetService.init();
  }
};

// Empty fallback for test environment when service isn't initialized yet
const _emptyFallback = {
  assetsById: {},
  assetIds: [],
  assets: [],
  relatedAssetIndex: {},
  getRelatedAssetIds: () => [],
  description: () => Promise.reject(new Error("AssetService not initialized")),
} as unknown as AssetService;

// Get initialized asset service - returns empty fallback if not yet initialized
export const getAssetService = (): AssetService => {
  if (!_assetService) {
    return _emptyFallback;
  }
  return _assetService;
};

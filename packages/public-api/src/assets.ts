import type { AssetId } from "@shapeshiftoss/caip";
import type { Asset, AssetsById } from "@shapeshiftoss/types";
import { getBaseAsset } from "@shapeshiftoss/utils";
import fs from "fs";
import path from "path";

let assetsById: AssetsById = {};
let assetIds: AssetId[] = [];
let assets: Asset[] = [];
let initialized = false;

export const initAssets = (): Promise<void> => {
  if (initialized) return Promise.resolve();

  try {
    // Try to load from the generated asset data file
    // First check env var, then relative to cwd, then relative to monorepo root
    const possiblePaths = [
      process.env.ASSET_DATA_PATH,
      path.join(process.cwd(), "public/generated/generatedAssetData.json"),
      path.join(
        process.cwd(),
        "../../public/generated/generatedAssetData.json",
      ),
      path.join(process.cwd(), "generatedAssetData.json"),
    ].filter(Boolean) as string[];

    let assetDataPath: string | undefined;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        assetDataPath = p;
        break;
      }
    }

    if (!assetDataPath) {
      const error = new Error(
        `Asset data file not found in any of the expected locations: ${possiblePaths.join(
          ", ",
        )}`,
      );
      console.warn(error.message);
      return Promise.reject(error);
    }

    const assetDataJson = JSON.parse(fs.readFileSync(assetDataPath, "utf8"));
    const localAssetData = assetDataJson.byId;
    const sortedAssetIds = assetDataJson.ids as AssetId[];

    // Enrich assets with chain-level data
    const enrichedAssetsById: AssetsById = {};
    for (const assetId of sortedAssetIds) {
      const asset = localAssetData[assetId];
      if (asset) {
        const baseAsset = getBaseAsset(asset.chainId);
        enrichedAssetsById[assetId] = {
          ...asset,
          networkName: baseAsset?.networkName,
          explorer: baseAsset?.explorer,
          explorerAddressLink: baseAsset?.explorerAddressLink,
          explorerTxLink: baseAsset?.explorerTxLink,
        };
      }
    }

    assetsById = enrichedAssetsById;
    assetIds = sortedAssetIds;
    assets = sortedAssetIds
      .map((id: AssetId) => enrichedAssetsById[id])
      .filter(Boolean) as Asset[];

    console.log(`Loaded ${assetIds.length} assets from ${assetDataPath}`);
    initialized = true;
    return Promise.resolve();
  } catch (error) {
    console.error("Failed to load assets:", error);
    return Promise.reject(error);
  }
};

export const getAssetsById = (): AssetsById => assetsById;
export const getAssetIds = (): AssetId[] => assetIds;
export const getAllAssets = (): Asset[] => assets;
export const getAsset = (assetId: AssetId): Asset | undefined =>
  assetsById[assetId];

import type { AssetId, Asset } from "../types";
import { isEvmChainId } from "../types";

const SHAPESHIFT_APP_URL = "https://app.shapeshift.com";

export type RedirectParams = {
  sellAssetId: AssetId;
  buyAssetId: AssetId;
  sellAmount?: string;
};

export const buildShapeShiftTradeUrl = (params: RedirectParams): string => {
  const url = new URL(`${SHAPESHIFT_APP_URL}/trade`);
  url.searchParams.set("sellAssetId", params.sellAssetId);
  url.searchParams.set("buyAssetId", params.buyAssetId);
  if (params.sellAmount) {
    url.searchParams.set("sellAmount", params.sellAmount);
  }
  return url.toString();
};

export const redirectToShapeShift = (params: RedirectParams): void => {
  const url = buildShapeShiftTradeUrl(params);
  window.open(url, "_blank", "noopener,noreferrer");
};

export type ChainType = "evm" | "utxo" | "cosmos" | "solana" | "other";

export const getChainTypeFromAsset = (asset: Asset): ChainType => {
  const chainId = asset.chainId;

  if (isEvmChainId(chainId)) return "evm";
  if (chainId.startsWith("bip122:")) return "utxo";
  if (chainId.startsWith("cosmos:")) return "cosmos";
  if (chainId.startsWith("solana:")) return "solana";

  return "other";
};

export const canExecuteInWidget = (
  sellAsset: Asset,
  buyAsset: Asset,
): boolean => {
  const sellChainType = getChainTypeFromAsset(sellAsset);
  const buyChainType = getChainTypeFromAsset(buyAsset);

  return sellChainType === "evm" && buyChainType === "evm";
};

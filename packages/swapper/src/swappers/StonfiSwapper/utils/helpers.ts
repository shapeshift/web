import { fromAssetId } from "@shapeshiftoss/caip";
import type { Asset } from "@shapeshiftoss/types";
import { KnownChainIds } from "@shapeshiftoss/types";
import type { Omniston } from "@ston-fi/omniston-sdk";

const CONNECTION_TIMEOUT_MS = 10000;

export const waitForOmnistonConnection = (
  omniston: Omniston,
): Promise<boolean> => {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      subscription.unsubscribe();
      resolve(false);
    }, CONNECTION_TIMEOUT_MS);

    const subscription = omniston.connectionStatusEvents.subscribe({
      next: (event) => {
        if (event.status === "connected") {
          clearTimeout(timer);
          subscription.unsubscribe();
          resolve(true);
        }
      },
      error: () => {
        clearTimeout(timer);
        resolve(false);
      },
    });
  });
};

export const assetToStonfiAddress = (asset: Asset): string | null => {
  if (asset.chainId !== KnownChainIds.TonMainnet) {
    return null;
  }

  const { assetNamespace, assetReference } = fromAssetId(asset.assetId);

  if (assetNamespace === "slip44") {
    return "EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c";
  }

  if (assetNamespace === "jetton") {
    return assetReference;
  }

  return null;
};

export const isTonAsset = (asset: Asset): boolean => {
  return asset.chainId === KnownChainIds.TonMainnet;
};

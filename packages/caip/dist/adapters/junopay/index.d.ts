import type { AssetId } from '../../assetId/assetId';
export declare const junoPayTickerToAssetId: (id: string) => AssetId | undefined;
export declare const assetIdToJunoPayTicker: (assetId: string) => string | undefined;
export declare const getSupportedJunoPayAssets: () => {
    assetId: string;
    ticker: string;
}[];

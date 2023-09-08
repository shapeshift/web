import type { AssetId } from '../../assetId/assetId';
type OnRamperTokenId = string;
export declare const AssetIdToOnRamperIdMap: Record<AssetId, OnRamperTokenId[]>;
export declare const getOnRamperSupportedAssets: () => void;
export declare const onRamperTokenIdToAssetId: (tokenId: OnRamperTokenId) => AssetId | undefined;
export declare const assetIdToOnRamperTokenList: (assetId: AssetId) => OnRamperTokenId[] | undefined;
export {};

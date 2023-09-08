import type { ChainId, ChainNamespace, ChainReference } from '../chainId/chainId';
import type { ASSET_NAMESPACE, ASSET_REFERENCE } from '../constants';
import type { Nominal } from '../utils';
export type AssetId = Nominal<string, 'AssetId'>;
export type AssetNamespace = (typeof ASSET_NAMESPACE)[keyof typeof ASSET_NAMESPACE];
export type AssetReference = (typeof ASSET_REFERENCE)[keyof typeof ASSET_REFERENCE];
type ToAssetIdWithChainId = {
    chainNamespace?: never;
    chainReference?: never;
    chainId: ChainId;
    assetNamespace: AssetNamespace;
    assetReference: AssetReference | string;
};
type ToAssetIdWithChainIdParts = {
    chainNamespace: ChainNamespace;
    chainReference: ChainReference;
    chainId?: never;
    assetNamespace: AssetNamespace;
    assetReference: AssetReference | string;
};
export type ToAssetIdArgs = ToAssetIdWithChainId | ToAssetIdWithChainIdParts;
type ToAssetId = (args: ToAssetIdArgs) => AssetId;
export declare const toAssetId: ToAssetId;
type FromAssetIdReturn = {
    chainNamespace: ChainNamespace;
    chainReference: ChainReference;
    chainId: ChainId;
    assetNamespace: AssetNamespace;
    assetReference: AssetReference | string;
};
export type FromAssetId = (assetId: AssetId) => FromAssetIdReturn;
export declare const fromAssetId: FromAssetId;
export declare const isNft: (assetId: AssetId) => boolean;
export declare const deserializeNftAssetReference: (assetReference: string) => [address: string, id: string];
export declare const toCAIP19: ToAssetId;
export declare const fromCAIP19: FromAssetId;
export {};

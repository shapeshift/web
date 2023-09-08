import type { AccountId } from './accountId/accountId';
import type { AssetId } from './assetId/assetId';
import type { ChainId, ChainNamespace, ChainReference } from './chainId/chainId';
export declare const accountIdToChainId: (accountId: AccountId) => ChainId;
export declare const accountIdToSpecifier: (accountId: AccountId) => string;
export declare const isValidChainPartsPair: (chainNamespace: ChainNamespace, chainReference: ChainReference) => boolean;
export declare const generateAssetIdFromCosmosSdkDenom: (denom: string, nativeAssetId: AssetId) => AssetId;
export declare const bitcoinAssetMap: {
    [x: string]: string;
};
export declare const bitcoinCashAssetMap: {
    [x: string]: string;
};
export declare const dogecoinAssetMap: {
    [x: string]: string;
};
export declare const litecoinAssetMap: {
    [x: string]: string;
};
export declare const cosmosAssetMap: {
    [x: string]: string;
};
export declare const thorchainAssetMap: {
    [x: string]: string;
};
interface Flavoring<FlavorT> {
    _type?: FlavorT;
}
export type Nominal<T, FlavorT> = T & Flavoring<FlavorT>;
export {};

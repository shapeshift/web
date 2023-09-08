import type { AssetNamespace, ChainId } from '@shapeshiftoss/caip';
export * from './bignumber';
export * from './bip44';
export * from './fees';
export * from './utxoUtils';
export declare const getAssetNamespace: (type: string) => AssetNamespace;
export declare const chainIdToChainLabel: (chainId: ChainId) => string;
export declare const convertNumberToHex: (value: string) => string;

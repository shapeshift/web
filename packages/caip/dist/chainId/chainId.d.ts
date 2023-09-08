import type { CHAIN_NAMESPACE, CHAIN_REFERENCE } from '../constants';
import type { Nominal } from '../utils';
export type ChainId = Nominal<string, 'ChainId'>;
export type ChainNamespace = (typeof CHAIN_NAMESPACE)[keyof typeof CHAIN_NAMESPACE];
export type ChainReference = (typeof CHAIN_REFERENCE)[keyof typeof CHAIN_REFERENCE];
type ToChainIdArgs = {
    chainNamespace: ChainNamespace;
    chainReference: ChainReference;
};
export declare const toChainId: (args: ToChainIdArgs) => ChainId;
export declare const fromChainId: (chainId: ChainId) => {
    chainNamespace: ChainNamespace;
    chainReference: ChainReference;
};
export declare const toCAIP2: (args: ToChainIdArgs) => ChainId;
export declare const fromCAIP2: (chainId: ChainId) => {
    chainNamespace: ChainNamespace;
    chainReference: ChainReference;
};
export {};

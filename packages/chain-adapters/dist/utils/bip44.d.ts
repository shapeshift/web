import type { BIP44Params } from '@shapeshiftoss/types';
export declare const toRootDerivationPath: (bip44Params: BIP44Params) => string;
export declare const toPath: (bip44Params: BIP44Params) => string;
export declare const fromPath: (path: string) => BIP44Params;
export declare const toAddressNList: (bip44Params: BIP44Params) => number[];
export declare const fromAddressNList: (addressNList: number[]) => BIP44Params;

import BigNumber from 'bignumber.js';
export type BN = BigNumber;
export declare const bn: (n: BigNumber.Value, base?: number) => BN;
export declare const bnOrZero: (n: BigNumber.Value | null | undefined) => BN;

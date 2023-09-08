import type { ChainId } from '@shapeshiftoss/caip';
import type { ethers } from 'ethers';
import type { BaseTxMetadata } from '../../types';
import type { Api } from '..';
import type { SubParser, Tx, TxSpecific } from './types';
interface Media {
    url: string;
    type?: 'image' | 'video';
}
export interface TxMetadata extends BaseTxMetadata {
    parser: 'nft';
    mediaById: Record<string, Media>;
}
interface ParserArgs {
    chainId: ChainId;
    api: Api;
    provider: ethers.providers.JsonRpcBatchProvider;
}
export declare class Parser<T extends Tx> implements SubParser<T> {
    provider: ethers.providers.JsonRpcBatchProvider;
    readonly chainId: ChainId;
    readonly api: Api;
    constructor(args: ParserArgs);
    parse(tx: T, address: string): Promise<TxSpecific | undefined>;
}
export {};

import type { ChainId } from '@shapeshiftoss/caip';
import { ethers } from 'ethers';
import type { BaseTxMetadata } from '../../../types';
import type { SubParser, Tx, TxSpecific } from '../../parser/types';
export interface TxMetadata extends BaseTxMetadata {
    parser: 'bep20';
    assetId: string;
    value?: string;
}
interface ParserArgs {
    chainId: ChainId;
    provider: ethers.providers.JsonRpcBatchProvider;
}
export declare class Parser<T extends Tx> implements SubParser<T> {
    provider: ethers.providers.JsonRpcBatchProvider;
    readonly chainId: ChainId;
    readonly abiInterface: ethers.utils.Interface;
    readonly supportedFunctions: {
        approveSigHash: string;
    };
    constructor(args: ParserArgs);
    parse(tx: T): Promise<TxSpecific | undefined>;
}
export {};

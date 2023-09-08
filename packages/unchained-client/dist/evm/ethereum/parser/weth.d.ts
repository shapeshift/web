import type { ChainId } from '@shapeshiftoss/caip';
import { ethers } from 'ethers';
import type { Tx } from '../../../generated/ethereum';
import type { BaseTxMetadata } from '../../../types';
import type { SubParser, TxSpecific } from '../../parser';
export interface TxMetadata extends BaseTxMetadata {
    parser: 'weth';
}
export interface ParserArgs {
    chainId: ChainId;
    provider: ethers.providers.JsonRpcBatchProvider;
}
export declare class Parser implements SubParser<Tx> {
    provider: ethers.providers.JsonRpcBatchProvider;
    readonly chainId: ChainId;
    readonly wethContract: string;
    readonly abiInterface: ethers.utils.Interface;
    readonly supportedFunctions: {
        depositSigHash: string;
        withdrawalSigHash: string;
    };
    constructor(args: ParserArgs);
    parse(tx: Tx): Promise<TxSpecific | undefined>;
}

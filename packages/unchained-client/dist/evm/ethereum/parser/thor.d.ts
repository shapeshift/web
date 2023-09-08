import type { ChainId } from '@shapeshiftoss/caip';
import { ethers } from 'ethers';
import type { Tx } from '../../../generated/ethereum';
import type { BaseTxMetadata } from '../../../types';
import type { SubParser, TxSpecific } from '../../parser';
export interface TxMetadata extends BaseTxMetadata {
    parser: 'thor';
}
export interface ParserArgs {
    chainId: ChainId;
    rpcUrl: string;
}
interface SupportedFunctions {
    depositSigHash: string;
    transferOutSigHash: string;
}
export declare class Parser implements SubParser<Tx> {
    readonly routerContract: string;
    readonly abiInterface: ethers.utils.Interface;
    readonly supportedFunctions: SupportedFunctions;
    constructor(args: ParserArgs);
    parse(tx: Tx): Promise<TxSpecific | undefined>;
}
export {};

import type { ChainId } from '@shapeshiftoss/caip';
import { ethers } from 'ethers';
import type { Tx } from '../../../generated/ethereum';
import type { BaseTxMetadata } from '../../../types';
import type { SubParser, TxSpecific } from '../../parser';
export interface TxMetadata extends BaseTxMetadata {
    parser: 'uniV2';
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
    readonly stakingRewardsInterface: ethers.utils.Interface;
    readonly supportedFunctions: {
        addLiquidityEthSigHash: string;
        removeLiquidityEthSigHash: string;
    };
    readonly supportedStakingRewardsFunctions: {
        stakeSigHash: string;
        exitSigHash: string;
    };
    constructor(args: ParserArgs);
    parseUniV2(tx: Tx): Promise<TxSpecific | undefined>;
    parseStakingRewards(tx: Tx): TxSpecific | undefined;
    parse(tx: Tx): Promise<TxSpecific | undefined>;
    private static pairFor;
}

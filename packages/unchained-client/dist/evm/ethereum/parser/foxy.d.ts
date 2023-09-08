import { ethers } from 'ethers';
import type { Tx } from '../../../generated/ethereum';
import type { BaseTxMetadata } from '../../../types';
import type { SubParser, TxSpecific } from '../../parser';
export interface TxMetadata extends BaseTxMetadata {
    parser: 'foxy';
}
export declare class Parser implements SubParser<Tx> {
    readonly abiInterface: ethers.utils.Interface;
    readonly supportedFunctions: {
        stakeSigHash: string;
        unstakeSigHash: string;
        instantUnstakeSigHash: string;
        claimWithdrawSigHash: string;
    };
    parse(tx: Tx): Promise<TxSpecific | undefined>;
}

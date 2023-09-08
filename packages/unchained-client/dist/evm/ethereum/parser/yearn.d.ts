import type { ChainId } from '@shapeshiftoss/caip';
import { ethers } from 'ethers';
import type { Tx } from '../../../generated/ethereum';
import type { BaseTxMetadata } from '../../../types';
import type { SubParser, TxSpecific } from '../../parser';
export declare const YEARN_VAULTS_URL = "https://ydaemon.yearn.finance/api/1/vaults/all";
export interface TxMetadata extends BaseTxMetadata {
    parser: 'yearn';
    assetId?: string;
    value?: string;
}
interface ParserArgs {
    chainId: ChainId;
}
export declare class Parser implements SubParser<Tx> {
    yearnTokenVaultAddresses: string[] | undefined;
    readonly chainId: ChainId;
    readonly shapeShiftInterface: ethers.utils.Interface;
    readonly yearnInterface: ethers.utils.Interface;
    readonly supportedYearnFunctions: {
        approveSigHash: string;
        depositSigHash: string;
        depositAmountSigHash: string;
        depositAmountAndRecipientSigHash: string;
        withdrawSigHash: string;
    };
    readonly supportedShapeShiftFunctions: {
        depositSigHash: string;
    };
    constructor(args: ParserArgs);
    parse(tx: Tx): Promise<TxSpecific | undefined>;
    getAbiInterface(txSigHash: string | undefined): ethers.utils.Interface | undefined;
}
export {};

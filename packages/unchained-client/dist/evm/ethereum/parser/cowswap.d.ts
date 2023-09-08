import type { Tx } from '../../../generated/ethereum';
import type { BaseTxMetadata } from '../../../types';
import type { SubParser, TxSpecific } from '../../parser';
export interface TxMetadata extends BaseTxMetadata {
    parser: 'cowswap';
}
export declare class Parser implements SubParser<Tx> {
    parse(tx: Tx): Promise<TxSpecific | undefined>;
}

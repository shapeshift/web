import type { Tx } from '../../../generated/optimism';
import type { TransactionParserArgs } from '../../parser';
import { BaseTransactionParser } from '../../parser';
export declare const ZRX_OPTIMISM_PROXY_CONTRACT = "0xDEF1ABE32c034e558Cdd535791643C58a13aCC10";
export declare class TransactionParser extends BaseTransactionParser<Tx> {
    constructor(args: TransactionParserArgs);
}

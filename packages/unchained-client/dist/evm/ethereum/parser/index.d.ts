import type { Tx } from '../../../generated/ethereum';
import type { TransactionParserArgs } from '../../parser';
import { BaseTransactionParser } from '../../parser';
export declare const ZRX_ETHEREUM_PROXY_CONTRACT = "0xDef1C0ded9bec7F1a1670819833240f027b25EfF";
export declare class TransactionParser extends BaseTransactionParser<Tx> {
    constructor(args: TransactionParserArgs);
}

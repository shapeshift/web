import type { Tx } from '../../../generated/gnosis';
import type { TransactionParserArgs } from '../../parser';
import { BaseTransactionParser } from '../../parser';
export declare class TransactionParser extends BaseTransactionParser<Tx> {
    constructor(args: TransactionParserArgs);
}

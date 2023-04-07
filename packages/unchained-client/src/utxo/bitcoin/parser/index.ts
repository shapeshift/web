import type { Tx } from '../../../generated/bitcoin'
import { BaseTransactionParser } from '../../parser'

export class TransactionParser extends BaseTransactionParser<Tx> {}

import type { Tx } from '../../../generated/dogecoin'
import { BaseTransactionParser } from '../../parser'

export class TransactionParser extends BaseTransactionParser<Tx> {}

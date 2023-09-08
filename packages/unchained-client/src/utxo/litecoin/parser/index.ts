import type { Tx } from '../../../generated/litecoin'
import { BaseTransactionParser } from '../../parser'

export class TransactionParser extends BaseTransactionParser<Tx> {}

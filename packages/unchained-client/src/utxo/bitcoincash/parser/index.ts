import type { Tx } from '../../../generated/bitcoincash'
import { BaseTransactionParser } from '../../parser'

export class TransactionParser extends BaseTransactionParser<Tx> {}

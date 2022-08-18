import type { evm } from '@shapeshiftoss/common-api'

import { StandardTx } from '../../types'
import * as cowswap from '../ethereum/parser/cowswap'
import * as foxy from '../ethereum/parser/foxy'
import * as thor from '../ethereum/parser/thor'
import * as uniV2 from '../ethereum/parser/uniV2'
import * as weth from '../ethereum/parser/weth'
import * as yearn from '../ethereum/parser/yearn'
import * as erc20 from '../parser/erc20'
import * as zrx from '../parser/zrx'

export type Tx = evm.Tx

export type TxMetadata =
  | cowswap.TxMetadata
  | erc20.TxMetadata
  | foxy.TxMetadata
  | thor.TxMetadata
  | uniV2.TxMetadata
  | weth.TxMetadata
  | yearn.TxMetadata
  | zrx.TxMetadata

export interface ParsedTx extends StandardTx {
  data?: TxMetadata
}

export type TxSpecific = Partial<Pick<ParsedTx, 'trade' | 'transfers' | 'data'>>

export interface SubParser<T extends Tx, U = TxSpecific> {
  parse(tx: T): Promise<U | undefined>
}

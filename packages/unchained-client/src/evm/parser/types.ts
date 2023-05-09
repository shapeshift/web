import type { evm } from '@shapeshiftoss/common-api'

import type { StandardTx } from '../../types'
import type * as bep20 from '../bnbsmartchain/parser/bep20'
import type * as cowswap from '../ethereum/parser/cowswap'
import type * as foxy from '../ethereum/parser/foxy'
import type * as thor from '../ethereum/parser/thor'
import type * as uniV2 from '../ethereum/parser/uniV2'
import type * as weth from '../ethereum/parser/weth'
import type * as yearn from '../ethereum/parser/yearn'
import type * as erc20 from '../parser/erc20'
import type * as nft from '../parser/nft'
import type * as zrx from '../parser/zrx'

export type Tx = evm.Tx

export type TxMetadata =
  | bep20.TxMetadata
  | cowswap.TxMetadata
  | erc20.TxMetadata
  | foxy.TxMetadata
  | thor.TxMetadata
  | uniV2.TxMetadata
  | weth.TxMetadata
  | yearn.TxMetadata
  | zrx.TxMetadata
  | nft.TxMetadata

export interface ParsedTx extends StandardTx {
  data?: TxMetadata
}

export type TxSpecific = Partial<Pick<ParsedTx, 'trade' | 'transfers' | 'data'>>

export interface SubParser<T extends Tx, U = TxSpecific> {
  parse(tx: T): Promise<U | undefined>
}

import type { ChainId } from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { SwapperName, TradeQuote } from '@shapeshiftoss/swapper'
import type { AccountMetadata } from '@shapeshiftoss/types'
import type { ReduxState } from 'state/reducer'

export type TradeExecutionInput = {
  swapperName: SwapperName
  tradeQuote: TradeQuote
  stepIndex: number
  accountMetadata: AccountMetadata
  wallet: HDWallet
  supportsEIP1559: boolean
  slippageTolerancePercentageDecimal: string
  getState: () => ReduxState
}

export type SupportedChainIds = {
  buy: ChainId[]
  sell: ChainId[]
}

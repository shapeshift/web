import type { AccountId } from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { Result } from '@sniptt/monads/build'
import type { ReduxState } from 'state/reducer'
import type { AccountMetadata } from 'state/slices/portfolioSlice/portfolioSliceCommon'

import type { SwapErrorRight, SwapperName, TradeQuote2 } from './api'

export type QuoteResult = Result<TradeQuote2[], SwapErrorRight> & {
  swapperName: SwapperName
}

export type TradeExecutionInput = {
  swapperName: SwapperName
  tradeQuote: TradeQuote2
  stepIndex: number
  accountMetadata: AccountMetadata
  quoteSellAssetAccountId: AccountId
  quoteBuyAssetAccountId: AccountId
  wallet: HDWallet
  supportsEIP1559: boolean
  slippageTolerancePercentageDecimal: string
  getState: () => ReduxState
}

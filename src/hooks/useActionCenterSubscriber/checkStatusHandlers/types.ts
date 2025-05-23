import type { CreateToastFnReturn } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import type { SupportedTradeQuoteStepIndex, TradeQuote, TradeRate } from '@shapeshiftoss/swapper'

export type CheckStatusHandlerProps = {
  toast: CreateToastFnReturn
  quote: TradeQuote | TradeRate
  stepIndex: SupportedTradeQuoteStepIndex
  sellTxHash: string
  translate: any
  sellAccountId: AccountId
}

export type CheckStatusHandler = ({ toast }: CheckStatusHandlerProps) => Promise<boolean>

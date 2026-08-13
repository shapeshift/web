import type { TradeRate } from '../types'

export const isDepositCapableRate = (rate: TradeRate): boolean =>
  rate.supportsDepositAddress === true

type ShouldUseDepositFlowArgs = {
  rate: TradeRate | undefined
  hasWalletForSellChain: boolean
}

export const shouldUseDepositFlow = ({
  rate,
  hasWalletForSellChain,
}: ShouldUseDepositFlowArgs): boolean =>
  !hasWalletForSellChain && !!rate && isDepositCapableRate(rate)

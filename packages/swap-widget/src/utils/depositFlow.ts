import type { TradeRate } from '../types'

export const isExternalPaymentRate = (rate: TradeRate): boolean =>
  rate.supportsExternalPayment === true

type ShouldUseDepositFlowArgs = {
  rate: TradeRate | undefined
  hasWalletForSellChain: boolean
}

export const shouldUseDepositFlow = ({
  rate,
  hasWalletForSellChain,
}: ShouldUseDepositFlowArgs): boolean =>
  !hasWalletForSellChain && !!rate && isExternalPaymentRate(rate)

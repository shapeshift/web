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

// A re-quote must stay with a swapper that can be paid externally - the one already quoted if it still rates
export const pickDepositRate = (
  rates: TradeRate[] | undefined,
  swapperName: string | undefined,
): TradeRate | undefined =>
  rates?.find(rate => rate.swapperName === swapperName && isExternalPaymentRate(rate)) ??
  rates?.find(isExternalPaymentRate)

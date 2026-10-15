import type { TradeRate } from '../types'
import { isWidgetExecutableChainId } from '../types'

export const isExternalPaymentRate = (rate: TradeRate): boolean =>
  rate.supportsExternalPayment === true

// On a chain that isn't executable in-widget, only an external payment route can swap
export const isSwappableRate = (sellChainId: string, rate: TradeRate): boolean =>
  isWidgetExecutableChainId(sellChainId) || isExternalPaymentRate(rate)

// Until the user picks one, the route is the best swappable one, or the best overall when none is
export const pickDefaultRate = (
  rates: TradeRate[] | undefined,
  sellChainId: string,
): TradeRate | undefined => rates?.find(rate => isSwappableRate(sellChainId, rate)) ?? rates?.[0]

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

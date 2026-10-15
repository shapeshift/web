import type { TradeRate } from '../types'
import { isWidgetExecutableChainId } from '../types'

export const isExternalPaymentRate = (rate: TradeRate): boolean =>
  rate.supportsExternalPayment === true

export const isSwappableRate = (sellChainId: string, rate: TradeRate): boolean =>
  isWidgetExecutableChainId(sellChainId) || isExternalPaymentRate(rate)

// Until the user picks one, the route is the best swappable one, or the best overall when none is
export const pickDefaultRate = (
  rates: TradeRate[] | undefined,
  sellChainId: string,
): TradeRate | undefined => rates?.find(rate => isSwappableRate(sellChainId, rate)) ?? rates?.[0]

// A pick is remembered by swapper, so each poll's rate for it is the live one; a swapper that
// stopped quoting falls back to the default
export const getActiveRate = (
  rates: TradeRate[] | undefined,
  selectedRate: TradeRate | null,
  sellChainId: string,
): TradeRate | undefined =>
  rates?.find(rate => rate.swapperName === selectedRate?.swapperName) ??
  pickDefaultRate(rates, sellChainId)

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

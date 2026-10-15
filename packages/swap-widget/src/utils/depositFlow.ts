import type { TradeRate } from '../types'
import { isWidgetExecutableChainId } from '../types'

export const isExternalPaymentRate = (rate: TradeRate): boolean =>
  rate.supportsExternalPayment === true

// A chain the widget can't sign for is only served by routes paid from another wallet
export const canWidgetRunRate = (sellChainId: string, rate: TradeRate): boolean =>
  isWidgetExecutableChainId(sellChainId) || isExternalPaymentRate(rate)

// Until the user picks one, the route is the best one the widget can run here, or the best overall
// when none can (those only lead to the app)
export const pickDefaultRate = (
  rates: TradeRate[] | undefined,
  sellChainId: string,
): TradeRate | undefined =>
  rates?.find(rate => canWidgetRunRate(sellChainId, rate)) ?? rates?.[0]

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

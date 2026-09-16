export type InputCtaAction = 'connect' | 'quote' | 'deposit' | 'redirect' | 'none'

export type InputCta = {
  text: string
  disabled: boolean
  action: InputCtaAction
}

type GetInputCtaArgs = {
  isDepositRoute: boolean
  hasWalletForSellChain: boolean
  // The adapter for the sell chain's type is connected, whether or not it can serve this chain
  isSellChainTypeConnected: boolean
  isUnsupportedChain: boolean
  supportsDepositRoute: boolean
  allowShapeshiftRedirect: boolean
  hasReceiveAddress: boolean
  hasSendAddress: boolean
  hasAmount: boolean
  isLoadingRates: boolean
  hasRates: boolean
  hasRatesError: boolean
}

const getUnsupportedCta = (allowShapeshiftRedirect: boolean): InputCta =>
  allowShapeshiftRedirect
    ? { text: 'Proceed on ShapeShift', disabled: false, action: 'redirect' }
    : { text: 'Route not supported', disabled: true, action: 'none' }

export const getInputCta = ({
  isDepositRoute,
  hasWalletForSellChain,
  isSellChainTypeConnected,
  isUnsupportedChain,
  supportsDepositRoute,
  allowShapeshiftRedirect,
  hasReceiveAddress,
  hasSendAddress,
  hasAmount,
  isLoadingRates,
  hasRates,
  hasRatesError,
}: GetInputCtaArgs): InputCta => {
  // No rates are fetched here, so neither an amount nor rates can change the outcome
  if (isUnsupportedChain && !supportsDepositRoute) return getUnsupportedCta(allowShapeshiftRedirect)

  if (!hasAmount) return { text: 'Enter an amount', disabled: true, action: 'none' }

  if (isLoadingRates) return { text: 'Finding rates…', disabled: true, action: 'none' }

  // Redirects even when rates fail, since the app may still have a route
  if (isUnsupportedChain && !isDepositRoute) return getUnsupportedCta(allowShapeshiftRedirect)

  if (hasRatesError) return { text: 'Rates unavailable', disabled: true, action: 'none' }
  if (!hasRates) return { text: 'No routes found', disabled: true, action: 'none' }

  // A deposit route needs no wallet, so it outranks both connecting and the redirect
  if (isDepositRoute) {
    if (!hasReceiveAddress) return { text: 'Enter receive address', disabled: true, action: 'none' }
    if (!hasSendAddress) return { text: 'Enter refund address', disabled: true, action: 'none' }
    return { text: 'Continue without a wallet', disabled: false, action: 'deposit' }
  }

  if (!hasWalletForSellChain) {
    // Connected but on a sibling chain (a bitcoin wallet for a litecoin sell) - connecting again can't help
    if (isSellChainTypeConnected) return getUnsupportedCta(allowShapeshiftRedirect)
    return { text: 'Connect Wallet', disabled: false, action: 'connect' }
  }

  if (!hasReceiveAddress) return { text: 'Enter receive address', disabled: true, action: 'none' }

  return { text: 'Swap', disabled: false, action: 'quote' }
}

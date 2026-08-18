export type InputCtaAction = 'connect' | 'quote' | 'deposit' | 'redirect' | 'none'

export type InputCta = {
  text: string
  disabled: boolean
  action: InputCtaAction
}

type GetInputCtaArgs = {
  isDepositCapable: boolean
  hasWalletForSellChain: boolean
  isUnsupportedChain: boolean
  allowShapeshiftRedirect: boolean
  hasReceiveAddress: boolean
  hasSendAddress: boolean
  hasAmount: boolean
  isLoadingRates: boolean
  hasRates: boolean
  hasRatesError: boolean
}

export const getInputCta = ({
  isDepositCapable,
  hasWalletForSellChain,
  isUnsupportedChain,
  allowShapeshiftRedirect,
  hasReceiveAddress,
  hasSendAddress,
  hasAmount,
  isLoadingRates,
  hasRates,
  hasRatesError,
}: GetInputCtaArgs): InputCta => {
  if (!hasAmount) return { text: 'Enter an amount', disabled: true, action: 'none' }
  if (isLoadingRates) return { text: 'Finding rates...', disabled: true, action: 'none' }
  if (hasRatesError) return { text: 'No routes available', disabled: true, action: 'none' }
  if (!hasRates) return { text: 'No routes found', disabled: true, action: 'none' }

  // A deposit route needs no wallet, so it outranks both connecting and the redirect
  if (isDepositCapable && !hasWalletForSellChain) {
    if (!hasReceiveAddress) return { text: 'Enter receive address', disabled: true, action: 'none' }
    if (!hasSendAddress) return { text: 'Enter refund address', disabled: true, action: 'none' }
    return { text: 'Continue without a wallet', disabled: false, action: 'deposit' }
  }

  if (isUnsupportedChain) {
    if (!allowShapeshiftRedirect) {
      return { text: 'Route not supported', disabled: true, action: 'none' }
    }
    return { text: 'Proceed on ShapeShift', disabled: false, action: 'redirect' }
  }

  if (!hasWalletForSellChain) return { text: 'Connect Wallet', disabled: false, action: 'connect' }
  if (!hasReceiveAddress) return { text: 'Enter receive address', disabled: true, action: 'none' }

  return { text: 'Swap', disabled: false, action: 'quote' }
}

import { useMemo } from 'react'

import type { BuyAmountProps, ReceiveAddressProps } from '../types'

// Routing is hash based, so params can land either side of it depending on how the url was typed
export const getDemoSearchParams = (): URLSearchParams => {
  const params = new URLSearchParams(window.location.search)

  const hashQueryIndex = window.location.hash.indexOf('?')
  if (hashQueryIndex !== -1) {
    new URLSearchParams(window.location.hash.slice(hashQueryIndex + 1)).forEach((value, key) =>
      params.set(key, value),
    )
  }

  return params
}

// Integrator props are driven off the query string so the demo can exercise them without a rebuild
export const useIntegratorParams = () => {
  const params = useMemo(getDemoSearchParams, [])

  return useMemo(() => {
    const receiveAddress = params.get('receiveAddress')
    const buyAmount = params.get('buyAmount')

    // Each lock only exists alongside the value it locks, so the pairs are built together
    const receiveAddressProps: ReceiveAddressProps = receiveAddress
      ? {
          defaultReceiveAddress: receiveAddress,
          isReceiveAddressLocked: params.get('lockReceiveAddress') === 'true',
        }
      : {}

    const buyAmountProps: BuyAmountProps = buyAmount
      ? {
          defaultBuyAmountCryptoBaseUnit: buyAmount,
          isBuyAmountLocked: params.get('lockBuyAmount') === 'true',
        }
      : {}

    return {
      defaultSellAsset: params.get('sellAssetId') || undefined,
      defaultBuyAsset: params.get('buyAssetId') || undefined,
      isBuyAssetLocked: params.get('lockBuyAsset') === 'true',
      ...receiveAddressProps,
      ...buyAmountProps,
    }
  }, [params])
}

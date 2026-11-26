import { useMemo } from 'react'

import type { BuyAmountProps, ReceiveAddressProps, SwapWidgetProps } from '../types'

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

type DemoEnv = {
  DEV?: boolean
  VITE_ENABLE_DEMO_RECEIVE_ADDRESS_PARAMS?: string
}

// The hosted demo is a public page, so a link must never be able to pick where funds go.
// The receive address params only work on the dev server, or on a build that opts in explicitly.
export const isReceiveAddressParamEnabled = (env: DemoEnv): boolean =>
  env.DEV === true || env.VITE_ENABLE_DEMO_RECEIVE_ADDRESS_PARAMS === 'true'

type IntegratorParamOptions = {
  allowReceiveAddress: boolean
}

export type IntegratorParamProps = Pick<
  SwapWidgetProps,
  'defaultSellAsset' | 'defaultBuyAsset' | 'isBuyAssetLocked'
> &
  ReceiveAddressProps &
  BuyAmountProps

export const parseIntegratorParams = (
  params: URLSearchParams,
  { allowReceiveAddress }: IntegratorParamOptions,
): IntegratorParamProps => {
  const receiveAddress = allowReceiveAddress ? params.get('receiveAddress') : null
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
}

// Integrator props are driven off the query string so the demo can exercise them without a rebuild
export const useIntegratorParams = () => {
  const params = useMemo(getDemoSearchParams, [])

  return useMemo(
    () =>
      parseIntegratorParams(params, {
        allowReceiveAddress: isReceiveAddressParamEnabled(import.meta.env),
      }),
    [params],
  )
}

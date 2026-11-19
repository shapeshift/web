import type { AssetId } from '@shapeshiftoss/caip'
import type { UseFormReturn } from 'react-hook-form'

import type { SendInput } from './Form'
import { SendFormFields } from './SendCommon'

import { resolveQrAssetId } from '@/lib/address/resolveQrAssetId'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import {
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioAccountIdsByAssetIdFilter,
} from '@/state/slices/selectors'
import { store } from '@/state/store'

type ApplyQrScanAssetArgs = {
  qrAssetId: AssetId
  amountCryptoPrecision: string | undefined
  isPaymentUri: boolean
}

export const applyQrScanAsset = (
  methods: UseFormReturn<SendInput>,
  { qrAssetId, amountCryptoPrecision, isPaymentUri }: ApplyQrScanAssetArgs,
): { isAmbiguous: boolean } => {
  const selectedAssetId = methods.getValues(SendFormFields.AssetId)
  const selectedAccountId = methods.getValues(SendFormFields.AccountId)
  const hasAmount = bnOrZero(amountCryptoPrecision).gt(0)
  const { assetId, isAmbiguous } = resolveQrAssetId({
    qrAssetId,
    selectedAssetId,
    hasAmount,
    isPaymentUri,
  })

  if (isAmbiguous) return { isAmbiguous }

  const state = store.getState()

  methods.setValue(SendFormFields.AssetId, assetId)

  if (assetId !== selectedAssetId || !selectedAccountId) {
    const [accountId] = selectPortfolioAccountIdsByAssetIdFilter(state, { assetId })
    if (accountId) methods.setValue(SendFormFields.AccountId, accountId)
  }

  const price = selectMarketDataByAssetIdUserCurrency(state, assetId)?.price
  methods.setValue(
    SendFormFields.AmountCryptoPrecision,
    hasAmount ? amountCryptoPrecision ?? '' : '',
  )
  methods.setValue(
    SendFormFields.FiatAmount,
    hasAmount ? bnOrZero(amountCryptoPrecision).times(bnOrZero(price)).toString() : '',
  )

  return { isAmbiguous }
}

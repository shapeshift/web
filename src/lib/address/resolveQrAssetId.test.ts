import { ethAssetId, usdcAssetId } from '@shapeshiftoss/caip'
import { describe, expect, it } from 'vitest'

import { resolveQrAssetId } from './resolveQrAssetId'

const baseEthAssetId = 'eip155:8453/slip44:60'

describe('resolveQrAssetId', () => {
  it('keeps the selected token for a plain address on the same chain', () => {
    expect(
      resolveQrAssetId({
        qrAssetId: ethAssetId,
        selectedAssetId: usdcAssetId,
        hasAmount: false,
        isPaymentUri: false,
      }),
    ).toEqual({ assetId: usdcAssetId, isAmbiguous: false })
  })

  it('uses the native asset when the QR requests an amount', () => {
    expect(
      resolveQrAssetId({
        qrAssetId: ethAssetId,
        selectedAssetId: usdcAssetId,
        hasAmount: true,
        isPaymentUri: true,
      }),
    ).toEqual({ assetId: ethAssetId, isAmbiguous: false })
  })

  it('uses the payment link chain when it differs from the selected asset', () => {
    expect(
      resolveQrAssetId({
        qrAssetId: baseEthAssetId,
        selectedAssetId: usdcAssetId,
        hasAmount: false,
        isPaymentUri: true,
      }),
    ).toEqual({ assetId: baseEthAssetId, isAmbiguous: true })
  })
})

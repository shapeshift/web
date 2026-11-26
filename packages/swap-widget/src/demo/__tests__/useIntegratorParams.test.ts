import { describe, expect, it } from 'vitest'

import { isReceiveAddressParamEnabled, parseIntegratorParams } from '../useIntegratorParams'

const EVM_ADDRESS = '0x41b4D81dD40c6c91d21f686Bb0596E37e4C8cb90'
const BUY_ASSET_ID = 'eip155:1/slip44:60'

const params = new URLSearchParams({
  receiveAddress: EVM_ADDRESS,
  lockReceiveAddress: 'true',
  buyAssetId: BUY_ASSET_ID,
  lockBuyAsset: 'true',
  buyAmount: '1000',
  lockBuyAmount: 'true',
})

describe('isReceiveAddressParamEnabled', () => {
  it('is off for a production build by default', () => {
    expect(isReceiveAddressParamEnabled({ DEV: false })).toBe(false)
    expect(
      isReceiveAddressParamEnabled({ DEV: false, VITE_ENABLE_DEMO_RECEIVE_ADDRESS_PARAMS: '' }),
    ).toBe(false)
    expect(
      isReceiveAddressParamEnabled({ DEV: false, VITE_ENABLE_DEMO_RECEIVE_ADDRESS_PARAMS: '1' }),
    ).toBe(false)
  })

  it('is on for the dev server', () => {
    expect(isReceiveAddressParamEnabled({ DEV: true })).toBe(true)
  })

  it('is on for a build that opts in explicitly', () => {
    expect(
      isReceiveAddressParamEnabled({ DEV: false, VITE_ENABLE_DEMO_RECEIVE_ADDRESS_PARAMS: 'true' }),
    ).toBe(true)
  })
})

describe('parseIntegratorParams', () => {
  it('ignores the receive address params when they are not allowed', () => {
    const props = parseIntegratorParams(params, { allowReceiveAddress: false })

    expect(props).not.toHaveProperty('defaultReceiveAddress')
    expect(props).not.toHaveProperty('isReceiveAddressLocked')
  })

  it('ignores a lone lock param when the receive address is not allowed', () => {
    const props = parseIntegratorParams(new URLSearchParams({ lockReceiveAddress: 'true' }), {
      allowReceiveAddress: false,
    })

    expect(props).not.toHaveProperty('isReceiveAddressLocked')
  })

  it('reads the receive address params when allowed', () => {
    const props = parseIntegratorParams(params, { allowReceiveAddress: true })

    expect(props.defaultReceiveAddress).toBe(EVM_ADDRESS)
    expect(props.isReceiveAddressLocked).toBe(true)
  })

  it('keeps the buy asset and amount params either way', () => {
    for (const allowReceiveAddress of [true, false]) {
      const props = parseIntegratorParams(params, { allowReceiveAddress })

      expect(props.defaultBuyAsset).toBe(BUY_ASSET_ID)
      expect(props.isBuyAssetLocked).toBe(true)
      expect(props.defaultBuyAmountCryptoBaseUnit).toBe('1000')
      expect(props.isBuyAmountLocked).toBe(true)
    }
  })
})

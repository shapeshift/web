import { ETH, FOX } from 'test/constants'
import { TradeAmountInputField } from 'components/Trade/types'
import { bn } from 'lib/bignumber/bignumber'

import { calculateAmounts } from './calculateAmounts'

describe('calculateAmounts', () => {
  const amount = '1'
  const buyAsset = FOX
  const sellAsset = ETH
  const buyAssetUsdRate = '1'
  const sellAssetUsdRate = '2'
  const selectedCurrencyToUsdRate = bn(1)

  it('returns sellAmount, buyAmount, fiatSellAmount for SELL action', async () => {
    const action = TradeAmountInputField.SELL

    const result = await calculateAmounts({
      amount,
      buyAsset,
      sellAsset,
      buyAssetUsdRate,
      sellAssetUsdRate,
      action,
      selectedCurrencyToUsdRate,
    })

    expect(result).toEqual({
      sellAmount: '1000000000000000000',
      buyAmount: '2000000000000000000',
      fiatSellAmount: '2.00',
    })
  })

  it('returns sellAmount, buyAmount, fiatSellAmount for BUY action', async () => {
    const action = TradeAmountInputField.BUY

    const result = await calculateAmounts({
      amount,
      buyAsset,
      sellAsset,
      buyAssetUsdRate,
      sellAssetUsdRate,
      action,
      selectedCurrencyToUsdRate,
    })

    expect(result).toEqual({
      buyAmount: '1000000000000000000',
      sellAmount: '500000000000000000',
      fiatSellAmount: '1.00',
    })
  })

  it('returns sellAmount, buyAmount, fiatSellAmount for FIAT action', async () => {
    const action = TradeAmountInputField.FIAT

    const result = await calculateAmounts({
      amount,
      buyAsset,
      sellAsset,
      buyAssetUsdRate,
      sellAssetUsdRate,
      action,
      selectedCurrencyToUsdRate,
    })

    expect(result).toEqual({
      buyAmount: '1000000000000000000',
      sellAmount: '500000000000000000',
      fiatSellAmount: '1',
    })
  })
})

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

  it('returns cryptoSellAmount, cryptoBuyAmount, fiatSellAmount, fiatBuyAmount for SELL_CRYPTO action', async () => {
    const action = TradeAmountInputField.SELL_CRYPTO

    const result = calculateAmounts({
      amount,
      buyAsset,
      sellAsset,
      buyAssetUsdRate,
      sellAssetUsdRate,
      action,
      selectedCurrencyToUsdRate,
    })

    expect(result).toEqual({
      cryptoSellAmount: '1000000000000000000',
      cryptoBuyAmount: '2000000000000000000',
      fiatSellAmount: '2.00',
      fiatBuyAmount: '2.00',
    })
  })

  it('returns cryptoSellAmount, cryptoBuyAmount, fiatSellAmount, fiatBuyAmount for BUY_CRYPTO action', async () => {
    const action = TradeAmountInputField.BUY_CRYPTO

    const result = calculateAmounts({
      amount,
      buyAsset,
      sellAsset,
      buyAssetUsdRate,
      sellAssetUsdRate,
      action,
      selectedCurrencyToUsdRate,
    })

    expect(result).toEqual({
      cryptoBuyAmount: '1000000000000000000',
      cryptoSellAmount: '500000000000000000',
      fiatSellAmount: '1.00',
      fiatBuyAmount: '1.00',
    })
  })

  it('returns cryptoSellAmount, cryptoBuyAmount, fiatSellAmount, fiatBuyAmount for SELL_FIAT action', async () => {
    const action = TradeAmountInputField.SELL_FIAT

    const result = calculateAmounts({
      amount,
      buyAsset,
      sellAsset,
      buyAssetUsdRate,
      sellAssetUsdRate,
      action,
      selectedCurrencyToUsdRate,
    })

    expect(result).toEqual({
      cryptoBuyAmount: '1000000000000000000',
      cryptoSellAmount: '500000000000000000',
      fiatSellAmount: '1',
      fiatBuyAmount: '1',
    })
  })

  it('returns cryptoSellAmount, cryptoBuyAmount, fiatSellAmount, fiatBuyAmount for BUY_FIAT action', async () => {
    const action = TradeAmountInputField.BUY_FIAT

    const result = calculateAmounts({
      amount,
      buyAsset,
      sellAsset,
      buyAssetUsdRate,
      sellAssetUsdRate,
      action,
      selectedCurrencyToUsdRate,
    })

    expect(result).toEqual({
      cryptoBuyAmount: '1000000000000000000',
      cryptoSellAmount: '500000000000000000',
      fiatSellAmount: '1',
      fiatBuyAmount: '1',
    })
  })
})

import type { AssetId } from '@shapeshiftoss/caip'
import { baseUnitToHuman, bn, convertPrecision } from 'lib/bignumber/bignumber'
import type { ProtocolFee } from 'lib/swapper/api'
import { BTC, ETH, FOX } from 'lib/swapper/swappers/utils/test-data/assets'
import { cryptoMarketDataById } from 'lib/swapper/swappers/utils/test-data/cryptoMarketDataById'

import { subtractBasisPointAmount, sumProtocolFeesToDenom } from './utils'

describe('sumProtocolFeesToDenom', () => {
  it("returns '0' for empty object", () => {
    const protocolFees: Record<AssetId, ProtocolFee> = {}

    const result = sumProtocolFeesToDenom({
      cryptoMarketDataById,
      outputExponent: FOX.precision,
      outputAssetPriceUsd: cryptoMarketDataById[FOX.assetId].price,
      protocolFees,
    })

    expect(result).toEqual('0')
  })

  it('can sum multiple protocol fees to a single big number string denominated in the target asset', () => {
    const protocolFees: Record<AssetId, ProtocolFee> = {
      [BTC.assetId]: {
        amountCryptoBaseUnit: '3000000', // 0.03 BTC
        asset: BTC,
        requiresBalance: false,
      },
      [ETH.assetId]: {
        amountCryptoBaseUnit: '500000000000000000', // 0.5 ETH
        asset: ETH,
        requiresBalance: false,
      },
    }

    const result = sumProtocolFeesToDenom({
      cryptoMarketDataById,
      outputExponent: FOX.precision,
      outputAssetPriceUsd: cryptoMarketDataById[FOX.assetId].price,
      protocolFees,
    })

    const btcToFoxPriceRatio = bn(cryptoMarketDataById[BTC.assetId].price).div(
      cryptoMarketDataById[FOX.assetId].price,
    )
    const ethToFoxPriceRatio = bn(cryptoMarketDataById[ETH.assetId].price).div(
      cryptoMarketDataById[FOX.assetId].price,
    )

    expect(btcToFoxPriceRatio.gt(0)).toBe(true)
    expect(ethToFoxPriceRatio.gt(0)).toBe(true)

    const btcAmountInFox = convertPrecision({
      value: '3000000',
      inputExponent: BTC.precision,
      outputExponent: FOX.precision,
    }).times(btcToFoxPriceRatio)

    const ethAmountInFox = convertPrecision({
      value: '500000000000000000',
      inputExponent: ETH.precision,
      outputExponent: FOX.precision,
    }).times(ethToFoxPriceRatio)

    const expectation = btcAmountInFox.plus(ethAmountInFox).toString()

    expect(result).toEqual(expectation)
  })

  it('can sum multiple protocol fees to USD', () => {
    const protocolFees: Record<AssetId, ProtocolFee> = {
      [BTC.assetId]: {
        amountCryptoBaseUnit: '3000000', // 0.03 BTC
        asset: BTC,
        requiresBalance: false,
      },
      [ETH.assetId]: {
        amountCryptoBaseUnit: '500000000000000000', // 0.5 ETH
        asset: ETH,
        requiresBalance: false,
      },
    }

    const result = sumProtocolFeesToDenom({
      cryptoMarketDataById,
      outputExponent: 0,
      outputAssetPriceUsd: '1',
      protocolFees,
    })

    const btcAmountInUsd = baseUnitToHuman({
      value: '3000000',
      inputExponent: BTC.precision,
    }).times(cryptoMarketDataById[BTC.assetId].price)

    const ethAmountInUsd = baseUnitToHuman({
      value: '500000000000000000',
      inputExponent: ETH.precision,
    }).times(cryptoMarketDataById[ETH.assetId].price)

    const expectation = btcAmountInUsd.plus(ethAmountInUsd).toString()

    expect(result).toEqual(expectation)
  })
})

describe('subtractBasisPoints', () => {
  test('should subtract 100 basis points correctly', () => {
    const result = subtractBasisPointAmount('100', '100')
    expect(result).toBe('99')
  })

  test('should subtract 0 basis points correctly', () => {
    const result = subtractBasisPointAmount('100', '0')
    expect(result).toBe('100')
  })

  test('should subtract 10000 basis points correctly', () => {
    const result = subtractBasisPointAmount('100', '10000')
    expect(result).toBe('0')
  })

  test('should subtract 20000 basis points correctly', () => {
    const result = subtractBasisPointAmount('100', '20000')
    expect(result).toBe('-100')
  })

  test('should handle very large numbers correctly', () => {
    const result = subtractBasisPointAmount('123456789012345678901234567890', '100')
    expect(result).toBe('122222221122222222112222222211.1')
  })

  test('should round up correctly', () => {
    const result = subtractBasisPointAmount('123456789012345678901234567890', '100', true)
    expect(result).toBe('122222221122222222112222222212')
  })
})

import type { AssetId } from '@shapeshiftoss/caip'
import type { ProtocolFee } from '@shapeshiftoss/swapper'
import { BTC, ETH, FOX_MAINNET } from '@shapeshiftoss/swapper/dist/swappers/utils/test-data/assets'
import { marketDataByAssetIdUsd } from '@shapeshiftoss/swapper/dist/swappers/utils/test-data/cryptoMarketDataById'
import { subtractBasisPointAmount } from '@shapeshiftoss/utils'
import BigNumber from 'bignumber.js'
import { describe, expect, it } from 'vitest'
import { baseUnitToHuman, bn, convertPrecision } from 'lib/bignumber/bignumber'
import { sumProtocolFeesToDenom } from 'state/slices/tradeQuoteSlice/utils'

describe('sumProtocolFeesToDenom', () => {
  it("returns '0' for empty object", () => {
    const protocolFees: Record<AssetId, ProtocolFee> = {}

    const result = sumProtocolFeesToDenom({
      marketDataByAssetIdUsd,
      outputExponent: FOX_MAINNET.precision,
      outputAssetPriceUsd: marketDataByAssetIdUsd[FOX_MAINNET.assetId].price,
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
      marketDataByAssetIdUsd,
      outputExponent: FOX_MAINNET.precision,
      outputAssetPriceUsd: marketDataByAssetIdUsd[FOX_MAINNET.assetId].price,
      protocolFees,
    })

    const btcToFoxPriceRatio = bn(marketDataByAssetIdUsd[BTC.assetId].price).div(
      marketDataByAssetIdUsd[FOX_MAINNET.assetId].price,
    )
    const ethToFoxPriceRatio = bn(marketDataByAssetIdUsd[ETH.assetId].price).div(
      marketDataByAssetIdUsd[FOX_MAINNET.assetId].price,
    )

    expect(btcToFoxPriceRatio.gt(0)).toBe(true)
    expect(ethToFoxPriceRatio.gt(0)).toBe(true)

    const btcAmountInFox = convertPrecision({
      value: '3000000',
      inputExponent: BTC.precision,
      outputExponent: FOX_MAINNET.precision,
    }).times(btcToFoxPriceRatio)

    const ethAmountInFox = convertPrecision({
      value: '500000000000000000',
      inputExponent: ETH.precision,
      outputExponent: FOX_MAINNET.precision,
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
      marketDataByAssetIdUsd,
      outputExponent: 0,
      outputAssetPriceUsd: '1',
      protocolFees,
    })

    const btcAmountInUsd = baseUnitToHuman({
      value: '3000000',
      inputExponent: BTC.precision,
    }).times(marketDataByAssetIdUsd[BTC.assetId].price)

    const ethAmountInUsd = baseUnitToHuman({
      value: '500000000000000000',
      inputExponent: ETH.precision,
    }).times(marketDataByAssetIdUsd[ETH.assetId].price)

    const expectation = btcAmountInUsd.plus(ethAmountInUsd).toString()

    expect(result).toEqual(expectation)
  })
})

describe('subtractBasisPoints', () => {
  it('should subtract 100 basis points correctly', () => {
    const result = subtractBasisPointAmount('100', '100')
    expect(result).toBe('99')
  })

  it('should subtract 0 basis points correctly', () => {
    const result = subtractBasisPointAmount('100', '0')
    expect(result).toBe('100')
  })

  it('should subtract 10000 basis points correctly', () => {
    const result = subtractBasisPointAmount('100', '10000')
    expect(result).toBe('0')
  })

  it('should subtract 20000 basis points correctly', () => {
    const result = subtractBasisPointAmount('100', '20000')
    expect(result).toBe('-100')
  })

  it('should handle very large numbers correctly', () => {
    const result = subtractBasisPointAmount('123456789012345678901234567890', '100')
    expect(result).toBe('122222221122222222112222222211.1')
  })

  it('should round up correctly', () => {
    const result = subtractBasisPointAmount(
      '123456789012345678901234567890',
      '100',
      BigNumber.ROUND_UP,
    )
    expect(result).toBe('122222221122222222112222222212')
  })
})

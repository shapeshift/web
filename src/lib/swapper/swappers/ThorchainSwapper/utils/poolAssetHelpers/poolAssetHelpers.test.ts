import { btcAssetId, ethAssetId } from '@shapeshiftoss/caip'
import {
  assetIdToPoolAssetId,
  poolAssetIdToAssetId,
} from 'lib/swapper/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'

describe('poolAssetHelpers', () => {
  const usdcAssetId = 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'

  describe('poolAssetIdToAssetId', () => {
    it('returns Ethereum assetId when poolAssetId is ETH.ETH', () => {
      const result = poolAssetIdToAssetId('ETH.ETH')
      expect(result).toEqual(ethAssetId)
    })

    it('returns Bitcoin assetId when poolAssetId is BTC.BTC', () => {
      const result = poolAssetIdToAssetId('BTC.BTC')
      expect(result).toEqual(btcAssetId)
    })

    it('returns ERC20 assetId when poolAssetId is in ERC20 format', () => {
      const result = poolAssetIdToAssetId('ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48')
      expect(result).toEqual(usdcAssetId)
    })

    it('returns undefined for an asset we dont support', () => {
      const result = poolAssetIdToAssetId('BNB.AVA-645')
      expect(result).toEqual(undefined)
    })

    it('returns undefined for an asset that uses asset abbreviations', () => {
      const result = poolAssetIdToAssetId('ETH.USDT-ec7')
      expect(result).toEqual(undefined)
    })
  })

  describe('assetIdToPoolAssetId', () => {
    it('returns Ethereum pool when assetId is ethAssetId', () => {
      const assetId = ethAssetId
      const result = assetIdToPoolAssetId({ assetId })
      const poolAssetId = 'ETH.ETH'
      expect(result).toEqual(poolAssetId)
    })

    it('returns bitcoin pool when assetId is btcAssetId', () => {
      const assetId = btcAssetId
      const result = assetIdToPoolAssetId({ assetId })
      const poolAssetId = 'BTC.BTC'
      expect(result).toEqual(poolAssetId)
    })

    it('returns USDC pool when assetId is usdc', () => {
      const assetId = usdcAssetId
      const result = assetIdToPoolAssetId({ assetId })
      const poolAssetId = 'ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48'
      expect(result).toEqual(poolAssetId)
    })

    it('returns undefined for an unsupported asset', () => {
      const assetId = 'foobar'
      const result = assetIdToPoolAssetId({ assetId })
      const poolAssetId = undefined
      expect(result).toEqual(poolAssetId)
    })
  })
})

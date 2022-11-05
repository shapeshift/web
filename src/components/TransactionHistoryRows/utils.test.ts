import { MaxUint256 } from '@ethersproject/constants'
import type { Asset } from '@keepkey/asset-service'
import { ethChainId, foxAssetId } from '@keepkey/caip'
import type { TxMetadata } from '@keepkey/chain-adapters'
import type { MarketData } from '@keepkey/types'
import { mockMarketData } from 'test/mocks/marketData'

import { makeAmountOrDefault } from './utils'

describe('TransactionHistoryRow/utils', () => {
  describe('makeAmountOrDefault', () => {
    const makeRestArgsTuple = ({
      value,
      marketData,
      asset,
      parser,
    }: {
      value: string
      marketData: MarketData
      asset: Asset
      parser: TxMetadata['parser']
    }): [string, MarketData, Asset, TxMetadata['parser']] => [value, marketData, asset, parser]

    const foxMarketData = mockMarketData({
      price: '1',
      supply: '415853375.7215277',
      maxSupply: '1000001337',
    })
    const foxAsset = {
      assetId: foxAssetId,
      chainId: ethChainId,
      name: 'Fox',
      precision: 18,
      color: '#222E51',
      icon: 'https://rawcdn.githack.com/trustwallet/assets/master/blockchains/ethereum/assets/0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d/logo.png',
      symbol: 'FOX',
      explorer: 'https://etherscan.io',
      explorerAddressLink: 'https://etherscan.io/address/',
      explorerTxLink: 'https://etherscan.io/tx/',
    }

    it('can parse erc20 parser revokes', () => {
      const args = makeRestArgsTuple({
        value: '0',
        marketData: foxMarketData,
        asset: foxAsset,
        parser: 'erc20',
      })

      const actual = makeAmountOrDefault(...args)
      const expected = 'transactionRow.parser.erc20.revoke'

      expect(actual).toEqual(expected)
    })

    it('can parse yearn parser revokes', () => {
      const args = makeRestArgsTuple({
        value: '0',
        marketData: foxMarketData,
        asset: foxAsset,
        parser: 'yearn',
      })

      const actual = makeAmountOrDefault(...args)
      const expected = 'transactionRow.parser.yearn.revoke'

      expect(actual).toEqual(expected)
    })

    it('can parse erc20 exact approvals', () => {
      const args = makeRestArgsTuple({
        value: '3000000000000000000',
        marketData: foxMarketData,
        asset: foxAsset,
        parser: 'erc20',
      })

      const actual = makeAmountOrDefault(...args)
      const expected = '3 FOX'

      expect(actual).toEqual(expected)
    })

    it('can parse yearn exact approvals', () => {
      const args = makeRestArgsTuple({
        value: '3000000000000000000',
        marketData: foxMarketData,
        asset: foxAsset,
        parser: 'yearn',
      })

      const actual = makeAmountOrDefault(...args)
      const expected = '3 FOX'

      expect(actual).toEqual(expected)
    })

    it('can parse erc20 infinite (max solidity uint256) approvals', () => {
      const args = makeRestArgsTuple({
        value: MaxUint256.toString(),
        marketData: foxMarketData,
        asset: foxAsset,
        parser: 'erc20',
      })

      const actual = makeAmountOrDefault(...args)
      const expected = 'transactionRow.parser.erc20.infinite'

      expect(actual).toEqual(expected)
    })

    it('can parse yearn infinite (max solidity uint256) approvals', () => {
      const args = makeRestArgsTuple({
        value: MaxUint256.toString(),
        marketData: foxMarketData,
        asset: foxAsset,
        parser: 'yearn',
      })

      const actual = makeAmountOrDefault(...args)
      const expected = 'transactionRow.parser.yearn.infinite'

      expect(actual).toEqual(expected)
    })
  })
})

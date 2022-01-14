import { BtcSend, EthReceive, EthSend, FOXSend, yearnVaultDeposit } from 'test/mocks/txs'

import { addToIndex, getRelatedAssetIds } from './utils'

describe('txHistorySlice:utils', () => {
  describe('getRelatedAssetIds', () => {
    const ethCAIP19 = 'eip155:1/slip44:60'
    const btcCAIP19 = 'bip122:000000000019d6689c085ae165831e93/slip44:0'
    const foxCAIP19 = 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'
    const usdcCAIP19 = 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
    const yvusdcCAIP19 = 'eip155:1/erc20:0x5f18c75abdae578b483e5f43f12a39cf75b973a9'

    it('can get related asset ids from eth send', () => {
      const relatedAssetIds = getRelatedAssetIds(EthSend)
      expect(relatedAssetIds.length).toEqual(1)
      expect(relatedAssetIds.includes(ethCAIP19)).toBeTruthy()
    })

    it('can get related asset ids from btc send', () => {
      const relatedAssetIds = getRelatedAssetIds(BtcSend)
      expect(relatedAssetIds.length).toEqual(1)
      expect(relatedAssetIds.includes(btcCAIP19)).toBeTruthy()
    })

    it('can get related asset ids from eth receive', () => {
      const relatedAssetIds = getRelatedAssetIds(EthReceive)
      expect(relatedAssetIds.length).toEqual(1)
      expect(relatedAssetIds.includes(ethCAIP19)).toBeTruthy()
    })

    it('can get related asset ids from fox send', () => {
      const relatedAssetIds = getRelatedAssetIds(FOXSend)
      expect(relatedAssetIds.length).toEqual(2)
      expect(relatedAssetIds.includes(foxCAIP19)).toBeTruthy()
      expect(relatedAssetIds.includes(ethCAIP19)).toBeTruthy()
    })

    it('can get related asset ids from yearn vault deposit', () => {
      const relatedAssetIds = getRelatedAssetIds(yearnVaultDeposit)
      expect(relatedAssetIds.length).toEqual(3)
      expect(relatedAssetIds.includes(ethCAIP19)).toBeTruthy()
      expect(relatedAssetIds.includes(usdcCAIP19)).toBeTruthy()
      expect(relatedAssetIds.includes(yvusdcCAIP19)).toBeTruthy()
    })
  })

  describe('addToIndex', () => {
    it('should add a new item to an empty index', () => {
      expect(addToIndex([1, 2], [], 2)).toStrictEqual([2])
    })

    it('should add a new item to an existing index', () => {
      expect(addToIndex([1, 2], [1], 2)).toStrictEqual([1, 2])
    })

    it('should not add a new item if it does not exist in the parent', () => {
      expect(addToIndex([1, 2], [1], 3)).toStrictEqual([1])
    })

    it('should maintain the sort order from the parent', () => {
      expect(addToIndex([2, 1, 3], [3], 1)).toStrictEqual([1, 3])
    })
  })
})

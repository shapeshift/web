import { btcAssetId, ethAssetId, foxAssetId } from '@shapeshiftoss/caip'
import { BtcSend, EthReceive, EthSend, FOXSend, yearnVaultDeposit } from 'test/mocks/txs'

import { getRelatedAssetIds } from './utils'

describe('txHistorySlice:utils', () => {
  describe('getRelatedAssetIds', () => {
    const usdcAssetId = 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
    const yvusdcAssetId = 'eip155:1/erc20:0x5f18c75abdae578b483e5f43f12a39cf75b973a9'

    it('can get related asset ids from eth send', () => {
      const relatedAssetIds = getRelatedAssetIds(EthSend)
      expect(relatedAssetIds.length).toEqual(1)
      expect(relatedAssetIds.includes(ethAssetId)).toBeTruthy()
    })

    it('can get related asset ids from btc send', () => {
      const relatedAssetIds = getRelatedAssetIds(BtcSend)
      expect(relatedAssetIds.length).toEqual(1)
      expect(relatedAssetIds.includes(btcAssetId)).toBeTruthy()
    })

    it('can get related asset ids from eth receive', () => {
      const relatedAssetIds = getRelatedAssetIds(EthReceive)
      expect(relatedAssetIds.length).toEqual(1)
      expect(relatedAssetIds.includes(ethAssetId)).toBeTruthy()
    })

    it('can get related asset ids from fox send', () => {
      const relatedAssetIds = getRelatedAssetIds(FOXSend)
      expect(relatedAssetIds.length).toEqual(2)
      expect(relatedAssetIds.includes(foxAssetId)).toBeTruthy()
      expect(relatedAssetIds.includes(ethAssetId)).toBeTruthy()
    })

    it('can get related asset ids from yearn vault deposit', () => {
      const relatedAssetIds = getRelatedAssetIds(yearnVaultDeposit)
      expect(relatedAssetIds.length).toEqual(3)
      expect(relatedAssetIds.includes(ethAssetId)).toBeTruthy()
      expect(relatedAssetIds.includes(usdcAssetId)).toBeTruthy()
      expect(relatedAssetIds.includes(yvusdcAssetId)).toBeTruthy()
    })
  })
})

import type { AssetId } from '@shapeshiftoss/caip'
import { btcAssetId, ethAssetId, foxAssetId } from '@shapeshiftoss/caip'
import { TransferType } from '@shapeshiftoss/unchained-client'
import { describe, expect, it } from 'vitest'

import type { Tx } from './txHistorySlice'
import { getRelatedAssetIds, isSpam } from './utils'

import { BtcSend, EthReceive, EthSend, FOXSend, yearnVaultDeposit } from '@/test/mocks/txs'

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

  describe('isSpam', () => {
    const aiccAssetId: AssetId = 'eip155:1/erc20:0x66a3c2fa3e467aa586e90912f977e648589cabaf'

    const makeAirdrop = (assetId: AssetId): Tx => ({
      ...EthReceive,
      fee: undefined,
      transfers: [
        {
          assetId,
          from: [EthReceive.pubkey],
          to: [EthReceive.pubkey],
          value: '1000000000000000000',
          type: TransferType.Receive,
          token: { contract: assetId, decimals: 18, name: 'AI Chain Coin', symbol: 'AICC' },
        },
      ],
    })

    it('marks blacklisted asset ids as spam despite legitimate looking token text', () => {
      expect(isSpam(makeAirdrop(aiccAssetId))).toBe(true)
    })

    it('does not mark legitimate token transfers as spam', () => {
      expect(isSpam(makeAirdrop(foxAssetId))).toBe(false)
    })

    it('does not mark regular transactions as spam', () => {
      expect(isSpam(EthReceive)).toBe(false)
      expect(isSpam(FOXSend)).toBe(false)
    })
  })
})

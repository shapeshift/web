import { tonAssetId, tonChainId } from '@shapeshiftoss/caip'
import { TransferType, TxStatus } from '@shapeshiftoss/unchained-client'
import { describe, expect, it } from 'vitest'

import { ChainAdapter } from './TonChainAdapter'
import type { TonTx } from './types'

const makeAdapter = () => new ChainAdapter({ rpcUrl: 'https://toncenter.com/api/v2/jsonRPC' })

const USER_BOUNCEABLE = 'EQBcJJt0qGjd4ts1kqFNfLro72PH2PnmXouQ3KIyTacvqAug'
const USER_NON_BOUNCEABLE = 'UQBcJJt0qGjd4ts1kqFNfLro72PH2PnmXouQ3KIyTacvqFZl'
const USER_RAW = '0:5c249b74a868dde2db3592a14d7cbae8ef63c7d8f9e65e8b90dca2324da72fa8'
const OTHER_ADDR = 'EQB3ncyBUTjZUA5EnFKR5_EnOMI9V1tTEAAPaiU71gc4TiUt'

describe('TonChainAdapter', () => {
  describe('base64ToHex', () => {
    it('should convert base64 hash to hex', () => {
      const adapter = makeAdapter() as any
      const b64 = 'uCnridS8+EbeKRJG2U/6Lqa7oh7urDUASq/UnyRnfnY='
      const hex = adapter.base64ToHex(b64)
      expect(hex).toBe('b829eb89d4bcf846de291246d94ffa2ea6bba21eeeac35004aafd49f24677e76')
    })

    it('should return empty string for empty input', () => {
      const adapter = makeAdapter() as any
      expect(adapter.base64ToHex('')).toBe('')
    })

    it('should return input on invalid base64', () => {
      const adapter = makeAdapter() as any
      expect(adapter.base64ToHex('not-valid-base64!!!')).toBeTruthy()
    })
  })

  describe('hexToBase64', () => {
    it('should convert hex hash to base64', () => {
      const adapter = makeAdapter() as any
      const hex = 'b829eb89d4bcf846de291246d94ffa2ea6bba21eeeac35004aafd49f24677e76'
      const b64 = adapter.hexToBase64(hex)
      expect(adapter.base64ToHex(b64)).toBe(hex)
    })

    it('should roundtrip known hash correctly', () => {
      const adapter = makeAdapter() as any
      const b64 = 'uCnridS8+EbeKRJG2U/6Lqa7oh7urDUASq/UnyRnfnY='
      const hex = adapter.base64ToHex(b64)
      expect(adapter.hexToBase64(hex)).toBe(b64)
    })
  })

  describe('isHexHash', () => {
    it('should return true for valid 64-char hex string', () => {
      const adapter = makeAdapter() as any
      expect(
        adapter.isHexHash('b829ebad4bcf846de291246d94ffa2ea6bba21eeeac35004aafd49f24677e760'),
      ).toBe(true)
    })

    it('should return false for base64 strings', () => {
      const adapter = makeAdapter() as any
      expect(adapter.isHexHash('uCnridS8+EbeKRJG2U/6Lqa7oh7urDUASq/UnyRnfnY=')).toBe(false)
    })

    it('should return false for wrong length', () => {
      const adapter = makeAdapter() as any
      expect(adapter.isHexHash('abcd')).toBe(false)
    })
  })

  describe('addressesMatch', () => {
    it('should match identical addresses', () => {
      const adapter = makeAdapter() as any
      expect(adapter.addressesMatch(USER_BOUNCEABLE, USER_BOUNCEABLE)).toBe(true)
    })

    it('should match bounceable and non-bounceable formats', () => {
      const adapter = makeAdapter() as any
      expect(adapter.addressesMatch(USER_BOUNCEABLE, USER_NON_BOUNCEABLE)).toBe(true)
    })

    it('should match raw and user-friendly formats', () => {
      const adapter = makeAdapter() as any
      expect(adapter.addressesMatch(USER_RAW, USER_BOUNCEABLE)).toBe(true)
    })

    it('should return false for different addresses', () => {
      const adapter = makeAdapter() as any
      expect(adapter.addressesMatch(USER_BOUNCEABLE, OTHER_ADDR)).toBe(false)
    })

    it('should return false for empty strings', () => {
      const adapter = makeAdapter() as any
      expect(adapter.addressesMatch('', USER_BOUNCEABLE)).toBe(false)
      expect(adapter.addressesMatch(USER_BOUNCEABLE, '')).toBe(false)
    })

    it('should match raw addresses with different casing via fallback', () => {
      const adapter = makeAdapter() as any
      const raw1 = '0:5c249b74a868dde2db3592a14d7cbae8ef63c7d8f9e65e8b90dca2324da72fa8'
      const raw2 = '0:5C249B74A868DDE2DB3592A14D7CBAE8EF63C7D8F9E65E8B90DCA2324DA72FA8'
      expect(adapter.addressesMatch(raw1, raw2)).toBe(true)
    })
  })

  describe('isProxyTon', () => {
    it('should identify Stonfi pTON v1 contract', () => {
      const adapter = makeAdapter() as any
      expect(adapter.isProxyTon('EQCM3B12QK1e4yZSf8GtBRT0aLMNyEsBc_DhVfRRtOEffLez')).toBe(true)
    })

    it('should identify Stonfi pTON v2 contract', () => {
      const adapter = makeAdapter() as any
      expect(adapter.isProxyTon('EQBnGWMCf3-FZZq1W4IWcWiGAc3PHuZ0_H-7sad2oY00o83S')).toBe(true)
    })

    it('should return false for non-pTON contract', () => {
      const adapter = makeAdapter() as any
      expect(adapter.isProxyTon('EQCxE6mUtQJKFnGF38OGN028eTz_ElukRFBY9iUYncP00Ash')).toBe(false)
    })

    it('should return false for invalid address', () => {
      const adapter = makeAdapter() as any
      expect(adapter.isProxyTon('not-an-address')).toBe(false)
    })
  })

  describe('resolveAddresses', () => {
    it('should resolve raw addresses to user-friendly via address book', () => {
      const adapter = makeAdapter() as any
      const tx: TonTx = {
        account: 'raw-account',
        hash: 'abc',
        lt: '100',
        now: 1000,
        total_fees: '1000',
        in_msg: {
          source: '0:abc',
          destination: '0:def',
          value: '100000000',
        },
        out_msgs: [
          {
            source: '0:def',
            destination: '0:ghi',
            value: '50000000',
          },
        ],
      }
      const addressBook = {
        '0:abc': { user_friendly: 'EQabc...' },
        '0:def': { user_friendly: 'EQdef...' },
      }

      const resolved = adapter.resolveAddresses(tx, addressBook)
      expect(resolved.in_msg?.source).toBe('EQabc...')
      expect(resolved.in_msg?.destination).toBe('EQdef...')
      expect(resolved.out_msgs?.[0]?.source).toBe('EQdef...')
      expect(resolved.out_msgs?.[0]?.destination).toBe('0:ghi')
    })

    it('should preserve addresses not in address book', () => {
      const adapter = makeAdapter() as any
      const tx: TonTx = {
        account: 'raw-account',
        hash: 'abc',
        lt: '100',
        now: 1000,
        total_fees: '1000',
        in_msg: {
          source: '0:unknown',
          destination: '0:also-unknown',
          value: '100',
        },
      }

      const resolved = adapter.resolveAddresses(tx, {})
      expect(resolved.in_msg?.source).toBe('0:unknown')
      expect(resolved.in_msg?.destination).toBe('0:also-unknown')
    })

    it('should handle tx with no messages', () => {
      const adapter = makeAdapter() as any
      const tx: TonTx = {
        account: 'raw-account',
        hash: 'abc',
        lt: '100',
        now: 1000,
        total_fees: '1000',
      }

      const resolved = adapter.resolveAddresses(tx, {})
      expect(resolved.in_msg).toBeUndefined()
      expect(resolved.out_msgs).toBeUndefined()
    })
  })

  describe('parse', () => {
    it('should parse a simple TON receive', () => {
      const adapter = makeAdapter() as any
      const tx: TonTx = {
        account: USER_BOUNCEABLE,
        hash: 'abc=',
        lt: '12345',
        now: 1700000000,
        total_fees: '1000',
        in_msg: {
          source: OTHER_ADDR,
          destination: USER_BOUNCEABLE,
          value: '1000000000',
        },
      }

      const result = adapter.parse(tx, USER_BOUNCEABLE, 'abc123')
      expect(result.status).toBe(TxStatus.Confirmed)
      expect(result.transfers).toHaveLength(1)
      expect(result.transfers[0]).toMatchObject({
        type: TransferType.Receive,
        assetId: tonAssetId,
        value: '1000000000',
      })
      expect(result.fee).toBeUndefined()
    })

    it('should parse a simple TON send via out_msg', () => {
      const adapter = makeAdapter() as any
      const tx: TonTx = {
        account: USER_BOUNCEABLE,
        hash: 'abc=',
        lt: '12345',
        now: 1700000000,
        total_fees: '5000',
        out_msgs: [
          {
            source: USER_BOUNCEABLE,
            destination: OTHER_ADDR,
            value: '500000000',
          },
        ],
      }

      const result = adapter.parse(tx, USER_BOUNCEABLE, 'def456')
      expect(result.transfers).toHaveLength(1)
      expect(result.transfers[0]).toMatchObject({
        type: TransferType.Send,
        value: '500000000',
      })
      expect(result.fee).toEqual({
        assetId: tonAssetId,
        value: '5000',
      })
    })

    it('should parse self-send as both Send and Receive', () => {
      const adapter = makeAdapter() as any
      const tx: TonTx = {
        account: USER_BOUNCEABLE,
        hash: 'abc=',
        lt: '12345',
        now: 1700000000,
        total_fees: '1000',
        out_msgs: [
          {
            source: USER_BOUNCEABLE,
            destination: USER_BOUNCEABLE,
            value: '100000000',
          },
        ],
      }

      const result = adapter.parse(tx, USER_BOUNCEABLE, 'self-send')
      expect(result.transfers).toHaveLength(2)
      expect(result.transfers[0].type).toBe(TransferType.Send)
      expect(result.transfers[1].type).toBe(TransferType.Receive)
    })

    it('should deduplicate self-send transfers across trace txs', () => {
      const adapter = makeAdapter() as any
      const traceTx1: TonTx = {
        account: USER_BOUNCEABLE,
        hash: 'tx1=',
        lt: '12345',
        now: 1700000000,
        total_fees: '1000',
        trace_id: 'trace1=',
        out_msgs: [
          {
            source: USER_BOUNCEABLE,
            destination: USER_BOUNCEABLE,
            value: '74074074',
          },
        ],
      }
      const traceTx2: TonTx = {
        account: USER_BOUNCEABLE,
        hash: 'tx2=',
        lt: '12346',
        now: 1700000000,
        total_fees: '500',
        trace_id: 'trace1=',
        in_msg: {
          source: USER_BOUNCEABLE,
          destination: USER_BOUNCEABLE,
          value: '74074074',
        },
      }

      const seen = new Set<string>()
      const nativeTransfers: { from: string[]; to: string[]; value: string; type: string }[] = []

      for (const traceTx of [traceTx1, traceTx2]) {
        const parsed = adapter.parse(traceTx, USER_BOUNCEABLE, 'self-send-dedup')
        for (const transfer of parsed.transfers) {
          const key = `${transfer.from[0]}-${transfer.to[0]}-${transfer.value}-${transfer.type}`
          if (seen.has(key)) continue
          seen.add(key)
          nativeTransfers.push(transfer)
        }
      }

      expect(nativeTransfers).toHaveLength(2)
      expect(nativeTransfers[0].type).toBe(TransferType.Send)
      expect(nativeTransfers[0].value).toBe('74074074')
      expect(nativeTransfers[1].type).toBe(TransferType.Receive)
      expect(nativeTransfers[1].value).toBe('74074074')
    })

    it('should use decoded ton_amount for pton_ton_transfer messages', () => {
      const adapter = makeAdapter() as any
      const tx: TonTx = {
        account: USER_BOUNCEABLE,
        hash: 'abc=',
        lt: '12345',
        now: 1700000000,
        total_fees: '5000',
        out_msgs: [
          {
            source: USER_BOUNCEABLE,
            destination: 'EQRouter...',
            value: '294074074',
            message_content: {
              decoded: {
                '@type': 'pton_ton_transfer',
                ton_amount: {
                  amount: {
                    value: '74074074',
                  },
                },
              },
            },
          },
        ],
      }

      const result = adapter.parse(tx, USER_BOUNCEABLE, 'swap-tx')
      expect(result.transfers).toHaveLength(1)
      expect(result.transfers[0]).toMatchObject({
        type: TransferType.Send,
        value: '74074074',
      })
    })

    it('should use raw value when decoded is not pton_ton_transfer', () => {
      const adapter = makeAdapter() as any
      const tx: TonTx = {
        account: USER_BOUNCEABLE,
        hash: 'abc=',
        lt: '12345',
        now: 1700000000,
        total_fees: '1000',
        out_msgs: [
          {
            source: USER_BOUNCEABLE,
            destination: OTHER_ADDR,
            value: '260000000',
            message_content: {
              decoded: {
                '@type': 'jetton_transfer',
              },
            },
          },
        ],
      }

      const result = adapter.parse(tx, USER_BOUNCEABLE, 'jetton-transfer')
      expect(result.transfers).toHaveLength(1)
      expect(result.transfers[0].value).toBe('260000000')
    })

    it('should mark failed tx from aborted description', () => {
      const adapter = makeAdapter() as any
      const tx: TonTx = {
        account: USER_BOUNCEABLE,
        hash: 'abc=',
        lt: '12345',
        now: 1700000000,
        total_fees: '1000',
        description: { aborted: true },
        in_msg: {
          source: OTHER_ADDR,
          destination: USER_BOUNCEABLE,
          value: '100',
        },
      }

      const result = adapter.parse(tx, USER_BOUNCEABLE, 'failed-tx')
      expect(result.status).toBe(TxStatus.Failed)
    })

    it('should skip excess messages (gas refunds)', () => {
      const adapter = makeAdapter() as any
      const tx: TonTx = {
        account: USER_BOUNCEABLE,
        hash: 'abc=',
        lt: '12345',
        now: 1700000000,
        total_fees: '1000',
        in_msg: {
          source: OTHER_ADDR,
          destination: USER_BOUNCEABLE,
          value: '45842400',
          message_content: {
            decoded: {
              '@type': 'excess',
            },
          },
        },
      }

      const result = adapter.parse(tx, USER_BOUNCEABLE, 'excess-tx')
      expect(result.transfers).toHaveLength(0)
    })

    it('should keep non-excess in_msg receives', () => {
      const adapter = makeAdapter() as any
      const tx: TonTx = {
        account: USER_BOUNCEABLE,
        hash: 'abc=',
        lt: '12345',
        now: 1700000000,
        total_fees: '1000',
        in_msg: {
          source: OTHER_ADDR,
          destination: USER_BOUNCEABLE,
          value: '105991706',
          message_content: {
            decoded: {
              '@type': 'dedust_payout',
            },
          },
        },
      }

      const result = adapter.parse(tx, USER_BOUNCEABLE, 'payout-tx')
      expect(result.transfers).toHaveLength(1)
      expect(result.transfers[0]).toMatchObject({
        type: TransferType.Receive,
        value: '105991706',
      })
    })

    it('should skip transfers with zero value', () => {
      const adapter = makeAdapter() as any
      const tx: TonTx = {
        account: USER_BOUNCEABLE,
        hash: 'abc=',
        lt: '12345',
        now: 1700000000,
        total_fees: '1000',
        in_msg: {
          source: OTHER_ADDR,
          destination: USER_BOUNCEABLE,
          value: '0',
        },
      }

      const result = adapter.parse(tx, USER_BOUNCEABLE, 'zero-value')
      expect(result.transfers).toHaveLength(0)
    })
  })

  describe('buildJettonTransfers', () => {
    const USDT_MASTER = 'EQCxE6mUtQJKFnGF38OGN028eTz_ElukRFBY9iUYncP00Ash'

    it('should match jetton transfers by trace_id', () => {
      const adapter = makeAdapter() as any
      const jettonTransfers = [
        {
          source: USER_BOUNCEABLE,
          destination: 'EQPool...',
          amount: '20000',
          jetton_master: USDT_MASTER,
          trace_id: 'trace-1',
        },
        {
          source: 'EQOther...',
          destination: 'EQPool...',
          amount: '50000',
          jetton_master: USDT_MASTER,
          trace_id: 'trace-2',
        },
      ]

      const result = adapter.buildJettonTransfers(jettonTransfers, 'trace-1', USER_BOUNCEABLE, {})
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: TransferType.Send,
        value: '20000',
      })
    })

    it('should filter out proxy TON transfers', () => {
      const adapter = makeAdapter() as any
      const jettonTransfers = [
        {
          source: 'EQSomeWallet...',
          destination: USER_BOUNCEABLE,
          amount: '74074074',
          jetton_master: 'EQCM3B12QK1e4yZSf8GtBRT0aLMNyEsBc_DhVfRRtOEffLez',
          trace_id: 'trace-1',
        },
      ]

      const result = adapter.buildJettonTransfers(jettonTransfers, 'trace-1', USER_BOUNCEABLE, {})
      expect(result).toHaveLength(0)
    })

    it('should handle receive transfers', () => {
      const adapter = makeAdapter() as any
      const jettonTransfers = [
        {
          source: 'EQPool...',
          destination: USER_BOUNCEABLE,
          amount: '99562',
          jetton_master: USDT_MASTER,
          trace_id: 'trace-1',
        },
      ]

      const result = adapter.buildJettonTransfers(jettonTransfers, 'trace-1', USER_BOUNCEABLE, {})
      expect(result).toHaveLength(1)
      expect(result[0].type).toBe(TransferType.Receive)
      expect(result[0].value).toBe('99562')
    })

    it('should return empty array for no matching trace_id', () => {
      const adapter = makeAdapter() as any
      const jettonTransfers = [
        {
          source: USER_BOUNCEABLE,
          destination: 'EQPool...',
          amount: '20000',
          jetton_master: USDT_MASTER,
          trace_id: 'trace-other',
        },
      ]

      const result = adapter.buildJettonTransfers(jettonTransfers, 'trace-1', USER_BOUNCEABLE, {})
      expect(result).toHaveLength(0)
    })

    it('should resolve addresses via address book', () => {
      const adapter = makeAdapter() as any
      const rawSource = '0:SOURCE_RAW'
      const rawDest = '0:DEST_RAW'
      const rawMaster = '0:MASTER_RAW'
      const jettonTransfers = [
        {
          source: rawSource,
          destination: rawDest,
          amount: '10000',
          jetton_master: rawMaster,
          trace_id: 'trace-1',
        },
      ]
      const addressBook = {
        [rawSource]: { user_friendly: USER_BOUNCEABLE },
        [rawDest]: { user_friendly: 'EQPool...' },
        [rawMaster]: { user_friendly: USDT_MASTER },
      }

      const result = adapter.buildJettonTransfers(
        jettonTransfers,
        'trace-1',
        USER_BOUNCEABLE,
        addressBook,
      )
      expect(result).toHaveLength(1)
      expect(result[0].type).toBe(TransferType.Send)
    })

    it('should skip transfers with missing required fields', () => {
      const adapter = makeAdapter() as any
      const jettonTransfers = [
        {
          source: USER_BOUNCEABLE,
          destination: 'EQPool...',
          jetton_master: USDT_MASTER,
          trace_id: 'trace-1',
        },
      ]

      const result = adapter.buildJettonTransfers(jettonTransfers, 'trace-1', USER_BOUNCEABLE, {})
      expect(result).toHaveLength(0)
    })
  })

  describe('validateAddress', () => {
    it('should accept valid bounceable address', async () => {
      const adapter = makeAdapter()
      const result = await adapter.validateAddress(USER_BOUNCEABLE)
      expect(result.valid).toBe(true)
    })

    it('should accept valid non-bounceable address', async () => {
      const adapter = makeAdapter()
      const result = await adapter.validateAddress(USER_NON_BOUNCEABLE)
      expect(result.valid).toBe(true)
    })

    it('should reject invalid address', async () => {
      const adapter = makeAdapter()
      const result = await adapter.validateAddress('not-an-address')
      expect(result.valid).toBe(false)
    })
  })

  describe('getBip44Params', () => {
    it('should return correct params for account 0', () => {
      const adapter = makeAdapter()
      const params = adapter.getBip44Params({ accountNumber: 0 })
      expect(params).toMatchObject({
        purpose: 44,
        accountNumber: 0,
      })
    })

    it('should throw for negative account number', () => {
      const adapter = makeAdapter()
      expect(() => adapter.getBip44Params({ accountNumber: -1 })).toThrow()
    })
  })

  describe('getType', () => {
    it('should return TonMainnet', () => {
      const adapter = makeAdapter()
      expect(adapter.getType()).toBe('ton:mainnet')
    })
  })

  describe('getChainId', () => {
    it('should return ton chain ID', () => {
      const adapter = makeAdapter()
      expect(adapter.getChainId()).toBe(tonChainId)
    })
  })

  describe('getFeeAssetId', () => {
    it('should return ton asset ID', () => {
      const adapter = makeAdapter()
      expect(adapter.getFeeAssetId()).toBe(tonAssetId)
    })
  })
})

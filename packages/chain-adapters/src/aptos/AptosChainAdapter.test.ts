import type * as AptosSdkActual from '@aptos-labs/ts-sdk'
import { aptosAssetId, aptosChainId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import { TransferType, TxStatus } from '@shapeshiftoss/unchained-client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ValidAddressResultType } from '../types'
import { ChainAdapter } from './AptosChainAdapter'

vi.mock('@aptos-labs/ts-sdk', async () => {
  // Keep real exports (AccountAddress, Ed25519PublicKey, BCS helpers, etc.) and only
  // mock the network-using Aptos client + AptosConfig + Network enum.
  const actual = await vi.importActual<typeof AptosSdkActual>('@aptos-labs/ts-sdk')
  return {
    ...actual,
    Aptos: vi.fn().mockImplementation(function () {
      return {
        getAccountCoinsData: vi.fn(),
        getGasPriceEstimation: vi.fn(),
        account: { getAccountInfo: vi.fn() },
        transaction: {
          getTransactionByHash: vi.fn(),
          build: {
            simple: vi
              .fn()
              .mockResolvedValue({ rawTransaction: { bcsToBytes: () => new Uint8Array() } }),
          },
          simulate: { simple: vi.fn() },
        },
      }
    }),
    AptosConfig: vi.fn(),
    Network: { MAINNET: 'mainnet' },
  }
})

const ADDR = '0x304ba231cacfd0b8ee2b3b3b0aa8ef3648f4efffa7080be996c57c107750eb22'
const SENDER = '0xd1a1c1804e91ba85a569c7f018bb7502d2f13d4742d2611953c9c14681af6446'
const APT_COIN_TYPE = '0x1::aptos_coin::AptosCoin'
const USDC_FA = '0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b'
const LEGACY_USDC =
  '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC'

const newAdapter = () =>
  new ChainAdapter({
    rpcUrl: 'https://fullnode.mainnet.aptoslabs.com',
    indexerUrl: 'https://api.mainnet.aptoslabs.com',
  })

const getMockedClient = (adapter: ChainAdapter) =>
  (adapter as unknown as { client: Record<string, any> }).client

describe('AptosChainAdapter', () => {
  let adapter: ChainAdapter
  let client: Record<string, any>

  beforeEach(() => {
    adapter = newAdapter()
    client = getMockedClient(adapter)
  })

  describe('basic getters', () => {
    it('exposes the canonical chainId and assetId', () => {
      expect(adapter.getChainId()).toBe(aptosChainId)
      expect(adapter.getFeeAssetId()).toBe(aptosAssetId)
      expect(adapter.getType()).toBe(KnownChainIds.AptosMainnet)
    })

    it('builds hardened BIP44 params on coin type 637', () => {
      const params = adapter.getBip44Params({ accountNumber: 0 })
      expect(params).toMatchObject({
        purpose: 44,
        coinType: 637,
        accountNumber: 0,
        addressIndex: 0,
        isChange: false,
      })
    })

    it('rejects negative account numbers', () => {
      expect(() => adapter.getBip44Params({ accountNumber: -1 })).toThrow()
    })
  })

  describe('validateAddress', () => {
    it('accepts 64-hex address with 0x prefix', async () => {
      const r = await adapter.validateAddress(ADDR)
      expect(r).toEqual({ valid: true, result: ValidAddressResultType.Valid })
    })

    it('rejects a 64-hex address without the 0x prefix', async () => {
      const r = await adapter.validateAddress(ADDR.slice(2))
      expect(r.valid).toBe(false)
    })

    it('rejects a short-form address', async () => {
      const r = await adapter.validateAddress(`0x${ADDR.slice(3)}`)
      expect(r.valid).toBe(false)
    })

    it.each(['0x1', 'a', `0x${'0'.repeat(63)}a`])(
      'rejects reserved framework address %s',
      async address => {
        const r = await adapter.validateAddress(address)
        expect(r.valid).toBe(false)
      },
    )

    it('rejects non-hex content', async () => {
      const r = await adapter.validateAddress('0x' + 'z'.repeat(64))
      expect(r.valid).toBe(false)
    })

    it('rejects garbage strings', async () => {
      const r = await adapter.validateAddress('not-an-address')
      expect(r.valid).toBe(false)
    })
  })

  describe('getAccount', () => {
    it('returns native APT balance when only APT is held', async () => {
      client.getAccountCoinsData.mockResolvedValueOnce([
        {
          asset_type: APT_COIN_TYPE,
          amount: '103970825',
          metadata: { symbol: 'APT', name: 'Aptos Coin', decimals: 8 },
        },
      ])

      const acct = await adapter.getAccount(ADDR)
      expect(acct.balance).toBe('103970825')
      expect(acct.assetId).toBe(aptosAssetId)
      expect(acct.chainSpecific.tokens).toEqual([])
    })

    it('populates chainSpecific.tokens with FA tokens, keeping APT separate', async () => {
      client.getAccountCoinsData.mockResolvedValueOnce([
        {
          asset_type: APT_COIN_TYPE,
          amount: '103970825',
          metadata: { symbol: 'APT', name: 'Aptos Coin', decimals: 8 },
        },
        {
          asset_type: USDC_FA,
          amount: '5000000',
          metadata: { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
        },
      ])

      const acct = await adapter.getAccount(ADDR)
      expect(acct.balance).toBe('103970825')
      expect(acct.chainSpecific.tokens).toEqual([
        {
          assetId: `aptos:1/fungible:${USDC_FA}`,
          balance: '5000000',
          symbol: 'USDC',
          name: 'USD Coin',
          precision: 6,
        },
      ])
    })

    it('filters out zero-amount entries', async () => {
      client.getAccountCoinsData.mockResolvedValueOnce([
        {
          asset_type: APT_COIN_TYPE,
          amount: '0',
          metadata: { symbol: 'APT', name: 'Aptos Coin', decimals: 8 },
        },
        {
          asset_type: USDC_FA,
          amount: '0',
          metadata: { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
        },
      ])

      const acct = await adapter.getAccount(ADDR)
      expect(acct.balance).toBe('0')
      expect(acct.chainSpecific.tokens).toEqual([])
    })

    it('falls back to UNKNOWN symbol when metadata is missing', async () => {
      client.getAccountCoinsData.mockResolvedValueOnce([
        { asset_type: USDC_FA, amount: '42', metadata: null },
      ])

      const acct = await adapter.getAccount(ADDR)
      expect(acct.chainSpecific.tokens?.[0]).toMatchObject({
        symbol: 'UNKNOWN',
        name: USDC_FA,
        precision: 0,
      })
    })
  })

  describe('buildSendApiTransaction', () => {
    const build = (contractAddress: string | undefined) =>
      adapter.buildSendApiTransaction({
        from: SENDER,
        to: ADDR,
        value: '1000',
        accountNumber: 0,
        chainSpecific: { contractAddress, gasUnitPrice: '150', maxGasAmount: '210' },
      })

    const getBuiltData = () => client.transaction.build.simple.mock.calls.at(-1)[0].data

    it('builds with the supplied gas price and limit without simulating', async () => {
      await build(undefined)
      expect(client.transaction.build.simple.mock.calls.at(-1)[0].options).toEqual({
        gasUnitPrice: 150,
        maxGasAmount: 210,
      })
      expect(client.transaction.simulate.simple).not.toHaveBeenCalled()
    })

    it('sends APT with transfer_coins<AptosCoin>', async () => {
      await build(undefined)
      expect(getBuiltData()).toMatchObject({
        function: '0x1::aptos_account::transfer_coins',
        typeArguments: [APT_COIN_TYPE],
        functionArguments: [ADDR, 1000n],
      })
    })

    it('sends a legacy coin with transfer_coins<T>', async () => {
      await build(LEGACY_USDC)
      expect(getBuiltData()).toMatchObject({
        function: '0x1::aptos_account::transfer_coins',
        typeArguments: [LEGACY_USDC],
        functionArguments: [ADDR, 1000n],
      })
    })

    it('sends a fungible asset with primary_fungible_store::transfer', async () => {
      await build(USDC_FA)
      expect(getBuiltData()).toMatchObject({
        function: '0x1::primary_fungible_store::transfer',
        typeArguments: ['0x1::fungible_asset::Metadata'],
        functionArguments: [USDC_FA, ADDR, 1000n],
      })
    })
  })

  describe('getFeeData', () => {
    const getFeeData = () =>
      adapter.getFeeData({
        to: ADDR,
        value: '1000',
        chainSpecific: { from: SENDER, contractAddress: USDC_FA },
      })

    // mainnet fee statement of an apt transfer that creates the recipient account
    const simulation = {
      success: true,
      events: [
        {
          type: '0x1::transaction_fee::FeeStatement',
          data: {
            execution_gas_units: '55',
            io_gas_units: '106',
            storage_fee_octas: '532400',
            storage_fee_refund_octas: '0',
            total_charge_gas_units: '5484',
          },
        },
      ],
    }

    beforeEach(() => {
      client.getGasPriceEstimation.mockResolvedValue({
        deprioritized_gas_estimate: 50,
        gas_estimate: 100,
        prioritized_gas_estimate: 150,
      })
    })

    it('prices each tier from the simulated fee statement at its own gas price', async () => {
      client.transaction.simulate.simple.mockResolvedValueOnce([simulation])

      const fees = await getFeeData()

      expect(client.transaction.build.simple.mock.calls[0][0].data).toMatchObject({
        function: '0x1::primary_fungible_store::transfer',
        functionArguments: [USDC_FA, ADDR, 1000n],
      })
      expect(fees).toEqual({
        fast: { txFee: '556650', chainSpecific: { gasUnitPrice: '150', maxGasAmount: '4453' } },
        average: { txFee: '548500', chainSpecific: { gasUnitPrice: '100', maxGasAmount: '6582' } },
        slow: { txFee: '540450', chainSpecific: { gasUnitPrice: '50', maxGasAmount: '12970' } },
      })
    })

    it('throws when the simulation has no fee statement', async () => {
      client.transaction.simulate.simple.mockResolvedValueOnce([{ success: true, events: [] }])

      await expect(getFeeData()).rejects.toThrow()
    })

    it('simulates a 1 octa transfer for a max apt send', async () => {
      client.transaction.simulate.simple.mockResolvedValueOnce([simulation])

      await adapter.getFeeData({
        to: ADDR,
        value: '198633150',
        sendMax: true,
        chainSpecific: { from: SENDER, contractAddress: undefined },
      })

      expect(client.transaction.build.simple.mock.calls[0][0].data.functionArguments).toEqual([
        ADDR,
        1n,
      ])
    })

    it('throws when the simulation fails', async () => {
      client.transaction.simulate.simple.mockResolvedValueOnce([
        { success: false, gas_used: '0', vm_status: 'INSUFFICIENT_BALANCE' },
      ])

      await expect(getFeeData()).rejects.toThrow()
    })
  })

  describe('parseTx', () => {
    const makeTx = (overrides: Record<string, unknown> = {}) => ({
      type: 'user_transaction',
      hash: '0xtxhash',
      version: '5276796244',
      timestamp: '1747000000000000', // microseconds
      success: true,
      gas_used: '151',
      gas_unit_price: '100',
      sender: SENDER,
      payload: {
        type: 'entry_function_payload',
        function: '0x1::aptos_account::transfer_coins',
        type_arguments: [APT_COIN_TYPE],
        arguments: [ADDR, '9423057'],
      },
      ...overrides,
    })

    it('attributes a Receive transfer for inbound APT', async () => {
      client.transaction.getTransactionByHash.mockResolvedValueOnce(makeTx())
      const tx = await adapter.parseTx('0xtxhash', ADDR)

      expect(tx.status).toBe(TxStatus.Confirmed)
      expect(tx.fee).toBeUndefined()
      expect(tx.transfers).toEqual([
        {
          assetId: aptosAssetId,
          from: [SENDER],
          to: [ADDR],
          type: TransferType.Receive,
          value: '9423057',
        },
      ])
    })

    it('attributes a Send transfer for outbound APT', async () => {
      client.transaction.getTransactionByHash.mockResolvedValueOnce(makeTx())
      const tx = await adapter.parseTx('0xtxhash', SENDER)

      expect(tx.fee).toEqual({ assetId: aptosAssetId, value: '15100' })
      expect(tx.transfers).toEqual([
        {
          assetId: aptosAssetId,
          from: [SENDER],
          to: [ADDR],
          type: TransferType.Send,
          value: '9423057',
        },
      ])
    })

    it('attributes the fee of a sponsored transaction to the fee payer, not the sender', async () => {
      const sponsored = makeTx({
        signature: {
          type: 'fee_payer_signature',
          fee_payer_address: ADDR,
        },
      })

      client.transaction.getTransactionByHash.mockResolvedValueOnce(sponsored)
      const senderTx = await adapter.parseTx('0xtxhash', SENDER)
      expect(senderTx.fee).toBeUndefined()

      client.transaction.getTransactionByHash.mockResolvedValueOnce(sponsored)
      const feePayerTx = await adapter.parseTx('0xtxhash', ADDR)
      expect(feePayerTx.fee).toEqual({ assetId: aptosAssetId, value: '15100' })
    })

    it('maps a FA primary_fungible_store::transfer to the right assetId and arg offsets', async () => {
      client.transaction.getTransactionByHash.mockResolvedValueOnce(
        makeTx({
          payload: {
            type: 'entry_function_payload',
            function: '0x1::primary_fungible_store::transfer',
            type_arguments: [],
            arguments: [{ inner: USDC_FA }, ADDR, '5000000'],
          },
        }),
      )

      const tx = await adapter.parseTx('0xtxhash', ADDR)
      expect(tx.transfers).toEqual([
        {
          assetId: `aptos:1/fungible:${USDC_FA}`,
          from: [SENDER],
          to: [ADDR],
          type: TransferType.Receive,
          value: '5000000',
        },
      ])
    })

    it('maps a FA aptos_account::transfer_fungible_assets to the right assetId and arg offsets', async () => {
      client.transaction.getTransactionByHash.mockResolvedValueOnce(
        makeTx({
          payload: {
            type: 'entry_function_payload',
            function: '0x1::aptos_account::transfer_fungible_assets',
            type_arguments: [],
            arguments: [USDC_FA, ADDR, '5000000'],
          },
        }),
      )

      const tx = await adapter.parseTx('0xtxhash', ADDR)
      expect(tx.transfers).toEqual([
        {
          assetId: `aptos:1/fungible:${USDC_FA}`,
          from: [SENDER],
          to: [ADDR],
          type: TransferType.Receive,
          value: '5000000',
        },
      ])
    })

    it('maps a legacy 0x1::aptos_account::transfer to APT', async () => {
      client.transaction.getTransactionByHash.mockResolvedValueOnce(
        makeTx({
          payload: {
            type: 'entry_function_payload',
            function: '0x1::aptos_account::transfer',
            type_arguments: [],
            arguments: [ADDR, '1000'],
          },
        }),
      )

      const tx = await adapter.parseTx('0xtxhash', ADDR)
      expect(tx.transfers).toEqual([
        {
          assetId: aptosAssetId,
          from: [SENDER],
          to: [ADDR],
          type: TransferType.Receive,
          value: '1000',
        },
      ])
    })

    it('returns Send+Receive when the user is both sender and recipient', async () => {
      client.transaction.getTransactionByHash.mockResolvedValueOnce(
        makeTx({ sender: ADDR, payload: { ...makeTx().payload, arguments: [ADDR, '100'] } }),
      )

      const tx = await adapter.parseTx('0xtxhash', ADDR)
      expect(tx.transfers.map(t => t.type)).toEqual([TransferType.Send, TransferType.Receive])
    })

    it('returns an empty transfer list for unrelated payloads', async () => {
      client.transaction.getTransactionByHash.mockResolvedValueOnce(
        makeTx({
          payload: {
            type: 'entry_function_payload',
            function: '0x123::some_dapp::do_thing',
            type_arguments: [],
            arguments: [],
          },
        }),
      )

      const tx = await adapter.parseTx('0xtxhash', ADDR)
      expect(tx.transfers).toEqual([])
    })

    it('marks pending transactions as Pending with no fee or block', async () => {
      client.transaction.getTransactionByHash.mockResolvedValueOnce({
        type: 'pending_transaction',
        hash: '0xtxhash',
        sender: SENDER,
        gas_unit_price: '100',
        payload: makeTx().payload,
      })
      const tx = await adapter.parseTx('0xtxhash', ADDR)
      expect(tx.status).toBe(TxStatus.Pending)
      expect(tx.fee).toBeUndefined()
      expect(tx.blockHeight).toBe(0)
      expect(tx.transfers).toHaveLength(1)
    })

    it('marks failed transactions as Failed, keeping the attempted transfer and the spent fee', async () => {
      client.transaction.getTransactionByHash.mockResolvedValueOnce(makeTx({ success: false }))
      const tx = await adapter.parseTx('0xtxhash', SENDER)
      expect(tx.status).toBe(TxStatus.Failed)
      expect(tx.confirmations).toBe(0)
      expect(tx.transfers.map(t => t.type)).toEqual([TransferType.Send])
      expect(tx.fee).toEqual({ assetId: aptosAssetId, value: '15100' })
    })

    it('converts microsecond timestamps to seconds', async () => {
      client.transaction.getTransactionByHash.mockResolvedValueOnce(
        makeTx({ timestamp: '1747000000000000' }),
      )
      const tx = await adapter.parseTx('0xtxhash', ADDR)
      expect(tx.blockTime).toBe(1747000000)
    })
  })
})

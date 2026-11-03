import type * as AptosSdkActual from '@aptos-labs/ts-sdk'
import {
  AccountAddress,
  ChainId,
  Deserializer,
  generateRawTransaction,
  Hex,
  RawTransaction,
} from '@aptos-labs/ts-sdk'
import { aptosAssetId } from '@shapeshiftoss/caip'
import { TransferType, TxStatus } from '@shapeshiftoss/unchained-client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ValidAddressResultType } from '../types'
import { ChainAdapter } from './AptosChainAdapter'
import { getSerializedTransferPayload } from './utils'

vi.mock('@aptos-labs/ts-sdk', async () => {
  // keep the real bcs and key classes, mock only the network client
  const actual = await vi.importActual<typeof AptosSdkActual>('@aptos-labs/ts-sdk')
  return {
    ...actual,
    Aptos: vi.fn().mockImplementation(function () {
      return {
        getAccountCoinsData: vi.fn(),
        getGasPriceEstimation: vi.fn(),
        view: vi.fn(),
        transaction: {
          getTransactionByHash: vi.fn(),
          build: {
            simple: vi.fn().mockResolvedValue({
              rawTransaction: new actual.RawTransaction(
                actual.AccountAddress.ONE,
                0n,
                new actual.TransactionPayloadEntryFunction(
                  actual.EntryFunction.build('0x1::aptos_account', 'transfer_coins', [], []),
                ),
                2000n,
                100n,
                0n,
                new actual.ChainId(1),
              ),
            }),
          },
          simulate: { simple: vi.fn() },
        },
      }
    }),
    AptosConfig: vi.fn(),
    generateRawTransaction: vi.fn(),
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

  describe('getBip44Params', () => {
    it('derives on coin type 637', () => {
      expect(adapter.getBip44Params({ accountNumber: 0 })).toMatchObject({
        purpose: 44,
        coinType: 637,
        accountNumber: 0,
        addressIndex: 0,
        isChange: false,
      })
    })
  })

  describe('validateAddress', () => {
    it('accepts 64-hex address with 0x prefix', async () => {
      const r = await adapter.validateAddress(ADDR)
      expect(r).toEqual({ valid: true, result: ValidAddressResultType.Valid })
    })

    it.each([
      ['missing 0x prefix', ADDR.slice(2)],
      ['short form', `0x${ADDR.slice(3)}`],
      ['reserved framework', `0x${'0'.repeat(63)}a`],
      ['reserved framework short form', '0x1'],
      ['non hex', `0x${'z'.repeat(64)}`],
      ['garbage', 'not-an-address'],
    ])('rejects a %s address', async (_, address) => {
      const r = await adapter.validateAddress(address)
      expect(r.valid).toBe(false)
    })
  })

  describe('getAccount', () => {
    it('returns APT as the native balance and other assets as tokens', async () => {
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

    it('pages through non-zero primary store balances', async () => {
      const page = Array.from({ length: 100 }, (_, i) => ({
        asset_type: `0x${(i + 1).toString(16)}::coin::T`,
        amount: '1',
        metadata: { symbol: 'T', name: 'T', decimals: 8 },
        storage_id: `0x${(i + 1).toString(16).padStart(4, '0')}`,
      }))
      client.getAccountCoinsData.mockResolvedValueOnce(page).mockResolvedValueOnce([
        {
          asset_type: USDC_FA,
          amount: '7',
          metadata: { symbol: 'USDC', name: 'USDC', decimals: 6 },
        },
      ])

      const acct = await adapter.getAccount(ADDR)
      expect(acct.chainSpecific.tokens).toHaveLength(101)
      expect(client.getAccountCoinsData).toHaveBeenCalledTimes(2)
      expect(client.getAccountCoinsData.mock.calls[1][0].options).toMatchObject({
        where: { amount: { _gt: 0 }, is_primary: { _eq: true }, storage_id: { _gt: '0x0064' } },
        limit: 100,
      })
    })

    it('reads balances past 2^53 from the node', async () => {
      client.getAccountCoinsData.mockResolvedValueOnce([
        { asset_type: APT_COIN_TYPE, amount: 29744182751680730, metadata: null },
        {
          asset_type: USDC_FA,
          amount: 103013109704767620,
          metadata: { symbol: 'USDC', name: 'USDC', decimals: 6 },
        },
      ])
      client.view
        .mockResolvedValueOnce(['29744182751680726'])
        .mockResolvedValueOnce(['103013109704767616'])

      const acct = await adapter.getAccount(ADDR)
      expect(acct.balance).toBe('29744182751680726')
      expect(acct.chainSpecific.tokens?.[0]?.balance).toBe('103013109704767616')
      expect(client.view.mock.calls[0][0].payload).toMatchObject({
        function: '0x1::coin::balance',
        typeArguments: [APT_COIN_TYPE],
      })
      expect(client.view.mock.calls[1][0].payload).toMatchObject({
        function: '0x1::primary_fungible_store::balance',
        functionArguments: [ADDR, USDC_FA],
      })
    })

    it('reads precision from the node when the indexer has no metadata', async () => {
      client.getAccountCoinsData.mockResolvedValueOnce([
        { asset_type: LEGACY_USDC, amount: '42', metadata: null },
      ])
      client.view.mockResolvedValueOnce([6])

      const acct = await adapter.getAccount(ADDR)
      expect(acct.chainSpecific.tokens?.[0]?.precision).toBe(6)
      expect(client.view.mock.calls[0][0].payload).toMatchObject({
        function: '0x1::coin::decimals',
        typeArguments: [LEGACY_USDC],
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

    it('signs the supplied gas price and limit below the sdk floor without simulating', async () => {
      const { rawTransactionBytes } = await build(undefined)
      const rawTransaction = RawTransaction.deserialize(new Deserializer(rawTransactionBytes))

      expect(rawTransaction.gas_unit_price).toBe(150n)
      expect(rawTransaction.max_gas_amount).toBe(210n)
      expect(client.transaction.simulate.simple).not.toHaveBeenCalled()
    })

    it.each([
      [
        'APT',
        undefined,
        {
          function: '0x1::aptos_account::transfer_coins',
          typeArguments: [APT_COIN_TYPE],
          functionArguments: [ADDR, 1000n],
        },
      ],
      [
        'a coin',
        LEGACY_USDC,
        {
          function: '0x1::aptos_account::transfer_coins',
          typeArguments: [LEGACY_USDC],
          functionArguments: [ADDR, 1000n],
        },
      ],
      [
        'a fungible asset',
        USDC_FA,
        {
          function: '0x1::primary_fungible_store::transfer',
          typeArguments: ['0x1::fungible_asset::Metadata'],
          functionArguments: [USDC_FA, ADDR, 1000n],
        },
      ],
    ])('sends %s with the matching transfer function', async (_, contractAddress, payload) => {
      await build(contractAddress)
      expect(getBuiltData()).toMatchObject(payload)
    })
  })

  describe('buildCustomApiTx', () => {
    it.each([
      ['APT', undefined],
      ['a coin', LEGACY_USDC],
      ['a fungible asset', USDC_FA],
    ])('signs the serialized %s payload at the quoted gas', async (_, contractAddress) => {
      const payload = getSerializedTransferPayload(ADDR, '1000', contractAddress)

      vi.mocked(generateRawTransaction).mockImplementationOnce(args =>
        Promise.resolve(
          new RawTransaction(
            AccountAddress.ONE,
            7n,
            args.payload as RawTransaction['payload'],
            2000n,
            100n,
            99n,
            new ChainId(1),
          ),
        ),
      )

      const { rawTransactionBytes } = await adapter.buildCustomApiTx({
        from: SENDER,
        accountNumber: 0,
        payload,
        gasUnitPrice: '150',
        maxGasAmount: '4639',
      })

      const raw = RawTransaction.deserialize(new Deserializer(rawTransactionBytes))

      expect(raw.max_gas_amount).toBe(4639n)
      expect(raw.gas_unit_price).toBe(150n)
      expect(Hex.fromHexInput(raw.payload.bcsToBytes()).toString()).toBe(payload)
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
        fast: { txFee: '667950', chainSpecific: { gasUnitPrice: '150', maxGasAmount: '4453' } },
        average: { txFee: '658200', chainSpecific: { gasUnitPrice: '100', maxGasAmount: '6582' } },
        slow: { txFee: '648500', chainSpecific: { gasUnitPrice: '50', maxGasAmount: '12970' } },
      })
    })

    it('simulates the given value so a sender short of it fails', async () => {
      client.transaction.simulate.simple.mockResolvedValueOnce([simulation])

      await adapter.getFeeData({
        to: ADDR,
        value: '198633150',
        chainSpecific: { from: SENDER, contractAddress: undefined },
      })

      expect(client.transaction.build.simple.mock.calls[0][0].data.functionArguments).toEqual([
        ADDR,
        198633150n,
      ])
    })

    it('simulates with a fee payer so a sender without apt still gets fees', async () => {
      client.transaction.simulate.simple.mockResolvedValueOnce([simulation])

      await getFeeData()

      expect(client.transaction.build.simple.mock.calls[0][0].withFeePayer).toBe(true)
    })

    it.each([
      ['fails', { success: false, gas_used: '0', vm_status: 'INSUFFICIENT_BALANCE' }],
      ['has no fee statement', { success: true, events: [] }],
    ])('throws when the simulation %s', async (_, result) => {
      client.transaction.simulate.simple.mockResolvedValueOnce([result])

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

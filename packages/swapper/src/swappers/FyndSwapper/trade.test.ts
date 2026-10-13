import type { Asset } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import { Err, Ok } from '@sniptt/monads'
import { AxiosError } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SwapperDeps } from '../../types'
import { TradeQuoteError } from '../../types'
import { makeSwapErrorRight } from '../../utils'
import { getEvmNetworkFeeCryptoBaseUnit } from '../../utils/evm'
import { ETH, USDC_MAINNET, WETH } from '../../utils/test-data/assets'
import { getTradeQuote } from './getTradeQuote/getTradeQuote'
import { getTradeRate } from './getTradeRate/getTradeRate'
import type { FyndTradeQuoteInput } from './types'
import { FYND_CHAINS, FYND_RATE_ADDRESS } from './utils/constants'

const http = vi.hoisted(() => ({
  post: vi.fn(),
  create: vi.fn(),
}))
vi.mock('./utils/fyndService', () => ({
  createFyndService: http.create.mockReturnValue({
    post: http.post,
  }),
}))
vi.mock('../../utils/evm', async importOriginal => ({
  ...(await importOriginal<object>()),
  getEvmNetworkFeeCryptoBaseUnit: vi.fn(),
}))

const sender = '0x1111111111111111111111111111111111111111'
const receiver = '0x2222222222222222222222222222222222222222'
const baseUrl = 'https://fynd.test/v1/fynd'
const deps = {
  config: { VITE_FYND_BASE_URL: baseUrl },
  assertGetEvmChainAdapter: vi.fn(() => ({})),
} as unknown as SwapperDeps
const input: FyndTradeQuoteInput = {
  sellAsset: WETH,
  buyAsset: USDC_MAINNET,
  chainId: KnownChainIds.EthereumMainnet,
  sellAmountIncludingProtocolFeesCryptoBaseUnit: '1000000000000000000',
  affiliateBps: '0',
  allowMultiHop: false,
  sendAddress: sender,
  receiveAddress: receiver,
  accountNumber: 3,
  quoteOrRate: 'quote',
  supportsEIP1559: false,
  slippageTolerancePercentageDecimal: '0.005',
}

const response = (router: `0x${string}`) => ({
  orders: [
    {
      order_id: 'test-order',
      status: 'success',
      amount_in: input.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      amount_out: '1000000',
      amount_out_net_gas: '990000',
      gas_estimate: '100000',
      gas_price: null,
      route: { swaps: [{ protocol: 'uniswap_v3' }] },
      transaction: {
        to: router,
        value: '0',
        data: '0x12345678',
        client_fee_signature_offset: null,
      },
      fee_breakdown: {
        router_fee: '10',
        client_fee: '0',
        max_slippage: '4999',
        min_amount_received: '994991',
        swaps_hash: null,
      },
    },
  ],
  total_gas_estimate: '100000',
  solve_time_ms: 20,
})

let payload: ReturnType<typeof response>
const chainAsset = (asset: Asset, chainId: Asset['chainId']): Asset => ({
  ...asset,
  chainId,
  assetId: `${chainId}/${asset.assetId.split('/')[1]}`,
})

beforeEach(() => {
  vi.clearAllMocks()
  payload = response(FYND_CHAINS['eip155:1'].routerAddress)
  http.post.mockImplementation(() => Promise.resolve(Ok({ data: payload })))
  vi.mocked(getEvmNetworkFeeCryptoBaseUnit).mockImplementation(args => {
    if ('transactionData' in args) args.transactionData.gasLimit = '120000'
    return Promise.resolve('100000000000000')
  })
})

describe('Fynd trades', () => {
  it.each([
    [KnownChainIds.EthereumMainnet, 'ethereum'],
    [KnownChainIds.BaseMainnet, 'base'],
    [KnownChainIds.ArbitrumMainnet, 'arbitrum'],
    [KnownChainIds.BnbSmartChainMainnet, 'bsc'],
    [KnownChainIds.PolygonMainnet, 'polygon'],
    [KnownChainIds.UnichainMainnet, 'unichain'],
    [KnownChainIds.RobinhoodMainnet, 'robinhood'],
  ] as const)('quotes supported chain %s', async (chainId, slug) => {
    const chain = FYND_CHAINS[chainId]
    payload = response(chain.routerAddress)
    const result = await getTradeQuote(
      {
        ...input,
        sellAsset: chainAsset(WETH, chainId),
        buyAsset: chainAsset(USDC_MAINNET, chainId),
        chainId,
      },
      deps,
    )
    expect(result.isOk()).toBe(true)
    expect(http.create).toHaveBeenCalledWith({
      baseUrl: `${baseUrl}/${slug}`,
    })
    const quote = result.unwrap()[0]
    expect(quote.deadline).toBeUndefined()
    expect(quote.steps[0].transactionData).toMatchObject({
      type: 'evm',
      chainId: Number(chainId.split(':')[1]),
      to: chain.routerAddress,
      data: payload.orders[0].transaction.data,
      gasLimit: '120000',
      value: '0',
    })
    expect(quote.steps[0].buyAmountAfterFeesCryptoBaseUnit).toBe('999990')
    expect(getEvmNetworkFeeCryptoBaseUnit).toHaveBeenCalledWith(
      expect.objectContaining({
        from: sender,
        stateOverride: expect.objectContaining({
          sellAmountCryptoBaseUnit: input.sellAmountIncludingProtocolFeesCryptoBaseUnit,
          spenderAddress: chain.routerAddress,
        }),
      }),
    )
  })

  it('preserves connected rate accounts without exposing an executable transaction', async () => {
    const result = await getTradeRate(
      { ...input, quoteOrRate: 'rate', supportsEIP1559: false },
      deps,
    )
    expect(result.isOk()).toBe(true)
    const rate = result.unwrap()[0]
    expect(rate.receiveAddress).toBe(receiver)
    expect(rate.steps[0].accountNumber).toBe(3)
    expect(rate.steps[0]).not.toHaveProperty('transactionData')
    expect(http.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        orders: [expect.objectContaining({ sender, receiver })],
        options: expect.objectContaining({
          encoding_options: expect.objectContaining({ slippage: '0.005' }),
        }),
      }),
    )
  })

  it.each([
    ['zero fees', '99999', '0', '99999'],
    ['large integer amounts', '1000000000000000001', '1', '1000000000000000000'],
  ])('preserves exact net output with %s', async (_label, amountOut, routerFee, netOutput) => {
    payload.orders[0].amount_out = amountOut
    payload.orders[0].fee_breakdown = {
      ...payload.orders[0].fee_breakdown,
      router_fee: routerFee,
      max_slippage: '0',
      min_amount_received: netOutput,
    }
    const result = await getTradeQuote(input, deps)
    const step = result.unwrap()[0].steps[0]
    expect(step.buyAmountBeforeFeesCryptoBaseUnit).toBe(amountOut)
    expect(step.buyAmountAfterFeesCryptoBaseUnit).toBe(netOutput)
  })

  it('quotes rates without a wallet and keeps the account absent', async () => {
    const result = await getTradeRate(
      {
        ...input,
        quoteOrRate: 'rate',
        supportsEIP1559: false,
        sendAddress: undefined,
        receiveAddress: undefined,
        accountNumber: undefined,
      },
      deps,
    )
    expect(result.isOk()).toBe(true)
    expect(result.unwrap()[0].steps[0].accountNumber).toBeUndefined()
    expect(result.unwrap()[0].steps[0]).not.toHaveProperty('transactionData')
    expect(result.unwrap()[0].receiveAddress).toBeUndefined()
    expect(http.post).toHaveBeenCalledWith(
      '/quote',
      expect.objectContaining({
        orders: [
          expect.objectContaining({ sender: FYND_RATE_ADDRESS, receiver: FYND_RATE_ADDRESS }),
        ],
      }),
    )
  })

  it('uses native transaction value and no approval spender', async () => {
    payload.orders[0].transaction.value = input.sellAmountIncludingProtocolFeesCryptoBaseUnit
    const result = await getTradeQuote({ ...input, sellAsset: ETH }, deps)
    expect(result.isOk()).toBe(true)
    expect(result.unwrap()[0].steps[0].allowanceContract).toBe('')
    expect(result.unwrap()[0].steps[0].transactionData).toMatchObject({
      value: input.sellAmountIncludingProtocolFeesCryptoBaseUnit,
    })
    expect(getEvmNetworkFeeCryptoBaseUnit).toHaveBeenCalledWith(
      expect.objectContaining({ stateOverride: expect.objectContaining({ spenderAddress: '' }) }),
    )
    expect(http.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        orders: [
          expect.objectContaining({
            token_in: '0x0000000000000000000000000000000000000000',
          }),
        ],
      }),
    )
  })

  it('falls back to the provider gas price for display-only rates', async () => {
    vi.mocked(getEvmNetworkFeeCryptoBaseUnit).mockRejectedValue(new Error('RPC unavailable'))
    http.post.mockResolvedValueOnce(
      Ok({
        data: {
          ...payload,
          orders: [{ ...payload.orders[0], gas_price: '2000000000' }],
        },
      }),
    )
    const result = await getTradeRate(
      { ...input, quoteOrRate: 'rate', supportsEIP1559: false },
      deps,
    )
    expect(result.unwrap()[0].steps[0].feeData.networkFeeCryptoBaseUnit).toBe('200000000000000')
    expect(result.unwrap()[0].steps[0]).not.toHaveProperty('transactionData')
  })

  it.each([undefined, FYND_RATE_ADDRESS])(
    'rejects a missing or rate-only sender %s',
    async sendAddress => {
      expect((await getTradeQuote({ ...input, sendAddress }, deps)).isErr()).toBe(true)
      expect(http.post).not.toHaveBeenCalled()
    },
  )

  it.each<[string, FyndTradeQuoteInput]>([
    [
      'unsupported',
      {
        ...input,
        sellAsset: chainAsset(WETH, 'eip155:10'),
        buyAsset: chainAsset(USDC_MAINNET, 'eip155:10'),
      },
    ],
    ['cross-chain', { ...input, buyAsset: chainAsset(USDC_MAINNET, 'eip155:8453') }],
    ['mismatched request chain', { ...input, chainId: KnownChainIds.BaseMainnet }],
  ])('rejects %s pairs before contacting the provider', async (_label, tradeInput) => {
    expect((await getTradeQuote(tradeInput, deps)).isErr()).toBe(true)
    expect(http.post).not.toHaveBeenCalled()
  })

  it('rejects quotes before contacting the provider when the base URL is not configured', async () => {
    const unconfiguredDeps = { ...deps, config: { VITE_FYND_BASE_URL: '' } } as SwapperDeps
    expect((await getTradeQuote(input, unconfiguredDeps)).unwrapErr()).toMatchObject({
      code: TradeQuoteError.InternalError,
      message: 'Fynd base URL is not configured',
    })
    expect(http.post).not.toHaveBeenCalled()
  })

  it('returns a quote error if gas estimation fails', async () => {
    vi.mocked(getEvmNetworkFeeCryptoBaseUnit).mockRejectedValue(new Error('estimation failed'))
    expect((await getTradeQuote(input, deps)).unwrapErr().code).toBe(
      TradeQuoteError.NetworkFeeEstimationFailed,
    )
  })

  it.each([
    `${WETH.assetId}/unexpected`,
    'eip155:1/notanasset:abc',
    'eip155:1/erc20:0x0000000000000000000000000000000000000000',
    'eip155:1/slip44:999',
  ])('rejects malformed or misidentified assets before requesting a quote: %s', async assetId => {
    const result = await getTradeQuote({ ...input, sellAsset: { ...WETH, assetId } }, deps)
    expect(result.isErr()).toBe(true)
    expect(http.post).not.toHaveBeenCalled()
  })

  it.each<[number, unknown, TradeQuoteError]>([
    [429, 'Too Many Requests', TradeQuoteError.RateLimitExceeded],
    [422, { error: 'no route', code: 'NO_ROUTE_FOUND' }, TradeQuoteError.NoRouteFound],
    [422, { error: 'thin', code: 'INSUFFICIENT_LIQUIDITY' }, TradeQuoteError.NoRouteFound],
    [503, { error: 'solver timeout', code: 'TIMEOUT' }, TradeQuoteError.Timeout],
    [422, { error: 'price check', code: 'PRICE_CHECK_FAILED' }, TradeQuoteError.QueryFailed],
    [400, { error: 'bad slippage', code: 'INVALID_SLIPPAGE' }, TradeQuoteError.QueryFailed],
    [503, 'Service Unavailable', TradeQuoteError.QueryFailed],
  ])('maps a proxied http %s response to %s', async (status, data, code) => {
    const cause = new AxiosError('Request failed', undefined, undefined, undefined, {
      status,
      data,
    } as AxiosError['response'])
    http.post.mockResolvedValueOnce(
      Err(makeSwapErrorRight({ message: 'makeSwapperAxiosServiceMonadic', cause })),
    )
    const result = await getTradeQuote(input, deps)
    expect(result.unwrapErr().code).toBe(code)
  })

  it.each([
    'no_route_found',
    'insufficient_liquidity',
    'timeout',
    'not_ready',
    'encoding_failed',
  ] as const)(
    'handles provider status %s without requiring successful quote fields',
    async status => {
      http.post.mockResolvedValueOnce(
        Ok({
          data: {
            orders: [{ order_id: 'error', status }],
            total_gas_estimate: '0',
            solve_time_ms: 1,
          },
        }),
      )
      const result = await getTradeQuote(input, deps)
      expect(result.isErr()).toBe(true)
      expect(result.unwrapErr().code).toBe(
        status === 'no_route_found' || status === 'insufficient_liquidity'
          ? TradeQuoteError.NoRouteFound
          : TradeQuoteError.QueryFailed,
      )
    },
  )

  it('requests the gross client fee and reports our net share', async () => {
    payload.orders[0].amount_out = '1000000'
    payload.orders[0].transaction = {
      ...payload.orders[0].transaction,
      data: `0x12345678${'ab'.repeat(65)}`,
      client_fee_signature_offset: 4,
    }
    payload.orders[0].fee_breakdown = {
      ...payload.orders[0].fee_breakdown,
      router_fee: '1500',
      client_fee: '6000',
      max_slippage: '4962',
      min_amount_received: '987538',
    }
    ;(payload.orders[0] as Record<string, unknown>).client_fee_deadline = 1_900_000_000
    const result = await getTradeQuote({ ...input, affiliateBps: '60' }, deps)
    const quote = result.unwrap()[0]
    expect(http.post).toHaveBeenCalledWith(
      '/quote',
      expect.objectContaining({
        options: expect.objectContaining({
          encoding_options: expect.objectContaining({ client_fee_params: { bps: 75 } }),
        }),
      }),
    )
    expect(quote.affiliateBps).toBe('60')
    expect(quote.deadline).toBe(1_900_000_000_000)
    expect(quote.steps[0].affiliateFee).toMatchObject({ amountCryptoBaseUnit: '6000' })
    expect(quote.steps[0].buyAmountAfterFeesCryptoBaseUnit).toBe('992500')
    expect(quote.steps[0].feeData.protocolFees).toMatchObject({
      [USDC_MAINNET.assetId]: { amountCryptoBaseUnit: '1500' },
    })
  })

  it('does not request a client fee without affiliate bps', async () => {
    await getTradeQuote(input, deps)
    expect(http.post).toHaveBeenCalledWith(
      '/quote',
      expect.objectContaining({
        options: expect.objectContaining({
          encoding_options: expect.not.objectContaining({ client_fee_params: expect.anything() }),
        }),
      }),
    )
  })
})

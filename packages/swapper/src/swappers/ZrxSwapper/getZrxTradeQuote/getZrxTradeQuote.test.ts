import type { ChainId } from '@shapeshiftoss/caip'
import { btcChainId } from '@shapeshiftoss/caip'
import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { AxiosResponse } from 'axios'
import { describe, expect, it, vi } from 'vitest'

import { type SwapErrorRight, TradeQuoteError } from '../../../types'
import { BTC } from '../../utils/test-data/assets'
import { gasFeeData } from '../../utils/test-data/fees'
import { setupQuote } from '../../utils/test-data/setupSwapQuote'
import { zrxServiceFactory } from '../utils/zrxService'
import { getZrxTradeQuote } from './getZrxTradeQuote'

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}))

vi.mock('../utils/zrxService', () => {
  const mockAxios = {
    default: {
      create: vi.fn(() => ({
        get: mocks.get,
        post: mocks.post,
      })),
    },
  }

  return {
    zrxServiceFactory: mockAxios.default.create,
  }
})

vi.mock('../utils/helpers/helpers', async () => {
  const actual = await vi.importActual('../utils/helpers/helpers')
  return {
    ...actual,
    baseUrlFromChainId: vi.fn(() => 'https://0x.shapeshift.com/ethereum/'),
  }
})
vi.mock('@shapeshiftoss/chain-adapters', async () => {
  const { KnownChainIds } = require('@shapeshiftoss/types')

  const actual = await vi.importActual('@shapeshiftoss/chain-adapters')

  return {
    ...actual,
    isEvmChainId: vi.fn(() => true),
    evmChainIds: [KnownChainIds.EthereumMainnet],
    optimism: {
      isOptimismChainAdapter: vi.fn(() => false),
    },
  }
})

const mockOk = Ok
const mockErr = Err
describe('getZrxTradeQuote', () => {
  const zrxBaseUrl = 'https://0x.shapeshift.com/ethereum/'

  const assertGetChainAdapter = (_chainId: ChainId) =>
    ({
      getChainId: () => KnownChainIds.EthereumMainnet,
      getGasFeeData: () => Promise.resolve(gasFeeData),
    }) as unknown as EvmChainAdapter
  const zrxService = zrxServiceFactory({ baseUrl: zrxBaseUrl })

  it('returns quote with fee data', async () => {
    const { quoteInput } = setupQuote()
    vi.mocked(zrxService.get).mockReturnValue(
      Promise.resolve(
        mockOk({
          data: { price: '100', gasPrice: '1000', gas: '1000000', auxiliaryChainData: {} },
        } as AxiosResponse<unknown, any>),
      ),
    )
    const maybeQuote = await getZrxTradeQuote(
      quoteInput,
      assertGetChainAdapter,
      false,
      {},
      zrxBaseUrl,
    )

    expect(maybeQuote.isErr()).toBe(false)
    const quote = maybeQuote.unwrap()
    expect(quote.steps[0].feeData).toStrictEqual({
      protocolFees: {},
      networkFeeCryptoBaseUnit: '94843800000000000',
    })
    expect(quote.steps[0].rate).toBe('100')
  })

  it('bubbles up the zrxService Err from a bad zrx response', async () => {
    const { quoteInput } = setupQuote()
    vi.mocked(zrxService.get).mockReturnValue(
      Promise.resolve(
        mockErr({ some: 'error' }) as unknown as Result<
          AxiosResponse<unknown, any>,
          SwapErrorRight
        >,
      ),
    )
    const maybeTradeQuote = await getZrxTradeQuote(
      quoteInput,
      assertGetChainAdapter,
      false,
      {},
      zrxBaseUrl,
    )

    expect(maybeTradeQuote.isErr()).toBe(true)
    expect(maybeTradeQuote.unwrapErr()).toMatchObject({
      some: 'error',
    })
  })

  it('returns an Err on errored zrx response', async () => {
    const { quoteInput } = setupQuote()
    vi.mocked(zrxService.get).mockResolvedValue(
      Err({
        response: { data: { code: 502, reason: 'Failed to do some stuff' } },
      }) as unknown as never,
    )

    const maybeTradeQuote = await getZrxTradeQuote(
      quoteInput,
      assertGetChainAdapter,
      false,
      {},
      zrxBaseUrl,
    )

    expect(maybeTradeQuote.isErr()).toBe(true)
    expect(maybeTradeQuote.unwrapErr()).toMatchObject({
      response: { data: { code: 502, reason: 'Failed to do some stuff' } },
    })
  })

  it('returns quote without gas limit', async () => {
    const { quoteInput } = setupQuote()
    vi.mocked(zrxService.get).mockReturnValue(
      Promise.resolve(
        Ok({
          data: { price: '100', auxiliaryChainData: {} },
        } as AxiosResponse<unknown>),
      ),
    )
    const maybeQuote = await getZrxTradeQuote(
      quoteInput,
      assertGetChainAdapter,
      false,
      {},
      zrxBaseUrl,
    )
    expect(maybeQuote.isErr()).toBe(false)
    const quote = maybeQuote.unwrap()

    expect(quote?.steps[0].feeData).toStrictEqual({
      protocolFees: {},
      networkFeeCryptoBaseUnit: '0',
    })
  })

  it('returns an Err on non ethereum chain for buyAsset', async () => {
    const { quoteInput } = setupQuote()
    vi.mocked(zrxService.get).mockReturnValue(Promise.resolve(Ok({} as AxiosResponse<unknown>)))

    const maybeTradeQuote = await getZrxTradeQuote(
      {
        ...quoteInput,
        buyAsset: BTC,
      },
      assertGetChainAdapter,
      false,
      {},
      zrxBaseUrl,
    )

    expect(maybeTradeQuote.isErr()).toBe(true)
    expect(maybeTradeQuote.unwrapErr()).toMatchObject({
      cause: undefined,
      code: TradeQuoteError.UnsupportedChain,
      message: 'unsupported chainId',
      name: 'SwapError',
    })
  })

  it('returns an Err on non ethereum chain for sellAsset', async () => {
    const { quoteInput, sellAsset } = setupQuote()
    vi.mocked(zrxService.get).mockReturnValue(
      Promise.resolve(Ok({} as AxiosResponse<unknown, any>)),
    )

    const maybeTradeQuote = await getZrxTradeQuote(
      {
        ...quoteInput,
        sellAsset: { ...sellAsset, chainId: btcChainId },
      },
      assertGetChainAdapter,
      false,
      {},
      zrxBaseUrl,
    )

    expect(maybeTradeQuote.isErr()).toBe(true)
    expect(maybeTradeQuote.unwrapErr()).toMatchObject({
      code: TradeQuoteError.UnsupportedChain,
      details: {
        chainId: 'bip122:000000000019d6689c085ae165831e93',
      },
      message: 'unsupported chainId',
      name: 'SwapError',
    })
  })
})

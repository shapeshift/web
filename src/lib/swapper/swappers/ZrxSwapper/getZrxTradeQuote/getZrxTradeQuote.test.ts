import { btcChainId } from '@shapeshiftoss/caip'
import type { ethereum } from '@shapeshiftoss/chain-adapters'
import type { SwapErrorRight } from '@shapeshiftoss/swapper'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { AxiosResponse } from 'axios'
import { describe, expect, it, vi } from 'vitest'

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
vi.mock('@shapeshiftoss/chain-adapters', () => {
  const { KnownChainIds } = require('@shapeshiftoss/types')
  return {
    isEvmChainId: vi.fn(() => true),
    evmChainIds: [KnownChainIds.EthereumMainnet],
    optimism: {
      isOptimismChainAdapter: vi.fn(() => false),
    },
  }
})
vi.mock('context/PluginProvider/chainAdapterSingleton', () => {
  const { KnownChainIds } = require('@shapeshiftoss/types')
  return {
    getChainAdapterManager: vi.fn(
      () =>
        new Map([
          [
            KnownChainIds.EthereumMainnet,
            {
              getChainId: () => KnownChainIds.EthereumMainnet,
              getGasFeeData: () => Promise.resolve(gasFeeData),
            } as ethereum.ChainAdapter,
          ],
        ]),
    ),
  }
})

const mockOk = Ok
const mockErr = Err
describe('getZrxTradeQuote', () => {
  const zrxService = zrxServiceFactory({ baseUrl: 'https://0x.shapeshift.com/ethereum/' })

  it('returns quote with fee data', async () => {
    const { quoteInput } = setupQuote()
    vi.mocked(zrxService.get).mockReturnValue(
      Promise.resolve(
        mockOk({
          data: { price: '100', gasPrice: '1000', gas: '1000000' },
        } as AxiosResponse<unknown, any>),
      ),
    )
    const maybeQuote = await getZrxTradeQuote(quoteInput)

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
    const maybeTradeQuote = await getZrxTradeQuote(quoteInput)

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

    const maybeTradeQuote = await getZrxTradeQuote(quoteInput)

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
          data: { price: '100' },
        } as AxiosResponse<unknown>),
      ),
    )
    const maybeQuote = await getZrxTradeQuote(quoteInput)
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

    const maybeTradeQuote = await getZrxTradeQuote({
      ...quoteInput,
      buyAsset: BTC,
    })

    expect(maybeTradeQuote.isErr()).toBe(true)
    expect(maybeTradeQuote.unwrapErr()).toMatchObject({
      cause: undefined,
      code: 'UNSUPPORTED_CHAIN',
      message: 'unsupported chainId',
      name: 'SwapError',
    })
  })

  it('returns an Err on non ethereum chain for sellAsset', async () => {
    const { quoteInput, sellAsset } = setupQuote()
    vi.mocked(zrxService.get).mockReturnValue(
      Promise.resolve(Ok({} as AxiosResponse<unknown, any>)),
    )

    const maybeTradeQuote = await getZrxTradeQuote({
      ...quoteInput,
      sellAsset: { ...sellAsset, chainId: btcChainId },
    })

    expect(maybeTradeQuote.isErr()).toBe(true)
    expect(maybeTradeQuote.unwrapErr()).toMatchObject({
      code: 'UNSUPPORTED_CHAIN',
      details: {
        chainId: 'bip122:000000000019d6689c085ae165831e93',
      },
      message: 'unsupported chainId',
      name: 'SwapError',
    })
  })
})

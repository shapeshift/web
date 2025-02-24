import type { ChainId } from '@shapeshiftmonorepo/caip'
import { btcChainId } from '@shapeshiftmonorepo/caip'
import type { EvmChainAdapter } from '@shapeshiftmonorepo/chain-adapters'
import { KnownChainIds } from '@shapeshiftmonorepo/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { AxiosResponse } from 'axios'
import { describe, expect, it, vi } from 'vitest'

import type { SwapErrorRight } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { BTC } from '../../utils/test-data/assets'
import { gasFeeData } from '../../utils/test-data/fees'
import { setupQuote } from '../../utils/test-data/setupSwapQuote'
import { zrxServiceFactory } from '../utils/zrxService'
import { getZrxTradeQuote } from './getZrxTradeQuote'

vi.mock('../utils/zrxService', () => {
  const get = vi.fn()
  const post = vi.fn()

  return {
    zrxServiceFactory: vi.fn(() => ({
      get,
      post,
    })),
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
  const { KnownChainIds } = await import('@shapeshiftoss/types')

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

  const assertGetChainAdapter = (_chainId: ChainId) => {
    return {
      getChainId: () => KnownChainIds.EthereumMainnet,
      getGasFeeData: () => Promise.resolve(gasFeeData),
    } as EvmChainAdapter
  }

  const zrxService = zrxServiceFactory({ baseUrl: zrxBaseUrl })

  it('returns quote with fee data', async () => {
    const { quoteInput } = setupQuote()

    vi.mocked(zrxService.get).mockReturnValue(
      Promise.resolve(
        mockOk({
          data: {
            buyAmount: quoteInput.sellAmountIncludingProtocolFeesCryptoBaseUnit,
            sellAmount: quoteInput.sellAmountIncludingProtocolFeesCryptoBaseUnit,
            fees: {
              integratorFee: null,
              zeroExFee: {
                amount: '3978501710063',
                token: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
              },
            },
            transaction: {
              gas: '237315',
            },
            route: { fills: [] },
            permit2: { eip712: {} },
          },
        } as unknown as AxiosResponse<unknown, any>),
      ),
    )

    const maybeQuote = await getZrxTradeQuote(
      quoteInput,
      assertGetChainAdapter,
      { 'eip155:1/erc20:0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': quoteInput.buyAsset },
      zrxBaseUrl,
    )
    if (maybeQuote.isErr()) console.log(maybeQuote.unwrapErr())

    expect(maybeQuote.isErr()).toBe(false)

    const quote = maybeQuote.unwrap()

    expect(quote.steps[0].feeData).toStrictEqual({
      protocolFees: {
        'eip155:1/erc20:0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': {
          amountCryptoBaseUnit: '3978501710063',
          asset: quoteInput.buyAsset,
          requiresBalance: false,
        },
      },
      networkFeeCryptoBaseUnit: '22507856397000000',
    })

    expect(quote.steps[0].rate).toBe('1')
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
      {},
      zrxBaseUrl,
    )

    expect(maybeTradeQuote.isErr()).toBe(true)
    expect(maybeTradeQuote.unwrapErr()).toMatchObject({
      response: { data: { code: 502, reason: 'Failed to do some stuff' } },
    })
  })

  it('returns an Err on non ethereum chain for buyAsset', async () => {
    const { quoteInput } = setupQuote()

    vi.mocked(zrxService.get).mockReturnValue(Promise.resolve(Ok({} as AxiosResponse<unknown>)))

    const maybeTradeQuote = await getZrxTradeQuote(
      { ...quoteInput, buyAsset: BTC },
      assertGetChainAdapter,
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
      { ...quoteInput, sellAsset: { ...sellAsset, chainId: btcChainId } },
      assertGetChainAdapter,
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

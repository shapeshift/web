import { btcChainId, ethChainId } from '@shapeshiftoss/caip'
import type { ethereum } from '@shapeshiftoss/chain-adapters'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { AxiosStatic } from 'axios'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { SwapErrorRight } from 'lib/swapper/api'

import { normalizeAmount } from '../../utils/helpers/helpers'
import { setupQuote } from '../../utils/test-data/setupSwapQuote'
import { baseUrlFromChainId } from '../utils/helpers/helpers'
import { zrxServiceFactory } from '../utils/zrxService'
import { getZrxTradeQuote } from './getZrxTradeQuote'

jest.mock('lib/swapper/swappers/ZrxSwapper/utils/zrxService', () => {
  const axios: AxiosStatic = jest.createMockFromModule('axios')
  axios.create = jest.fn(() => axios)

  return {
    zrxServiceFactory: () => axios.create(),
  }
})

const zrxService = zrxServiceFactory({ baseUrl: 'https://api.0x.org/' })

jest.mock('../utils/helpers/helpers', () => ({
  ...jest.requireActual('../utils/helpers/helpers'),
  baseUrlFromChainId: jest.fn(() => 'https://api.0x.org/'),
}))
jest.mock('../../utils/helpers/helpers')
jest.mock('../utils/zrxService')
jest.mock('state/zustand/swapperStore/amountSelectors', () => ({
  selectSellAssetUsdRate: jest.fn(() => '1'),
}))
jest.mock('@shapeshiftoss/chain-adapters', () => {
  const { KnownChainIds } = require('@shapeshiftoss/types')
  return {
    isEvmChainId: jest.fn(() => true),
    evmChainIds: [KnownChainIds.EthereumMainnet],
    optimism: {
      isOptimismChainAdapter: jest.fn(() => false),
    },
  }
})
jest.mock('context/PluginProvider/chainAdapterSingleton', () => {
  const { KnownChainIds } = require('@shapeshiftoss/types')
  const { gasFeeData } = require('../../utils/test-data/setupDeps')
  return {
    getChainAdapterManager: jest.fn(
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

const mockOk = Ok as jest.MockedFunction<typeof Ok>
const mockErr = Err as jest.MockedFunction<typeof Err>
describe('getZrxTradeQuote', () => {
  const sellAmount = '1000000000000000000'
  ;(normalizeAmount as jest.Mock<string>).mockReturnValue(sellAmount)
  ;(baseUrlFromChainId as jest.Mock<Result<string, SwapErrorRight>>).mockReturnValue(
    mockOk('https://api.0x.org/'),
  )

  it('returns quote with fee data', async () => {
    const { quoteInput } = setupQuote()
    ;(zrxService.get as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve(
        mockOk({
          data: { price: '100', gasPrice: '1000', gas: '1000000' },
        }),
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
    ;(zrxService.get as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve(mockErr({ some: 'error' })),
    )
    const maybeTradeQuote = await getZrxTradeQuote(quoteInput)

    expect(maybeTradeQuote.isErr()).toBe(true)
    expect(maybeTradeQuote.unwrapErr()).toMatchObject({
      some: 'error',
    })
  })

  it('returns an Err on errored zrx response', async () => {
    const { quoteInput } = setupQuote()
    ;(zrxService.get as jest.Mock<unknown>).mockResolvedValue(
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
    ;(zrxService.get as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve(
        Ok({
          data: { price: '100' },
        }),
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
    const { quoteInput, buyAsset } = setupQuote()
    ;(zrxService.get as jest.Mock<unknown>).mockReturnValue(Promise.resolve(Ok({})))

    const maybeTradeQuote = await getZrxTradeQuote({
      ...quoteInput,
      buyAsset: { ...buyAsset, chainId: btcChainId },
    })

    expect(maybeTradeQuote.isErr()).toBe(true)
    expect(maybeTradeQuote.unwrapErr()).toMatchObject({
      cause: undefined,
      code: 'UNSUPPORTED_PAIR',
      details: {
        buyAssetChainId: btcChainId,
        sellAssetChainId: ethChainId,
      },
      message: `[assertValidTradePair] - both assets must be on chainId eip155:1`,
      name: 'SwapError',
    })
  })

  it('returns an Err on non ethereum chain for sellAsset', async () => {
    const { quoteInput, sellAsset } = setupQuote()
    ;(zrxService.get as jest.Mock<unknown>).mockReturnValue(Promise.resolve(Ok({})))

    const maybeTradeQuote = await getZrxTradeQuote({
      ...quoteInput,
      sellAsset: { ...sellAsset, chainId: btcChainId },
    })

    expect(maybeTradeQuote.isErr()).toBe(true)
    expect(maybeTradeQuote.unwrapErr()).toMatchObject({
      code: 'UNSUPPORTED_PAIR',
      details: {
        buyAssetChainId: ethChainId,
        sellAssetChainId: btcChainId,
      },
      message: '[assertValidTradePair] - both assets must be on chainId eip155:1',
      name: 'SwapError',
    })
  })

  it('use minQuoteSellAmount when sellAmount is 0', async () => {
    const { quoteInput, sellAsset } = setupQuote()
    ;(zrxService.get as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve(Ok({ data: { sellAmount: '20000000000000000000' } })),
    )

    const minimum = '20'
    const maybeQuote = await getZrxTradeQuote({
      ...quoteInput,
      sellAmountBeforeFeesCryptoBaseUnit: '0',
    })

    expect(maybeQuote.isErr()).toBe(false)
    const quote = maybeQuote.unwrap()

    expect(quote?.steps[0].sellAmountBeforeFeesCryptoBaseUnit).toBe(
      bnOrZero(minimum).times(bn(10).exponentiatedBy(sellAsset.precision)).toString(),
    )
  })
})

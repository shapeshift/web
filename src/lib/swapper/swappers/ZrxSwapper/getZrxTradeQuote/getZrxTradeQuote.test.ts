import { btcChainId, ethChainId } from '@shapeshiftoss/caip'
import type { ethereum } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { AxiosStatic } from 'axios'
import type Web3 from 'web3'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { SwapErrorRight } from 'lib/swapper/api'

import { normalizeAmount } from '../../utils/helpers/helpers'
import { setupQuote } from '../../utils/test-data/setupSwapQuote'
import { baseUrlFromChainId, getUsdRate } from '../utils/helpers/helpers'
import { zrxServiceFactory } from '../utils/zrxService'
import { ZrxSwapper } from '../ZrxSwapper'

jest.mock('lib/swapper/swappers/ZrxSwapper/utils/zrxService', () => {
  const axios: AxiosStatic = jest.createMockFromModule('axios')
  axios.create = jest.fn(() => axios)

  return {
    zrxServiceFactory: () => axios.create(),
  }
})

const zrxService = zrxServiceFactory('https://api.0x.org/')

jest.mock('../utils/helpers/helpers')
jest.mock('../../utils/helpers/helpers')
jest.mock('../utils/zrxService')

const mockOk = Ok as jest.MockedFunction<typeof Ok>
const mockErr = Err as jest.MockedFunction<typeof Err>
describe('getZrxTradeQuote', () => {
  const sellAmount = '1000000000000000000'
  ;(getUsdRate as jest.Mock<Promise<Result<string, SwapErrorRight>>>).mockReturnValue(
    Promise.resolve(mockOk('1')),
  )
  ;(normalizeAmount as jest.Mock<string>).mockReturnValue(sellAmount)
  ;(baseUrlFromChainId as jest.Mock<Result<string, SwapErrorRight>>).mockReturnValue(
    mockOk('https://api.0x.org/'),
  )
  const zrxSwapperDeps = {
    web3: {} as Web3,
    adapter: {
      getChainId: () => KnownChainIds.EthereumMainnet,
    } as ethereum.ChainAdapter,
  }

  it('returns quote with fee data', async () => {
    const { quoteInput } = setupQuote()
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    ;(zrxService.get as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve(
        mockOk({
          data: { price: '100', gasPrice: '1000', estimatedGas: '1000000' },
        }),
      ),
    )
    const maybeQuote = await swapper.getTradeQuote(quoteInput)
    expect(maybeQuote.isErr()).toBe(false)
    const quote = maybeQuote.unwrap()
    expect(quote.feeData).toStrictEqual({
      chainSpecific: {
        estimatedGasCryptoBaseUnit: '1500000',
        gasPriceCryptoBaseUnit: '1000',
        approvalFeeCryptoBaseUnit: '100000000',
      },
      buyAssetTradeFeeUsd: '0',
      networkFeeCryptoBaseUnit: '1500000000',
      sellAssetTradeFeeUsd: '0',
    })
    expect(quote.rate).toBe('100')
  })

  it('returns an Err with a bad zrx response with no error indicated', async () => {
    const { quoteInput } = setupQuote()
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    ;(zrxService.get as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve(mockErr({ some: 'error' })),
    )
    const maybeTradeQuote = await swapper.getTradeQuote({
      ...quoteInput,
    })

    expect(maybeTradeQuote.isErr()).toBe(true)
    expect(maybeTradeQuote.unwrapErr()).toMatchObject({
      some: 'error',
    })
  })

  it('returns an Err on errored zrx response', async () => {
    const { quoteInput } = setupQuote()
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    ;(zrxService.get as jest.Mock<unknown>).mockResolvedValue(
      Err({
        response: { data: { code: 502, reason: 'Failed to do some stuff' } },
      }) as unknown as never,
    )

    const maybeTradeQuote = await swapper.getTradeQuote({
      ...quoteInput,
    })

    expect(maybeTradeQuote.isErr()).toBe(true)
    expect(maybeTradeQuote.unwrapErr()).toMatchObject({
      response: { data: { code: 502, reason: 'Failed to do some stuff' } },
    })
  })

  it('returns quote without fee data', async () => {
    const { quoteInput } = setupQuote()
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    ;(zrxService.get as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve(
        Ok({
          data: { price: '100' },
        }),
      ),
    )
    const maybeQuote = await swapper.getTradeQuote(quoteInput)
    expect(maybeQuote.isErr()).toBe(false)
    const quote = maybeQuote.unwrap()

    expect(quote?.feeData).toStrictEqual({
      chainSpecific: {
        estimatedGasCryptoBaseUnit: '0',
        approvalFeeCryptoBaseUnit: '0',
        gasPriceCryptoBaseUnit: undefined,
      },
      sellAssetTradeFeeUsd: '0',
      buyAssetTradeFeeUsd: '0',
      networkFeeCryptoBaseUnit: '0',
    })
  })

  it('returns an Err on non ethereum chain for buyAsset', async () => {
    const { quoteInput, buyAsset } = setupQuote()
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    ;(zrxService.get as jest.Mock<unknown>).mockReturnValue(Promise.resolve(Ok({})))
    const maybeTradeQuote = await swapper.getTradeQuote({
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
      message:
        '[getZrxTradeQuote] - Both assets need to be on the same supported EVM chain to use Zrx',
      name: 'SwapError',
    })
  })

  it('returns an Err on non ethereum chain for sellAsset', async () => {
    const { quoteInput, sellAsset } = setupQuote()
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    ;(zrxService.get as jest.Mock<unknown>).mockReturnValue(Promise.resolve(Ok({})))
    const maybeTradeQuote = await swapper.getTradeQuote({
      ...quoteInput,
      sellAsset: { ...sellAsset, chainId: btcChainId },
    })

    expect(maybeTradeQuote.isErr()).toBe(true)
    expect(maybeTradeQuote.unwrapErr()).toMatchObject({
      cause: undefined,
      code: 'UNSUPPORTED_PAIR',
      details: {
        buyAssetChainId: ethChainId,
        sellAssetChainId: btcChainId,
      },
      message:
        '[getZrxTradeQuote] - Both assets need to be on the same supported EVM chain to use Zrx',
      name: 'SwapError',
    })
  })

  it('use minQuoteSellAmount when sellAmount is 0', async () => {
    const { quoteInput, sellAsset } = setupQuote()
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    ;(zrxService.get as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve(Ok({ data: { sellAmount: '20000000000000000000' } })),
    )

    const minimum = '20'
    const maybeQuote = await swapper.getTradeQuote({
      ...quoteInput,
      sellAmountBeforeFeesCryptoBaseUnit: '0',
    })

    expect(maybeQuote.isErr()).toBe(false)
    const quote = maybeQuote.unwrap()

    expect(quote?.sellAmountBeforeFeesCryptoBaseUnit).toBe(
      bnOrZero(minimum).times(bn(10).exponentiatedBy(sellAsset.precision)).toString(),
    )
  })
})

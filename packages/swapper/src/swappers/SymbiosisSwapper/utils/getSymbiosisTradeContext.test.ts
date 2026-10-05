import { Err, Ok } from '@sniptt/monads'
import type { AxiosResponse } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SwapperDeps } from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { BSC, ETH_ARBITRUM, USDC_ARBITRUM } from '../../../utils/test-data/assets'
import { SYMBIOSIS_DISABLED_PROVIDERS } from './constants'
import { fetchSymbiosisTrade } from './fetchSymbiosisTrade'
import { getSymbiosisTradeContext } from './getSymbiosisTradeContext'
import type { SymbiosisQuoteResponse, SymbiosisTradeQuoteInput } from './types'

vi.mock('./fetchSymbiosisTrade', () => ({
  fetchSymbiosisTrade: vi.fn(),
}))

const ROUTER = '0x3743c756b64ECd0770f1d4f47696A73d2A46dcbe'
const FROM = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
const TO = '0x1111111111111111111111111111111111111111'

const deps = {
  config: {
    VITE_SYMBIOSIS_API_URL: 'https://api.symbiosis.finance/crosschain',
    VITE_SYMBIOSIS_PARTNER_ADDRESS: '',
  },
} as unknown as SwapperDeps

const makeInput = (overrides: Partial<SymbiosisTradeQuoteInput> = {}): SymbiosisTradeQuoteInput =>
  ({
    sellAsset: USDC_ARBITRUM,
    buyAsset: BSC,
    sellAmountIncludingProtocolFeesCryptoBaseUnit: '100000000',
    affiliateBps: '60',
    slippageTolerancePercentageDecimal: '0.005',
    ...overrides,
  }) as SymbiosisTradeQuoteInput

const quote: SymbiosisQuoteResponse = {
  type: 'evm',
  tx: { chainId: 42161, to: ROUTER, data: '0xa11b1198', value: '0' },
  kind: 'crosschain-swap',
  labels: ['octopool-swap', 'dst-chain-swap'],
  approveTo: ROUTER,
  tokenAmountOut: {
    chainId: 56,
    address: '',
    decimals: 18,
    symbol: 'BNB',
    amount: '126000000000000000',
  },
  tokenAmountOutMin: {
    chainId: 56,
    address: '',
    decimals: 18,
    symbol: 'BNB',
    amount: '125000000000000000',
  },
  fees: [
    {
      provider: 'symbiosis',
      description: 'Cross-chain fee',
      value: { chainId: 56, address: '', decimals: 18, symbol: 'BNB', amount: '1000000000000000' },
    },
  ],
  estimatedTime: 38,
}

const mockQuote = (response: SymbiosisQuoteResponse) =>
  vi
    .mocked(fetchSymbiosisTrade)
    .mockResolvedValue(Ok({ data: response } as AxiosResponse<SymbiosisQuoteResponse>))

const mockProviderError = (status: number, message: string) =>
  vi.mocked(fetchSymbiosisTrade).mockResolvedValue(
    Err(
      makeSwapErrorRight({
        message: 'request failed',
        cause: { isAxiosError: true, response: { status, data: { code: 0, message } } },
      }),
    ),
  )

describe('getSymbiosisTradeContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requests the route with bps slippage, disabled passthrough providers and no partner', async () => {
    mockQuote(quote)

    await getSymbiosisTradeContext({ input: makeInput(), deps, from: FROM, to: TO })

    expect(fetchSymbiosisTrade).toHaveBeenCalledWith(
      {
        tokenAmountIn: {
          chainId: 42161,
          address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
          decimals: 6,
          amount: '100000000',
        },
        tokenOut: { chainId: 56, address: '', decimals: 18 },
        from: FROM,
        to: TO,
        slippage: 50,
        disabledProviders: SYMBIOSIS_DISABLED_PROVIDERS,
        partnerAddress: undefined,
      },
      deps.config,
    )
  })

  it('maps the response onto the trade and step', async () => {
    mockQuote(quote)

    const result = await getSymbiosisTradeContext({ input: makeInput(), deps, from: FROM, to: TO })
    const { tradeCommon, stepCommon, protocolFees, stepDataArgs } = result.unwrap()

    expect(tradeCommon.swapperName).toBe(SwapperName.Symbiosis)
    expect(tradeCommon.affiliateBps).toBe('0')
    expect(tradeCommon.slippageTolerancePercentageDecimal).toBe('0.005')
    expect(stepCommon.buyAmountAfterFeesCryptoBaseUnit).toBe('126000000000000000')
    expect(stepCommon.buyAmountBeforeFeesCryptoBaseUnit).toBe('127000000000000000')
    expect(stepCommon.allowanceContract).toBe(ROUTER)
    expect(stepCommon.estimatedExecutionTimeMs).toBe(38000)
    expect(stepCommon.affiliateFee).toBeUndefined()
    expect(protocolFees?.[BSC.assetId]?.amountCryptoBaseUnit).toBe('1000000000000000')
    expect(stepDataArgs.swapTx).toBe(quote)
    expect(stepDataArgs.from).toBe(FROM)
    expect(stepDataArgs.spenderAddress).toBe(ROUTER)
  })

  it('reports the clamped slippage when the requested value is below the Symbiosis minimum', async () => {
    mockQuote(quote)

    const input = makeInput({ slippageTolerancePercentageDecimal: '0.0005' })
    const result = await getSymbiosisTradeContext({ input, deps, from: FROM, to: TO })

    expect(vi.mocked(fetchSymbiosisTrade).mock.calls[0][0].slippage).toBe(20)
    expect(result.unwrap().tradeCommon.slippageTolerancePercentageDecimal).toBe('0.002')
  })

  it('sets no allowance contract for a native sell', async () => {
    mockQuote(quote)

    const input = makeInput({ sellAsset: ETH_ARBITRUM })
    const result = await getSymbiosisTradeContext({ input, deps, from: FROM, to: TO })

    expect(result.unwrap().stepCommon.allowanceContract).toBe('')
  })

  it('rejects a passthrough route', async () => {
    mockQuote({ ...quote, labels: ['partner-swap'] })

    const result = await getSymbiosisTradeContext({ input: makeInput(), deps, from: FROM, to: TO })

    expect(result.unwrapErr().code).toBe(TradeQuoteError.NoRouteFound)
  })

  it('does not call the provider for a same-chain pair', async () => {
    const input = makeInput({ buyAsset: ETH_ARBITRUM })
    const result = await getSymbiosisTradeContext({ input, deps, from: FROM, to: TO })

    expect(result.unwrapErr().code).toBe(TradeQuoteError.UnsupportedTradePair)
    expect(fetchSymbiosisTrade).not.toHaveBeenCalled()
  })

  it('maps provider error messages and passes the message through', async () => {
    mockProviderError(400, 'Amount is too low to cover fees')

    const result = await getSymbiosisTradeContext({ input: makeInput(), deps, from: FROM, to: TO })

    expect(result.unwrapErr().code).toBe(TradeQuoteError.SellAmountBelowTradeFee)
    expect(result.unwrapErr().message).toBe('Amount is too low to cover fees')
  })

  it('maps HTTP 429 to RateLimitExceeded', async () => {
    mockProviderError(429, 'Too many requests')

    const result = await getSymbiosisTradeContext({ input: makeInput(), deps, from: FROM, to: TO })

    expect(result.unwrapErr().code).toBe(TradeQuoteError.RateLimitExceeded)
  })
})

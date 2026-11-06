import type { Asset } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import { describe, expect, it, vi } from 'vitest'

import type { GetTradeQuoteInput, GetTradeRateInput, SwapperDeps } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { ETH } from '../../../utils/test-data/assets'
import type { KyberBuildData, KyberRouteSummary } from '../types'
import { KYBER_ROUTER_ADDRESS } from './constants'
import { getKyberStepData } from './getKyberStepData'

// The override path reads live chain state, so resolve to no override and hit the mocked adapter
vi.mock('../../../utils/evm/stateOverride', async importOriginal => ({
  ...(await importOriginal<object>()),
  getMinimalStateOverride: vi.fn().mockResolvedValue(undefined),
}))

const HYPE: Asset = {
  ...ETH,
  assetId: 'eip155:999/slip44:60',
  chainId: KnownChainIds.HyperEvmMainnet,
  symbol: 'HYPE',
  name: 'HYPE',
}

const build: KyberBuildData = {
  amountOut: '255332539',
  gas: '679101',
  data: '0xe21fd0e9',
  routerAddress: '0x6131B5fae19EA4f9D964eAc0408E4408b66337b5',
  transactionValue: '3000000000000000000',
}

const makeDeps = (adapter: unknown): SwapperDeps =>
  ({ assertGetEvmChainAdapter: () => adapter }) as unknown as SwapperDeps

const evmAdapter = ({
  gasPrice = '1000000000',
  estimatedGasLimit = '500000',
  throwOnGasFeeData = false,
  throwOnFeeData = false,
} = {}) => ({
  getGasFeeData: () => {
    if (throwOnGasFeeData) return Promise.reject(new Error('rpc down'))
    return Promise.resolve({ average: { gasPrice, maxFeePerGas: '0', maxPriorityFeePerGas: '0' } })
  },
  getFeeData: () => {
    if (throwOnFeeData) return Promise.reject(new Error('execution reverted'))
    return Promise.resolve({
      average: { chainSpecific: { gasLimit: estimatedGasLimit, gasPrice } },
    })
  },
})

const rateInput = { supportsEIP1559: false } as unknown as GetTradeRateInput
const quoteInput = { supportsEIP1559: false } as unknown as GetTradeQuoteInput

const baseArgs = {
  sellAsset: HYPE,
  sellAmountCryptoBaseUnit: '3000000000000000000',
  spenderAddress: '',
  routeSummary: { gas: '679101', gasPrice: '2000000000' } as KyberRouteSummary,
}

describe('getKyberStepData', () => {
  it('prices the provider gas limit for a rate', async () => {
    const actual = await getKyberStepData({
      ...baseArgs,
      type: 'rate',
      input: rateInput,
      deps: makeDeps(evmAdapter()),
    })

    // gas 679101 * gasPrice 1000000000
    expect(actual.unwrap()).toEqual({ networkFeeCryptoBaseUnit: '679101000000000' })
  })

  it('falls back to the provider gas price when rate pricing fails', async () => {
    const actual = await getKyberStepData({
      ...baseArgs,
      type: 'rate',
      input: rateInput,
      deps: makeDeps(evmAdapter({ throwOnGasFeeData: true })),
    })

    // gas 679101 * provider gasPrice 2000000000
    expect(actual.unwrap()).toEqual({ networkFeeCryptoBaseUnit: '1358202000000000' })
  })

  it('builds the router transaction and sets the buffered on chain estimate for a quote', async () => {
    const actual = await getKyberStepData({
      ...baseArgs,
      type: 'quote',
      input: quoteInput,
      from: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      build,
      deps: makeDeps(evmAdapter({ estimatedGasLimit: '500000' })),
    })

    expect(actual.unwrap()).toEqual({
      networkFeeCryptoBaseUnit: '600000000000000',
      transactionData: {
        type: 'evm',
        chainId: 999,
        to: KYBER_ROUTER_ADDRESS,
        data: build.data,
        value: '3000000000000000000',
        gasLimit: '600000',
      },
    })
  })

  it('fails the quote when estimation fails', async () => {
    const actual = await getKyberStepData({
      ...baseArgs,
      type: 'quote',
      input: quoteInput,
      from: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      build,
      deps: makeDeps(evmAdapter({ throwOnFeeData: true })),
    })

    expect(actual.unwrapErr().code).toBe(TradeQuoteError.NetworkFeeEstimationFailed)
  })
})

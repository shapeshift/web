import { solanaChainId, tronChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { describe, expect, it, vi } from 'vitest'

import type { GetTradeQuoteInput, GetTradeRateInput, SwapperDeps } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { ETH, RUNE, WETH } from '../../../utils/test-data/assets'
import { ROUTE_QUOTE } from '../test-data/routeQuote'
import type { BuildTxSuccessItem, RouteSuccessItem } from '../types'
import { getButterSwapStepData } from './getButterSwapStepData'

// The override path reads live chain state - resolve to no override so estimation exercises the
// mocked adapter
vi.mock('../../../utils/evm/stateOverride', async importOriginal => ({
  ...(await importOriginal<object>()),
  getMinimalStateOverride: vi.fn().mockResolvedValue(undefined),
}))

const route = (ROUTE_QUOTE.data as RouteSuccessItem[])[0]

// The provider gas fee, in human units, that every fallback path prices off of
const PROVIDER_GAS_FEE_BASE_UNIT = '1333043669759539' // 0.001333043669759539 ETH

const SOL: Asset = { ...ETH, assetId: `${solanaChainId}/slip44:501`, chainId: solanaChainId }
const TRX: Asset = { ...ETH, assetId: `${tronChainId}/slip44:195`, chainId: tronChainId }
const USDT_TRON: Asset = {
  ...ETH,
  assetId: `${tronChainId}/trc20:TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`,
  chainId: tronChainId,
}

const evmBuildTx: BuildTxSuccessItem = {
  to: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
  data: '0xdeadbeef',
  value: '0x16345785d8a0000', // 0.1 ETH
  chainId: '1',
}

const makeDeps = (adapters: Partial<Record<string, unknown>>): SwapperDeps =>
  ({
    assertGetEvmChainAdapter: () => adapters.evm,
    assertGetUtxoChainAdapter: () => adapters.utxo,
    assertGetSolanaChainAdapter: () => adapters.solana,
    assertGetTronChainAdapter: () => adapters.tron,
  }) as unknown as SwapperDeps

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

const evmRateInput = { supportsEIP1559: false } as unknown as GetTradeRateInput
const evmQuoteInput = { supportsEIP1559: false } as unknown as GetTradeQuoteInput

describe('getButterSwapStepData', () => {
  describe('evm', () => {
    it('prices the provider gas limit for a rate', async () => {
      const actual = await getButterSwapStepData({
        type: 'rate',
        input: evmRateInput,
        deps: makeDeps({ evm: evmAdapter() }),
        route,
        sellAsset: WETH,
        feeAsset: ETH,
        sellAmountCryptoBaseUnit: '999000000000000000',
        spenderAddress: '',
      })

      // gasEstimatedTarget 1159118 * gasPrice 1000000000
      expect(actual.unwrap()).toEqual({ networkFeeCryptoBaseUnit: '1159118000000000' })
    })

    it('falls back to the provider fee when rate estimation fails', async () => {
      const actual = await getButterSwapStepData({
        type: 'rate',
        input: evmRateInput,
        deps: makeDeps({ evm: evmAdapter({ throwOnGasFeeData: true }) }),
        route,
        sellAsset: WETH,
        feeAsset: ETH,
        sellAmountCryptoBaseUnit: '999000000000000000',
        spenderAddress: '',
      })

      expect(actual.unwrap()).toEqual({
        networkFeeCryptoBaseUnit: PROVIDER_GAS_FEE_BASE_UNIT,
      })
    })

    it('estimates gas on chain for a quote instead of trusting the provider target', async () => {
      const actual = await getButterSwapStepData({
        type: 'quote',
        input: evmQuoteInput,
        from: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
        buildTx: evmBuildTx,
        deps: makeDeps({ evm: evmAdapter({ estimatedGasLimit: '500000' }) }),
        route,
        sellAsset: WETH,
        feeAsset: ETH,
        sellAmountCryptoBaseUnit: '999000000000000000',
        spenderAddress: '',
      })

      // gasEstimatedTarget 1159118 is ignored - the tx carries the buffered on chain estimate
      expect(actual.unwrap()).toEqual({
        networkFeeCryptoBaseUnit: '500000000000000',
        transactionData: {
          type: 'evm',
          chainId: 1,
          to: evmBuildTx.to,
          data: evmBuildTx.data,
          value: '100000000000000000',
          gasLimit: '600000',
        },
      })
    })

    it('estimates gas on chain for a quote when the provider omits a target', async () => {
      const actual = await getButterSwapStepData({
        type: 'quote',
        input: evmQuoteInput,
        from: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
        buildTx: evmBuildTx,
        deps: makeDeps({ evm: evmAdapter({ estimatedGasLimit: '500000' }) }),
        route: { ...route, gasEstimatedTarget: '0' },
        sellAsset: WETH,
        feeAsset: ETH,
        sellAmountCryptoBaseUnit: '999000000000000000',
        spenderAddress: '',
      })

      const { transactionData, networkFeeCryptoBaseUnit } = actual.unwrap()

      // The buffered limit is set on the tx data in place, so the executable tx always carries one
      expect(transactionData).toMatchObject({ gasLimit: '600000' })
      expect(networkFeeCryptoBaseUnit).toBe('500000000000000')
    })

    it('errors rather than falling back to the provider fee when quote estimation fails', async () => {
      const actual = await getButterSwapStepData({
        type: 'quote',
        input: evmQuoteInput,
        from: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
        buildTx: evmBuildTx,
        deps: makeDeps({ evm: evmAdapter({ throwOnFeeData: true }) }),
        route: { ...route, gasEstimatedTarget: '0' },
        sellAsset: WETH,
        feeAsset: ETH,
        sellAmountCryptoBaseUnit: '999000000000000000',
        spenderAddress: '',
      })

      expect(actual.isErr()).toBe(true)
      expect(actual.unwrapErr().code).toBe(TradeQuoteError.NetworkFeeEstimationFailed)
    })
  })

  describe('solana', () => {
    it('uses the provider fee for a rate, since swap instructions do not exist yet', async () => {
      const assertGetSolanaChainAdapter = vi.fn()

      const actual = await getButterSwapStepData({
        type: 'rate',
        input: {} as GetTradeRateInput,
        deps: { assertGetSolanaChainAdapter } as unknown as SwapperDeps,
        route,
        sellAsset: SOL,
        feeAsset: SOL,
        sellAmountCryptoBaseUnit: '1000000000',
        spenderAddress: '',
      })

      expect(actual.unwrap()).toEqual({
        networkFeeCryptoBaseUnit: PROVIDER_GAS_FEE_BASE_UNIT,
      })
    })
  })

  describe('tron', () => {
    const tronBuildTx: BuildTxSuccessItem = { ...evmBuildTx, to: 'TRouterAddress' }
    const tronAdapter = ({ txFee = '9000000', allowance = '0' } = {}) => ({
      getFeeData: vi.fn().mockResolvedValue({ fast: { txFee } }),
      httpProvider: {
        getChainPrices: () => Promise.resolve({ energyPrice: 100, bandwidthPrice: 1000 }),
        getTrc20Allowance: vi.fn().mockResolvedValue(allowance),
      },
    })

    it('carries the router call as transactionData and simulates it', async () => {
      const adapter = tronAdapter()

      const actual = await getButterSwapStepData({
        type: 'quote',
        input: {} as GetTradeQuoteInput,
        from: 'TSenderAddress',
        buildTx: tronBuildTx,
        deps: makeDeps({ tron: adapter }),
        route,
        sellAsset: TRX,
        feeAsset: TRX,
        sellAmountCryptoBaseUnit: '1000000',
        spenderAddress: '',
      })

      // Butter's value is the native amount to send: the sell amount for a native sell, 0 for a token
      const transactionData = {
        type: 'tron',
        to: 'TRouterAddress',
        data: evmBuildTx.data,
        value: '100000000000000000',
      }

      expect(actual.unwrap()).toEqual({ transactionData, networkFeeCryptoBaseUnit: '9000000' })
      expect(adapter.getFeeData).toHaveBeenCalledWith({
        to: 'TRouterAddress',
        value: '100000000000000000',
        chainSpecific: { from: 'TSenderAddress', data: evmBuildTx.data },
      })
    })

    it('uses the provider value for a token sell', async () => {
      const actual = await getButterSwapStepData({
        type: 'quote',
        input: {} as GetTradeQuoteInput,
        from: 'TSenderAddress',
        buildTx: { ...tronBuildTx, value: '0x00' },
        deps: makeDeps({ tron: tronAdapter() }),
        route,
        sellAsset: USDT_TRON,
        feeAsset: TRX,
        sellAmountCryptoBaseUnit: '1000000',
        spenderAddress: '',
      })

      expect(actual.unwrap().transactionData).toMatchObject({ value: '0' })
    })

    it('fails a native quote when the simulation fails', async () => {
      const adapter = tronAdapter()
      adapter.getFeeData.mockRejectedValue(new Error('REVERT opcode executed'))

      const actual = await getButterSwapStepData({
        type: 'quote',
        input: {} as GetTradeQuoteInput,
        from: 'TSenderAddress',
        buildTx: tronBuildTx,
        deps: makeDeps({ tron: adapter }),
        route,
        sellAsset: TRX,
        feeAsset: TRX,
        sellAmountCryptoBaseUnit: '1000000',
        spenderAddress: '',
      })

      expect(actual.isErr()).toBe(true)
    })

    it('prices the measured worst case when a token allowance is not granted yet', async () => {
      const adapter = tronAdapter({ allowance: '0' })
      adapter.getFeeData.mockRejectedValue(new Error('REVERT opcode executed'))

      const actual = await getButterSwapStepData({
        type: 'quote',
        input: {} as GetTradeQuoteInput,
        from: 'TSenderAddress',
        buildTx: { ...tronBuildTx, value: '0x00' },
        deps: makeDeps({ tron: adapter }),
        route,
        sellAsset: USDT_TRON,
        feeAsset: TRX,
        sellAmountCryptoBaseUnit: '1000000',
        spenderAddress: '',
      })

      // 450000 energy * 100 sun + (4 calldata + 279 envelope) bytes * 1000 sun
      expect(actual.unwrap().networkFeeCryptoBaseUnit).toBe('45283000')
    })

    it('rates price the provider fee', async () => {
      const actual = await getButterSwapStepData({
        type: 'rate',
        input: {} as GetTradeRateInput,
        deps: makeDeps({ tron: tronAdapter() }),
        route,
        sellAsset: TRX,
        feeAsset: TRX,
        sellAmountCryptoBaseUnit: '1000000',
        spenderAddress: '',
      })

      expect(actual.unwrap()).toEqual({ networkFeeCryptoBaseUnit: PROVIDER_GAS_FEE_BASE_UNIT })
    })
  })

  it('errors on an unsupported chain namespace', async () => {
    const actual = await getButterSwapStepData({
      type: 'rate',
      input: {} as GetTradeRateInput,
      deps: {} as SwapperDeps,
      route,
      sellAsset: RUNE,
      feeAsset: RUNE,
      sellAmountCryptoBaseUnit: '100000000',
      spenderAddress: '',
    })

    expect(actual.isErr()).toBe(true)
    expect(actual.unwrapErr().code).toBe(TradeQuoteError.UnsupportedChain)
  })
})

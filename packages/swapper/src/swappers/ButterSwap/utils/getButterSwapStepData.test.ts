import { solanaChainId, tronChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { describe, expect, it, vi } from 'vitest'

import type { GetTradeQuoteInput, GetTradeRateInput, SwapperDeps } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { BTC, ETH, RUNE, WETH } from '../../../utils/test-data/assets'
import { ROUTE_QUOTE } from '../test-data/routeQuote'
import type { BuildTxSuccessItem, RouteSuccessItem } from '../types'
import { getButterSwapStepData } from './getButterSwapStepData'

const route = (ROUTE_QUOTE.data as RouteSuccessItem[])[0]

// The provider gas fee, in human units, that every fallback path prices off of
const PROVIDER_GAS_FEE_BASE_UNIT = '1333043669759539' // 0.001333043669759539 ETH

const SOL: Asset = { ...ETH, assetId: `${solanaChainId}/slip44:501`, chainId: solanaChainId }
const TRX: Asset = { ...ETH, assetId: `${tronChainId}/slip44:195`, chainId: tronChainId }

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
      })

      expect(actual.isErr()).toBe(true)
      expect(actual.unwrapErr().code).toBe(TradeQuoteError.NetworkFeeEstimationFailed)
    })
  })

  describe('utxo', () => {
    const utxoAdapter = {
      getFeeData: () => Promise.resolve({ fast: { txFee: '4200' } }),
      httpProvider: {
        getNetworkFees: () => Promise.resolve({ fast: { satsPerKiloByte: 10000 } }),
      },
    }

    it('estimates off the default vsize for a rate with no pubkey', async () => {
      const actual = await getButterSwapStepData({
        type: 'rate',
        input: {} as GetTradeRateInput,
        deps: makeDeps({ utxo: utxoAdapter }),
        route,
        sellAsset: BTC,
        feeAsset: BTC,
        sellAmountCryptoBaseUnit: '100000',
      })

      // 10 sats/byte * 200 vbyte default
      expect(actual.unwrap()).toEqual({ networkFeeCryptoBaseUnit: '2000' })
    })

    it('builds transaction data with the memo as op return data for a quote', async () => {
      const actual = await getButterSwapStepData({
        type: 'quote',
        input: { xpub: 'zpub6qux' } as unknown as GetTradeQuoteInput,
        from: 'bc1qaddress',
        buildTx: { ...evmBuildTx, to: 'bc1qbridge', memo: 'butter-memo' },
        deps: makeDeps({ utxo: utxoAdapter }),
        route,
        sellAsset: BTC,
        feeAsset: BTC,
        sellAmountCryptoBaseUnit: '100000',
      })

      expect(actual.unwrap()).toEqual({
        networkFeeCryptoBaseUnit: '4200',
        transactionData: {
          type: 'utxo',
          to: 'bc1qbridge',
          opReturnData: 'butter-memo',
          value: '100000',
        },
      })
    })

    it('errors when the quote is missing the memo the bridge routes on', async () => {
      const actual = await getButterSwapStepData({
        type: 'quote',
        input: { xpub: 'zpub6qux' } as unknown as GetTradeQuoteInput,
        from: 'bc1qaddress',
        buildTx: { ...evmBuildTx, to: 'bc1qbridge', memo: undefined },
        deps: makeDeps({ utxo: utxoAdapter }),
        route,
        sellAsset: BTC,
        feeAsset: BTC,
        sellAmountCryptoBaseUnit: '100000',
      })

      expect(actual.isErr()).toBe(true)
      expect(actual.unwrapErr().code).toBe(TradeQuoteError.InvalidResponse)
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
      })

      expect(actual.unwrap()).toEqual({
        networkFeeCryptoBaseUnit: PROVIDER_GAS_FEE_BASE_UNIT,
      })
    })
  })

  describe('tron', () => {
    it('returns legacy metadata rather than transaction data, since exec still builds from it', async () => {
      const buildTx: BuildTxSuccessItem = {
        ...evmBuildTx,
        to: 'TRouterAddress',
        method: 'swapAndCall',
        args: [{ type: 'address', value: 'TSpender' }],
      }

      const actual = await getButterSwapStepData({
        type: 'quote',
        input: {} as GetTradeQuoteInput,
        from: 'TSenderAddress',
        buildTx,
        deps: {} as SwapperDeps,
        route,
        sellAsset: TRX,
        feeAsset: TRX,
        sellAmountCryptoBaseUnit: '1000000',
      })

      expect(actual.unwrap()).toEqual({
        networkFeeCryptoBaseUnit: PROVIDER_GAS_FEE_BASE_UNIT,
        butterSwapTransactionMetadata: {
          to: 'TRouterAddress',
          data: evmBuildTx.data,
          value: evmBuildTx.value,
          method: 'swapAndCall',
          args: [{ type: 'address', value: 'TSpender' }],
          memo: undefined,
        },
      })
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
    })

    expect(actual.isErr()).toBe(true)
    expect(actual.unwrapErr().code).toBe(TradeQuoteError.UnsupportedChain)
  })
})

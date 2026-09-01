import type { Asset } from '@shapeshiftoss/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { GetTradeRateInput, SwapperDeps } from '../../../types'
import { USDC_MAINNET } from '../../../utils/test-data/assets'
import type { PortalsTx } from './fetchPortalsTradeOrder'
import { getPortalsStepData } from './getPortalsStepData'

vi.mock('../../../utils/evm', async importOriginal => ({
  ...(await importOriginal<object>()),
  estimateGasWithStateOverride: vi.fn(),
}))

vi.mock('./fetchPortalsTradeOrder', async importOriginal => ({
  ...(await importOriginal<object>()),
  fetchPortalsTradeEstimate: vi.fn(),
}))

const { estimateGasWithStateOverride } = await import('../../../utils/evm')
const { fetchPortalsTradeEstimate } = await import('./fetchPortalsTradeOrder')

const GAS_PRICE = '1000000000'

const deps = {
  assertGetEvmChainAdapter: () => ({
    getGasFeeData: () =>
      Promise.resolve({
        average: { gasPrice: GAS_PRICE, maxFeePerGas: '0', maxPriorityFeePerGas: '0' },
      }),
  }),
  config: {},
} as unknown as SwapperDeps

const tx = (gasLimit?: string): PortalsTx => ({
  to: '0x4cd00e387622c35bddb9b4c962c136462338bc31',
  from: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  data: '0xdeadbeef',
  value: '0',
  gasLimit,
})

const rate = (portalsTx: PortalsTx) =>
  getPortalsStepData({
    type: 'rate',
    input: { supportsEIP1559: false } as unknown as GetTradeRateInput,
    deps,
    tx: portalsTx,
    sellAsset: USDC_MAINNET as Asset,
    sellAmountCryptoBaseUnit: '1000000000',
    spenderAddress: '0x4cd00e387622c35bddb9b4c962c136462338bc31',
    inputToken: 'ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    outputToken: 'arbitrum:0xaf88d065e77c8cc2239327c5edb3a432268e5831',
    inputAmount: '1000000000',
    slippageTolerancePercentage: 2.5,
  })

const estimateEndpointGasLimit = (gasLimit: number) =>
  vi.mocked(fetchPortalsTradeEstimate).mockResolvedValue({
    context: { gasLimit },
  } as unknown as Awaited<ReturnType<typeof fetchPortalsTradeEstimate>>)

describe('getPortalsStepData rate gas limit', () => {
  beforeEach(() => vi.clearAllMocks())

  it('falls back to the order gas limit on bridge routes the estimate endpoint zeroes', async () => {
    vi.mocked(estimateGasWithStateOverride).mockRejectedValue(new Error('execution reverted'))
    estimateEndpointGasLimit(0)

    const actual = await rate(tx('76384'))

    expect(actual.unwrap()).toEqual({ networkFeeCryptoBaseUnit: '76384000000000' })
    expect(fetchPortalsTradeEstimate).not.toHaveBeenCalled()
  })

  it('falls back to the estimate endpoint when the order carries no gas limit', async () => {
    vi.mocked(estimateGasWithStateOverride).mockRejectedValue(new Error('execution reverted'))
    estimateEndpointGasLimit(273203)

    const actual = await rate(tx(undefined))

    expect(actual.unwrap()).toEqual({ networkFeeCryptoBaseUnit: '273203000000000' })
  })

  it('errors rather than pricing a zero gas limit as a free trade', async () => {
    vi.mocked(estimateGasWithStateOverride).mockRejectedValue(new Error('execution reverted'))
    estimateEndpointGasLimit(0)

    const actual = await rate(tx(undefined))

    expect(actual.isErr()).toBe(true)
    expect(actual.unwrapErr().message).toContain('getPortalsStepData')
  })
})

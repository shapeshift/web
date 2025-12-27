import { KnownChainIds } from '@shapeshiftoss/types'
import { bn } from '@shapeshiftoss/utils'
import { Ok } from '@sniptt/monads'
import type { AxiosResponse } from 'axios'
import { describe, expect, it, vi } from 'vitest'

import type { GetTradeRateInput, SwapperDeps } from '../../../types'
import { BTC, ETH, USDC_MAINNET, WETH } from '../../utils/test-data/assets'
import ethBtcRoute from '../test-data/eth-btc.json'
import { ROUTE_QUOTE } from '../test-data/routeQuote'
import type { RouteResponse } from '../types'
import { butterService } from '../utils/butterSwapService'
import { getTradeRate } from './getTradeRate'

vi.mock('../utils/butterSwapService', () => ({
  butterService: {
    get: vi.fn(),
  },
}))

describe('getTradeRate', () => {
  it('should return a trade rate', async () => {
    const deps: SwapperDeps = {
      assetsById: { [ETH.assetId]: ETH },
      assertGetChainAdapter: () => vi.fn() as any,
      assertGetEvmChainAdapter: () => vi.fn() as any,
      assertGetUtxoChainAdapter: () => vi.fn() as any,
      assertGetCosmosSdkChainAdapter: () => vi.fn() as any,
      assertGetSolanaChainAdapter: () => vi.fn() as any,
      assertGetTronChainAdapter: () => vi.fn() as any,
      assertGetSuiChainAdapter: () => vi.fn() as any,
      assertGetNearChainAdapter: () => vi.fn() as any,
      config: {
        VITE_BUTTERSWAP_CLIENT_ID: 'test',
      } as any,
      mixPanel: undefined,
      fetchIsSmartContractAddressQuery: vi.fn(),
    }

    const input: GetTradeRateInput = {
      sellAsset: WETH,
      buyAsset: USDC_MAINNET,
      sellAmountIncludingProtocolFeesCryptoBaseUnit: bn(1).shiftedBy(18).toString(),
      affiliateBps: '0',
      allowMultiHop: true,
      receiveAddress: '0x123',
      accountNumber: undefined,
      quoteOrRate: 'rate',
      chainId: KnownChainIds.EthereumMainnet,
      supportsEIP1559: false, // TODO - upstream type bug? this is a literal false in the type def
    }

    vi.mocked(butterService.get).mockResolvedValue(
      Ok({ data: ROUTE_QUOTE } as AxiosResponse<RouteResponse>),
    )

    const result = await getTradeRate(input, deps)

    expect(result.isOk()).toBe(true)
    const tradeRate = result.unwrap()
    expect(tradeRate[0].rate).toBe('2296.409699')
  })

  it('should return a correct trade rate and steps for a multi-hop ETH->BTC route', async () => {
    const deps: SwapperDeps = {
      assetsById: { [ETH.assetId]: ETH, [BTC.assetId]: BTC },
      assertGetChainAdapter: () => vi.fn() as any,
      assertGetEvmChainAdapter: () => vi.fn() as any,
      assertGetUtxoChainAdapter: () => vi.fn() as any,
      assertGetCosmosSdkChainAdapter: () => vi.fn() as any,
      assertGetSolanaChainAdapter: () => vi.fn() as any,
      assertGetTronChainAdapter: () => vi.fn() as any,
      assertGetSuiChainAdapter: () => vi.fn() as any,
      assertGetNearChainAdapter: () => vi.fn() as any,
      config: {
        VITE_BUTTERSWAP_CLIENT_ID: 'test',
      } as any,
      mixPanel: undefined,
      fetchIsSmartContractAddressQuery: vi.fn(),
    }

    const input: GetTradeRateInput = {
      sellAsset: ETH,
      buyAsset: BTC,
      sellAmountIncludingProtocolFeesCryptoBaseUnit: bn(1).shiftedBy(18).toString(),
      affiliateBps: '0',
      allowMultiHop: true,
      receiveAddress: '0x123',
      accountNumber: undefined,
      quoteOrRate: 'rate',
      chainId: KnownChainIds.EthereumMainnet,
      supportsEIP1559: false,
    }

    // Use the first route in the eth-btc.json data
    vi.mocked(butterService.get).mockResolvedValue(
      Ok({ data: ethBtcRoute } as AxiosResponse<typeof ethBtcRoute>),
    )

    const result = await getTradeRate(input, deps)

    expect(result.isOk()).toBe(true)
    const tradeRate = result.unwrap()[0]
    expect(tradeRate).toBeDefined()
    // The expected rate is dstChain.totalAmountOut / srcChain.totalAmountIn
    expect(tradeRate.rate).toBe('0.02284418')
    // Should have a single step
    expect(tradeRate.steps).toBeDefined()
    expect(tradeRate.steps.length).toBe(1)
    // The step should have the correct rate
    expect(tradeRate.steps[0]?.rate).toBe('0.02284418')
    // The buyAmountAfterFeesCryptoBaseUnit of the step should match the output in base units
    expect(tradeRate.steps[0]?.buyAmountAfterFeesCryptoBaseUnit).toBe('2284418') // 0.02284418 BTC in base units
  })
})

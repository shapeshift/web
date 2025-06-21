import { KnownChainIds } from '@shapeshiftoss/types'
import { bn } from '@shapeshiftoss/utils'
import { Ok } from '@sniptt/monads'
import type { AxiosResponse } from 'axios'
import { describe, expect, it, vi } from 'vitest'

import type { GetTradeRateInput, SwapperDeps } from '../../../types'
import { ROUTE_QUOTE } from '../../../utils/test-data/butter/routeQuote'
import { USDC_MAINNET, WETH } from '../../utils/test-data/assets'
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
      assetsById: {},
      assertGetChainAdapter: () => vi.fn() as any,
      assertGetEvmChainAdapter: () => vi.fn() as any,
      assertGetUtxoChainAdapter: () => vi.fn() as any,
      assertGetCosmosSdkChainAdapter: () => vi.fn() as any,
      assertGetSolanaChainAdapter: () => vi.fn() as any,
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
      Ok({ data: ROUTE_QUOTE } as unknown as AxiosResponse),
    )
    const result = await getTradeRate(input, deps)

    expect(result.isOk()).toBe(true)
    const tradeRate = result.unwrap()
    expect(tradeRate[0].rate).toBe('2298.70840740740740740741')
  })
})

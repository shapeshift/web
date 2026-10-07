import { tronAssetId, tronChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { GetTradeQuoteInput, SwapperDeps } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { getEvmNetworkFeeCryptoBaseUnit } from '../../../utils/evm'
import { ETH, ETH_ARBITRUM, USDC_ARBITRUM } from '../../../utils/test-data/assets'
import { getTronContractCallNetworkFeeCryptoBaseUnit } from '../../../utils/tron'
import { getSymbiosisStepData } from './getSymbiosisStepData'
import type { SymbiosisSwapTx } from './types'

vi.mock('../../../utils/evm', () => ({
  getEvmNetworkFeeCryptoBaseUnit: vi.fn(),
}))

vi.mock('../../../utils/tron', () => ({
  getTronContractCallFallbackFeeCryptoBaseUnit: vi.fn(),
  getTronContractCallNetworkFeeCryptoBaseUnit: vi.fn(),
}))

const TRX: Asset = {
  ...ETH,
  assetId: tronAssetId,
  chainId: tronChainId,
  symbol: 'TRX',
  precision: 6,
}

const ROUTER = '0x3743c756b64ECd0770f1d4f47696A73d2A46dcbe'
const TRON_ROUTER = 'TPuaJ6gnYfE9gLUDFrbWbPx3tMnjG8max1'
const FROM = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
const TRON_FROM = 'TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7'

const deps = {
  assertGetEvmChainAdapter: vi.fn(() => ({})),
  assertGetTronChainAdapter: vi.fn(() => ({})),
} as unknown as SwapperDeps

const quoteInput = { supportsEIP1559: true } as unknown as GetTradeQuoteInput

const evmSwapTx: SymbiosisSwapTx = {
  type: 'evm',
  tx: { chainId: 42161, to: ROUTER, data: '0xa11b1198', value: '0' },
}

const tronSwapTx: SymbiosisSwapTx = {
  type: 'tron',
  tx: {
    chainId: 728126428,
    from: TRON_FROM,
    to: TRON_ROUTER,
    data: '0x0020',
    value: '500000000',
    feeLimit: 200000000,
    functionSelector:
      'metaRoute((bytes,bytes,address[],address,address,uint256,bool,address,bytes))',
  },
}

const evmArgs = {
  swapTx: evmSwapTx,
  sellAsset: USDC_ARBITRUM,
  sellAmountCryptoBaseUnit: '100000000',
  spenderAddress: ROUTER,
  tronFallbackEnergy: '470000',
  from: FROM,
  deps,
}

const tronArgs = {
  swapTx: tronSwapTx,
  sellAsset: TRX,
  sellAmountCryptoBaseUnit: '500000000',
  spenderAddress: '',
  tronFallbackEnergy: '580000',
  from: TRON_FROM,
  deps,
}

describe('getSymbiosisStepData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('evm', () => {
    it('fails to build when a token sell carries native value', async () => {
      const swapTx: SymbiosisSwapTx = {
        type: 'evm',
        tx: { ...evmSwapTx.tx, value: '300000000000000' },
      }

      const result = await getSymbiosisStepData({
        ...evmArgs,
        swapTx,
        type: 'quote',
        input: quoteInput,
      })

      expect(result.unwrapErr().code).toBe(TradeQuoteError.InvalidResponse)
      expect(getEvmNetworkFeeCryptoBaseUnit).not.toHaveBeenCalled()
    })

    it('fails to build when a native sell sends more than the sell amount', async () => {
      const swapTx: SymbiosisSwapTx = {
        type: 'evm',
        tx: { ...evmSwapTx.tx, value: '50300000000000000' },
      }

      const result = await getSymbiosisStepData({
        ...evmArgs,
        swapTx,
        sellAsset: ETH_ARBITRUM,
        sellAmountCryptoBaseUnit: '50000000000000000',
        type: 'quote',
        input: quoteInput,
      })

      expect(result.unwrapErr().code).toBe(TradeQuoteError.InvalidResponse)
      expect(getEvmNetworkFeeCryptoBaseUnit).not.toHaveBeenCalled()
    })

    it('fails to build when the payload is for another chain', async () => {
      const swapTx: SymbiosisSwapTx = { type: 'evm', tx: { ...evmSwapTx.tx, chainId: 1 } }

      const result = await getSymbiosisStepData({
        ...evmArgs,
        swapTx,
        type: 'quote',
        input: quoteInput,
      })

      expect(result.unwrapErr().code).toBe(TradeQuoteError.InvalidResponse)
      expect(getEvmNetworkFeeCryptoBaseUnit).not.toHaveBeenCalled()
    })

    it('builds a native sell whose value is exactly the sell amount', async () => {
      vi.mocked(getEvmNetworkFeeCryptoBaseUnit).mockResolvedValue('1234')

      const swapTx: SymbiosisSwapTx = {
        type: 'evm',
        tx: { ...evmSwapTx.tx, value: '50000000000000000' },
      }

      const result = await getSymbiosisStepData({
        ...evmArgs,
        swapTx,
        sellAsset: ETH_ARBITRUM,
        sellAmountCryptoBaseUnit: '50000000000000000',
        type: 'quote',
        input: quoteInput,
      })

      expect(result.isOk()).toBe(true)
    })
  })

  describe('tron', () => {
    const expectedCall = { to: TRON_ROUTER, data: '0xa11b11980020', value: '500000000' }

    it('assembles the contract call and prices it for a quote', async () => {
      vi.mocked(getTronContractCallNetworkFeeCryptoBaseUnit).mockResolvedValue('45000000')

      const result = await getSymbiosisStepData({ ...tronArgs, type: 'quote', input: quoteInput })

      expect(result.unwrap()).toEqual({
        transactionData: { type: 'tron', ...expectedCall },
        networkFeeCryptoBaseUnit: '45000000',
      })
      expect(getTronContractCallNetworkFeeCryptoBaseUnit).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionData: expectedCall,
          from: TRON_FROM,
          spenderAddress: '',
          fallbackEnergy: '580000',
        }),
      )
    })

    it('fails to build when the response has no function selector', async () => {
      const swapTx: SymbiosisSwapTx = {
        type: 'tron',
        tx: { ...tronSwapTx.tx, functionSelector: undefined },
      }

      const result = await getSymbiosisStepData({
        ...tronArgs,
        swapTx,
        type: 'quote',
        input: quoteInput,
      })

      expect(result.unwrapErr().code).toBe(TradeQuoteError.InvalidResponse)
      expect(getTronContractCallNetworkFeeCryptoBaseUnit).not.toHaveBeenCalled()
    })
  })
})

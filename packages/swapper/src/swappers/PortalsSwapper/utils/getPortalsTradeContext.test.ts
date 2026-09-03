import { describe, expect, it } from 'vitest'

import type { SwapperDeps } from '../../../types'
import { USDC_ARBITRUM, USDC_MAINNET } from '../../../utils/test-data/assets'
import type { PortalsTradeQuoteInput, PortalsTradeRateInput } from '../types'
import type { PortalsTradeOrderResponse, PortalsTx } from './fetchPortalsTradeOrder'
import { getPortalsTradeContext } from './getPortalsTradeContext'

const deps = {} as SwapperDeps

const tx: PortalsTx = {
  to: '0x4cd00e387622c35bddb9b4c962c136462338bc31',
  from: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  data: '0xdeadbeef',
  value: '0',
}

const makeInput = (buyAsset = USDC_ARBITRUM) =>
  ({
    sellAsset: USDC_MAINNET,
    buyAsset,
    affiliateBps: '0',
    sellAmountIncludingProtocolFeesCryptoBaseUnit: '4631313795',
  }) as unknown as PortalsTradeQuoteInput | PortalsTradeRateInput

const makeOrderContext = (
  overrides: Partial<PortalsTradeOrderResponse['context']>,
): PortalsTradeOrderResponse['context'] =>
  ({
    orderId: 'eaae8ea5-30af-4463-97ab-1c5b1fe7def4',
    target: '0x4cd00e387622c35bddb9b4c962c136462338bc31',
    inputAmount: '4631313795',
    ...overrides,
  }) as PortalsTradeOrderResponse['context']

const unwrap = (args: Parameters<typeof getPortalsTradeContext>[0]) =>
  getPortalsTradeContext(args).unwrap()

describe('getPortalsTradeContext', () => {
  it('does not gross up a bridge route Portals applied no slippage to', () => {
    const { stepCommon, tradeCommon } = unwrap({
      input: makeInput(),
      deps,
      sellChainId: USDC_MAINNET.chainId as never,
      orderContext: makeOrderContext({
        outputAmount: '4616564490',
        minOutputAmount: '4616564490',
        slippageTolerancePercentage: 0,
      }),
      outputToken: 'arbitrum:0xaf88d065e77c8cc2239327c5edb3a432268e5831',
      tx,
    })

    expect(stepCommon.buyAmountAfterFeesCryptoBaseUnit).toBe('4616564490')
    expect(tradeCommon.slippageTolerancePercentageDecimal).toBe('0')
  })

  it('reverses the applied slippage on an unvalidated order collapsed to its minimum', () => {
    const { stepCommon, tradeCommon } = unwrap({
      input: makeInput(USDC_MAINNET),
      deps,
      sellChainId: USDC_MAINNET.chainId as never,
      orderContext: makeOrderContext({
        outputAmount: '2360574345',
        minOutputAmount: '2360574345',
        slippageTolerancePercentage: 2.5,
      }),
      outputToken: 'ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      tx,
    })

    // Within 0.01% of the 2420957576 the same order returns when validated
    expect(stepCommon.buyAmountAfterFeesCryptoBaseUnit).toBe('2421101892')
    expect(tradeCommon.slippageTolerancePercentageDecimal).toBe('0.025')
  })

  it('keeps the reported output of a validated order and advertises the wider buffer', () => {
    const { stepCommon, tradeCommon } = unwrap({
      input: makeInput(USDC_MAINNET),
      deps,
      sellChainId: USDC_MAINNET.chainId as never,
      orderContext: makeOrderContext({
        outputAmount: '2420957576',
        minOutputAmount: '2360574345',
        slippageTolerancePercentage: 2.5,
      }),
      outputToken: 'ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      tx,
    })

    expect(stepCommon.buyAmountAfterFeesCryptoBaseUnit).toBe('2420957576')
    expect(tradeCommon.slippageTolerancePercentageDecimal).toBe('0.025')
  })

  it('prices against the input amount Portals filled rather than the one requested', () => {
    const { stepCommon } = unwrap({
      input: makeInput(),
      deps,
      sellChainId: USDC_MAINNET.chainId as never,
      orderContext: makeOrderContext({
        // Portals withhold 0.01% of the requested 4631313795 on cross-chain orders
        inputAmount: '4630850664',
        outputAmount: '4616564490',
        minOutputAmount: '4616564490',
        slippageTolerancePercentage: 0,
      }),
      outputToken: 'arbitrum:0xaf88d065e77c8cc2239327c5edb3a432268e5831',
      tx,
    })

    expect(stepCommon.sellAmountIncludingProtocolFeesCryptoBaseUnit).toBe('4630850664')
  })
})

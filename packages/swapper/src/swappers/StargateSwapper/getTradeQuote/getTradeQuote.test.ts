import { arbitrumChainId, baseChainId, ethChainId, optimismChainId, polygonChainId } from '@shapeshiftoss/caip'
import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import { describe, expect, it, vi } from 'vitest'

import type { GetEvmTradeQuoteInputBase, SwapperDeps } from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import {
  ETH,
  ETH_ARBITRUM,
  ETH_BASE,
  FOX_MAINNET,
  USDC_ARBITRUM,
  USDC_BASE,
  USDC_MAINNET,
  USDC_OPTIMISM,
  USDC_POLYGON,
  USDT_ARBITRUM,
  USDT_MAINNET,
} from '../../utils/test-data/assets'
import { getTradeQuote } from './getTradeQuote'

vi.mock('@shapeshiftoss/contracts', () => ({
  viemClientByChainId: {
    [ethChainId]: {
      call: vi.fn().mockResolvedValue({ data: '0xdeadbeef' }),
    },
    [arbitrumChainId]: {
      call: vi.fn().mockResolvedValue({ data: '0xdeadbeef' }),
    },
    [optimismChainId]: {
      call: vi.fn().mockResolvedValue({ data: '0xdeadbeef' }),
    },
    [baseChainId]: {
      call: vi.fn().mockResolvedValue({ data: '0xdeadbeef' }),
    },
    [polygonChainId]: {
      call: vi.fn().mockResolvedValue({ data: '0xdeadbeef' }),
    },
  },
}))

vi.mock('@shapeshiftoss/chain-adapters', async () => {
  const actual = await vi.importActual('@shapeshiftoss/chain-adapters')
  return {
    ...actual,
    evm: {
      getFees: vi.fn().mockResolvedValue({ networkFeeCryptoBaseUnit: '21000' }),
      calcNetworkFeeCryptoBaseUnit: vi.fn().mockReturnValue('21000'),
    },
  }
})

vi.mock('../utils/helpers', () => ({
  encodeQuoteOFT: vi.fn().mockReturnValue('0x11'),
  decodeQuoteOFTResult: vi.fn().mockReturnValue([
    {},
    [],
    { amountReceivedLD: 990_000_000n, amountSentLD: 1_000_000_000n },
  ]),
  encodeQuoteSend: vi.fn().mockReturnValue('0x22'),
  decodeQuoteSendResult: vi.fn().mockReturnValue({
    nativeFee: 1_000_000_000_000_000n,
    lzTokenFee: 0n,
  }),
  encodeSend: vi.fn().mockReturnValue('0x33'),
}))

describe('Stargate getTradeQuote', () => {
  const mockAdapter = {
    getGasFeeData: vi.fn().mockResolvedValue({
      average: { gasPrice: '42', maxFeePerGas: '42' },
    }),
  } as unknown as EvmChainAdapter

  const deps = {
    assertGetEvmChainAdapter: () => mockAdapter,
  } as unknown as SwapperDeps

  const commonInput = {
    sellAsset: USDC_MAINNET,
    buyAsset: USDC_ARBITRUM,
    accountNumber: 0,
    affiliateBps: '0',
    sellAmountIncludingProtocolFeesCryptoBaseUnit: '1000000000',
    sendAddress: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
    receiveAddress: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
    slippageTolerancePercentageDecimal: '0.005',
  } as unknown as GetEvmTradeQuoteInputBase

  it('returns error when sendAddress is missing', async () => {
    const result = await getTradeQuote({ ...commonInput, sendAddress: undefined }, deps)
    expect(result.isErr()).toBe(true)
    const err = result.unwrapErr()
    expect(err.message).toBe('sendAddress is required')
    expect(err.code).toBe(TradeQuoteError.InternalError)
  })

  it('returns error when receiveAddress is missing', async () => {
    const result = await getTradeQuote({ ...commonInput, receiveAddress: undefined }, deps)
    expect(result.isErr()).toBe(true)
    const err = result.unwrapErr()
    expect(err.message).toBe('receiveAddress is required')
    expect(err.code).toBe(TradeQuoteError.InternalError)
  })

  it('returns UnsupportedTradePair error for same-chain swap', async () => {
    const result = await getTradeQuote(
      { ...commonInput, buyAsset: USDC_MAINNET },
      deps,
    )
    expect(result.isErr()).toBe(true)
    expect(result.unwrapErr().code).toBe(TradeQuoteError.UnsupportedTradePair)
  })

  it('returns UnsupportedChain error for unsupported sell chain', async () => {
    // ETH on mainnet → USDC Arbitrum but sell asset on a non-Stargate chain
    const result = await getTradeQuote(
      {
        ...commonInput,
        sellAsset: { ...ETH, chainId: 'eip155:5' as const }, // Goerli (not supported)
      },
      deps,
    )
    expect(result.isErr()).toBe(true)
    expect(result.unwrapErr().code).toBe(TradeQuoteError.UnsupportedChain)
  })

  it('returns a valid quote for USDC Ethereum → USDC Arbitrum', async () => {
    const result = await getTradeQuote(commonInput, deps)
    expect(result.isOk()).toBe(true)

    const quotes = result.unwrap()
    expect(quotes).toHaveLength(1)

    const quote = quotes[0]
    expect(quote.swapperName).toBe(SwapperName.Stargate)
    expect(quote.receiveAddress).toBe(commonInput.receiveAddress)
    expect(quote.quoteOrRate).toBe('quote')
    expect(quote.slippageTolerancePercentageDecimal).toBe('0.005')
  })

  it('quote step has correct source and chain metadata', async () => {
    const result = await getTradeQuote(commonInput, deps)
    const step = result.unwrap()[0].steps[0]

    expect(step.source).toBe(SwapperName.Stargate)
    expect(step.sellAsset.chainId).toBe(ethChainId)
    expect(step.buyAsset.chainId).toBe(arbitrumChainId)
    expect(step.estimatedExecutionTimeMs).toBe(60_000)
  })

  it('quote step includes protocol fees and network fee', async () => {
    const result = await getTradeQuote(commonInput, deps)
    const step = result.unwrap()[0].steps[0]

    expect(step.feeData.networkFeeCryptoBaseUnit).toBeDefined()
    expect(step.feeData.protocolFees).toBeDefined()
    const protocolFee = step.feeData.protocolFees[USDC_MAINNET.assetId]
    expect(protocolFee).toBeDefined()
    // fee = amountSentLD - amountReceivedLD = 1_000_000_000 - 990_000_000 = 10_000_000
    expect(protocolFee.amountCryptoBaseUnit).toBe('10000000')
  })

  it('quote step has stargateTransactionMetadata', async () => {
    const result = await getTradeQuote(commonInput, deps)
    const step = result.unwrap()[0].steps[0]

    expect(step.stargateTransactionMetadata).toBeDefined()
    expect(step.stargateTransactionMetadata.to).toBeDefined()
    expect(step.stargateTransactionMetadata.data).toBe('0x33')
  })

  it('buyAmountAfterFees reflects the received amount from quoteOFT', async () => {
    const result = await getTradeQuote(commonInput, deps)
    const step = result.unwrap()[0].steps[0]

    // mocked amountReceivedLD = 990_000_000
    expect(step.buyAmountAfterFeesCryptoBaseUnit).toBe('990000000')
    expect(step.buyAmountBeforeFeesCryptoBaseUnit).toBe('1000000000')
  })

  it('slippage is applied: minAmountLD = detailDstAmountLD * (1 - slippage)', async () => {
    const { encodeSend } = await import('../utils/helpers')

    await getTradeQuote(commonInput, deps)

    // encodeSend should have been called with sendParam.minAmountLD = 990_000_000 * 0.995 = 985_050_000
    const sendParamArg = vi.mocked(encodeSend).mock.calls[0][0]
    expect(sendParamArg.minAmountLD).toBe(985_050_000n)
  })

  it('returns UnsupportedChain error for unsupported buy chain', async () => {
    const result = await getTradeQuote(
      {
        ...commonInput,
        buyAsset: { ...USDC_ARBITRUM, chainId: 'eip155:5' as const }, // Goerli (not supported)
      },
      deps,
    )
    expect(result.isErr()).toBe(true)
    expect(result.unwrapErr().code).toBe(TradeQuoteError.UnsupportedChain)
  })

  it('returns UnsupportedTradePair error when sell asset has no Stargate contract', async () => {
    // FOX has no Stargate pool on mainnet
    const result = await getTradeQuote(
      { ...commonInput, sellAsset: FOX_MAINNET },
      deps,
    )
    expect(result.isErr()).toBe(true)
    expect(result.unwrapErr().code).toBe(TradeQuoteError.UnsupportedTradePair)
  })

  it('returns a valid quote for ETH (mainnet) → ETH (Arbitrum) native bridge', async () => {
    const result = await getTradeQuote(
      { ...commonInput, sellAsset: ETH, buyAsset: ETH_ARBITRUM },
      deps,
    )
    expect(result.isOk()).toBe(true)

    const step = result.unwrap()[0].steps[0]
    expect(step.sellAsset.chainId).toBe(ethChainId)
    expect(step.buyAsset.chainId).toBe(arbitrumChainId)
    // native sell: txValue = nativeFee + sellAmount
    // mocked nativeFee = 1_000_000_000_000_000, sellAmount = 1_000_000_000
    expect(step.stargateTransactionMetadata.value).toBe('1000001000000000')
  })

  it('returns a valid quote for USDC (Arbitrum) → USDC (Mainnet) reverse direction', async () => {
    const result = await getTradeQuote(
      { ...commonInput, sellAsset: USDC_ARBITRUM, buyAsset: USDC_MAINNET },
      deps,
    )
    expect(result.isOk()).toBe(true)

    const step = result.unwrap()[0].steps[0]
    expect(step.sellAsset.chainId).toBe(arbitrumChainId)
    expect(step.buyAsset.chainId).toBe(ethChainId)
    expect(step.source).toBe(SwapperName.Stargate)
    // non-native sell: txValue = nativeFee only
    expect(step.stargateTransactionMetadata.value).toBe('1000000000000000')
  })

  it('returns a valid quote for USDC (Mainnet) → USDC (Optimism)', async () => {
    const result = await getTradeQuote(
      { ...commonInput, sellAsset: USDC_MAINNET, buyAsset: USDC_OPTIMISM },
      deps,
    )
    expect(result.isOk()).toBe(true)
    const step = result.unwrap()[0].steps[0]
    expect(step.sellAsset.chainId).toBe(ethChainId)
    expect(step.buyAsset.chainId).toBe(optimismChainId)
  })

  it('returns a valid quote for USDC (Mainnet) → USDC (Base)', async () => {
    const result = await getTradeQuote(
      { ...commonInput, sellAsset: USDC_MAINNET, buyAsset: USDC_BASE },
      deps,
    )
    expect(result.isOk()).toBe(true)
    const step = result.unwrap()[0].steps[0]
    expect(step.sellAsset.chainId).toBe(ethChainId)
    expect(step.buyAsset.chainId).toBe(baseChainId)
  })

  it('returns a valid quote for USDC (Mainnet) → USDC (Polygon)', async () => {
    const result = await getTradeQuote(
      { ...commonInput, sellAsset: USDC_MAINNET, buyAsset: USDC_POLYGON },
      deps,
    )
    expect(result.isOk()).toBe(true)
    const step = result.unwrap()[0].steps[0]
    expect(step.sellAsset.chainId).toBe(ethChainId)
    expect(step.buyAsset.chainId).toBe(polygonChainId)
  })

  it('returns a valid quote for USDT (Mainnet) → USDT (Arbitrum)', async () => {
    const result = await getTradeQuote(
      { ...commonInput, sellAsset: USDT_MAINNET, buyAsset: USDT_ARBITRUM },
      deps,
    )
    expect(result.isOk()).toBe(true)
    const step = result.unwrap()[0].steps[0]
    expect(step.sellAsset.chainId).toBe(ethChainId)
    expect(step.buyAsset.chainId).toBe(arbitrumChainId)
    expect(step.sellAsset.symbol).toBe('USDT')
  })

  it('returns a valid quote for ETH (Mainnet) → ETH (Base) native bridge', async () => {
    const result = await getTradeQuote(
      { ...commonInput, sellAsset: ETH, buyAsset: ETH_BASE },
      deps,
    )
    expect(result.isOk()).toBe(true)
    const step = result.unwrap()[0].steps[0]
    expect(step.sellAsset.chainId).toBe(ethChainId)
    expect(step.buyAsset.chainId).toBe(baseChainId)
    // native sell: txValue = nativeFee + sellAmount
    expect(step.stargateTransactionMetadata.value).toBe('1000001000000000')
  })

  it('returns a valid quote for USDC (Base) → USDC (Arbitrum) L2-to-L2', async () => {
    const result = await getTradeQuote(
      { ...commonInput, sellAsset: USDC_BASE, buyAsset: USDC_ARBITRUM },
      deps,
    )
    expect(result.isOk()).toBe(true)
    const step = result.unwrap()[0].steps[0]
    expect(step.sellAsset.chainId).toBe(baseChainId)
    expect(step.buyAsset.chainId).toBe(arbitrumChainId)
    expect(step.source).toBe(SwapperName.Stargate)
  })
})

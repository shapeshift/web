import { KnownChainIds } from '@shapeshiftoss/types'
import { DAO_TREASURY_ETHEREUM_MAINNET } from '@shapeshiftoss/utils'
import type { Address } from 'viem'
import { encodeFunctionData } from 'viem'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { SwapperDeps } from '../../../types'
import { SwapperName } from '../../../types'
import { getEvmNetworkFeeCryptoBaseUnit } from '../../../utils/evm'
import { ETH, USDC_MAINNET, WETH } from '../../../utils/test-data/assets'
import type { CleaveQuoteResponse, CleaveTradeQuoteInput } from '../types'
import { cleaveService } from '../utils/cleaveService'
import { CLEAVE_CHAINS, CLEAVE_DEADLINE_SECONDS, CLEAVE_SWAP_SHELL_ABI } from '../utils/constants'
import { getTradeQuote } from './getTradeQuote'

vi.mock('../utils/cleaveService', () => ({ cleaveService: { get: vi.fn() } }))
vi.mock('../../../utils/evm', async importOriginal => ({
  ...(await importOriginal<object>()),
  getEvmNetworkFeeCryptoBaseUnit: vi.fn(() => Promise.resolve('100000')),
}))

const now = 1_800_000_000_123
const deadline = Math.floor(now / 1000) + CLEAVE_DEADLINE_SECONDS
const { swapShell: shell, wrappedNative } = CLEAVE_CHAINS[KnownChainIds.EthereumMainnet]
const sender: Address = '0x2222222222222222222222222222222222222222'
const recipient: Address = '0x1111111111111111111111111111111111111111'
const sellAmount = '1000000000000000000'

const input: CleaveTradeQuoteInput = {
  sellAsset: WETH,
  buyAsset: USDC_MAINNET,
  sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmount,
  sendAddress: sender,
  receiveAddress: recipient,
  accountNumber: 0,
  affiliateBps: '60',
  slippageTolerancePercentageDecimal: '0.005',
  allowMultiHop: false,
  quoteOrRate: 'quote',
  chainId: KnownChainIds.EthereumMainnet,
  supportsEIP1559: true,
}

const deps = {
  assetsById: {},
  config: { VITE_CLEAVE_BASE_URL: 'https://example.com' },
  assertGetEvmChainAdapter: vi.fn(() => ({})),
} as unknown as SwapperDeps

const encodeSwap = (isNativeSell: boolean) =>
  encodeFunctionData({
    abi: CLEAVE_SWAP_SHELL_ABI,
    functionName: 'swapWithBlob',
    args: [
      {
        tokenIn: wrappedNative,
        tokenOut: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        amountIn: BigInt(sellAmount),
        minAmountOut: 2472569030n,
        deadline: BigInt(deadline),
        recipient,
        referrer: DAO_TREASURY_ETHEREUM_MAINNET,
        referralFeeBps: 60,
        wethAsErc20: !isNativeSell,
      },
      '0x01',
    ],
  })

const quoteResponse = (isNativeSell: boolean): CleaveQuoteResponse => ({
  status: 'ok',
  kind: 'swap',
  amountIn: sellAmount,
  amountOutGross: '2501000000',
  amountOutNet: '2484994000',
  minOut: '2472569030',
  fees: { referral: { bps: 60, amount: '15006000' } },
  partial: { refusedAtSource: '0' },
  remainders: [],
  route: {
    legs: [{ venueName: 'Uniswap V3' }, { venueName: 'unknown' }, { venueName: 'Curve' }],
  },
  preferredExecution: 'classic',
  execution: {
    target: shell,
    approval: isNativeSell ? null : { token: wrappedNative, spender: shell, amount: sellAmount },
  },
  tx: { to: shell, data: encodeSwap(isNativeSell), value: isNativeSell ? sellAmount : '0' },
  notices: [],
})

const mockCleaveResponse = (response: CleaveQuoteResponse) =>
  vi.mocked(cleaveService.get).mockResolvedValue({
    isErr: () => false,
    isOk: () => true,
    unwrap: () => ({ data: response }),
  } as unknown as Awaited<ReturnType<typeof cleaveService.get>>)

describe('getTradeQuote', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'], now })
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('requests the treasury referral and maps the quote', async () => {
    mockCleaveResponse(quoteResponse(false))

    const result = await getTradeQuote(input, deps)

    expect(cleaveService.get).toHaveBeenCalledWith('https://example.com/partner/v1/quote', {
      params: expect.objectContaining({
        chainId: '1',
        amountIn: sellAmount,
        slippageBps: 50,
        recipient,
        deadline,
        referralBps: 60,
        referralRecipient: DAO_TREASURY_ETHEREUM_MAINNET,
      }),
    })
    expect(getEvmNetworkFeeCryptoBaseUnit).toHaveBeenCalledWith(
      expect.objectContaining({ from: sender }),
    )

    const [quote] = result.unwrap()

    expect(quote).toMatchObject({
      quoteOrRate: 'quote',
      swapperName: SwapperName.Cleave,
      rate: '2484.994',
      affiliateBps: '60',
      receiveAddress: recipient,
      deadline: deadline * 1000,
    })
    expect(quote.steps).toHaveLength(1)
    expect(quote.steps[0]).toMatchObject({
      allowanceContract: shell,
      buyAmountBeforeFeesCryptoBaseUnit: '2500000000',
      buyAmountAfterFeesCryptoBaseUnit: '2484994000',
      source: `${SwapperName.Cleave} • Uniswap V3, Curve`,
      affiliateFee: {
        assetId: USDC_MAINNET.assetId,
        amountCryptoBaseUnit: '15006000',
        asset: USDC_MAINNET,
      },
      transactionData: {
        type: 'evm',
        chainId: 1,
        to: shell,
        data: encodeSwap(false),
        value: '0',
      },
    })
    expect(quote.steps[0].feeData).toEqual({
      networkFeeCryptoBaseUnit: '100000',
      protocolFees: {},
    })
  })

  it('keeps the native value on a native sell', async () => {
    mockCleaveResponse(quoteResponse(true))

    const result = await getTradeQuote({ ...input, sellAsset: ETH }, deps)

    expect(cleaveService.get).toHaveBeenCalledWith('https://example.com/partner/v1/quote', {
      params: expect.objectContaining({ tokenIn: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' }),
    })

    const [quote] = result.unwrap()

    expect(quote.steps[0]).toMatchObject({
      allowanceContract: '',
      transactionData: { to: shell, data: encodeSwap(true), value: sellAmount },
    })
  })
})

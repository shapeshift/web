import { KnownChainIds } from '@shapeshiftoss/types'
import { DAO_TREASURY_ETHEREUM_MAINNET } from '@shapeshiftoss/utils'
import type { Address } from 'viem'
import { encodeFunctionData } from 'viem'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { SwapperDeps } from '../../../types'
import { SwapperName } from '../../../types'
import { USDC_MAINNET, WETH } from '../../../utils/test-data/assets'
import type { CleaveSwapQuote, CleaveTradeQuoteInput } from '../types'
import { cleaveService } from '../utils/cleaveService'
import { CLEAVE_CHAINS, CLEAVE_DEADLINE_SECONDS, CLEAVE_SWAP_SHELL_ABI } from '../utils/constants'
import { getTradeQuote } from './getTradeQuote'

vi.mock('../utils/cleaveService', () => ({ cleaveService: { get: vi.fn() } }))
vi.mock('../../../utils/evm', async importOriginal => ({
  ...(await importOriginal<object>()),
  getEvmNetworkFeeCryptoBaseUnit: vi.fn(() => Promise.resolve('100000')),
}))

const now = 1_800_000_000_000
const deadline = now / 1000 + CLEAVE_DEADLINE_SECONDS
const shell = CLEAVE_CHAINS[KnownChainIds.EthereumMainnet].swapShell
const user: Address = '0x1111111111111111111111111111111111111111'

const input: CleaveTradeQuoteInput = {
  sellAsset: WETH,
  buyAsset: USDC_MAINNET,
  sellAmountIncludingProtocolFeesCryptoBaseUnit: '1000000000000000000',
  sendAddress: user,
  receiveAddress: user,
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

const data = encodeFunctionData({
  abi: CLEAVE_SWAP_SHELL_ABI,
  functionName: 'swapWithBlob',
  args: [
    {
      tokenIn: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      tokenOut: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      amountIn: 1000000000000000000n,
      minAmountOut: 2472569030n,
      deadline: BigInt(deadline),
      recipient: user,
      referrer: DAO_TREASURY_ETHEREUM_MAINNET,
      referralFeeBps: 60,
      wethAsErc20: true,
    },
    '0x01',
  ],
})

const quoteResponse: CleaveSwapQuote = {
  status: 'ok',
  kind: 'swap',
  amountIn: '1000000000000000000',
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
    approval: {
      token: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      spender: shell,
      amount: '1000000000000000000',
    },
  },
  tx: { to: shell, data, value: '0' },
  notices: [],
}

describe('getTradeQuote', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'], now })
    vi.mocked(cleaveService.get).mockResolvedValue({
      isErr: () => false,
      isOk: () => true,
      unwrap: () => ({ data: quoteResponse }),
    } as unknown as Awaited<ReturnType<typeof cleaveService.get>>)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('requests the treasury referral and maps the quote', async () => {
    const result = await getTradeQuote(input, deps)

    expect(cleaveService.get).toHaveBeenCalledWith('https://example.com/partner/v1/quote', {
      params: expect.objectContaining({
        chainId: '1',
        amountIn: '1000000000000000000',
        slippageBps: 50,
        recipient: user,
        deadline,
        referralBps: 60,
        referralRecipient: DAO_TREASURY_ETHEREUM_MAINNET,
      }),
    })

    const [quote] = result.unwrap()

    expect(quote).toMatchObject({
      quoteOrRate: 'quote',
      swapperName: SwapperName.Cleave,
      rate: '2484.994',
      affiliateBps: '60',
      receiveAddress: user,
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
      transactionData: { type: 'evm', chainId: 1, to: shell, data, value: '0' },
    })
    expect(quote.steps[0].feeData).toEqual({
      networkFeeCryptoBaseUnit: '100000',
      protocolFees: {},
    })
  })
})

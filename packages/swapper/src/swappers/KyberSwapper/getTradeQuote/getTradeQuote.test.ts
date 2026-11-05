import type { Asset } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import { Ok } from '@sniptt/monads'
import { describe, expect, it, vi } from 'vitest'

import type { SwapperDeps } from '../../../types'
import { ETH } from '../../../utils/test-data/assets'
import { HYPEREVM_BUILD_RESPONSE, HYPEREVM_ROUTES_RESPONSE } from '../test-data/hyperevmHypeUsdc'
import type { KyberTradeQuoteInput } from '../types'
import { getTradeQuote } from './getTradeQuote'

const BUILT_AMOUNT_OUT = '250000000'

vi.mock('../utils/fetchFromKyber', () => ({
  fetchKyberRoute: vi.fn(() => Promise.resolve(Ok(HYPEREVM_ROUTES_RESPONSE.data))),
  fetchKyberBuild: vi.fn(() =>
    Promise.resolve(Ok({ ...HYPEREVM_BUILD_RESPONSE.data, amountOut: BUILT_AMOUNT_OUT })),
  ),
}))
vi.mock('../utils/getKyberStepData', () => ({
  getKyberStepData: vi.fn(() =>
    Promise.resolve(
      Ok({
        transactionData: {
          type: 'evm',
          chainId: 999,
          to: HYPEREVM_BUILD_RESPONSE.data.routerAddress,
          data: HYPEREVM_BUILD_RESPONSE.data.data,
          value: HYPEREVM_BUILD_RESPONSE.data.transactionValue,
        },
        networkFeeCryptoBaseUnit: '100000',
      }),
    ),
  ),
}))

const HYPE: Asset = {
  ...ETH,
  assetId: 'eip155:999/slip44:60',
  chainId: KnownChainIds.HyperEvmMainnet,
  symbol: 'HYPE',
  name: 'HYPE',
}

const USDC_HYPEREVM: Asset = {
  ...ETH,
  assetId: 'eip155:999/erc20:0xb88339cb7199b77e23db6e890353e22632ba630f',
  chainId: KnownChainIds.HyperEvmMainnet,
  symbol: 'USDC',
  name: 'USDC',
  precision: 6,
}

const input: KyberTradeQuoteInput = {
  sellAsset: HYPE,
  buyAsset: USDC_HYPEREVM,
  sellAmountIncludingProtocolFeesCryptoBaseUnit: '3000000000000000000',
  sendAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  receiveAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  accountNumber: 0,
  affiliateBps: '60',
  allowMultiHop: false,
  quoteOrRate: 'quote',
  chainId: KnownChainIds.HyperEvmMainnet,
  supportsEIP1559: true,
}

const deps = { config: { VITE_KYBER_BASE_URL: 'https://example.com' } } as unknown as SwapperDeps

describe('getTradeQuote', () => {
  it('quotes the built amount out instead of the route amount', async () => {
    const [quote] = (await getTradeQuote(input, deps)).unwrap()
    const [step] = quote.steps

    expect(step.buyAmountAfterFeesCryptoBaseUnit).toBe(BUILT_AMOUNT_OUT)
    expect(step.buyAmountBeforeFeesCryptoBaseUnit).toBe('251509054')
    expect(step.affiliateFee?.amountCryptoBaseUnit).toBe('1509054')
    expect(quote.rate).toBe(step.rate)
    expect(quote.rate).toMatch(/^83\.333/)
  })
})

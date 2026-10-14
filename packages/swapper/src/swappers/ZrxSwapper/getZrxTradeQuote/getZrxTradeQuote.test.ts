import { KnownChainIds } from '@shapeshiftoss/types'
import { Ok } from '@sniptt/monads'
import type { TypedData } from 'eip-712'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SwapperDeps } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { ETH, USDC_MAINNET, WETH } from '../../../utils/test-data/assets'
import type { ZrxQuoteResponse, ZrxTradeQuoteInput } from '../types'
import { fetchZrxQuote } from '../utils/fetchFromZrx'
import { getZrxTradeQuote } from './getZrxTradeQuote'

vi.mock('../utils/fetchFromZrx', () => ({ fetchZrxQuote: vi.fn() }))
vi.mock('../utils/getZrxStepData', () => ({
  getZrxStepData: vi.fn(({ permit2Eip712 }) =>
    Promise.resolve(
      Ok({
        transactionData: {
          type: 'evm',
          chainId: 1,
          to: '0x1111111111111111111111111111111111111111',
          data: '0x1234',
          value: '0',
          ...(permit2Eip712 && {
            signatureRequired: { type: 'permit2', eip712: permit2Eip712 },
          }),
        },
        networkFeeCryptoBaseUnit: '100000',
      }),
    ),
  ),
}))

const input: ZrxTradeQuoteInput = {
  sellAsset: WETH,
  buyAsset: USDC_MAINNET,
  sellAmountIncludingProtocolFeesCryptoBaseUnit: '1000000000000000000',
  sendAddress: '0x1111111111111111111111111111111111111111',
  receiveAddress: '0x1111111111111111111111111111111111111111',
  accountNumber: 0,
  affiliateBps: '0',
  allowMultiHop: false,
  quoteOrRate: 'quote',
  chainId: KnownChainIds.EthereumMainnet,
  supportsEIP1559: true,
}

const deps = {
  assetsById: {},
  config: { VITE_ZRX_BASE_URL: 'https://example.com' },
} as unknown as SwapperDeps

const typedData = (deadline: unknown): TypedData => ({
  domain: { name: 'Permit2', chainId: 1 },
  types: { PermitTransferFrom: [{ name: 'deadline', type: 'uint256' }] },
  primaryType: 'PermitTransferFrom',
  message: { deadline },
})

const quoteResponse = (eip712: TypedData | null): ZrxQuoteResponse => ({
  blockNumber: '1',
  buyAmount: '1000000',
  buyToken: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  sellAmount: input.sellAmountIncludingProtocolFeesCryptoBaseUnit,
  sellToken: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  fees: { integratorFee: null, zeroExFee: null, gasFee: null },
  issues: { allowance: null, balance: null, simulationIncomplete: false, invalidSourcesPassed: [] },
  liquidityAvailable: true,
  minBuyAmount: '990000',
  route: { fills: [], tokens: [] },
  tokenMetadata: {
    buyToken: { buyTaxBps: null, sellTaxBps: null },
    sellToken: { buyTaxBps: null, sellTaxBps: null },
  },
  totalNetworkFee: null,
  zid: 'test',
  permit2: eip712 ? { type: 'Permit2', hash: '0x1234', eip712 } : null,
  transaction: {
    to: '0x1111111111111111111111111111111111111111',
    data: '0x1234',
    gas: '100000',
    gasPrice: '1000000000',
    value: '0',
  },
})

describe('getZrxTradeQuote Permit2 deadline', () => {
  beforeEach(() => {
    vi.mocked(fetchZrxQuote).mockResolvedValue(Ok(quoteResponse(typedData('1791934983'))))
  })

  it.each(['1791934983', 1791934983])(
    'uses the provider deadline in milliseconds (%s)',
    async deadline => {
      const eip712 = typedData(deadline)
      vi.mocked(fetchZrxQuote).mockResolvedValue(Ok(quoteResponse(eip712)))

      const result = await getZrxTradeQuote(input, deps)
      expect(result.isOk()).toBe(true)
      const [quote] = result.unwrap()
      expect(quote.deadline).toBe(1791934983000)
      expect(quote.steps[0].transactionData).toMatchObject({
        signatureRequired: { eip712 },
      })
    },
  )

  it.each([undefined, null, true, '', 'invalid', '-1', '1.5', '9007199254740991'])(
    'rejects an invalid Permit2 deadline (%s)',
    async deadline => {
      vi.mocked(fetchZrxQuote).mockResolvedValue(Ok(quoteResponse(typedData(deadline))))

      const result = await getZrxTradeQuote(input, deps)
      expect(result.isErr()).toBe(true)
      expect(result.unwrapErr().code).toBe(TradeQuoteError.InvalidResponse)
    },
  )

  it('leaves native-token quotes without Permit2 free of a fabricated deadline', async () => {
    vi.mocked(fetchZrxQuote).mockResolvedValue(Ok(quoteResponse(null)))

    const result = await getZrxTradeQuote({ ...input, sellAsset: ETH }, deps)
    expect(result.isOk()).toBe(true)
    expect(result.unwrap()[0].deadline).toBeUndefined()
  })
})

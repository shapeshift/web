import type { L2Network } from '@arbitrum/sdk'
import { EthBridger, getL2Network } from '@arbitrum/sdk'
import { ethChainId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { GetEvmTradeQuoteInput } from '@shapeshiftoss/swapper'
import { SwapperName } from '@shapeshiftoss/swapper'
import { arbitrum, ethereum } from 'test/mocks/assets'
import { describe, expect, it, vi } from 'vitest'

import { getTradeQuote } from './getTradeQuote'

vi.mock('@arbitrum/sdk', () => ({
  Erc20Bridger: vi.fn(),
  EthBridger: vi.fn(),
  getL2Network: vi.fn(),
}))

vi.mock('@shapeshiftoss/chain-adapters', () => ({
  isEvmChainId: vi.fn(),
}))

vi.mock('lib/utils/evm', () => ({
  assertGetEvmChainAdapter: vi.fn(),
  getFees: vi.fn().mockResolvedValue({ networkFeeCryptoBaseUnit: '42' }),
}))

describe('getTradeQuote', () => {
  const setupMocks = () => {
    vi.mocked(isEvmChainId).mockReturnValue(true)
    vi.mocked(getL2Network).mockResolvedValue({ chainID: 42161 } as L2Network)
  }

  const commonInput = {
    allowMultiHop: false,
    chainId: ethChainId,
    sellAsset: ethereum,
    buyAsset: arbitrum,
    accountNumber: 0,
    affiliateBps: '0',
    potentialAffiliateBps: '0',
    supportsEIP1559: true,
    receiveAddress: '0x0000000000000000000000000000000000000000',
    sellAmountIncludingProtocolFeesCryptoBaseUnit: '1000000000000000000',
    sendAddress: '0x0000000000000000000000000000000000000000',
  } as GetEvmTradeQuoteInput

  it('returns a correct ETH deposit quote', async () => {
    setupMocks()

    const ethBridgerMock = {
      getDepositRequest: vi.fn().mockResolvedValue({
        txRequest: {
          data: '0x',
          to: '0x',
          value: '0',
          from: '0x',
        },
      }),
    }
    vi.mocked(EthBridger).mockReturnValue(ethBridgerMock as unknown as EthBridger)

    const maybeQuote = await getTradeQuote(commonInput)
    expect(maybeQuote.isOk()).toBe(true)
    const quote = maybeQuote.unwrap()

    expect(quote.receiveAddress).toBe(commonInput.receiveAddress)
    expect(quote.rate).toBe('1')
    expect(quote.steps[0].allowanceContract).toBe('0x0')
    expect(quote.steps[0].source).toBe(SwapperName.ArbitrumBridge)
  })

  it('throws an error if non-EVM chain IDs are used', async () => {
    vi.mocked(isEvmChainId).mockReturnValueOnce(false)

    await expect(getTradeQuote(commonInput)).rejects.toThrow(
      'Arbitrum Bridge only supports EVM chains',
    )
  })
})

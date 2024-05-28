import type { L2Network } from '@arbitrum/sdk'
import { Erc20Bridger, EthBridger } from '@arbitrum/sdk'
import { ethAssetId, ethChainId } from '@shapeshiftoss/caip'
import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import type { GetEvmTradeQuoteInput } from '@shapeshiftoss/swapper'
import { SwapperName } from '@shapeshiftoss/swapper'
import { arbitrum, bitcoin, ethereum, fox, foxOnArbitrum } from 'test/mocks/assets'
import { describe, expect, it, vi } from 'vitest'
import { assertGetEvmChainAdapter } from 'lib/utils/evm'

import { getTradeQuote } from './getTradeQuote'

vi.mock('@arbitrum/sdk', () => ({
  Erc20Bridger: vi.fn(),
  EthBridger: vi.fn(),
  getL2Network: vi.fn().mockResolvedValue({ chainID: 42161 } as L2Network),
}))

vi.mock('lib/utils/evm', () => ({
  assertGetEvmChainAdapter: vi.fn(),
  getFees: vi.fn().mockResolvedValue({ networkFeeCryptoBaseUnit: '42' }),
}))

describe('getTradeQuote', () => {
  const mockAdapter = {
    getGasFeeData: vi.fn().mockResolvedValue({ fast: { gasPrice: '42' } }),
  }
  const mockAdapterEth = Object.assign({}, mockAdapter, {
    getFeeAssetId: () => ethAssetId,
  }) as unknown as EvmChainAdapter

  const commonInput = {
    allowMultiHop: false,
    chainId: ethChainId,
    sellAsset: ethereum,
    buyAsset: arbitrum,
    accountNumber: 0,
    affiliateBps: '0',
    potentialAffiliateBps: '0',
    supportsEIP1559: true,
    receiveAddress: '0xfauxmes',
    sellAmountIncludingProtocolFeesCryptoBaseUnit: '1000000000000000000',
    sendAddress: '0xfauxmes',
  } as GetEvmTradeQuoteInput

  it('returns a correct ETH deposit quote', async () => {
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

  it('returns a correct ETH withdraw quote', async () => {
    const ethBridgerMock = {
      getWithdrawalRequest: vi.fn().mockResolvedValue({
        txRequest: {
          data: '0x',
          to: '0x',
          value: '0',
          from: '0x',
        },
      }),
    }
    vi.mocked(EthBridger).mockReturnValue(ethBridgerMock as unknown as EthBridger)

    const withdrawInput = {
      ...commonInput,
      sellAsset: arbitrum,
      buyAsset: ethereum,
    }

    const maybeQuote = await getTradeQuote(withdrawInput)
    expect(maybeQuote.isOk()).toBe(true)
    const quote = maybeQuote.unwrap()

    expect(quote.receiveAddress).toBe(withdrawInput.receiveAddress)
    expect(quote.rate).toBe('1')
    expect(quote.steps[0].allowanceContract).toBe('0x0')
    expect(quote.steps[0].source).toBe(SwapperName.ArbitrumBridge)
  })

  it('returns a correct ERC20 deposit quote', async () => {
    const Erc20BridgerMock = {
      getDepositRequest: vi.fn().mockResolvedValue({
        txRequest: {
          data: '0x',
          to: '0x',
          value: '0',
          from: '0x',
        },
      }),
      getL2ERC20Address: vi.fn().mockResolvedValue('0xf929de51d91c77e42f5090069e0ad7a09e513c73'),
      getL1ERC20Address: vi.fn().mockResolvedValue('0xc770eefad204b5180df6a14ee197d99d808ee52d'),
      getL1GatewayAddress: vi.fn().mockResolvedValue('0x0c66f315542fdec1d312c415b14eef614b0910ef'),
    }
    vi.mocked(Erc20Bridger).mockReturnValue(Erc20BridgerMock as unknown as Erc20Bridger)
    vi.mocked(assertGetEvmChainAdapter).mockReturnValue(mockAdapterEth)

    const erc20DepositInput = {
      ...commonInput,
      sellAsset: fox,
      buyAsset: foxOnArbitrum,
    }

    const maybeQuote = await getTradeQuote(erc20DepositInput)
    expect(maybeQuote.isOk()).toBe(true)
    const quote = maybeQuote.unwrap()

    expect(quote.receiveAddress).toBe(erc20DepositInput.receiveAddress)
    expect(quote.rate).toBe('1')
    expect(quote.steps[0].allowanceContract).toBe('0x0c66f315542fdec1d312c415b14eef614b0910ef')
    expect(quote.steps[0].source).toBe(SwapperName.ArbitrumBridge)
  })

  it('returns a correct ERC20 withdraw quote', async () => {
    const Erc20BridgerMock = {
      getWithdrawalRequest: vi.fn().mockResolvedValue({
        txRequest: {
          data: '0x',
          to: '0x',
          value: '0',
          from: '0x',
        },
      }),
      getL2ERC20Address: vi.fn().mockResolvedValue('0xf929de51d91c77e42f5090069e0ad7a09e513c73'),
      getL1ERC20Address: vi.fn().mockResolvedValue('0xc770eefad204b5180df6a14ee197d99d808ee52d'),
      getL1GatewayAddress: vi.fn().mockResolvedValue('0x0c66f315542fdec1d312c415b14eef614b0910ef'),
    }
    vi.mocked(Erc20Bridger).mockReturnValue(Erc20BridgerMock as unknown as Erc20Bridger)
    vi.mocked(assertGetEvmChainAdapter).mockReturnValue(mockAdapterEth)

    const erc20WithdrawInput = {
      ...commonInput,
      sellAsset: foxOnArbitrum,
      buyAsset: fox,
    }

    const maybeQuote = await getTradeQuote(erc20WithdrawInput)
    expect(maybeQuote.isOk()).toBe(true)
    const quote = maybeQuote.unwrap()

    expect(quote.receiveAddress).toBe(erc20WithdrawInput.receiveAddress)
    expect(quote.rate).toBe('1')
    expect(quote.steps[0].allowanceContract).toBe('0x0')
    expect(quote.steps[0].source).toBe(SwapperName.ArbitrumBridge)
  })

  it('throws an error if non-EVM chain IDs are used', async () => {
    await expect(getTradeQuote({ ...commonInput, sellAsset: bitcoin })).rejects.toThrow(
      'Arbitrum Bridge only supports EVM chains',
    )
  })
})

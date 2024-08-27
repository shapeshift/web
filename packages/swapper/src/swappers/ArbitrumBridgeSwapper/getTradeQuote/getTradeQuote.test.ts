import { Erc20Bridger, EthBridger } from '@arbitrum/sdk'
import { ethAssetId, ethChainId } from '@shapeshiftoss/caip'
import { type EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import { describe, expect, it, vi } from 'vitest'

import type { GetEvmTradeQuoteInput, SwapperDeps } from '../../../types'
import { SwapperName } from '../../../types'
import { BTC, ETH, ETH_ARBITRUM, FOX_ARBITRUM, FOX_MAINNET } from '../../utils/test-data/assets'
import { getTradeQuote } from './getTradeQuote'

vi.mock('@arbitrum/sdk', () => ({
  Erc20Bridger: vi.fn(),
  EthBridger: vi.fn(),
  getArbitrumNetwork: vi.fn().mockResolvedValue({ chainID: 42161 }),
}))

vi.mock('@shapeshiftoss/utils/dist/evm', () => ({
  getFees: vi.fn().mockResolvedValue({ networkFeeCryptoBaseUnit: '42' }),
}))

describe('getTradeQuote', () => {
  const mockAdapter = {
    getGasFeeData: vi.fn().mockResolvedValue({ fast: { gasPrice: '42', maxFeePerGas: '42' } }),
  }
  const mockAdapterEth = Object.assign({}, mockAdapter, {
    getFeeAssetId: () => ethAssetId,
  }) as unknown as EvmChainAdapter

  const assertGetEvmChainAdapter = () => mockAdapterEth

  const commonInput = {
    allowMultiHop: false,
    chainId: ethChainId,
    sellAsset: ETH,
    buyAsset: ETH_ARBITRUM,
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
      getDepositToRequest: vi.fn().mockResolvedValue({
        txRequest: {
          data: '0x',
          to: '0x',
          value: '0',
          from: '0x',
        },
      }),
    }
    vi.mocked(EthBridger).mockReturnValue(ethBridgerMock as unknown as EthBridger)

    const maybeQuote = await getTradeQuote(commonInput, {
      assertGetEvmChainAdapter,
      getEthersV5Provider: vi.fn(),
    } as unknown as SwapperDeps)
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
      sellAsset: ETH_ARBITRUM,
      buyAsset: ETH,
    }

    const maybeQuote = await getTradeQuote(withdrawInput, {
      assertGetEvmChainAdapter,
      getEthersV5Provider: vi.fn(),
    } as unknown as SwapperDeps)
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
      getChildErc20Address: vi.fn().mockResolvedValue('0xf929de51d91c77e42f5090069e0ad7a09e513c73'),
      getParentErc20Address: vi
        .fn()
        .mockResolvedValue('0xc770eefad204b5180df6a14ee197d99d808ee52d'),
      getParentGatewayAddress: vi
        .fn()
        .mockResolvedValue('0x0c66f315542fdec1d312c415b14eef614b0910ef'),
    }
    vi.mocked(Erc20Bridger).mockReturnValue(Erc20BridgerMock as unknown as Erc20Bridger)

    const erc20DepositInput = {
      ...commonInput,
      sellAsset: FOX_MAINNET,
      buyAsset: FOX_ARBITRUM,
    }

    const maybeQuote = await getTradeQuote(erc20DepositInput, {
      assertGetEvmChainAdapter,
      getEthersV5Provider: vi.fn(),
    } as unknown as SwapperDeps)
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
      getChildErc20Address: vi.fn().mockResolvedValue('0xf929de51d91c77e42f5090069e0ad7a09e513c73'),
      getParentErc20Address: vi
        .fn()
        .mockResolvedValue('0xc770eefad204b5180df6a14ee197d99d808ee52d'),
      getParentGatewayAddress: vi
        .fn()
        .mockResolvedValue('0x0c66f315542fdec1d312c415b14eef614b0910ef'),
    }
    vi.mocked(Erc20Bridger).mockReturnValue(Erc20BridgerMock as unknown as Erc20Bridger)

    const erc20WithdrawInput = {
      ...commonInput,
      sellAsset: FOX_ARBITRUM,
      buyAsset: FOX_MAINNET,
    }

    const maybeQuote = await getTradeQuote(erc20WithdrawInput, {
      assertGetEvmChainAdapter,
      getEthersV5Provider: vi.fn(),
    } as unknown as SwapperDeps)
    expect(maybeQuote.isOk()).toBe(true)
    const quote = maybeQuote.unwrap()

    expect(quote.receiveAddress).toBe(erc20WithdrawInput.receiveAddress)
    expect(quote.rate).toBe('1')
    expect(quote.steps[0].allowanceContract).toBe('0x0')
    expect(quote.steps[0].source).toBe(SwapperName.ArbitrumBridge)
  })

  it('returns an error monad if non-EVM chain IDs are used', async () => {
    const result = await getTradeQuote({ ...commonInput, sellAsset: BTC }, {
      assertGetEvmChainAdapter,
      getEthersV5Provider: vi.fn(),
    } as unknown as SwapperDeps)
    expect(result.isErr()).toBe(true)
    expect(result.unwrapErr().message).toBe(
      '[ArbitrumBridge: assertValidTrade] - unsupported chainId',
    )
  })
})

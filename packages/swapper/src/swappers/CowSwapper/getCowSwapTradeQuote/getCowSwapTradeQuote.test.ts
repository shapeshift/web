import { KnownChainIds } from '@shapeshiftoss/types'
import { Ok } from '@sniptt/monads'
import type { AxiosResponse } from 'axios'
import { describe, expect, it, vi } from 'vitest'

import type { GetTradeQuoteInput, SwapperConfig, TradeQuote } from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import {
  ETH,
  ETH_ARBITRUM,
  FOX_MAINNET,
  USDC_ARBITRUM,
  USDC_GNOSIS,
  WETH,
  XDAI,
} from '../../utils/test-data/assets'
import type { CowSwapQuoteResponse } from '../types'
import {
  COW_SWAP_NATIVE_ASSET_MARKER_ADDRESS,
  DEFAULT_ADDRESS,
  ERC20_TOKEN_BALANCE,
} from '../utils/constants'
import { cowService } from '../utils/cowService'
import type { CowSwapSellQuoteApiInput } from '../utils/helpers/helpers'
import { getCowSwapTradeQuote } from './getCowSwapTradeQuote'

vi.mock('@shapeshiftoss/chain-adapters')

const mockedCowService = vi.mocked(cowService)

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}))

vi.mock('../utils/cowService', () => {
  const mockAxios = {
    default: {
      create: vi.fn(() => ({
        get: mocks.get,
        post: mocks.post,
      })),
    },
  }

  return {
    cowService: mockAxios.default.create(),
  }
})

vi.mock('../utils/helpers/helpers', async () => {
  const actual = await vi.importActual('../utils/helpers/helpers')
  return {
    ...actual,
    getNowPlusThirtyMinutesTimestamp: () => 1656797787,
  }
})

vi.mock('../../utils/helpers/helpers', async () => {
  const actual = await vi.importActual('../../utils/helpers/helpers')
  return {
    ...actual,
    getApproveContractData: () => '0xABCDEFGH',
  }
})

const expectedApiInputWethToFox: CowSwapSellQuoteApiInput = {
  appData:
    '{"appCode":"shapeshift","metadata":{"orderClass":{"orderClass":"market"},"quote":{"slippageBips":"50"}},"version":"0.9.0"}',
  appDataHash: '0x9b3c15b566e3b432f1ba3533bb0b071553fd03cec359caf3e6559b29fec1e62e',
  buyToken: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
  from: '0x0000000000000000000000000000000000000000',
  kind: 'sell',
  partiallyFillable: false,
  receiver: '0x0000000000000000000000000000000000000000',
  sellAmountBeforeFee: '1000000000000000000',
  sellToken: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  validTo: 1656797787,
}

const expectedApiInputSmallAmountWethToFox: CowSwapSellQuoteApiInput = {
  appData:
    '{"appCode":"shapeshift","metadata":{"orderClass":{"orderClass":"market"},"quote":{"slippageBips":"50"}},"version":"0.9.0"}',
  appDataHash: '0x9b3c15b566e3b432f1ba3533bb0b071553fd03cec359caf3e6559b29fec1e62e',
  buyToken: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
  from: '0x0000000000000000000000000000000000000000',
  kind: 'sell',
  partiallyFillable: false,
  receiver: '0x0000000000000000000000000000000000000000',
  sellAmountBeforeFee: '1000000000000',
  sellToken: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  validTo: 1656797787,
}

const expectedApiInputFoxToEth: CowSwapSellQuoteApiInput = {
  appData:
    '{"appCode":"shapeshift","metadata":{"orderClass":{"orderClass":"market"},"quote":{"slippageBips":"50"}},"version":"0.9.0"}',
  appDataHash: '0x9b3c15b566e3b432f1ba3533bb0b071553fd03cec359caf3e6559b29fec1e62e',
  buyToken: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
  from: '0x0000000000000000000000000000000000000000',
  kind: 'sell',
  partiallyFillable: false,
  receiver: '0x0000000000000000000000000000000000000000',
  sellAmountBeforeFee: '1000000000000000000000',
  sellToken: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
  validTo: 1656797787,
}

const expectedApiInputUsdcGnosisToXdai: CowSwapSellQuoteApiInput = {
  appData:
    '{"appCode":"shapeshift","metadata":{"orderClass":{"orderClass":"market"},"quote":{"slippageBips":"50"}},"version":"0.9.0"}',
  appDataHash: '0x9b3c15b566e3b432f1ba3533bb0b071553fd03cec359caf3e6559b29fec1e62e',
  buyToken: COW_SWAP_NATIVE_ASSET_MARKER_ADDRESS,
  from: '0x0000000000000000000000000000000000000000',
  kind: 'sell',
  partiallyFillable: false,
  receiver: '0x0000000000000000000000000000000000000000',
  sellAmountBeforeFee: '20000000',
  sellToken: '0xddafbb505ad214d7b80b1f830fccc89b60fb7a83',
  validTo: 1656797787,
}

const expectedApiInputUsdcToEthArbitrum: CowSwapSellQuoteApiInput = {
  appData:
    '{"appCode":"shapeshift","metadata":{"orderClass":{"orderClass":"market"},"quote":{"slippageBips":"50"}},"version":"0.9.0"}',
  appDataHash: '0x9b3c15b566e3b432f1ba3533bb0b071553fd03cec359caf3e6559b29fec1e62e',
  buyToken: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
  from: '0x0000000000000000000000000000000000000000',
  kind: 'sell',
  partiallyFillable: false,
  receiver: '0x0000000000000000000000000000000000000000',
  sellAmountBeforeFee: '500000',
  sellToken: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
  validTo: 1656797787,
}

const expectedTradeQuoteWethToFox: TradeQuote = {
  id: '123',
  receiveAddress: '0x0000000000000000000000000000000000000000',
  affiliateBps: '0',
  potentialAffiliateBps: '0',
  rate: '14924.80846543344314936607', // 14942 FOX per WETH
  slippageTolerancePercentageDecimal: '0.005',
  steps: [
    {
      estimatedExecutionTimeMs: undefined,
      allowanceContract: '0xc92e8bdf79f0507f65a392b0ab4667716bfe0110',
      rate: '14924.80846543344314936607', // 14942 FOX per WETH
      feeData: {
        protocolFees: {
          [WETH.assetId]: {
            amountCryptoBaseUnit: '14557942658757988',
            requiresBalance: false,
            asset: WETH,
          },
        },
        networkFeeCryptoBaseUnit: '0',
      },
      sellAmountIncludingProtocolFeesCryptoBaseUnit: '1000000000000000000',
      buyAmountBeforeFeesCryptoBaseUnit: '14924808465433443149366', // 14924 FOX
      buyAmountAfterFeesCryptoBaseUnit: '14707533959600717283163', // 14707 FOX
      source: SwapperName.CowSwap,
      buyAsset: FOX_MAINNET,
      sellAsset: WETH,
      accountNumber: 0,
    },
  ],
}

const expectedTradeQuoteFoxToEth: TradeQuote = {
  id: '123',
  receiveAddress: '0x0000000000000000000000000000000000000000',
  affiliateBps: '0',
  potentialAffiliateBps: '0',
  rate: '0.00004995640398295996',
  slippageTolerancePercentageDecimal: '0.005',
  steps: [
    {
      estimatedExecutionTimeMs: undefined,
      allowanceContract: '0xc92e8bdf79f0507f65a392b0ab4667716bfe0110',
      rate: '0.00004995640398295996',
      feeData: {
        protocolFees: {
          [FOX_MAINNET.assetId]: {
            amountCryptoBaseUnit: '61804771879693983744',
            requiresBalance: false,
            asset: FOX_MAINNET,
          },
        },
        networkFeeCryptoBaseUnit: '0',
      },
      sellAmountIncludingProtocolFeesCryptoBaseUnit: '1000000000000000000000',
      buyAmountBeforeFeesCryptoBaseUnit: '49956403982959960',
      buyAmountAfterFeesCryptoBaseUnit: '46868859830863283',
      source: SwapperName.CowSwap,
      buyAsset: ETH,
      sellAsset: FOX_MAINNET,
      accountNumber: 0,
    },
  ],
}

const expectedTradeQuoteUsdcToXdai: TradeQuote = {
  id: '123',
  receiveAddress: '0x0000000000000000000000000000000000000000',
  affiliateBps: '0',
  potentialAffiliateBps: '0',
  rate: '1.0003121775396440882',
  slippageTolerancePercentageDecimal: '0.005',
  steps: [
    {
      allowanceContract: '0xc92e8bdf79f0507f65a392b0ab4667716bfe0110',
      rate: '1.0003121775396440882',
      estimatedExecutionTimeMs: undefined,
      feeData: {
        protocolFees: {
          [USDC_GNOSIS.assetId]: {
            amountCryptoBaseUnit: '1188',
            requiresBalance: false,
            asset: USDC_GNOSIS,
          },
        },
        networkFeeCryptoBaseUnit: '0',
      },
      sellAmountIncludingProtocolFeesCryptoBaseUnit: '20000000',
      buyAmountBeforeFeesCryptoBaseUnit: '21006555728332525852',
      buyAmountAfterFeesCryptoBaseUnit: '21005367357465608755',
      source: SwapperName.CowSwap,
      buyAsset: XDAI,
      sellAsset: USDC_GNOSIS,
      accountNumber: 0,
    },
  ],
}

const expectedTradeQuoteUsdcToEthArbitrum: TradeQuote = {
  id: '123',
  receiveAddress: '0x0000000000000000000000000000000000000000',
  affiliateBps: '0',
  potentialAffiliateBps: '0',
  rate: '0.00028787191526496171',
  slippageTolerancePercentageDecimal: '0.005',
  steps: [
    {
      allowanceContract: '0xc92e8bdf79f0507f65a392b0ab4667716bfe0110',
      rate: '0.00028787191526496171',
      estimatedExecutionTimeMs: undefined,
      feeData: {
        networkFeeCryptoBaseUnit: '0',
        protocolFees: {
          [USDC_ARBITRUM.assetId]: {
            amountCryptoBaseUnit: '7944',
            requiresBalance: false,
            asset: USDC_ARBITRUM,
          },
        },
      },
      sellAmountIncludingProtocolFeesCryptoBaseUnit: '500000',
      buyAmountBeforeFeesCryptoBaseUnit: '143935957632481',
      buyAmountAfterFeesCryptoBaseUnit: '141649103137616',
      source: SwapperName.CowSwap,
      buyAsset: ETH_ARBITRUM,
      sellAsset: USDC_ARBITRUM,
      accountNumber: 0,
    },
  ],
}

const expectedTradeQuoteSmallAmountWethToFox: TradeQuote = {
  id: '123',
  receiveAddress: '0x0000000000000000000000000000000000000000',
  affiliateBps: '0',
  potentialAffiliateBps: '0',
  rate: '14716.04718939437523468382', // 14716 FOX per WETH
  slippageTolerancePercentageDecimal: '0.005',
  steps: [
    {
      estimatedExecutionTimeMs: undefined,
      allowanceContract: '0xc92e8bdf79f0507f65a392b0ab4667716bfe0110',
      rate: '14716.04718939437523468382', // 14716 FOX per WETH
      feeData: {
        protocolFees: {
          [WETH.assetId]: {
            amountCryptoBaseUnit: '1455794265875791',
            requiresBalance: false,
            asset: WETH,
          },
        },
        networkFeeCryptoBaseUnit: '0',
      },
      sellAmountIncludingProtocolFeesCryptoBaseUnit: '1000000000000',
      buyAmountBeforeFeesCryptoBaseUnit: '166441655297153832879', // 166 FOX
      buyAmountAfterFeesCryptoBaseUnit: '145018118182475950905', // 145 FOX
      source: SwapperName.CowSwap,
      buyAsset: FOX_MAINNET,
      sellAsset: WETH,
      accountNumber: 0,
    },
  ],
}

describe('getCowTradeQuote', () => {
  it('should throw an exception if sell asset is not an erc20', async () => {
    const input: GetTradeQuoteInput = {
      chainId: KnownChainIds.EthereumMainnet,
      sellAsset: ETH,
      buyAsset: FOX_MAINNET,
      sellAmountIncludingProtocolFeesCryptoBaseUnit: '11111',
      accountNumber: 0,
      receiveAddress: DEFAULT_ADDRESS,
      affiliateBps: '0',
      potentialAffiliateBps: '0',
      supportsEIP1559: false,
      allowMultiHop: false,
      slippageTolerancePercentageDecimal: '0.005', // 0.5%
    }

    const maybeTradeQuote = await getCowSwapTradeQuote(input, {
      REACT_APP_COWSWAP_BASE_URL: 'https://api.cow.fi',
    } as SwapperConfig)
    expect(maybeTradeQuote.isErr()).toBe(true)
    expect(maybeTradeQuote.unwrapErr()).toMatchObject({
      cause: undefined,
      code: TradeQuoteError.UnsupportedTradePair,
      details: { sellAsset: ETH },
      message: '[CowSwap: assertValidTrade] - Sell asset must be an ERC-20',
      name: 'SwapError',
    })
  })

  it('should call cowService with correct parameters, handle the fees and return the correct trade quote when selling WETH', async () => {
    const input: GetTradeQuoteInput = {
      chainId: KnownChainIds.EthereumMainnet,
      sellAsset: WETH,
      buyAsset: FOX_MAINNET,
      sellAmountIncludingProtocolFeesCryptoBaseUnit: '1000000000000000000',
      accountNumber: 0,
      receiveAddress: DEFAULT_ADDRESS,
      affiliateBps: '0',
      potentialAffiliateBps: '0',
      supportsEIP1559: false,
      allowMultiHop: false,
      slippageTolerancePercentageDecimal: '0.005', // 0.5%
    }

    mockedCowService.post.mockReturnValue(
      Promise.resolve(
        Ok({
          data: {
            id: 123,
            quote: {
              ...expectedApiInputWethToFox,
              sellAmountBeforeFee: undefined,
              sellAmount: '985442057341242012',
              buyAmount: '14707533959600717283163',
              feeAmount: '14557942658757988',
              sellTokenBalance: ERC20_TOKEN_BALANCE,
              buyTokenBalance: ERC20_TOKEN_BALANCE,
            },
          },
        } as unknown as AxiosResponse<CowSwapQuoteResponse>),
      ),
    )

    const maybeTradeQuote = await getCowSwapTradeQuote(input, {
      REACT_APP_COWSWAP_BASE_URL: 'https://api.cow.fi',
    } as SwapperConfig)

    expect(maybeTradeQuote.isOk()).toBe(true)
    expect(maybeTradeQuote.unwrap()).toEqual(expectedTradeQuoteWethToFox)
    expect(cowService.post).toHaveBeenCalledWith(
      'https://api.cow.fi/mainnet/api/v1/quote/',
      expectedApiInputWethToFox,
    )
  })

  it('should call cowService with correct parameters, handle the fees and return the correct trade quote when buying ETH', async () => {
    const input: GetTradeQuoteInput = {
      chainId: KnownChainIds.EthereumMainnet,
      sellAsset: FOX_MAINNET,
      buyAsset: ETH,
      sellAmountIncludingProtocolFeesCryptoBaseUnit: '1000000000000000000000',
      accountNumber: 0,
      receiveAddress: DEFAULT_ADDRESS,
      affiliateBps: '0',
      potentialAffiliateBps: '0',
      supportsEIP1559: false,
      allowMultiHop: false,
      slippageTolerancePercentageDecimal: '0.005', // 0.5%
    }

    mockedCowService.post.mockReturnValue(
      Promise.resolve(
        Ok({
          data: {
            id: 123,
            quote: {
              ...expectedApiInputFoxToEth,
              sellAmountBeforeFee: undefined,
              sellAmount: '938195228120306016256',
              buyAmount: '46868859830863283',
              feeAmount: '61804771879693983744',
              sellTokenBalance: ERC20_TOKEN_BALANCE,
              buyTokenBalance: ERC20_TOKEN_BALANCE,
            },
          },
        } as unknown as AxiosResponse<CowSwapQuoteResponse>),
      ),
    )

    const maybeTradeQuote = await getCowSwapTradeQuote(input, {
      REACT_APP_COWSWAP_BASE_URL: 'https://api.cow.fi',
    } as SwapperConfig)

    expect(maybeTradeQuote.isOk()).toBe(true)
    expect(maybeTradeQuote.unwrap()).toEqual(expectedTradeQuoteFoxToEth)
    expect(cowService.post).toHaveBeenCalledWith(
      'https://api.cow.fi/mainnet/api/v1/quote/',
      expectedApiInputFoxToEth,
    )
  })

  it('should call cowService with correct parameters, handle the fees and return the correct trade quote when buying XDAI', async () => {
    const input: GetTradeQuoteInput = {
      chainId: KnownChainIds.GnosisMainnet,
      sellAsset: USDC_GNOSIS,
      buyAsset: XDAI,
      sellAmountIncludingProtocolFeesCryptoBaseUnit: '20000000',
      accountNumber: 0,
      receiveAddress: DEFAULT_ADDRESS,
      affiliateBps: '0',
      potentialAffiliateBps: '0',
      supportsEIP1559: false,
      allowMultiHop: false,
      slippageTolerancePercentageDecimal: '0.005', // 0.5%
    }

    mockedCowService.post.mockReturnValue(
      Promise.resolve(
        Ok({
          data: {
            id: 123,
            quote: {
              ...expectedApiInputUsdcGnosisToXdai,
              sellAmountBeforeFee: undefined,
              sellAmount: '20998812',
              buyAmount: '21005367357465608755',
              feeAmount: '1188',
              sellTokenBalance: ERC20_TOKEN_BALANCE,
              buyTokenBalance: ERC20_TOKEN_BALANCE,
            },
          },
        } as unknown as AxiosResponse<CowSwapQuoteResponse>),
      ),
    )

    const maybeTradeQuote = await getCowSwapTradeQuote(input, {
      REACT_APP_COWSWAP_BASE_URL: 'https://api.cow.fi',
    } as SwapperConfig)

    expect(maybeTradeQuote.isOk()).toBe(true)
    expect(maybeTradeQuote.unwrap()).toEqual(expectedTradeQuoteUsdcToXdai)
    expect(cowService.post).toHaveBeenCalledWith(
      'https://api.cow.fi/xdai/api/v1/quote/',
      expectedApiInputUsdcGnosisToXdai,
    )
  })

  it('should call cowService with correct parameters, handle the fees and return the correct trade quote when buying ETH on Arbitrum', async () => {
    const input: GetTradeQuoteInput = {
      chainId: KnownChainIds.ArbitrumMainnet,
      sellAsset: USDC_ARBITRUM,
      buyAsset: ETH_ARBITRUM,
      sellAmountIncludingProtocolFeesCryptoBaseUnit: '500000',
      accountNumber: 0,
      receiveAddress: DEFAULT_ADDRESS,
      affiliateBps: '0',
      potentialAffiliateBps: '0',
      supportsEIP1559: false,
      allowMultiHop: false,
      slippageTolerancePercentageDecimal: '0.005', // 0.5%
    }

    mockedCowService.post.mockReturnValue(
      Promise.resolve(
        Ok({
          data: {
            id: 123,
            quote: {
              ...expectedApiInputUsdcToEthArbitrum,
              sellAmountBeforeFee: undefined,
              sellAmount: '492056',
              buyAmount: '141649103137616',
              feeAmount: '7944',
              sellTokenBalance: ERC20_TOKEN_BALANCE,
              buyTokenBalance: ERC20_TOKEN_BALANCE,
            },
          },
        } as unknown as AxiosResponse<CowSwapQuoteResponse>),
      ),
    )

    const maybeTradeQuote = await getCowSwapTradeQuote(input, {
      REACT_APP_COWSWAP_BASE_URL: 'https://api.cow.fi',
    } as SwapperConfig)

    expect(maybeTradeQuote.isOk()).toBe(true)
    expect(maybeTradeQuote.unwrap()).toEqual(expectedTradeQuoteUsdcToEthArbitrum)
    expect(cowService.post).toHaveBeenCalledWith(
      'https://api.cow.fi/arbitrum_one/api/v1/quote/',
      expectedApiInputUsdcToEthArbitrum,
    )
  })

  it('should call cowService with correct parameters and return quote with original sellAmount when selling a very small amount of WETH', async () => {
    const input: GetTradeQuoteInput = {
      chainId: KnownChainIds.EthereumMainnet,
      sellAsset: WETH,
      buyAsset: FOX_MAINNET,
      sellAmountIncludingProtocolFeesCryptoBaseUnit: '1000000000000',
      accountNumber: 0,
      receiveAddress: DEFAULT_ADDRESS,
      affiliateBps: '0',
      potentialAffiliateBps: '0',
      supportsEIP1559: false,
      allowMultiHop: false,
      slippageTolerancePercentageDecimal: '0.005', // 0.5%
    }

    mockedCowService.post.mockReturnValue(
      Promise.resolve(
        Ok({
          data: {
            id: 123,
            quote: {
              ...expectedApiInputSmallAmountWethToFox,
              sellAmountBeforeFee: undefined,
              sellAmount: '9854420573412420',
              buyAmount: '145018118182475950905',
              feeAmount: '1455794265875791',
              sellTokenBalance: ERC20_TOKEN_BALANCE,
              buyTokenBalance: ERC20_TOKEN_BALANCE,
            },
          },
        } as unknown as AxiosResponse<CowSwapQuoteResponse>),
      ),
    )

    const maybeTradeQuote = await getCowSwapTradeQuote(input, {
      REACT_APP_COWSWAP_BASE_URL: 'https://api.cow.fi',
    } as SwapperConfig)

    expect(maybeTradeQuote.isErr()).toBe(false)
    expect(maybeTradeQuote.unwrap()).toEqual(expectedTradeQuoteSmallAmountWethToFox)
    expect(cowService.post).toHaveBeenCalledWith(
      'https://api.cow.fi/mainnet/api/v1/quote/',
      expectedApiInputSmallAmountWethToFox,
    )
  })
})

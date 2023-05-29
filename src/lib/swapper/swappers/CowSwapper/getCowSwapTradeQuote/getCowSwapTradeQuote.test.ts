import type { ethereum, FeeDataEstimate } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import { Ok } from '@sniptt/monads'
import type { AxiosStatic } from 'axios'
import type Web3 from 'web3'
import type { Asset } from 'lib/asset-service'
import * as selectors from 'state/zustand/swapperStore/amountSelectors'

import type { GetTradeQuoteInput, TradeQuote } from '../../../api'
import { SwapperName } from '../../../api'
import { ETH, FOX, WETH } from '../../utils/test-data/assets'
import type { CowSwapperDeps } from '../CowSwapper'
import { DEFAULT_ADDRESS, DEFAULT_APP_DATA } from '../utils/constants'
import { cowService } from '../utils/cowService'
import type { CowSwapSellQuoteApiInput } from '../utils/helpers/helpers'
import { getCowSwapTradeQuote } from './getCowSwapTradeQuote'

const mockOk = Ok as jest.MockedFunction<typeof Ok>

const foxRate = '0.0873'
const ethRate = '1233.65940923824103061992'
const wethRate = '1233.65940923824103061992'

jest.mock('@shapeshiftoss/chain-adapters')
jest.mock('../utils/cowService', () => {
  const axios: AxiosStatic = jest.createMockFromModule('axios')
  axios.create = jest.fn(() => axios)

  return {
    cowService: axios.create(),
  }
})
jest.mock('../utils/helpers/helpers', () => {
  return {
    getNowPlusThirtyMinutesTimestamp: () => 1656797787,
  }
})

jest.mock('../../utils/helpers/helpers', () => {
  return {
    ...jest.requireActual('../../utils/helpers/helpers'),
    getApproveContractData: () => '0xABCDEFGH',
  }
})

jest.mock('../getCowSwapMinMax/getCowSwapMinMax', () => {
  const { FOX } = require('../../utils/test-data/assets') // Move the import inside the factory function

  return {
    getCowSwapMinMax: (sellAsset: Asset) => {
      if (sellAsset.assetId === FOX.assetId) {
        return mockOk({
          minimumAmountCryptoHuman: '229.09507445589919816724',
          maximumAmountCryptoHuman: '100000000000000000000000000',
        })
      }

      return mockOk({
        minimumAmountCryptoHuman: '0.011624',
        maximumAmountCryptoHuman: '100000000000000000000000000',
      })
    },
  }
})

const selectBuyAssetUsdRateSpy = jest.spyOn(selectors, 'selectBuyAssetUsdRate')
const selectSellAssetUsdRateSpy = jest.spyOn(selectors, 'selectSellAssetUsdRate')

const feeData: FeeDataEstimate<KnownChainIds.EthereumMainnet> = {
  fast: {
    txFee: '4080654495000000',
    chainSpecific: {
      gasLimit: '100000',
      gasPrice: '79036500000',
      maxFeePerGas: '216214758112',
      maxPriorityFeePerGas: '2982734547',
    },
  },
  slow: {
    txFee: '4080654495000000',
    chainSpecific: {
      gasLimit: '100000',
      gasPrice: '79036500000',
      maxFeePerGas: '216214758112',
      maxPriorityFeePerGas: '2982734547',
    },
  },
  average: {
    txFee: '4080654495000000',
    chainSpecific: {
      gasLimit: '100000',
      gasPrice: '79036500000',
      maxFeePerGas: '216214758112',
      maxPriorityFeePerGas: '2982734547',
    },
  },
}

const expectedApiInputWethToFox: CowSwapSellQuoteApiInput = {
  appData: DEFAULT_APP_DATA,
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
  appData: DEFAULT_APP_DATA,
  buyToken: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
  from: '0x0000000000000000000000000000000000000000',
  kind: 'sell',
  partiallyFillable: false,
  receiver: '0x0000000000000000000000000000000000000000',
  sellAmountBeforeFee: '11624000000000000',
  sellToken: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  validTo: 1656797787,
}

const expectedApiInputFoxToEth: CowSwapSellQuoteApiInput = {
  appData: DEFAULT_APP_DATA,
  buyToken: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
  from: '0x0000000000000000000000000000000000000000',
  kind: 'sell',
  partiallyFillable: false,
  receiver: '0x0000000000000000000000000000000000000000',
  sellAmountBeforeFee: '1000000000000000000000',
  sellToken: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
  validTo: 1656797787,
}

const expectedTradeQuoteWethToFox: TradeQuote<KnownChainIds.EthereumMainnet> = {
  rate: '14924.80846543344314936607', // 14942 FOX per WETH
  minimumCryptoHuman: '0.011624',
  maximumCryptoHuman: '100000000000000000000000000',
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
  sellAmountBeforeFeesCryptoBaseUnit: '1000000000000000000',
  buyAmountBeforeFeesCryptoBaseUnit: '14913256100953839475750', // 14913 FOX
  sources: [{ name: SwapperName.CowSwap, proportion: '1' }],
  allowanceContract: '0xc92e8bdf79f0507f65a392b0ab4667716bfe0110',
  buyAsset: FOX,
  sellAsset: WETH,
  accountNumber: 0,
}

const expectedTradeQuoteFoxToEth: TradeQuote<KnownChainIds.EthereumMainnet> = {
  rate: '0.00004995640398295996',
  minimumCryptoHuman: '229.09507445589919816724',
  maximumCryptoHuman: '100000000000000000000000000',
  feeData: {
    protocolFees: {
      [FOX.assetId]: {
        amountCryptoBaseUnit: '61804771879693983744',
        requiresBalance: false,
        asset: FOX,
      },
    },
    networkFeeCryptoBaseUnit: '0',
  },
  sellAmountBeforeFeesCryptoBaseUnit: '1000000000000000000000',
  buyAmountBeforeFeesCryptoBaseUnit: '51242479117266593',
  sources: [{ name: SwapperName.CowSwap, proportion: '1' }],
  allowanceContract: '0xc92e8bdf79f0507f65a392b0ab4667716bfe0110',
  buyAsset: ETH,
  sellAsset: FOX,
  accountNumber: 0,
}

const expectedTradeQuoteSmallAmountWethToFox: TradeQuote<KnownChainIds.EthereumMainnet> = {
  rate: '14716.04718939437523468382', // 14716 FOX per WETH
  minimumCryptoHuman: '0.011624',
  maximumCryptoHuman: '100000000000000000000000000',
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
  sellAmountBeforeFeesCryptoBaseUnit: '1000000000000',
  buyAmountBeforeFeesCryptoBaseUnit: '0', // 0 FOX
  sources: [{ name: SwapperName.CowSwap, proportion: '1' }],
  allowanceContract: '0xc92e8bdf79f0507f65a392b0ab4667716bfe0110',
  buyAsset: FOX,
  sellAsset: WETH,
  accountNumber: 0,
}

const deps: CowSwapperDeps = {
  baseUrl: 'https://api.cow.fi/mainnet/api',
  adapter: {
    getAddress: jest.fn(() => Promise.resolve('address11')),
    getFeeData: jest.fn<Promise<FeeDataEstimate<KnownChainIds.EthereumMainnet>>, []>(() =>
      Promise.resolve(feeData),
    ),
  } as unknown as ethereum.ChainAdapter,
  web3: {} as Web3,
}

describe('getCowTradeQuote', () => {
  it('should throw an exception if both assets are not erc20s', async () => {
    selectBuyAssetUsdRateSpy.mockImplementation(() => foxRate)
    selectSellAssetUsdRateSpy.mockImplementation(() => ethRate)

    const input: GetTradeQuoteInput = {
      chainId: KnownChainIds.EthereumMainnet,
      sellAsset: ETH,
      buyAsset: FOX,
      sellAmountBeforeFeesCryptoBaseUnit: '11111',
      sendMax: true,
      accountNumber: 0,
      receiveAddress: DEFAULT_ADDRESS,
      affiliateBps: '0',
      eip1559Support: false,
    }

    const maybeTradeQuote = await getCowSwapTradeQuote(deps, input)
    expect(maybeTradeQuote.isErr()).toBe(true)
    expect(maybeTradeQuote.unwrapErr()).toMatchObject({
      cause: undefined,
      code: 'UNSUPPORTED_PAIR',
      details: { sellAssetNamespace: 'slip44' },
      message: '[getCowSwapTradeQuote] - Sell asset needs to be ERC-20 to use CowSwap',
      name: 'SwapError',
    })
  })

  it('should call cowService with correct parameters, handle the fees and return the correct trade quote when selling WETH', async () => {
    selectBuyAssetUsdRateSpy.mockImplementation(() => foxRate)
    selectSellAssetUsdRateSpy.mockImplementation(() => wethRate)

    const input: GetTradeQuoteInput = {
      chainId: KnownChainIds.EthereumMainnet,
      sellAsset: WETH,
      buyAsset: FOX,
      sellAmountBeforeFeesCryptoBaseUnit: '1000000000000000000',
      sendMax: true,
      accountNumber: 0,
      receiveAddress: DEFAULT_ADDRESS,
      affiliateBps: '0',
      eip1559Support: false,
    }

    ;(cowService.post as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve(
        Ok({
          data: {
            quote: {
              ...expectedApiInputWethToFox,
              sellAmountBeforeFee: undefined,
              sellAmount: '985442057341242012',
              buyAmount: '14707533959600717283163',
              feeAmount: '14557942658757988',
              sellTokenBalance: 'erc20',
              buyTokenBalance: 'erc20',
            },
          },
        }),
      ),
    )

    const maybeTradeQuote = await getCowSwapTradeQuote(deps, input)

    expect(maybeTradeQuote.isOk()).toBe(true)
    expect(maybeTradeQuote.unwrap()).toEqual(expectedTradeQuoteWethToFox)
    expect(cowService.post).toHaveBeenCalledWith(
      'https://api.cow.fi/mainnet/api/v1/quote/',
      expectedApiInputWethToFox,
    )
  })

  it('should call cowService with correct parameters, handle the fees and return the correct trade quote when buying ETH', async () => {
    selectBuyAssetUsdRateSpy.mockImplementation(() => ethRate)
    selectSellAssetUsdRateSpy.mockImplementation(() => foxRate)

    const input: GetTradeQuoteInput = {
      chainId: KnownChainIds.EthereumMainnet,
      sellAsset: FOX,
      buyAsset: ETH,
      sellAmountBeforeFeesCryptoBaseUnit: '1000000000000000000000',
      sendMax: true,
      accountNumber: 0,
      receiveAddress: DEFAULT_ADDRESS,
      affiliateBps: '0',
      eip1559Support: false,
    }

    ;(cowService.post as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve(
        Ok({
          data: {
            quote: {
              ...expectedApiInputFoxToEth,
              sellAmountBeforeFee: undefined,
              sellAmount: '938195228120306016256',
              buyAmount: '46868859830863283',
              feeAmount: '61804771879693983744',
              sellTokenBalance: 'erc20',
              buyTokenBalance: 'erc20',
            },
          },
        }),
      ),
    )

    const maybeTradeQuote = await getCowSwapTradeQuote(deps, input)

    expect(maybeTradeQuote.isOk()).toBe(true)
    expect(maybeTradeQuote.unwrap()).toEqual(expectedTradeQuoteFoxToEth)
    expect(cowService.post).toHaveBeenCalledWith(
      'https://api.cow.fi/mainnet/api/v1/quote/',
      expectedApiInputFoxToEth,
    )
  })

  it('should call cowService with correct parameters and return quote with original sellAmount when selling a very small amount of WETH', async () => {
    selectBuyAssetUsdRateSpy.mockImplementation(() => foxRate)
    selectSellAssetUsdRateSpy.mockImplementation(() => wethRate)

    const input: GetTradeQuoteInput = {
      chainId: KnownChainIds.EthereumMainnet,
      sellAsset: WETH,
      buyAsset: FOX,
      sellAmountBeforeFeesCryptoBaseUnit: '1000000000000',
      sendMax: true,
      accountNumber: 0,
      receiveAddress: DEFAULT_ADDRESS,
      affiliateBps: '0',
      eip1559Support: false,
    }

    ;(cowService.post as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve(
        Ok({
          data: {
            quote: {
              ...expectedApiInputSmallAmountWethToFox,
              sellAmountBeforeFee: undefined,
              sellAmount: '9854420573412420',
              buyAmount: '145018118182475950905',
              feeAmount: '1455794265875791',
              sellTokenBalance: 'erc20',
              buyTokenBalance: 'erc20',
            },
          },
        }),
      ),
    )

    const maybeTradeQuote = await getCowSwapTradeQuote(deps, input)

    expect(maybeTradeQuote.isErr()).toBe(false)
    expect(maybeTradeQuote.unwrap()).toEqual(expectedTradeQuoteSmallAmountWethToFox)
    expect(cowService.post).toHaveBeenCalledWith(
      'https://api.cow.fi/mainnet/api/v1/quote/',
      expectedApiInputSmallAmountWethToFox,
    )
  })
})

import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { KnownChainIds } from '@shapeshiftoss/types'
import { Ok } from '@sniptt/monads/build'
import type { AxiosStatic } from 'axios'
import { getDefaultSlippagePercentageForSwapper } from 'constants/constants'
import * as selectors from 'state/zustand/swapperStore/amountSelectors'

import type { BuildTradeInput } from '../../../api'
import { SwapperName } from '../../../api'
import { ETH, FOX, USDC_GNOSIS, WBTC, WETH, XDAI } from '../../utils/test-data/assets'
import type { CowSwapQuoteResponse } from '../CowSwapper'
import type { CowTrade } from '../types'
import { DEFAULT_ADDRESS, DEFAULT_APP_DATA } from '../utils/constants'
import { cowService } from '../utils/cowService'
import type { CowSwapSellQuoteApiInput } from '../utils/helpers/helpers'
import { cowBuildTrade } from './cowBuildTrade'

const foxRate = '0.0873'
const ethRate = '1233.65940923824103061992'
const wethRate = '1233.65940923824103061992'
const wbtcRate = '20978.38'
const usdcXdaiRate = '1.001'

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
    ...jest.requireActual('../utils/helpers/helpers'),
    getNowPlusThirtyMinutesTimestamp: () => 1656797787,
  }
})

jest.mock('../../utils/helpers/helpers', () => {
  return {
    ...jest.requireActual('../../utils/helpers/helpers'),
    getApproveContractData: () => '0xABCDEFGHIJ',
  }
})

const selectBuyAssetUsdRateSpy = jest.spyOn(selectors, 'selectBuyAssetUsdRate')
const selectSellAssetUsdRateSpy = jest.spyOn(selectors, 'selectSellAssetUsdRate')

const supportedChainIds = [KnownChainIds.EthereumMainnet, KnownChainIds.GnosisMainnet]

const expectedApiInputWethToFox: CowSwapSellQuoteApiInput = {
  appData: DEFAULT_APP_DATA,
  buyToken: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
  from: DEFAULT_ADDRESS,
  kind: 'sell',
  partiallyFillable: false,
  receiver: DEFAULT_ADDRESS,
  sellAmountBeforeFee: '1000000000000000000',
  sellToken: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  validTo: 1656797787,
}

const expectedApiInputWbtcToWeth: CowSwapSellQuoteApiInput = {
  appData: DEFAULT_APP_DATA,
  buyToken: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  from: DEFAULT_ADDRESS,
  kind: 'sell',
  partiallyFillable: false,
  receiver: DEFAULT_ADDRESS,
  sellAmountBeforeFee: '100000000',
  sellToken: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
  validTo: 1656797787,
}

const expectedApiInputFoxToEth: CowSwapSellQuoteApiInput = {
  appData: DEFAULT_APP_DATA,
  buyToken: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
  from: DEFAULT_ADDRESS,
  kind: 'sell',
  partiallyFillable: false,
  receiver: DEFAULT_ADDRESS,
  sellAmountBeforeFee: '1000000000000000000000',
  sellToken: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
  validTo: 1656797787,
}

const expectedApiInputUsdcGnosisToXdai: CowSwapSellQuoteApiInput = {
  appData: DEFAULT_APP_DATA,
  buyToken: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
  from: '0x0000000000000000000000000000000000000000',
  kind: 'sell',
  partiallyFillable: false,
  receiver: '0x0000000000000000000000000000000000000000',
  sellAmountBeforeFee: '20000000',
  sellToken: '0xddafbb505ad214d7b80b1f830fccc89b60fb7a83',
  validTo: 1656797787,
}

const expectedTradeWethToFox: CowTrade<KnownChainIds.EthereumMainnet> = {
  rate: '14716.04718939437505555958', // 14716 FOX per WETH
  feeData: {
    networkFeeCryptoBaseUnit: '0',
    protocolFees: {
      [WETH.assetId]: {
        amountCryptoBaseUnit: '14557942658757988',
        requiresBalance: false,
        asset: WETH,
      },
    },
  },
  sellAmountBeforeFeesCryptoBaseUnit: '1000000000000000000',
  buyAmountBeforeFeesCryptoBaseUnit: '14707533959600717283163', // 14707 FOX
  sources: [{ name: SwapperName.CowSwap, proportion: '1' }],
  buyAsset: FOX,
  sellAsset: WETH,
  accountNumber: 0,
  receiveAddress: DEFAULT_ADDRESS,
  feeAmountInSellTokenCryptoBaseUnit: '14557942658757988',
  sellAmountDeductFeeCryptoBaseUnit: '985442057341242012',
  id: '1',
  minimumBuyAmountAfterFeesCryptoBaseUnit: '14472808194611099900395',
}

const expectedTradeQuoteWbtcToWethWithApprovalFeeCryptoBaseUnit: CowTrade<KnownChainIds.EthereumMainnet> =
  {
    rate: '19.1423299300562315722', // 19.14 WETH per WBTC
    feeData: {
      networkFeeCryptoBaseUnit: '0',
      protocolFees: {
        [WBTC.assetId]: {
          amountCryptoBaseUnit: '17238',
          requiresBalance: false,
          asset: WBTC,
        },
      },
    },
    sellAmountBeforeFeesCryptoBaseUnit: '100000000',
    buyAmountBeforeFeesCryptoBaseUnit: '19141961497366844695', // 19.14 WETH
    sources: [{ name: SwapperName.CowSwap, proportion: '1' }],
    buyAsset: WETH,
    sellAsset: WBTC,
    accountNumber: 0,
    receiveAddress: DEFAULT_ADDRESS,
    feeAmountInSellTokenCryptoBaseUnit: '17238',
    sellAmountDeductFeeCryptoBaseUnit: '99982762',
    id: '1',
    minimumBuyAmountAfterFeesCryptoBaseUnit: '19100752114872442703',
  }

const expectedTradeQuoteFoxToEth: CowTrade<KnownChainIds.EthereumMainnet> = {
  rate: '0.00005461814085319106',
  feeData: {
    networkFeeCryptoBaseUnit: '0',
    protocolFees: {
      [FOX.assetId]: {
        amountCryptoBaseUnit: '61804771879693983744',
        requiresBalance: false,
        asset: FOX,
      },
    },
  },
  sellAmountBeforeFeesCryptoBaseUnit: '1000000000000000000000',
  buyAmountBeforeFeesCryptoBaseUnit: '55616098403669903',
  sources: [{ name: SwapperName.CowSwap, proportion: '1' }],
  buyAsset: ETH,
  sellAsset: FOX,
  accountNumber: 0,
  receiveAddress: DEFAULT_ADDRESS,
  feeAmountInSellTokenCryptoBaseUnit: '61804771879693983744',
  sellAmountDeductFeeCryptoBaseUnit: '938195228120306016256',
  id: '1',
  minimumBuyAmountAfterFeesCryptoBaseUnit: '51242479117266593',
}

const expectedTradeQuoteUsdcToXdai: CowTrade<KnownChainIds.GnosisMainnet> = {
  rate: '5.462e-17',
  feeData: {
    protocolFees: {
      [USDC_GNOSIS.assetId]: {
        amountCryptoBaseUnit: '61804771879693983744',
        requiresBalance: false,
        asset: USDC_GNOSIS,
      },
    },
    networkFeeCryptoBaseUnit: '0',
  },
  sellAmountBeforeFeesCryptoBaseUnit: '20000000',
  buyAmountBeforeFeesCryptoBaseUnit: '61804771879694034986479117266593',
  sources: [{ name: SwapperName.CowSwap, proportion: '1' }],
  buyAsset: XDAI,
  sellAsset: USDC_GNOSIS,
  accountNumber: 0,
  receiveAddress: DEFAULT_ADDRESS,
  feeAmountInSellTokenCryptoBaseUnit: '61804771879693983744',
  sellAmountDeductFeeCryptoBaseUnit: '938195228120306016256',
  id: '1',
  minimumBuyAmountAfterFeesCryptoBaseUnit: '51242479117266593',
}

describe('cowBuildTrade', () => {
  it('should throw an exception if both assets are not erc20s', async () => {
    selectBuyAssetUsdRateSpy.mockImplementation(() => foxRate)
    selectSellAssetUsdRateSpy.mockImplementation(() => ethRate)

    const tradeInput: BuildTradeInput = {
      chainId: KnownChainIds.EthereumMainnet,
      sellAsset: ETH,
      buyAsset: FOX,
      sellAmountBeforeFeesCryptoBaseUnit: '11111',
      sendMax: true,
      accountNumber: 0,
      wallet: {} as HDWallet,
      receiveAddress: DEFAULT_ADDRESS,
      affiliateBps: '0',
      eip1559Support: false,
      slippage: getDefaultSlippagePercentageForSwapper(SwapperName.Test),
    }

    const maybeCowBuildTrade = await cowBuildTrade(tradeInput, supportedChainIds)
    expect(maybeCowBuildTrade.isErr()).toBe(true)
    expect(maybeCowBuildTrade.unwrapErr()).toMatchObject({
      cause: undefined,
      code: 'UNSUPPORTED_PAIR',
      details: { sellAssetNamespace: 'slip44' },
      message: '[cowBuildTrade] - Sell asset needs to be ERC-20 to use CowSwap',
      name: 'SwapError',
    })
  })

  it('should call cowService with correct parameters, handle the fees and return the correct trade when selling WETH', async () => {
    selectBuyAssetUsdRateSpy.mockImplementation(() => foxRate)
    selectSellAssetUsdRateSpy.mockImplementation(() => wethRate)

    const tradeInput: BuildTradeInput = {
      chainId: KnownChainIds.EthereumMainnet,
      sellAsset: WETH,
      buyAsset: FOX,
      sellAmountBeforeFeesCryptoBaseUnit: '1000000000000000000',
      sendMax: true,
      accountNumber: 0,
      wallet: {} as HDWallet,
      receiveAddress: DEFAULT_ADDRESS,
      affiliateBps: '0',
      eip1559Support: false,
      slippage: getDefaultSlippagePercentageForSwapper(SwapperName.Test),
    }

    ;(cowService.post as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve(
        Ok<{ data: CowSwapQuoteResponse }>({
          data: {
            quote: {
              ...expectedApiInputWethToFox,
              sellAmount: '985442057341242012',
              buyAmount: '14501811818247595090576',
              feeAmount: '14557942658757988',
            },
            from: '0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6',
            expiration: '1684901061',
            id: '1',
          },
        }),
      ),
    )

    const maybeBuiltTrade = await cowBuildTrade(tradeInput, supportedChainIds)

    expect(maybeBuiltTrade.isOk()).toBe(true)
    expect(maybeBuiltTrade.unwrap()).toEqual(expectedTradeWethToFox)
    expect(cowService.post).toHaveBeenCalledWith(
      'https://api.cow.fi/mainnet/api/v1/quote/',
      expectedApiInputWethToFox,
    )
  })

  it('should call cowService with correct parameters, handle the fees and return the correct trade when selling WBTC with allowance being required', async () => {
    selectBuyAssetUsdRateSpy.mockImplementation(() => wethRate)
    selectSellAssetUsdRateSpy.mockImplementation(() => wbtcRate)

    const tradeInput: BuildTradeInput = {
      chainId: KnownChainIds.EthereumMainnet,
      sellAsset: WBTC,
      buyAsset: WETH,
      sellAmountBeforeFeesCryptoBaseUnit: '100000000',
      sendMax: true,
      accountNumber: 0,
      wallet: {} as HDWallet,
      receiveAddress: DEFAULT_ADDRESS,
      affiliateBps: '0',
      eip1559Support: false,
      slippage: getDefaultSlippagePercentageForSwapper(SwapperName.Test),
    }

    ;(cowService.post as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve(
        Ok<{ data: CowSwapQuoteResponse }>({
          data: {
            quote: {
              ...expectedApiInputWbtcToWeth,
              sellAmount: '99982762',
              buyAmount: '19139030175222888479',
              feeAmount: '17238',
            },
            from: '0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6',
            expiration: '1684901061',
            id: '1',
          },
        }),
      ),
    )

    const maybeBuiltTrade = await cowBuildTrade(tradeInput, supportedChainIds)
    expect(maybeBuiltTrade.isOk()).toBe(true)

    expect(maybeBuiltTrade.unwrap()).toEqual(
      expectedTradeQuoteWbtcToWethWithApprovalFeeCryptoBaseUnit,
    )
    expect(cowService.post).toHaveBeenCalledWith(
      'https://api.cow.fi/mainnet/api/v1/quote/',
      expectedApiInputWbtcToWeth,
    )
  })

  it('should call cowService with correct parameters, handle the fees and return the correct trade when buying ETH', async () => {
    selectBuyAssetUsdRateSpy.mockImplementation(() => ethRate)
    selectSellAssetUsdRateSpy.mockImplementation(() => foxRate)

    const tradeInput: BuildTradeInput = {
      chainId: KnownChainIds.EthereumMainnet,
      sellAsset: FOX,
      buyAsset: ETH,
      sellAmountBeforeFeesCryptoBaseUnit: '1000000000000000000000',
      sendMax: true,
      accountNumber: 0,
      wallet: {} as HDWallet,
      receiveAddress: DEFAULT_ADDRESS,
      affiliateBps: '0',
      eip1559Support: false,
    }

    ;(cowService.post as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve(
        Ok<{ data: CowSwapQuoteResponse }>({
          data: {
            quote: {
              ...expectedApiInputFoxToEth,
              sellAmount: '938195228120306016256',
              buyAmount: '51242479117266593',
              feeAmount: '61804771879693983744',
            },
            from: '0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6',
            expiration: '1684901061',
            id: '1',
          },
        }),
      ),
    )

    const maybeBuiltTrade = await cowBuildTrade(tradeInput, supportedChainIds)
    expect(maybeBuiltTrade.isOk()).toBe(true)

    expect(maybeBuiltTrade.unwrap()).toEqual(expectedTradeQuoteFoxToEth)
    expect(cowService.post).toHaveBeenCalledWith(
      'https://api.cow.fi/mainnet/api/v1/quote/',
      expectedApiInputFoxToEth,
    )
  })

  it('should call cowService with correct parameters, handle the fees and return the correct trade when buying XDAI', async () => {
    selectBuyAssetUsdRateSpy.mockImplementation(() => usdcXdaiRate)
    selectSellAssetUsdRateSpy.mockImplementation(() => usdcXdaiRate)

    const tradeInput: BuildTradeInput = {
      chainId: KnownChainIds.GnosisMainnet,
      sellAsset: USDC_GNOSIS,
      buyAsset: XDAI,
      sellAmountBeforeFeesCryptoBaseUnit: '20000000',
      sendMax: true,
      accountNumber: 0,
      wallet: {} as HDWallet,
      receiveAddress: DEFAULT_ADDRESS,
      affiliateBps: '0',
      eip1559Support: false,
    }

    ;(cowService.post as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve(
        Ok<{ data: CowSwapQuoteResponse }>({
          data: {
            quote: {
              ...expectedApiInputUsdcGnosisToXdai,
              sellAmount: '938195228120306016256',
              buyAmount: '51242479117266593',
              feeAmount: '61804771879693983744',
            },
            from: '0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6',
            expiration: '1684901061',
            id: '1',
          },
        }),
      ),
    )

    const maybeBuiltTrade = await cowBuildTrade(tradeInput, supportedChainIds)
    expect(maybeBuiltTrade.isOk()).toBe(true)

    expect(maybeBuiltTrade.unwrap()).toEqual(expectedTradeQuoteUsdcToXdai)
    expect(cowService.post).toHaveBeenCalledWith(
      'https://api.cow.fi/xdai/api/v1/quote/',
      expectedApiInputUsdcGnosisToXdai,
    )
  })
})

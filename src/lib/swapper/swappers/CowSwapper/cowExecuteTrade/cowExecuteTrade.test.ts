import { ethChainId, gnosisChainId } from '@shapeshiftoss/caip'
import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { KnownChainIds } from '@shapeshiftoss/types'
import { Ok } from '@sniptt/monads'
import type { AxiosStatic } from 'axios'
import { ethers } from 'ethers'

import type { ExecuteTradeInput } from '../../../api'
import { SwapperName } from '../../../api'
import { ETH, FOX, USDC_GNOSIS, WETH, XDAI } from '../../utils/test-data/assets'
import type { CowChainId, CowTrade } from '../types'
import {
  COW_SWAP_NATIVE_ASSET_MARKER_ADDRESS,
  DEFAULT_APP_DATA,
  ERC20_TOKEN_BALANCE,
  ORDER_KIND_SELL,
  SIGNING_SCHEME,
} from '../utils/constants'
import { cowService } from '../utils/cowService'
import type { CowSwapOrder } from '../utils/helpers/helpers'
import { hashOrder } from '../utils/helpers/helpers'
import { cowExecuteTrade } from './cowExecuteTrade'

const OrderDigest = '0xaf1d4f80d997d0cefa325dd6e003e5b5940247694eaba507b793c7ec60db10a0'
const Signature =
  '0x521ff65fd1e679b15b3ded234c89a30c0a4af1b190466a2dae0e14b7f935ce2c260cf3c0e4a5d81e340b8e615c095cbd65d0920387bea32cf09ccf3d624bf8251b'

const supportedChainIds: CowChainId[] = [KnownChainIds.EthereumMainnet, KnownChainIds.GnosisMainnet]

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
    hashOrder: jest.fn(() => OrderDigest),
  }
})

const actualChainAdapters = jest.requireActual('@shapeshiftoss/chain-adapters')

const mockEthereumChainAdapter = {
  // TODO: test account 0+
  getBIP44Params: jest.fn(() => actualChainAdapters.ethereum.ChainAdapter.defaultBIP44Params),
  getChainId: () => KnownChainIds.EthereumMainnet,
  signMessage: jest.fn(() => Promise.resolve(Signature)),
} as unknown as EvmChainAdapter

const mockGnosisChainAdapter = {
  getBIP44Params: jest.fn(() => actualChainAdapters.gnosis.ChainAdapter.defaultBIP44Params),
  getChainId: () => KnownChainIds.GnosisMainnet,
  signMessage: jest.fn(() => Promise.resolve(Signature)),
} as unknown as EvmChainAdapter // wrong type but doesn't matter here

jest.mock('context/PluginProvider/chainAdapterSingleton', () => {
  const { KnownChainIds } = require('@shapeshiftoss/types')

  return {
    getChainAdapterManager: jest.fn(
      () =>
        new Map([
          [KnownChainIds.EthereumMainnet, mockEthereumChainAdapter],
          [KnownChainIds.GnosisMainnet, mockGnosisChainAdapter],
        ]),
    ),
  }
})

const hashOrderMock = jest.mocked(hashOrder)

const cowTradeEthToFox: CowTrade<KnownChainIds.EthereumMainnet> = {
  rate: '14716.04718939437505555958',
  feeData: {
    protocolFees: {},
    networkFeeCryptoBaseUnit: '14557942658757988',
  },
  sellAmountBeforeFeesCryptoBaseUnit: '1000000000000000000',
  buyAmountBeforeFeesCryptoBaseUnit: '14501811818247595090576',
  sources: [{ name: SwapperName.CowSwap, proportion: '1' }],
  buyAsset: FOX,
  sellAsset: ETH,
  accountNumber: 0,
  receiveAddress: 'address11',
  feeAmountInSellTokenCryptoBaseUnit: '14557942658757988',
  sellAmountDeductFeeCryptoBaseUnit: '111111',
  id: '1',
  minimumBuyAmountAfterFeesCryptoBaseUnit: '14501811818247595090576',
}

const cowTradeWethToFox: CowTrade<KnownChainIds.EthereumMainnet> = {
  rate: '14716.04718939437505555958',
  feeData: {
    protocolFees: {},
    networkFeeCryptoBaseUnit: '14557942658757988',
  },
  sellAmountBeforeFeesCryptoBaseUnit: '20200000000000000',
  buyAmountBeforeFeesCryptoBaseUnit: '272522025311597443544',
  sources: [{ name: SwapperName.CowSwap, proportion: '1' }],
  buyAsset: FOX,
  sellAsset: WETH,
  accountNumber: 0,
  receiveAddress: 'address11',
  feeAmountInSellTokenCryptoBaseUnit: '3514395197690019',
  sellAmountDeductFeeCryptoBaseUnit: '16685605000000000',
  id: '1',
  minimumBuyAmountAfterFeesCryptoBaseUnit: '272522025311597443544',
}

const cowTradeFoxToEth: CowTrade<KnownChainIds.EthereumMainnet> = {
  rate: '0.00004995640398295996',
  feeData: {
    protocolFees: {
      [FOX.assetId]: {
        amountCryptoBaseUnit: '5.3955565850972847808512',
        requiresBalance: false,
        asset: FOX,
      },
    },
    networkFeeCryptoBaseUnit: '0',
  },
  sellAmountBeforeFeesCryptoBaseUnit: '1000000000000000000000',
  buyAmountBeforeFeesCryptoBaseUnit: '46868859830863283',
  sources: [{ name: SwapperName.CowSwap, proportion: '1' }],
  buyAsset: ETH,
  sellAsset: FOX,
  accountNumber: 0,
  receiveAddress: 'address11',
  feeAmountInSellTokenCryptoBaseUnit: '61804771879693983744',
  sellAmountDeductFeeCryptoBaseUnit: '938195228120306016256',
  id: '1',
  minimumBuyAmountAfterFeesCryptoBaseUnit: '46868859830863283',
}

const cowTradeUsdcToXdai: CowTrade<KnownChainIds.GnosisMainnet> = {
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
  receiveAddress: 'address11',
  feeAmountInSellTokenCryptoBaseUnit: '61804771879693983744',
  sellAmountDeductFeeCryptoBaseUnit: '938195228120306016256',
  id: '1',
  minimumBuyAmountAfterFeesCryptoBaseUnit: '51242479117266593',
}

const expectedWethToFoxOrderToSign: CowSwapOrder = {
  sellToken: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  buyToken: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
  sellAmount: '16685605000000000',
  buyAmount: '272522025311597443544',
  validTo: 1656797787,
  appData: DEFAULT_APP_DATA,
  feeAmount: '3514395197690019',
  kind: ORDER_KIND_SELL,
  partiallyFillable: false,
  receiver: 'address11',
  sellTokenBalance: ERC20_TOKEN_BALANCE,
  buyTokenBalance: ERC20_TOKEN_BALANCE,
  quoteId: '1',
}

const expectedFoxToEthOrderToSign: CowSwapOrder = {
  sellToken: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
  buyToken: COW_SWAP_NATIVE_ASSET_MARKER_ADDRESS,
  sellAmount: '938195228120306016256',
  buyAmount: '46868859830863283',
  validTo: 1656797787,
  appData: DEFAULT_APP_DATA,
  feeAmount: '61804771879693983744',
  kind: ORDER_KIND_SELL,
  partiallyFillable: false,
  receiver: 'address11',
  sellTokenBalance: ERC20_TOKEN_BALANCE,
  buyTokenBalance: ERC20_TOKEN_BALANCE,
  quoteId: '1',
}

const expectedUsdcToXdaiOrderToSign: CowSwapOrder = {
  sellToken: '0xddafbb505ad214d7b80b1f830fccc89b60fb7a83',
  buyToken: COW_SWAP_NATIVE_ASSET_MARKER_ADDRESS,
  sellAmount: '938195228120306016256',
  buyAmount: '51242479117266593',
  validTo: 1656797787,
  appData: DEFAULT_APP_DATA,
  feeAmount: '61804771879693983744',
  kind: ORDER_KIND_SELL,
  partiallyFillable: false,
  receiver: 'address11',
  sellTokenBalance: ERC20_TOKEN_BALANCE,
  buyTokenBalance: ERC20_TOKEN_BALANCE,
  quoteId: '1',
}

describe('cowExecuteTrade', () => {
  it('should throw an exception if both assets are not erc20s', async () => {
    const tradeInput: ExecuteTradeInput<KnownChainIds.EthereumMainnet> = {
      trade: cowTradeEthToFox,
      wallet: {} as HDWallet,
    }

    expect((await cowExecuteTrade(tradeInput, supportedChainIds)).unwrapErr()).toMatchObject({
      cause: undefined,
      code: 'UNSUPPORTED_PAIR',
      details: { sellAssetNamespace: 'slip44' },
      message: '[cowExecuteTrade] - Sell asset needs to be ERC-20 to use CowSwap',
      name: 'SwapError',
    })
  })

  it('should call cowService with correct parameters and return the order uid when selling WETH', async () => {
    const tradeInput: ExecuteTradeInput<KnownChainIds.EthereumMainnet> = {
      trade: cowTradeWethToFox,
      wallet: {} as HDWallet,
    }

    ;(cowService.post as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve(
        Ok({
          data: '0xe476dadc86e768e4602bc872d4a7d50b03a4c2a609b37bf741f26baa578146bd0ea983f21f58f0e1a29ed653bcfc8afac4fec2a462c2e25e',
        }),
      ),
    )

    const maybeTrade = await cowExecuteTrade(tradeInput, supportedChainIds)
    expect(maybeTrade.isErr()).toBe(false)
    const trade = maybeTrade.unwrap()

    expect(trade).toEqual({
      chainId: ethChainId,
      tradeId:
        '0xe476dadc86e768e4602bc872d4a7d50b03a4c2a609b37bf741f26baa578146bd0ea983f21f58f0e1a29ed653bcfc8afac4fec2a462c2e25e',
    })
    expect(cowService.post).toHaveBeenCalledWith('https://api.cow.fi/mainnet/api/v1/orders/', {
      ...expectedWethToFoxOrderToSign,
      signingScheme: SIGNING_SCHEME,
      signature: Signature,
      from: expectedWethToFoxOrderToSign.receiver,
    })

    expect(hashOrderMock).toHaveBeenCalledWith(
      {
        chainId: 1,
        name: 'Gnosis Protocol',
        verifyingContract: '0x9008D19f58AAbD9eD0D60971565AA8510560ab41',
        version: 'v2',
      },
      expectedWethToFoxOrderToSign,
    )
    expect(mockEthereumChainAdapter.signMessage).toHaveBeenCalledWith({
      messageToSign: {
        addressNList: [2147483692, 2147483708, 2147483648, 0, 0],
        message: ethers.utils.arrayify(OrderDigest),
      },
      wallet: tradeInput.wallet,
    })
  })

  it('should call cowService with correct parameters and return the order uid when buying ETH', async () => {
    const tradeInput: ExecuteTradeInput<KnownChainIds.EthereumMainnet> = {
      trade: cowTradeFoxToEth,
      wallet: {} as HDWallet,
    }

    ;(cowService.post as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve(
        Ok({
          data: '0xe476dadc86e768e4602bc872d4a7d50b03a4c2a609b37bf741f26baa578146bd0ea983f21f58f0e1a29ed653bcfc8afac4fec2a462c2e26f',
        }),
      ),
    )

    const maybeTrade = await cowExecuteTrade(tradeInput, supportedChainIds)

    expect(maybeTrade.isErr()).toBe(false)
    const trade = maybeTrade.unwrap()
    expect(trade).toEqual({
      chainId: ethChainId,
      tradeId:
        '0xe476dadc86e768e4602bc872d4a7d50b03a4c2a609b37bf741f26baa578146bd0ea983f21f58f0e1a29ed653bcfc8afac4fec2a462c2e26f',
    })

    expect(cowService.post).toHaveBeenCalledWith('https://api.cow.fi/mainnet/api/v1/orders/', {
      ...expectedFoxToEthOrderToSign,
      signingScheme: SIGNING_SCHEME,
      signature: Signature,
      from: expectedFoxToEthOrderToSign.receiver,
    })

    expect(hashOrderMock).toHaveBeenCalledWith(
      {
        chainId: 1,
        name: 'Gnosis Protocol',
        verifyingContract: '0x9008D19f58AAbD9eD0D60971565AA8510560ab41',
        version: 'v2',
      },
      expectedFoxToEthOrderToSign,
    )
    expect(mockEthereumChainAdapter.signMessage).toHaveBeenCalledWith({
      messageToSign: {
        addressNList: [2147483692, 2147483708, 2147483648, 0, 0],
        message: ethers.utils.arrayify(OrderDigest),
      },
      wallet: tradeInput.wallet,
    })
  })

  it('should call cowService with correct parameters and return the order uid when buying XDAI', async () => {
    const tradeInput: ExecuteTradeInput<KnownChainIds.GnosisMainnet> = {
      trade: cowTradeUsdcToXdai,
      wallet: {} as HDWallet,
    }

    ;(cowService.post as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve(
        Ok({
          data: '0xe476dadc86e768e4602bc872d4a7d50b03a4c2a609b37bf741f26baa578146bd0ea983f21f58f0e1a29ed653bcfc8afac4fec2a462c2e26f',
        }),
      ),
    )

    const maybeTrade = await cowExecuteTrade(tradeInput, supportedChainIds)

    expect(maybeTrade.isErr()).toBe(false)
    const trade = maybeTrade.unwrap()
    expect(trade).toEqual({
      chainId: gnosisChainId,
      tradeId:
        '0xe476dadc86e768e4602bc872d4a7d50b03a4c2a609b37bf741f26baa578146bd0ea983f21f58f0e1a29ed653bcfc8afac4fec2a462c2e26f',
    })

    expect(cowService.post).toHaveBeenCalledWith('https://api.cow.fi/xdai/api/v1/orders/', {
      ...expectedUsdcToXdaiOrderToSign,
      signingScheme: SIGNING_SCHEME,
      signature: Signature,
      from: expectedUsdcToXdaiOrderToSign.receiver,
    })

    expect(hashOrderMock).toHaveBeenCalledWith(
      {
        chainId: 100,
        name: 'Gnosis Protocol',
        verifyingContract: '0x9008D19f58AAbD9eD0D60971565AA8510560ab41',
        version: 'v2',
      },
      expectedUsdcToXdaiOrderToSign,
    )
    expect(mockGnosisChainAdapter.signMessage).toHaveBeenCalledWith({
      messageToSign: {
        addressNList: [2147483692, 2147483708, 2147483648, 0, 0],
        message: ethers.utils.arrayify(OrderDigest),
      },
      wallet: tradeInput.wallet,
    })
  })
})

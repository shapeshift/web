import { ethereum } from '@shapeshiftoss/chain-adapters'
import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { KnownChainIds } from '@shapeshiftoss/types'
import { ethers } from 'ethers'
import Web3 from 'web3'

import { ExecuteTradeInput } from '../../../api'
import { ETH, FOX, WETH } from '../../utils/test-data/assets'
import { CowSwapperDeps } from '../CowSwapper'
import { CowTrade } from '../types'
import {
  DEFAULT_APP_DATA,
  ERC20_TOKEN_BALANCE,
  ORDER_KIND_SELL,
  SIGNING_SCHEME,
} from '../utils/constants'
import { cowService } from '../utils/cowService'
import { CowSwapOrder } from '../utils/helpers/helpers'
import { hashOrder } from '../utils/helpers/helpers'
import { cowExecuteTrade } from './cowExecuteTrade'

const OrderDigest = '0xaf1d4f80d997d0cefa325dd6e003e5b5940247694eaba507b793c7ec60db10a0'
const Signature =
  '0x521ff65fd1e679b15b3ded234c89a30c0a4af1b190466a2dae0e14b7f935ce2c260cf3c0e4a5d81e340b8e615c095cbd65d0920387bea32cf09ccf3d624bf8251b'

jest.mock('@shapeshiftoss/chain-adapters', () => {
  const actualChainAdapters = jest.requireActual('@shapeshiftoss/chain-adapters')
  return {
    ...actualChainAdapters,
    ethereum: {
      ChainAdapter: {
        defaultBIP44Params: actualChainAdapters.ethereum.ChainAdapter.defaultBIP44Params,
        signMessage: jest.fn(() => Promise.resolve(Signature)),
      },
    },
  }
})

jest.mock('../utils/cowService')
jest.mock('../utils/helpers/helpers', () => {
  return {
    ...jest.requireActual('../utils/helpers/helpers'),
    getNowPlusThirtyMinutesTimestamp: () => 1656797787,
    hashOrder: jest.fn(() => OrderDigest),
  }
})

const ethereumMock = jest.mocked(ethereum, true)
const hashOrderMock = jest.mocked(hashOrder, true)

const cowTradeEthToFox: CowTrade<KnownChainIds.EthereumMainnet> = {
  rate: '14716.04718939437505555958',
  feeData: {
    fee: '14557942658757988',
    chainSpecific: {
      estimatedGas: '100000',
      gasPrice: '79036500000',
    },
    tradeFee: '0',
  },
  sellAmount: '1000000000000000000',
  buyAmount: '14501811818247595090576',
  sources: [{ name: 'CowSwap', proportion: '1' }],
  buyAsset: FOX,
  sellAsset: ETH,
  bip44Params: { purpose: 44, coinType: 60, accountNumber: 0 },
  receiveAddress: 'address11',
  feeAmountInSellToken: '14557942658757988',
  sellAmountWithoutFee: '111111',
}

const cowTradeWethToFox: CowTrade<KnownChainIds.EthereumMainnet> = {
  rate: '14716.04718939437505555958',
  feeData: {
    fee: '14557942658757988',
    chainSpecific: {
      estimatedGas: '100000',
      gasPrice: '79036500000',
    },
    tradeFee: '0',
  },
  sellAmount: '20200000000000000',
  buyAmount: '272522025311597443544',
  sources: [{ name: 'CowSwap', proportion: '1' }],
  buyAsset: FOX,
  sellAsset: WETH,
  bip44Params: { purpose: 44, coinType: 60, accountNumber: 0 },
  receiveAddress: 'address11',
  feeAmountInSellToken: '3514395197690019',
  sellAmountWithoutFee: '16685605000000000',
}

const cowTradeFoxToEth: CowTrade<KnownChainIds.EthereumMainnet> = {
  rate: '0.00004995640398295996',
  feeData: {
    fee: '0',
    chainSpecific: {
      estimatedGas: '100000',
      gasPrice: '79036500000',
    },
    tradeFee: '5.3955565850972847808512',
  },
  sellAmount: '1000000000000000000000',
  buyAmount: '46868859830863283',
  sources: [{ name: 'CowSwap', proportion: '1' }],
  buyAsset: ETH,
  sellAsset: FOX,
  bip44Params: { purpose: 44, coinType: 60, accountNumber: 0 },
  receiveAddress: 'address11',
  feeAmountInSellToken: '61804771879693983744',
  sellAmountWithoutFee: '938195228120306016256',
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
}

const expectedFoxToEthOrderToSign: CowSwapOrder = {
  sellToken: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
  buyToken: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
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
}

const deps: CowSwapperDeps = {
  apiUrl: 'https://api.cow.fi/mainnet/api',
  adapter: ethereumMock.ChainAdapter as unknown as ethereum.ChainAdapter,
  web3: {} as Web3,
}

describe('cowExecuteTrade', () => {
  it('should throw an exception if both assets are not erc20s', async () => {
    const tradeInput: ExecuteTradeInput<KnownChainIds.EthereumMainnet> = {
      trade: cowTradeEthToFox,
      wallet: {} as HDWallet,
    }

    await expect(cowExecuteTrade(deps, tradeInput)).rejects.toThrow(
      '[cowExecuteTrade] - Sell asset needs to be ERC-20 to use CowSwap',
    )
  })

  it('should call cowService with correct parameters and return the order uid when selling WETH', async () => {
    const tradeInput: ExecuteTradeInput<KnownChainIds.EthereumMainnet> = {
      trade: cowTradeWethToFox,
      wallet: {} as HDWallet,
    }

    ;(cowService.post as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve({
        data: '0xe476dadc86e768e4602bc872d4a7d50b03a4c2a609b37bf741f26baa578146bd0ea983f21f58f0e1a29ed653bcfc8afac4fec2a462c2e25e',
      }),
    )

    const trade = await cowExecuteTrade(deps, tradeInput)

    expect(trade).toEqual({
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
    expect(
      (ethereumMock.ChainAdapter as unknown as ethereum.ChainAdapter).signMessage,
    ).toHaveBeenCalledWith({
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
      Promise.resolve({
        data: '0xe476dadc86e768e4602bc872d4a7d50b03a4c2a609b37bf741f26baa578146bd0ea983f21f58f0e1a29ed653bcfc8afac4fec2a462c2e26f',
      }),
    )

    const trade = await cowExecuteTrade(deps, tradeInput)

    expect(trade).toEqual({
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
    expect(
      (ethereumMock.ChainAdapter as unknown as ethereum.ChainAdapter).signMessage,
    ).toHaveBeenCalledWith({
      messageToSign: {
        addressNList: [2147483692, 2147483708, 2147483648, 0, 0],
        message: ethers.utils.arrayify(OrderDigest),
      },
      wallet: tradeInput.wallet,
    })
  })
})

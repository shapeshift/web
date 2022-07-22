import { ethereum, FeeDataEstimate } from '@shapeshiftoss/chain-adapters'
import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { Asset, KnownChainIds } from '@shapeshiftoss/types'
import Web3 from 'web3'

import { GetTradeQuoteInput, TradeQuote } from '../../../api'
import { ETH, FOX, WETH } from '../../utils/test-data/assets'
import { CowSwapperDeps } from '../CowSwapper'
import { cowService } from '../utils/cowService'
import { CowSwapQuoteApiInput } from '../utils/helpers/helpers'
import { getCowSwapTradeQuote } from './getCowSwapTradeQuote'

jest.mock('@shapeshiftoss/chain-adapters')
jest.mock('../utils/cowService')
jest.mock('../utils/helpers/helpers', () => {
  return {
    getNowPlusThirtyMinutesTimestamp: () => 1656797787,
    getUsdRate: (_args: CowSwapperDeps, input: Asset) => {
      if (input.assetId === WETH.assetId) {
        return Promise.resolve('1233.65940923824103061992')
      }

      return Promise.resolve('20978.38')
    }
  }
})

jest.mock('../../utils/helpers/helpers', () => {
  return {
    ...jest.requireActual('../../utils/helpers/helpers'),
    getApproveContractData: () => '0xABCDEFGH'
  }
})

const feeData: FeeDataEstimate<KnownChainIds.EthereumMainnet> = {
  fast: {
    txFee: '4080654495000000',
    chainSpecific: {
      gasLimit: '100000',
      gasPrice: '79036500000',
      maxFeePerGas: '216214758112',
      maxPriorityFeePerGas: '2982734547'
    }
  },
  slow: {
    txFee: '4080654495000000',
    chainSpecific: {
      gasLimit: '100000',
      gasPrice: '79036500000',
      maxFeePerGas: '216214758112',
      maxPriorityFeePerGas: '2982734547'
    }
  },
  average: {
    txFee: '4080654495000000',
    chainSpecific: {
      gasLimit: '100000',
      gasPrice: '79036500000',
      maxFeePerGas: '216214758112',
      maxPriorityFeePerGas: '2982734547'
    }
  }
}

const expectedApiInputWethToFox: CowSwapQuoteApiInput = {
  appData: '0x0000000000000000000000000000000000000000000000000000000000000000',
  buyToken: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
  from: '0x0000000000000000000000000000000000000000',
  kind: 'sell',
  partiallyFillable: false,
  receiver: '0x0000000000000000000000000000000000000000',
  sellAmountBeforeFee: '1000000000000000000',
  sellToken: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  validTo: 1656797787
}

const expectedTradeQuoteWethToFox: TradeQuote<KnownChainIds.EthereumMainnet> = {
  rate: '14716.04718939437505555958', // 14716 FOX per WETH
  minimum: '0.00810596500550730736',
  maximum: '100000000000000000000000000',
  feeData: {
    fee: '0',
    chainSpecific: {
      estimatedGas: '100000',
      gasPrice: '79036500000',
      approvalFee: '7903650000000000'
    },
    tradeFee: '17.95954294012756741283729339486489192096'
  },
  sellAmount: '1000000000000000000',
  buyAmount: '14501811818247595090576', // 14501 FOX
  sources: [{ name: 'CowSwap', proportion: '1' }],
  allowanceContract: '0xc92e8bdf79f0507f65a392b0ab4667716bfe0110',
  buyAsset: FOX,
  sellAsset: WETH,
  sellAssetAccountNumber: 0
}

const defaultDeps: CowSwapperDeps = {
  apiUrl: '',
  adapter: {} as ethereum.ChainAdapter,
  web3: {} as Web3,
  feeAsset: WETH
}

describe('getCowTradeQuote', () => {
  it('should throw an exception if both assets are not erc20s', async () => {
    const input: GetTradeQuoteInput = {
      chainId: KnownChainIds.EthereumMainnet,
      sellAsset: ETH,
      buyAsset: FOX,
      sellAmount: '11111',
      sendMax: true,
      sellAssetAccountNumber: 1,
      wallet: <HDWallet>{},
      receiveAddress: ''
    }

    await expect(getCowSwapTradeQuote(defaultDeps, input)).rejects.toThrow(
      '[getCowSwapTradeQuote] - Both assets need to be ERC-20 to use CowSwap'
    )
  })

  it('should call cowService with correct parameters, handle the fees and return the correct trade quote when selling WETH', async () => {
    const deps: CowSwapperDeps = {
      apiUrl: 'https://api.cow.fi/mainnet/api',
      adapter: {
        getAddress: jest.fn(() => Promise.resolve('address11')),
        getFeeData: jest.fn<Promise<FeeDataEstimate<KnownChainIds.EthereumMainnet>>, []>(() =>
          Promise.resolve(feeData)
        )
      } as unknown as ethereum.ChainAdapter,
      web3: {} as Web3,
      feeAsset: WETH
    }

    const input: GetTradeQuoteInput = {
      chainId: KnownChainIds.EthereumMainnet,
      sellAsset: WETH,
      buyAsset: FOX,
      sellAmount: '1000000000000000000',
      sendMax: true,
      sellAssetAccountNumber: 0,
      wallet: <HDWallet>{},
      receiveAddress: ''
    }

    ;(cowService.post as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve({
        data: {
          quote: {
            ...expectedApiInputWethToFox,
            sellAmountBeforeFee: undefined,
            sellAmount: '985442057341242012',
            buyAmount: '14501811818247595090576',
            feeAmount: '14557942658757988',
            sellTokenBalance: 'erc20',
            buyTokenBalance: 'erc20'
          }
        }
      })
    )

    const trade = await getCowSwapTradeQuote(deps, input)

    expect(trade).toEqual(expectedTradeQuoteWethToFox)
    expect(cowService.post).toHaveBeenCalledWith(
      'https://api.cow.fi/mainnet/api/v1/quote/',
      expectedApiInputWethToFox
    )
  })
})

import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { KnownChainIds } from '@shapeshiftoss/types'
import { Ok } from '@sniptt/monads'
import type { AxiosStatic } from 'axios'
import type { BuildTradeInput } from 'lib/swapper/api'

import { setupQuote } from '../../utils/test-data/setupSwapQuote'
import { oneInchService } from '../utils/oneInchService'
import type { OneInchSwapperDeps } from '../utils/types'
import { buildTrade } from './buildTrade'

jest.mock('../utils/oneInchService', () => {
  const axios: AxiosStatic = jest.createMockFromModule('axios')
  axios.create = jest.fn(() => axios)

  return {
    oneInchService: axios.create(),
  }
})

jest.mock('lib/utils/evm', () => ({
  ...jest.requireActual('lib/utils/evm'),
  getApiFees: () => ({ networkFeeCryptoBaseUnit: '32388859301500' }),
  getFees: () => ({ networkFeeCryptoBaseUnit: '32388859301500' }),
}))

jest.mock('context/PluginProvider/chainAdapterSingleton', () => ({
  getChainAdapterManager: () => ({ get: () => ({ getChainId: () => 'eip155:1' }) }),
}))

describe('buildTrade', () => {
  const deps: OneInchSwapperDeps = {
    apiUrl: 'https://api.1inch.io/v5.0',
  }
  const { buyAsset, sellAsset } = setupQuote()

  const buildTradeInput: BuildTradeInput = {
    wallet: {} as HDWallet,
    chainId: KnownChainIds.EthereumMainnet,
    sellAsset,
    buyAsset,
    sellAmountBeforeFeesCryptoBaseUnit: '1000000000000000000',
    accountNumber: 0,
    receiveAddress: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
    affiliateBps: '0',
    supportsEIP1559: false,
    allowMultiHop: false,
  }

  it('should return a valid trade', async () => {
    ;(oneInchService.get as jest.Mock<unknown>).mockReturnValueOnce(
      Promise.resolve(
        Ok({
          data: {
            fromToken: {
              symbol: 'FOX',
              name: 'FOX',
              decimals: 18,
              address: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
              logoURI: 'https://tokens.1inch.io/0xc770eefad204b5180df6a14ee197d99d808ee52d.png',
              tags: ['tokens'],
            },
            toToken: {
              symbol: 'WETH',
              name: 'Wrapped Ether',
              address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
              decimals: 18,
              logoURI: 'https://tokens.1inch.io/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2.png',
              wrappedNative: 'true',
              tags: ['tokens', 'PEG:ETH'],
            },
            toTokenAmount: '16502150590853',
            fromTokenAmount: '1000000000000000000',
            tx: {
              from: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
              to: '0x1111111254eeb25477b68fb85ed929f73a960582',
              data: '0x0502b1c5000000000000000000000000c770eefad204b5180df6a14ee197d99d808ee52d0000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000efa859d46070000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000180000000000000003b6d0340470e8de2ebaef52014a47cb5e6af86884947f08ccfee7c08',
              value: '0',
              gas: 500,
              gasPrice: '64777718603',
            },
          },
        }),
      ),
    )
    const buildTradeMaybe = await buildTrade(deps, { ...buildTradeInput })
    const buildTradeOut = buildTradeMaybe.unwrap()
    expect(buildTradeOut.buyAmountBeforeFeesCryptoBaseUnit).toEqual('16502150590853')
    expect(buildTradeOut.sellAmountBeforeFeesCryptoBaseUnit).toEqual('1000000000000000000')
    expect(buildTradeOut.feeData.networkFeeCryptoBaseUnit).toEqual('32388859301500') // gas * gasPrice
    expect(buildTradeOut.rate).toEqual('0.000016502150590853')
  })
})

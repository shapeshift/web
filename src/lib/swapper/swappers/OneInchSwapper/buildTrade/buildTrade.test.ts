import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { KnownChainIds } from '@shapeshiftoss/types'
import axios from 'axios'

import type { OneInchSwapperDeps } from '../utils/types'
import { buildTrade } from './buildTrade'
import { setupQuote } from '../../utils/test-data/setupSwapQuote'
import { BuildTradeInput } from 'lib/swapper/api'

jest.mock('axios')
const mockAxios = axios as jest.Mocked<typeof axios>

describe('buildTrade', () => {
  const deps: OneInchSwapperDeps = {
    apiUrl: 'https://api.1inch.io/v5.0',
  }
  const walletAddress = '0xc770eefad204b5180df6a14ee197d99d808ee52d'
  const wallet = {
    ethGetAddress: jest.fn(() => Promise.resolve(walletAddress)),
  } as unknown as HDWallet
  const { buyAsset, sellAsset } = setupQuote()

  const buildTradeInput: BuildTradeInput = {
    chainId: KnownChainIds.EthereumMainnet,
    sendMax: false,
    sellAsset,
    buyAsset,
    sellAmountBeforeFeesCryptoBaseUnit: '1000000000000000000',
    accountNumber: 0,
    wallet,
    receiveAddress: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
  }

  it('should return a valid trade', async () => {
    mockAxios.get.mockImplementation(async () => {
      return {
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
      }
    })
    const buildTradeOut = await buildTrade(deps, { ...buildTradeInput })
    expect(buildTradeOut.buyAmountCryptoBaseUnit).toEqual('16502150590853')
    expect(buildTradeOut.sellAmountBeforeFeesCryptoBaseUnit).toEqual('1000000000000000000')
    expect(buildTradeOut.feeData.networkFeeCryptoBaseUnit).toEqual('32388859301500') // gas * gasPrice
    expect(buildTradeOut.rate).toEqual('0.000016502150590853')
  })
})

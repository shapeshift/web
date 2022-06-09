import { HDWallet } from '@shapeshiftoss/hdwallet-core'

import { TradeQuote } from '../../../api'
import { ETH, FOX } from '../../utils/test-data/assets'
import { setupQuote } from '../../zrx/utils/test-data/setupSwapQuote'
import { ThorchainSwapperDeps } from '../types'
import { ethMidgardPool, foxMidgardPool } from '../utils/test-data/midgardResponse'
import { thorService } from '../utils/thorService'
import { getThorTradeQuote } from './getTradeQuote'

jest.mock('../utils/thorService')

const mockedAxios = jest.mocked(thorService, true)

const feeData = {
  fast: {
    txFee: '1',
    chainSpecific: { approvalFee: '1', gasLimit: '1', gasPrice: '1' },
    tradeFee: '2'
  }
}
const quoteResponse: TradeQuote<'eip155:1'> = {
  minimum: '2.202188',
  maximum: '100000000000000000000000000',
  sellAmount: '10000000000000000000', // 1000 FOX
  allowanceContract: '0x3624525075b88B24ecc29CE226b0CEc1fFcB6976',
  buyAmount: '784326686463921.8',
  feeData: {
    fee: '1',
    chainSpecific: { estimatedGas: '1', approvalFee: '100000', gasPrice: '1' },
    tradeFee: '115149000000000'
  },
  rate: '0.00007843266864639218',
  sources: [{ name: 'thorchain', proportion: '1' }],
  buyAsset: ETH,
  sellAsset: FOX,
  sellAssetAccountNumber: 0
}

const adapterManager = {
  byChainId: jest.fn(() => ({
    buildBIP44Params: jest.fn(() => ({ purpose: 44, coinType: 60, accountNumber: 0 })),
    getAddress: jest.fn(() => Promise.resolve('0xthisIsMyAddress')),
    getFeeData: jest.fn(() => feeData)
  }))
}

describe('getTradeQuote', () => {
  const { quoteInput } = setupQuote()
  const deps = {
    midgardUrl: 'https://midgard.thorchain.info/v2',
    adapterManager
  } as unknown as ThorchainSwapperDeps

  const wallet = {
    supportsOfflineSigning: jest.fn(() => true)
  } as unknown as HDWallet

  it('should throw if no wallet is provided', async () => {
    const input = {
      ...quoteInput,
      buyAsset: ETH,
      sellAsset: FOX
    }

    await expect(getThorTradeQuote({ deps, input })).rejects.toThrow(
      '[getTradeQuote] - wallet is required'
    )
  })

  it('should get a thorchain quote for a thorchain trade', async () => {
    const data = [
      {
        router: '0x3624525075b88B24ecc29CE226b0CEc1fFcB6976',
        address: '0x084b1c3C81545d370f3634392De611CaaBFf8148',
        chain: 'ETH',
        gas_rate: '1'
      }
    ]
    const input = {
      ...quoteInput,
      sellAmount: '10000000000000000000', // 100 FOX
      buyAsset: ETH,
      sellAsset: FOX,
      wallet
    }

    // Mock midgard api calls in 'getThorTxInfo' and 'getPriceRatio'
    mockedAxios.get
      .mockImplementationOnce(() => Promise.resolve({ data })) // getThorTxInfo
      .mockImplementationOnce(() => Promise.resolve({ data: [ethMidgardPool, foxMidgardPool] })) // getPriceRatio
      .mockImplementationOnce(() => Promise.resolve({ data })) // getThorTxInfo
      .mockImplementationOnce(() => Promise.resolve({ data: [ethMidgardPool, foxMidgardPool] })) // getPriceRatio
      .mockImplementationOnce(() => Promise.resolve({ data: [ethMidgardPool, foxMidgardPool] })) // getPriceRatio

    const tradeQuote = await getThorTradeQuote({ deps, input })
    expect(tradeQuote).toEqual(quoteResponse)
  })
})

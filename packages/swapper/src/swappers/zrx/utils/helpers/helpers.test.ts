import Web3 from 'web3'
import BigNumber from 'bignumber.js'
import { ChainTypes } from '@shapeshiftoss/types'
import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { ChainAdapterManager } from '@shapeshiftoss/chain-adapters'
import { setupQuote } from '../test-data/setupSwapQuote'
import { erc20AllowanceAbi } from '../abi/erc20Allowance-abi'
import { erc20Abi } from '../abi/erc20-abi'
import {
  normalizeAmount,
  getAllowanceRequired,
  getUsdRate,
  grantAllowance
} from '../helpers/helpers'
import { zrxService } from '../zrxService'

jest.mock('web3')
jest.mock('@shapeshiftoss/chain-adapters')
const axios = jest.createMockFromModule('axios')

//@ts-ignore
axios.create = jest.fn(() => axios)
jest.mock('../zrxService')

// @ts-ignore
Web3.mockImplementation(() => ({
  eth: {
    Contract: jest.fn(() => ({
      methods: {
        allowance: jest.fn(() => ({
          call: jest.fn()
        }))
      }
    }))
  }
}))

// @ts-ignore
ChainAdapterManager.mockImplementation(() => ({
  byChain: jest.fn(() => ({
    buildBIP32Params: jest.fn(() => ({ purpose: 44, coinType: 60, accountNumber: 0 })),
    buildSendTransaction: jest.fn(() => Promise.resolve({ txToSign: {} })),
    signTransaction: jest.fn(() => Promise.resolve('signedTx')),
    broadcastTransaction: jest.fn(() => Promise.resolve('broadcastedTx'))
  }))
}))

const setup = () => {
  const unchainedUrls = {
    [ChainTypes.Ethereum]: {
      httpUrl: 'http://localhost:31300',
      wsUrl: 'ws://localhost:31300'
    }
  }
  const adapterManager = new ChainAdapterManager(unchainedUrls)
  const adapter = adapterManager.byChain(ChainTypes.Ethereum)

  const ethNodeUrl = 'http://localhost:1000'
  const web3Provider = new Web3.providers.HttpProvider(ethNodeUrl)
  const web3Instance = new Web3(web3Provider)

  return { web3Instance, adapter }
}

describe('utils', () => {
  const { quoteInput, sellAsset } = setupQuote()
  const { web3Instance, adapter } = setup()

  describe('getUsdRate', () => {
    it('getUsdRate gets the usd rate of the symbol', async () => {
      ;(zrxService.get as jest.Mock<unknown>).mockReturnValue(
        Promise.resolve({ data: { price: '2' } })
      )
      const rate = await getUsdRate({ symbol: 'FOX' })
      expect(rate).toBe('0.5')
    })
    it('getUsdRate fails', async () => {
      ;(zrxService.get as jest.Mock<unknown>).mockReturnValue(Promise.resolve({ data: {} }))
      await expect(getUsdRate({ symbol: 'WETH', tokenId: '0x0001' })).rejects.toThrow(
        'getUsdRate - Failed to get price data'
      )
    })
  })

  describe('normalizeAmount', () => {
    it('should return undefined if not amount is given', () => {
      expect(normalizeAmount(undefined)).toBeUndefined()
    })

    it('should return a string number rounded to the 16th decimal place', () => {
      const result = normalizeAmount('586084736227728377283728272309128120398')
      expect(result).toEqual('586084736227728400000000000000000000000')
    })
  })

  describe('getAllowanceRequired', () => {
    it('should return 0 if the sellAsset symbol is ETH', async () => {
      const quote = {
        ...quoteInput,
        sellAsset: { ...sellAsset, symbol: 'ETH' }
      }
      expect(await getAllowanceRequired({ quote, web3: web3Instance, erc20AllowanceAbi })).toEqual(
        new BigNumber(0)
      )
    })

    it('should return sellAmount if allowanceOnChain is 0', async () => {
      const allowanceOnChain = '0'
      ;(web3Instance.eth.Contract as jest.Mock<unknown>).mockImplementation(() => ({
        methods: {
          allowance: jest.fn(() => ({
            call: jest.fn(() => allowanceOnChain)
          }))
        }
      }))

      expect(
        await getAllowanceRequired({ quote: quoteInput, web3: web3Instance, erc20AllowanceAbi })
      ).toEqual(new BigNumber(quoteInput.sellAmount))
    })

    it('should throw error if allowanceOnChain is undefined', async () => {
      const allowanceOnChain = undefined
      ;(web3Instance.eth.Contract as jest.Mock<unknown>).mockImplementation(() => ({
        methods: {
          allowance: jest.fn(() => ({
            call: jest.fn(() => allowanceOnChain)
          }))
        }
      }))

      await expect(
        getAllowanceRequired({ quote: quoteInput, web3: web3Instance, erc20AllowanceAbi })
      ).rejects.toThrow(
        `No allowance data for ${quoteInput.allowanceContract} to ${quoteInput.receiveAddress}`
      )
    })

    it('should return 0 if sellAmount minus allowanceOnChain is negative', async () => {
      const sellAmount = '100'
      const allowanceOnChain = '1000'
      const quote = {
        ...quoteInput,
        sellAmount
      }
      ;(web3Instance.eth.Contract as jest.Mock<unknown>).mockImplementation(() => ({
        methods: {
          allowance: jest.fn(() => ({
            call: jest.fn(() => allowanceOnChain)
          }))
        }
      }))

      expect(await getAllowanceRequired({ quote, web3: web3Instance, erc20AllowanceAbi })).toEqual(
        new BigNumber(0)
      )
    })

    it('should return sellAsset minus allowanceOnChain', async () => {
      const sellAmount = '1000'
      const allowanceOnChain = '100'
      const quote = {
        ...quoteInput,
        sellAmount
      }
      ;(web3Instance.eth.Contract as jest.Mock<unknown>).mockImplementation(() => ({
        methods: {
          allowance: jest.fn(() => ({
            call: jest.fn(() => allowanceOnChain)
          }))
        }
      }))

      expect(await getAllowanceRequired({ quote, web3: web3Instance, erc20AllowanceAbi })).toEqual(
        new BigNumber(900)
      )
    })
  })

  describe('grantAllowance', () => {
    const walletAddress = '0xc770eefad204b5180df6a14ee197d99d808ee52d'
    const wallet = ({
      ethGetAddress: jest.fn(() => Promise.resolve(walletAddress))
    } as unknown) as HDWallet

    it('should throw if sellAsset.tokenId is not provided', async () => {
      const quote = {
        ...quoteInput,
        sellAsset: { ...sellAsset, tokenId: '' }
      }
      ;(web3Instance.eth.Contract as jest.Mock<unknown>).mockImplementation(() => ({
        methods: {
          approve: jest.fn(() => ({
            encodeABI: jest.fn(
              () => '0x3a93b3190cbb22d23a07c18959c701a7e7d83257a775b6197b67c648a3f90419'
            )
          }))
        }
      }))

      await expect(
        grantAllowance({ quote, wallet, adapter, erc20Abi, web3: web3Instance })
      ).rejects.toThrow('sellAsset.tokenId is required')
    })

    it('should return a txid', async () => {
      const quote = {
        ...quoteInput
      }
      ;(web3Instance.eth.Contract as jest.Mock<unknown>).mockImplementation(() => ({
        methods: {
          approve: jest.fn(() => ({
            encodeABI: jest.fn(
              () => '0x3a93b3190cbb22d23a07c18959c701a7e7d83257a775b6197b67c648a3f90419'
            )
          }))
        }
      }))

      expect(
        await grantAllowance({ quote, wallet, adapter, erc20Abi, web3: web3Instance })
      ).toEqual('broadcastedTx')
    })
  })
})

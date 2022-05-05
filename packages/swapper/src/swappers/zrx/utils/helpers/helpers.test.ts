import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { ChainTypes } from '@shapeshiftoss/types'
import Web3 from 'web3'

import { erc20Abi } from '../abi/erc20-abi'
import { erc20AllowanceAbi } from '../abi/erc20Allowance-abi'
import { bnOrZero } from '../bignumber'
import {
  getAllowanceRequired,
  getUsdRate,
  grantAllowance,
  normalizeAmount
} from '../helpers/helpers'
import { setupQuote } from '../test-data/setupSwapQuote'
import { setupZrxDeps } from '../test-data/setupZrxDeps'
import { zrxService } from '../zrxService'

jest.mock('web3')
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

const setup = () => {
  const { web3Instance, adapterManager } = setupZrxDeps()
  const adapter = adapterManager.byChain(ChainTypes.Ethereum)

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
      expect(zrxService.get).toHaveBeenCalledWith('/swap/v1/price', {
        params: {
          buyToken: 'USDC',
          buyAmount: '1000000000',
          sellToken: 'FOX'
        }
      })
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
    const getAllowanceInput = {
      receiveAddress: '0x0',
      web3: web3Instance,
      erc20AllowanceAbi,
      allowanceContract: '0x0',
      sellAmount: '100',
      sellAsset
    }

    it('should return 0 if the sellAsset symbol is ETH', async () => {
      expect(
        await getAllowanceRequired({
          ...getAllowanceInput,
          sellAsset: { ...sellAsset, symbol: 'ETH' }
        })
      ).toEqual(bnOrZero(0))
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

      expect(await getAllowanceRequired(getAllowanceInput)).toEqual(
        bnOrZero(getAllowanceInput.sellAmount)
      )
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

      await expect(getAllowanceRequired(getAllowanceInput)).rejects.toThrow(
        `No allowance data for ${getAllowanceInput.allowanceContract} to ${getAllowanceInput.receiveAddress}`
      )
    })

    it('should return 0 if sellAmount minus allowanceOnChain is negative', async () => {
      const allowanceOnChain = '1000'

      ;(web3Instance.eth.Contract as jest.Mock<unknown>).mockImplementation(() => ({
        methods: {
          allowance: jest.fn(() => ({
            call: jest.fn(() => allowanceOnChain)
          }))
        }
      }))

      expect(await getAllowanceRequired(getAllowanceInput)).toEqual(bnOrZero(0))
    })

    it('should return sellAsset minus allowanceOnChain', async () => {
      const allowanceOnChain = '100'

      ;(web3Instance.eth.Contract as jest.Mock<unknown>).mockImplementation(() => ({
        methods: {
          allowance: jest.fn(() => ({
            call: jest.fn(() => allowanceOnChain)
          }))
        }
      }))

      expect(await getAllowanceRequired({ ...getAllowanceInput, sellAmount: '1000' })).toEqual(
        bnOrZero(900)
      )
    })
  })

  describe('grantAllowance', () => {
    const walletAddress = '0xc770eefad204b5180df6a14ee197d99d808ee52d'
    const wallet = {
      supportsOfflineSigning: jest.fn(() => true),
      ethGetAddress: jest.fn(() => Promise.resolve(walletAddress))
    } as unknown as HDWallet

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

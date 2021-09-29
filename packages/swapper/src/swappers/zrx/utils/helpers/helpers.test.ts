import Web3 from 'web3'
import BigNumber from 'bignumber.js'
import { setupQuote } from '../test-data/setupSwapQuote'
import { erc20AllowanceAbi } from '../../utils/abi/erc20-abi'
import { normalizeAmount, getAllowanceRequired } from '../helpers/helpers'

jest.mock('web3')

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
  const ethNodeUrl = 'http://localhost:1000'
  const web3Provider = new Web3.providers.HttpProvider(ethNodeUrl)
  const web3Instance = new Web3(web3Provider)

  return { web3Instance }
}

describe('utils', () => {
  const { quoteInput, sellAsset } = setupQuote()
  const { web3Instance } = setup()

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
})

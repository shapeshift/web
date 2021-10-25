import Web3 from 'web3'
import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { approveInfinite } from './approveInfinite'
import { setupZrxDeps } from '../utils/test-data/setupZrxDeps'
import { setupQuote } from '../utils/test-data/setupSwapQuote'
import { zrxService } from '../utils/zrxService'

jest.mock('web3')
jest.mock('../utils/helpers/helpers', () => ({
  grantAllowance: jest.fn(() => 'grantAllowanceTxId')
}))
jest.mock('axios', () => ({
  create: () => ({
    get: jest.fn(() => Promise.resolve({ data: {} })),
    post: jest.fn(() => Promise.resolve({ data: { txid: 'txid' } }))
  }),
  get: jest.fn(() => Promise.resolve({ data: { result: [{ source: 'MEDIAN' }] } }))
}))

// @ts-ignore
Web3.mockImplementation(() => ({
  eth: {
    Contract: jest.fn(() => ({
      methods: {
        approve: jest.fn(() => ({
          encodeABI: jest.fn()
        }))
      }
    }))
  }
}))

describe('approveInfinite', () => {
  const { web3Instance, adapterManager } = setupZrxDeps()
  const { quoteInput } = setupQuote()
  const wallet = ({
    ethGetAddress: jest.fn(() => Promise.resolve('0xc770eefad204b5180df6a14ee197d99d808ee52d')),
    ethSignTx: jest.fn(() => Promise.resolve({}))
  } as unknown) as HDWallet

  it('should return a txid', async () => {
    const deps = { web3: web3Instance, adapterManager }
    const data = { allowanceTarget: '10000' }
    const quote = { ...quoteInput }
    ;(zrxService.get as jest.Mock<unknown>).mockReturnValue(Promise.resolve({ data }))

    expect(await approveInfinite(deps, { quote, wallet })).toEqual('grantAllowanceTxId')
  })
})

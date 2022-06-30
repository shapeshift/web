import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import Web3 from 'web3'

import { setupDeps } from '../../utils/test-data/setupDeps'
import { setupQuote } from '../../utils/test-data/setupSwapQuote'
import { zrxService } from '../utils/zrxService'
import { zrxApproveInfinite } from './/zrxApproveInfinite'

jest.mock('web3')
jest.mock('../../utils/helpers/helpers', () => ({
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

describe('zrxApproveInfinite', () => {
  const deps = setupDeps()
  const { tradeQuote } = setupQuote()
  const wallet = {
    ethGetAddress: jest.fn(() => Promise.resolve('0xc770eefad204b5180df6a14ee197d99d808ee52d')),
    ethSignTx: jest.fn(() => Promise.resolve({}))
  } as unknown as HDWallet

  it('should return a txid', async () => {
    const data = { allowanceTarget: '10000' }
    const quote = { ...tradeQuote }
    ;(zrxService.get as jest.Mock<unknown>).mockReturnValue(Promise.resolve({ data }))

    expect(await zrxApproveInfinite(deps, { quote, wallet })).toEqual('grantAllowanceTxId')
  })
})

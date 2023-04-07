import { HDWallet } from '@shapeshiftoss/hdwallet-core'

import { setupQuote } from '../../utils/test-data/setupSwapQuote'
import { setupThorswapDeps } from '../utils/test-data/setupThorswapDeps'
import { thorTradeApproveInfinite } from './thorTradeApproveInfinite'

jest.mock('../../utils/helpers/helpers', () => ({
  grantAllowance: jest.fn(() => 'grantAllowanceTxId'),
}))

describe('thorTradeApproveInfinite', () => {
  const deps = setupThorswapDeps()
  const { tradeQuote: quote } = setupQuote()
  const wallet = <HDWallet>{}
  const input = { wallet, quote }

  it('should return a broadcastedTxId', async () => {
    expect(await thorTradeApproveInfinite({ deps, input })).toEqual('grantAllowanceTxId')
  })
})

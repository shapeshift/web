import type { ethereum } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { KnownChainIds } from '@shapeshiftoss/types'
import type Web3 from 'web3'

import { SwapperType } from '../../api'
import { setupBuildTrade, setupQuote } from '../utils/test-data/setupSwapQuote'
import { getZrxTradeQuote } from './getZrxTradeQuote/getZrxTradeQuote'
import { setupExecuteTrade } from './utils/test-data/setupZrxSwapQuote'
import { zrxBuildTrade } from './zrxBuildTrade/zrxBuildTrade'
import { zrxExecuteTrade } from './zrxExecuteTrade/zrxExecuteTrade'
import { ZrxSwapper } from './ZrxSwapper'

jest.mock('./utils/helpers/helpers')
jest.mock('lib/swapper/swappers/ZrxSwapper/zrxExecuteTrade/zrxExecuteTrade', () => ({
  zrxExecuteTrade: jest.fn(),
}))

jest.mock('lib/swapper/swappers/ZrxSwapper/zrxBuildTrade/zrxBuildTrade', () => ({
  zrxBuildTrade: jest.fn(),
}))

jest.mock('./getZrxTradeQuote/getZrxTradeQuote', () => ({
  getZrxTradeQuote: jest.fn(),
}))

jest.mock('./getZrxMinMax/getZrxMinMax', () => ({
  getZrxMinMax: jest.fn(),
}))

describe('ZrxSwapper', () => {
  const wallet = {} as HDWallet
  const web3 = {} as Web3
  const adapter = {
    getChainId: () => KnownChainIds.EthereumMainnet,
  } as ethereum.ChainAdapter
  const zrxEthereumSwapperDeps = { web3, adapter }

  it('calls getZrxTradeQuote on getTradeQuote', async () => {
    const { quoteInput } = setupQuote()
    const swapper = new ZrxSwapper(zrxEthereumSwapperDeps)
    await swapper.getTradeQuote(quoteInput)
    expect(getZrxTradeQuote).toHaveBeenCalled()
  })
  it('returns 0x name', () => {
    const swapper = new ZrxSwapper(zrxEthereumSwapperDeps)
    expect(swapper.name).toBe('0x')
  })
  it('returns Zrx type', () => {
    const swapper = new ZrxSwapper(zrxEthereumSwapperDeps)
    const type = swapper.getType()
    expect(type).toBe(SwapperType.ZrxEthereum)
  })
  it('calls zrxBuildTrade on swapper.buildQuoteTx', async () => {
    const { buildTradeInput } = setupBuildTrade()
    const swapper = new ZrxSwapper(zrxEthereumSwapperDeps)
    await swapper.buildTrade(buildTradeInput)
    expect(zrxBuildTrade).toHaveBeenCalled()
  })
  it('calls ZrxExecuteTrade on swapper.executeTrade', async () => {
    const { executeTradeInput } = setupExecuteTrade()
    const swapper = new ZrxSwapper(zrxEthereumSwapperDeps)
    const args = { trade: executeTradeInput, wallet }
    await swapper.executeTrade(args)
    expect(zrxExecuteTrade).toHaveBeenCalled()
  })
})
